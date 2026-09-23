<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Client;
use App\Models\ClientPriceList;

class PricingService
{
    /**
     * Calculate deterministic price for a product, factoring in client overrides, tier discounts, and global defaults.
     *
     * @param Product|int $product
     * @param Client|int|null $client
     * @param float $quantity
     * @param float|null $customWeight
     * @return array
     */
    public static function calculateItemPrice($product, $client = null, float $quantity = 1.0, ?float $customWeight = null): array
    {
        if (is_numeric($product)) {
            $product = Product::with(['category', 'subcategory'])->find($product);
        }

        if (is_numeric($client)) {
            $client = Client::find($client);
        }

        if (!$product) {
            return [
                'unit_price' => 0.0,
                'making_charge' => 0.0,
                'stone_charge' => 0.0,
                'subtotal' => 0.0,
                'discount' => 0.0,
                'tax' => 0.0,
                'total' => 0.0,
                'applied_rule' => 'none',
            ];
        }

        $attrs = is_array($product->attributes) ? $product->attributes : (json_decode($product->attributes ?? '[]', true) ?: []);
        $weight = $customWeight ?: floatval($attrs['gross_wt'] ?? $product->opening_stock_weight ?? $product->weight ?? 1.0);
        $baseRate = floatval($attrs['sale_rate'] ?? $attrs['rate'] ?? $product->opening_stock_rate ?? 6850.0);

        $makingChargePerGram = floatval($attrs['making_charge'] ?? 650.0);
        $stoneCharge = floatval($attrs['stone_charge'] ?? $attrs['diamond_charge'] ?? 0.0);

        $appliedRule = 'global_default';
        $clientPriceList = null;

        if ($client) {
            $clientPriceList = ClientPriceList::where('client_id', $client->id)->latest()->first();
        }

        // Priority Level 1: Client-Specific Product Rate Override in ClientPriceList
        if ($clientPriceList && !empty($clientPriceList->custom_rates) && isset($clientPriceList->custom_rates[$product->id])) {
            $customRate = floatval($clientPriceList->custom_rates[$product->id]);
            if ($customRate > 0) {
                $baseRate = $customRate;
                $appliedRule = 'client_specific_override';
            }
        }

        // Priority Level 2: Specific Metal Rate Override in ClientPriceList
        if ($appliedRule === 'global_default' && $clientPriceList) {
            $catName = strtolower($product->category->name ?? '');
            $prodName = strtolower($product->name ?? '');
            if (str_contains($catName, 'silver') || str_contains($prodName, 'silver')) {
                if (!empty($clientPriceList->silver_rate_per_gram) && floatval($clientPriceList->silver_rate_per_gram) > 0) {
                    $baseRate = floatval($clientPriceList->silver_rate_per_gram);
                    $appliedRule = 'client_metal_rate';
                }
            } else {
                if (!empty($clientPriceList->gold_rate_per_gram) && floatval($clientPriceList->gold_rate_per_gram) > 0) {
                    $baseRate = floatval($clientPriceList->gold_rate_per_gram);
                    $appliedRule = 'client_metal_rate';
                }
            }
        }

        // Base product line calculations
        $rawProductValue = $weight * $baseRate;
        $totalMakingCharge = $weight * $makingChargePerGram;
        $unitPrice = round($rawProductValue + $totalMakingCharge + $stoneCharge, 2);
        $lineSubtotal = round($unitPrice * $quantity, 2);

        // Priority Level 3: Client Tier Discount / Overall Client Discount
        $discountPercent = 0.0;
        if ($client) {
            if (isset($client->discount_percentage) && floatval($client->discount_percentage) > 0) {
                $discountPercent = floatval($client->discount_percentage);
            } else {
                $tier = strtoupper($client->membership_tier ?? $client->client_tier ?? 'SILVER');
                switch ($tier) {
                    case 'PLATINUM':
                    case 'VIP':
                        $discountPercent = 5.0;
                        break;
                    case 'GOLD':
                        $discountPercent = 3.0;
                        break;
                    case 'SILVER':
                    default:
                        $discountPercent = 0.0;
                        break;
                }
            }
        }

        $discountAmount = round(($lineSubtotal * $discountPercent) / 100.0, 2);
        $taxableAmount = max(0, $lineSubtotal - $discountAmount);
        $taxAmount = round($taxableAmount * 0.03, 2); // Standard 3% Jewellery GST
        $grandTotal = round($taxableAmount + $taxAmount, 2);

        return [
            'product_id' => $product->id,
            'product_name' => $product->name,
            'product_code' => $product->product_code,
            'weight' => $weight,
            'rate_per_gram' => $baseRate,
            'making_charge' => $totalMakingCharge,
            'stone_charge' => $stoneCharge,
            'unit_price' => $unitPrice,
            'quantity' => $quantity,
            'subtotal' => $lineSubtotal,
            'discount_percent' => $discountPercent,
            'discount_amount' => $discountAmount,
            'tax_amount' => $taxAmount,
            'total' => $grandTotal,
            'applied_rule' => $appliedRule,
        ];
    }
}
