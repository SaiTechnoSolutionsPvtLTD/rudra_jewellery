<?php

namespace App\Services;

use App\Models\Client;
use App\Models\InventoryMovement;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\SaleItem;
use App\Models\SalePayment;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaleService
{
    public function create(array $data, ?int $userId = null): Invoice
    {
        return DB::transaction(function () use ($data, $userId) {
            $client = !empty($data['client_id']) ? Client::findOrFail($data['client_id']) : null;
            $items = $data['items'];
            $subtotal = 0;
            $costTotal = 0;
            $lineItems = [];

            foreach ($items as $item) {
                $product = !empty($item['product_id']) ? Product::whereKey($item['product_id'])->lockForUpdate()->firstOrFail() : null;
                $quantity = (float) ($item['quantity'] ?? 1);
                if ($quantity <= 0) throw ValidationException::withMessages(['items' => 'Quantity must be greater than zero.']);

                $available = $product ? (float) ($product->current_stock_qty ?? 0) : null;
                if ($product && $available < $quantity) {
                    throw ValidationException::withMessages(['items' => "Insufficient stock for {$product->name}. Available: {$available}."]);
                }

                $rate = (float) ($item['rate'] ?? ($product?->attributes['sale_rate'] ?? $product?->attributes['rate'] ?? 0));
                $charges = collect(['making_charge', 'labour_charge', 'stone_charge', 'diamond_charge', 'other_charge'])
                    ->sum(fn ($key) => (float) ($item[$key] ?? 0));
                $lineTotal = round(($rate * $quantity) + $charges, 2);
                $unitCost = (float) ($item['cost_rate'] ?? ($product?->opening_stock_rate ?? 0));
                $lineCost = round($unitCost * $quantity, 2);
                $subtotal += $lineTotal;
                $costTotal += $lineCost;
                $lineItems[] = compact('product', 'item', 'quantity', 'rate', 'lineTotal', 'unitCost', 'lineCost');
            }

            $discount = (float) ($data['discount'] ?? 0);
            $taxRate = (float) ($data['gst_rate'] ?? 0);
            $taxable = max(0, $subtotal - $discount);
            $tax = round($taxable * $taxRate / 100, 2);
            $total = round($taxable + $tax + (float) ($data['other_charge'] ?? 0), 2);
            $paid = min($total, max(0, (float) ($data['paid_amount'] ?? 0)));
            $due = round($total - $paid, 2);
            $status = $due <= 0 ? 'paid' : ($paid > 0 ? 'partial' : 'pending');
            $invoiceNo = $this->nextInvoiceNumber();
            $clientName = $client?->full_name ?: trim((string) ($data['client_name'] ?? 'Walk-in Customer'));

            $invoice = Invoice::create([
                'invoice_no' => $invoiceNo,
                'client_id' => $client?->id,
                'client_name' => $clientName,
                'client_email' => $client?->email,
                'client_tier' => strtoupper($client?->membership_tier ?: 'SILVER'),
                'client_initials' => collect(explode(' ', $clientName))->map(fn ($part) => strtoupper(substr($part, 0, 1)))->take(2)->implode(''),
                'invoice_date' => $data['invoice_date'] ?? now()->toDateString(),
                'amount' => $subtotal,
                'gst_rate' => $taxRate,
                'gst_amount' => $tax,
                'total_amount' => $total,
                'paid_amount' => $paid,
                'due_amount' => $due,
                'due_date' => $data['due_date'] ?? null,
                'payment_method' => $data['payment_method'] ?? null,
                'cost_amount' => $costTotal,
                'profit_amount' => round($total - $costTotal, 2),
                'sale_status' => 'completed',
                'status' => $status,
                'invoice_type' => $data['invoice_type'] ?? 'retail_sale',
                'notes' => $data['notes'] ?? null,
                'items' => $items,
                'created_by' => $userId,
            ]);

            foreach ($lineItems as $line) {
                $product = $line['product'];
                $item = $line['item'];
                SaleItem::create([
                    'invoice_id' => $invoice->id,
                    'product_id' => $product?->id,
                    'product_name' => $item['product_name'] ?? $product?->name ?? 'Jewellery Item',
                    'product_code' => $item['product_code'] ?? $product?->product_code,
                    'quantity' => $line['quantity'],
                    'gross_weight' => $item['gross_weight'] ?? 0,
                    'net_weight' => $item['net_weight'] ?? 0,
                    'stone_weight' => $item['stone_weight'] ?? 0,
                    'purity' => $item['purity'] ?? null,
                    'rate' => $line['rate'],
                    'making_charge' => $item['making_charge'] ?? 0,
                    'labour_charge' => $item['labour_charge'] ?? 0,
                    'stone_charge' => $item['stone_charge'] ?? 0,
                    'diamond_charge' => $item['diamond_charge'] ?? 0,
                    'other_charge' => $item['other_charge'] ?? 0,
                    'line_total' => $line['lineTotal'],
                    'cost_amount' => $line['lineCost'],
                    'details' => $item['details'] ?? null,
                ]);

                if ($product) {
                    $product->decrement('current_stock_qty', $line['quantity']);
                    InventoryMovement::create([
                        'product_id' => $product->id,
                        'invoice_id' => $invoice->id,
                        'movement_type' => 'sale',
                        'quantity' => -$line['quantity'],
                        'weight' => -((float) ($item['gross_weight'] ?? 0) * $line['quantity']),
                        'unit_cost' => $line['unitCost'],
                        'notes' => "Sold on {$invoice->invoice_no}",
                        'created_by' => $userId,
                    ]);
                }
            }

            if ($paid > 0) {
                SalePayment::create(['invoice_id' => $invoice->id, 'amount' => $paid, 'payment_method' => $data['payment_method'] ?? 'cash', 'reference' => $data['payment_reference'] ?? null, 'paid_at' => now(), 'received_by' => $userId]);
            }

            if ($client) {
                $client->increment('total_purchases', $total);
                $client->update(['last_visit' => now()]);
            }

            return $invoice->load(['itemsRelation', 'payments', 'client']);
        });
    }

    public function recordPayment(Invoice $invoice, array $data, ?int $userId = null): Invoice
    {
        return DB::transaction(function () use ($invoice, $data, $userId) {
            $amount = (float) $data['amount'];
            $due = max(0, (float) $invoice->total_amount - (float) $invoice->paid_amount);
            if ($amount <= 0 || $amount > $due) throw ValidationException::withMessages(['amount' => 'Payment must be greater than zero and cannot exceed the outstanding balance.']);
            SalePayment::create(['invoice_id' => $invoice->id, 'amount' => $amount, 'payment_method' => $data['payment_method'], 'reference' => $data['reference'] ?? null, 'paid_at' => $data['paid_at'] ?? now(), 'received_by' => $userId]);
            $invoice->paid_amount += $amount;
            $invoice->due_amount = max(0, $invoice->total_amount - $invoice->paid_amount);
            $invoice->status = $invoice->due_amount <= 0 ? 'paid' : 'partial';
            $invoice->payment_method = $data['payment_method'];
            $invoice->save();
            return $invoice->load('payments');
        });
    }

    private function nextInvoiceNumber(): string
    {
        $next = ((int) Invoice::max('id')) + 1;
        do { $number = 'INV-' . now()->format('Y') . '-' . str_pad((string) $next++, 5, '0', STR_PAD_LEFT); } while (Invoice::where('invoice_no', $number)->exists());
        return $number;
    }
}
