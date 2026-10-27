<?php

namespace App\Services;

use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Models\WorkOrderReceivedPiece;
use App\Models\WorkOrderNotification;
use App\Models\Product;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class NotificationService
{
    /**
     * Find active recipients matching specified roles, permissions, or user IDs.
     */
    public static function findRecipients(
        array $roles = [],
        array $permissions = [],
        array $userIds = [],
        ?int $excludeUserId = null
    ): Collection {
        $query = User::where('status', 'active');

        $activeUsers = $query->get();

        $matched = $activeUsers->filter(function (User $user) use ($roles, $permissions, $userIds, $excludeUserId) {
            $isSuperAdmin = $user->isSuperAdmin() || in_array(strtolower(str_replace(' ', '_', $user->role ?? '')), ['super_admin']);

            // Never notify the user performing the action if excluded, unless they are Super Admin
            if ($excludeUserId !== null && $user->id === $excludeUserId && !$isSuperAdmin) {
                return false;
            }

            // Explicit user ID match
            if (!empty($userIds) && in_array($user->id, $userIds)) {
                return true;
            }

            // Role match (case-insensitive role check)
            if (!empty($roles)) {
                $userRole = strtolower(str_replace(' ', '_', $user->role ?? ''));
                foreach ($roles as $r) {
                    $targetRole = strtolower(str_replace(' ', '_', $r));
                    if ($userRole === $targetRole) {
                        return true;
                    }
                }
            }

            // Permission match
            if (!empty($permissions)) {
                foreach ($permissions as $perm) {
                    if ($user->hasPermission($perm)) {
                        return true;
                    }
                }
            }

            return false;
        });

        // Safe fallback: If no specific recipient found, fall back to active Super Admins & Admins so no event is lost
        if ($matched->isEmpty()) {
            $fallback = $activeUsers->filter(function (User $u) use ($excludeUserId) {
                $isSuperAdmin = $u->isSuperAdmin() || in_array(strtolower(str_replace(' ', '_', $u->role ?? '')), ['super_admin']);
                if ($excludeUserId !== null && $u->id === $excludeUserId && !$isSuperAdmin) {
                    return false;
                }
                return in_array(strtolower(str_replace(' ', '_', $u->role ?? '')), ['super_admin', 'admin']);
            });

            if ($fallback->isNotEmpty()) {
                return $fallback->values();
            }

            Log::warning('NotificationService: No eligible active recipients found for notification.');
        }

        return $matched->values();
    }

    /**
     * Centralized notification dispatcher with idempotency and individual recipient records.
     */
    public static function send(array $params): array
    {
        $created = [];

        try {
            $type = $params['type'] ?? 'system';
            $title = $params['title'] ?? 'Notification';
            $message = $params['message'] ?? '';
            $workOrderId = $params['work_order_id'] ?? null;
            $pieceId = $params['piece_id'] ?? null;
            $karigarId = $params['karigar_id'] ?? null;
            $entityType = $params['entity_type'] ?? ($workOrderId ? 'work_order' : null);
            $entityId = $params['entity_id'] ?? $workOrderId;
            $actionUrl = $params['action_url'] ?? null;
            $data = $params['data'] ?? [];
            $idempotencyKey = $params['idempotency_key'] ?? null;
            $excludeUserId = $params['exclude_user_id'] ?? null;

            // Foreign key safety validation
            if ($workOrderId && !WorkOrder::where('id', $workOrderId)->exists()) {
                $workOrderId = null;
            }
            if ($pieceId && !WorkOrderReceivedPiece::where('id', $pieceId)->exists()) {
                $pieceId = null;
            }
            if ($karigarId && !\App\Models\Karigar::where('id', $karigarId)->exists()) {
                $karigarId = null;
            }

            // Resolve recipients
            if (!empty($params['recipients']) && $params['recipients'] instanceof Collection) {
                $recipients = $params['recipients'];
            } elseif (!empty($params['recipients']) && is_array($params['recipients'])) {
                $recipients = User::where('status', 'active')->whereIn('id', $params['recipients'])->get();
            } else {
                $recipients = self::findRecipients(
                    $params['roles'] ?? [],
                    $params['permissions'] ?? [],
                    $params['user_ids'] ?? [],
                    $excludeUserId
                );
            }

            if ($recipients->isEmpty()) {
                return [];
            }

            foreach ($recipients as $recipient) {
                // Prevent duplicate notifications if idempotency key provided
                if ($idempotencyKey) {
                    $existing = WorkOrderNotification::where('user_id', $recipient->id)
                        ->where('idempotency_key', $idempotencyKey)
                        ->exists();

                    if ($existing) {
                        continue;
                    }
                }

                $notif = WorkOrderNotification::create([
                    'work_order_id' => $workOrderId,
                    'piece_id' => $pieceId,
                    'karigar_id' => $karigarId,
                    'user_id' => $recipient->id,
                    'type' => $type,
                    'entity_type' => $entityType,
                    'entity_id' => $entityId,
                    'title' => $title,
                    'message' => $message,
                    'data' => array_merge($data, [
                        'order_id' => $workOrderId,
                        'piece_id' => $pieceId,
                        'action_url' => $actionUrl,
                        'recipient_role' => $recipient->role,
                    ]),
                    'action_url' => $actionUrl,
                    'idempotency_key' => $idempotencyKey,
                    'is_read' => false,
                    'read_at' => null,
                ]);

                $created[] = $notif;
            }
        } catch (\Throwable $e) {
            Log::error('NotificationService::send failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'params' => $params,
            ]);
        }

        return $created;
    }

    /**
     * Send notification directly to a list of user IDs.
     */
    public function sendToUsers(array $userIds, array $params): array
    {
        return self::send(array_merge($params, ['user_ids' => $userIds]));
    }

    /* ------------------------------------------------------------------------
     * WORK ORDER MANAGEMENT WORKFLOWS
     * ------------------------------------------------------------------------ */

    /**
     * Notify Manager / Supervisor when an Admin creates a new Work Order.
     */
    public static function notifyWorkOrderCreated(WorkOrder $order, ?int $actorId = null): array
    {
        $woNo = $order->work_order_number;
        $prod = $order->product_name ?: 'Jewelry Item';

        return self::send([
            'type' => 'work_order_created',
            'title' => "New Work Order Created: {$woNo}",
            'message' => "Work Order {$woNo} for {$prod} ({$order->required_qty} pcs) has been created and requires assignment/review.",
            'work_order_id' => $order->id,
            'entity_type' => 'work_order',
            'entity_id' => $order->id,
            'action_url' => "/job-order/hub?order_id={$order->id}",
            'roles' => ['Manager', 'Admin', 'Super Admin'],
            'permissions' => ['workorders.view', 'workorders.assign'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "wo_created_{$order->id}",
            'data' => [
                'work_order_number' => $woNo,
                'product_name' => $prod,
                'required_qty' => $order->required_qty,
                'status' => $order->status,
            ],
        ]);
    }

    /**
     * Notify Manager / Supervisor when a Work Order is assigned to a Karigar.
     */
    public static function notifyWorkOrderAssigned(WorkOrder $order, ?int $actorId = null): array
    {
        $woNo = $order->work_order_number;
        $karigar = $order->karigar?->name ?: $order->karigar_name ?: 'Artisan';
        $prod = $order->product_name ?: 'Jewelry Item';

        return self::send([
            'type' => 'assigned',
            'title' => "Work Order Assigned: {$woNo}",
            'message' => "Work Order {$woNo} ({$prod}) assigned to artisan {$karigar}.",
            'work_order_id' => $order->id,
            'karigar_id' => $order->karigar_id,
            'entity_type' => 'work_order',
            'entity_id' => $order->id,
            'action_url' => "/job-order/in-progress?order_id={$order->id}",
            'roles' => ['Manager', 'Admin', 'Super Admin'],
            'permissions' => ['workorders.view', 'workorders.update'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "wo_assigned_{$order->id}_{$order->karigar_id}",
            'data' => [
                'work_order_number' => $woNo,
                'product_name' => $prod,
                'karigar_name' => $karigar,
                'allotted_weight' => $order->allotted_weight,
            ],
        ]);
    }

    /**
     * Notify Manager / Supervisor when a Work Order is delayed.
     */
    public static function notifyWorkOrderDelayed(
        WorkOrder $order,
        string $reason,
        int $delayDays,
        ?int $actorId = null
    ): array {
        $woNo = $order->work_order_number;

        return self::send([
            'type' => 'delay',
            'title' => "Work Order Delayed: {$woNo}",
            'message' => "Work Order {$woNo} reported a delay of {$delayDays} day(s). Reason: {$reason}",
            'work_order_id' => $order->id,
            'entity_type' => 'work_order',
            'entity_id' => $order->id,
            'action_url' => "/job-order/delays?order_id={$order->id}",
            'roles' => ['Manager', 'Admin', 'Super Admin'],
            'permissions' => ['workorders.view', 'workorders.update'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "wo_delay_{$order->id}_" . time(),
            'data' => [
                'work_order_number' => $woNo,
                'delay_reason' => $reason,
                'delay_days' => $delayDays,
            ],
        ]);
    }

    /**
     * Notify Admin / Manager when a Work Order is completed.
     */
    public static function notifyWorkOrderCompleted(WorkOrder $order, ?int $actorId = null): array
    {
        $woNo = $order->work_order_number;
        $prod = $order->product_name ?: 'Jewelry Item';

        return self::send([
            'type' => 'completed',
            'title' => "Work Order Completed: {$woNo}",
            'message' => "Work Order {$woNo} ({$prod}, {$order->completed_qty} pcs) has completed all manufacturing and inventory gates.",
            'work_order_id' => $order->id,
            'entity_type' => 'work_order',
            'entity_id' => $order->id,
            'action_url' => "/job-order/hub?order_id={$order->id}",
            'roles' => ['Admin', 'Super Admin', 'Manager'],
            'permissions' => ['workorders.view', 'workorders.approve'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "wo_completed_{$order->id}",
            'data' => [
                'work_order_number' => $woNo,
                'product_name' => $prod,
                'completed_qty' => $order->completed_qty,
            ],
        ]);
    }

    /**
     * Notify responsible Manager when a new Job Item is added to a Work Order.
     */
    public static function notifyJobAdded(WorkOrder $order, WorkOrderItem $item, ?int $actorId = null): array
    {
        $woNo = $order->work_order_number;
        $itemProd = $item->product_name ?: 'Product Item';
        $des = $item->design_no ? " (Design #{$item->design_no})" : '';

        return self::send([
            'type' => 'job_added',
            'title' => "New Job Added to {$woNo}",
            'message' => "New job '{$itemProd}'{$des} added to Work Order {$woNo} with required qty {$item->required_qty}.",
            'work_order_id' => $order->id,
            'entity_type' => 'work_order_item',
            'entity_id' => $item->id,
            'action_url' => "/job-order/in-progress?order_id={$order->id}",
            'roles' => ['Manager', 'Admin'],
            'permissions' => ['workorders.view', 'workorders.update'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "job_added_{$order->id}_{$item->id}",
            'data' => [
                'work_order_number' => $woNo,
                'item_id' => $item->id,
                'product_name' => $itemProd,
                'design_no' => $item->design_no,
            ],
        ]);
    }

    /**
     * Notify when a Work Order is updated, edited, or stage advanced.
     */
    public static function notifyWorkOrderUpdated(WorkOrder $order, string $updateSummary = 'Details updated', ?int $actorId = null): array
    {
        $woNo = $order->work_order_number;
        $prod = $order->product_name ?: 'Jewelry Item';

        return self::send([
            'type' => 'work_order_updated',
            'title' => "Work Order Updated: {$woNo}",
            'message' => "Work Order {$woNo} ({$prod}) updated: {$updateSummary}.",
            'work_order_id' => $order->id,
            'entity_type' => 'work_order',
            'entity_id' => $order->id,
            'action_url' => "/job-order/in-progress?order_id={$order->id}",
            'roles' => ['Manager', 'Admin', 'Super Admin'],
            'permissions' => ['workorders.view', 'workorders.update'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "wo_updated_{$order->id}_" . time(),
            'data' => [
                'work_order_number' => $woNo,
                'product_name' => $prod,
                'current_stage' => $order->current_stage,
                'status' => $order->status,
                'summary' => $updateSummary,
            ],
        ]);
    }

    /**
     * Notify responsible Manager when production progress is recorded.
     */
    public static function notifyProductionProgress(
        WorkOrder $order,
        WorkOrderItem $item,
        int $completedNow,
        ?int $actorId = null
    ): array {
        $woNo = $order->work_order_number;
        $itemProd = $item->product_name ?: 'Product Item';

        return self::send([
            'type' => 'progress_update',
            'title' => "Production Update: {$woNo}",
            'message' => "Production recorded: +{$completedNow} pc(s) for {$itemProd} on {$woNo} (Total: {$item->completed_qty}/{$item->required_qty}).",
            'work_order_id' => $order->id,
            'entity_type' => 'work_order_item',
            'entity_id' => $item->id,
            'action_url' => "/job-order/in-progress?order_id={$order->id}",
            'roles' => ['Manager', 'Admin'],
            'permissions' => ['workorders.view', 'workorders.update'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "wip_update_{$order->id}_{$item->id}_" . time(),
            'data' => [
                'work_order_number' => $woNo,
                'item_id' => $item->id,
                'completed_now' => $completedNow,
                'item_completed_qty' => $item->completed_qty,
            ],
        ]);
    }

    /* ------------------------------------------------------------------------
     * QUALITY CONTROL (QC) WORKFLOWS (PER INDIVIDUAL PIECE)
     * ------------------------------------------------------------------------ */

    /**
     * When individual pieces are submitted for QC, notify designated QC users & Manager.
     */
    public static function notifyQcSubmitted(
        WorkOrder $order,
        ?WorkOrderItem $item = null,
        ?WorkOrderReceivedPiece $piece = null,
        int $qty = 1,
        ?int $actorId = null
    ): array {
        $woNo = $order->work_order_number;
        $prod = $item?->product_name ?: $order->product_name ?: 'Jewelry Item';
        $pieceTag = $piece ? "Piece #{$piece->piece_number}" : "{$qty} pc(s)";
        $url = $piece ? "/job-order/qc?order_id={$order->id}&piece_id={$piece->id}" : "/job-order/qc?order_id={$order->id}";

        return self::send([
            'type' => 'qc_submitted',
            'title' => "Submitted for QC: {$woNo}",
            'message' => "{$pieceTag} of {$prod} ({$woNo}) submitted for Quality Check inspection.",
            'work_order_id' => $order->id,
            'piece_id' => $piece?->id,
            'entity_type' => 'qc_inspection',
            'entity_id' => $piece?->id ?: $order->id,
            'action_url' => $url,
            'roles' => ['Manager', 'Admin', 'Super Admin'],
            'permissions' => ['workorders.qc', 'workorders.approve'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "qc_submitted_{$order->id}_" . ($piece?->id ?? "batch_" . time()),
            'data' => [
                'work_order_number' => $woNo,
                'product_name' => $prod,
                'piece_id' => $piece?->id,
                'piece_number' => $piece?->piece_number,
                'qty' => $qty,
            ],
        ]);
    }

    /**
     * When a piece passes QC, notify the user responsible for next stage (Receiving).
     */
    public static function notifyQcPassed(
        WorkOrder $order,
        ?WorkOrderItem $item = null,
        ?WorkOrderReceivedPiece $piece = null,
        int $qty = 1,
        ?int $actorId = null
    ): array {
        $woNo = $order->work_order_number;
        $prod = $item?->product_name ?: $order->product_name ?: 'Jewelry Item';
        $pieceTag = $piece ? "Piece #{$piece->piece_number}" : "{$qty} pc(s)";
        $url = "/job-order/receive?order_id={$order->id}";

        return self::send([
            'type' => 'qc_passed',
            'title' => "QC Passed: {$woNo}",
            'message' => "{$pieceTag} of {$prod} ({$woNo}) passed Quality Check inspection and is ready for receiving.",
            'work_order_id' => $order->id,
            'piece_id' => $piece?->id,
            'entity_type' => 'qc_inspection',
            'entity_id' => $piece?->id ?: $order->id,
            'action_url' => $url,
            'roles' => ['Staff', 'Manager', 'Admin'],
            'permissions' => ['workorders.receive', 'workorders.view'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "qc_passed_{$order->id}_" . ($piece?->id ?? "qty_{$qty}_" . time()),
            'data' => [
                'work_order_number' => $woNo,
                'product_name' => $prod,
                'piece_id' => $piece?->id,
                'qty' => $qty,
            ],
        ]);
    }

    /**
     * When a piece fails QC and is returned for rework, notify responsible Manager / Supervisor.
     */
    public static function notifyQcReworkReturned(
        WorkOrder $order,
        ?WorkOrderItem $item = null,
        ?WorkOrderReceivedPiece $piece = null,
        string $reason = 'Quality defect',
        int $qty = 1,
        ?int $actorId = null
    ): array {
        $woNo = $order->work_order_number;
        $prod = $item?->product_name ?: $order->product_name ?: 'Jewelry Item';
        $pieceTag = $piece ? "Piece #{$piece->piece_number}" : "{$qty} pc(s)";

        return self::send([
            'type' => 'returned',
            'title' => "QC Rework Returned: {$woNo}",
            'message' => "{$pieceTag} of {$prod} ({$woNo}) failed QC and returned for rework. Reason: {$reason}",
            'work_order_id' => $order->id,
            'piece_id' => $piece?->id,
            'entity_type' => 'qc_inspection',
            'entity_id' => $piece?->id ?: $order->id,
            'action_url' => "/job-order/in-progress?order_id={$order->id}",
            'roles' => ['Manager', 'Admin'],
            'permissions' => ['workorders.rework', 'workorders.update'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "qc_rework_{$order->id}_" . ($piece?->id ?? time()),
            'data' => [
                'work_order_number' => $woNo,
                'product_name' => $prod,
                'piece_id' => $piece?->id,
                'reason' => $reason,
                'qty' => $qty,
            ],
        ]);
    }

    /**
     * When a reworked piece is resubmitted back to QC, notify QC user / Inspector.
     */
    public static function notifyQcReworkResubmitted(
        WorkOrder $order,
        ?WorkOrderItem $item = null,
        ?WorkOrderReceivedPiece $piece = null,
        int $qty = 1,
        ?int $actorId = null
    ): array {
        $woNo = $order->work_order_number;
        $prod = $item?->product_name ?: $order->product_name ?: 'Jewelry Item';
        $pieceTag = $piece ? "Piece #{$piece->piece_number}" : "{$qty} pc(s)";

        return self::send([
            'type' => 'rework_resubmitted',
            'title' => "Rework Resubmitted for QC: {$woNo}",
            'message' => "Reworked {$pieceTag} of {$prod} ({$woNo}) has been resubmitted for Quality Check review.",
            'work_order_id' => $order->id,
            'piece_id' => $piece?->id,
            'entity_type' => 'qc_inspection',
            'entity_id' => $piece?->id ?: $order->id,
            'action_url' => "/job-order/qc?order_id={$order->id}",
            'roles' => ['Manager', 'Admin'],
            'permissions' => ['workorders.qc', 'workorders.approve'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "qc_resubmitted_{$order->id}_" . ($piece?->id ?? time()),
            'data' => [
                'work_order_number' => $woNo,
                'product_name' => $prod,
                'piece_id' => $piece?->id,
                'qty' => $qty,
            ],
        ]);
    }

    /* ------------------------------------------------------------------------
     * RECEIVE ORDER WORKFLOWS
     * ------------------------------------------------------------------------ */

    /**
     * When QC-approved pieces become Ready for receiving, notify receiving user.
     */
    public static function notifyReadyForReceiving(
        WorkOrder $order,
        ?WorkOrderItem $item = null,
        ?WorkOrderReceivedPiece $piece = null,
        int $qty = 1,
        ?int $actorId = null
    ): array {
        $woNo = $order->work_order_number;
        $prod = $item?->product_name ?: $order->product_name ?: 'Jewelry Item';

        return self::send([
            'type' => 'ready_for_receive',
            'title' => "Ready for Receiving: {$woNo}",
            'message' => "{$qty} pc(s) of {$prod} ({$woNo}) passed inspection and ready for counter receiving.",
            'work_order_id' => $order->id,
            'piece_id' => $piece?->id,
            'entity_type' => 'work_order',
            'entity_id' => $order->id,
            'action_url' => "/job-order/receive?order_id={$order->id}",
            'roles' => ['Staff', 'Manager'],
            'permissions' => ['workorders.receive'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "ready_receive_{$order->id}_{$qty}_" . ($piece?->id ?? 'batch'),
            'data' => [
                'work_order_number' => $woNo,
                'product_name' => $prod,
                'ready_qty' => $qty,
            ],
        ]);
    }

    /**
     * When pieces are received, notify appropriate Manager / Admin when further action is required.
     */
    public static function notifyPieceReceived(
        WorkOrder $order,
        WorkOrderReceivedPiece $piece,
        ?int $actorId = null
    ): array {
        $woNo = $order->work_order_number;
        $tag = $piece->barcode ?: "Piece #{$piece->piece_number}";
        $prod = $piece->product_name ?: $order->product_name ?: 'Jewelry Piece';

        return self::send([
            'type' => 'piece_received',
            'title' => "Piece Received: {$tag}",
            'message' => "{$prod} ({$tag}) received. Weight: {$piece->gross_weight}g. Proceeding to Certification & Hallmarking gates.",
            'work_order_id' => $order->id,
            'piece_id' => $piece->id,
            'entity_type' => 'work_order_piece',
            'entity_id' => $piece->id,
            'action_url' => "/job-order/receive?order_id={$order->id}&tab=history",
            'roles' => ['Manager', 'Admin'],
            'permissions' => ['workorders.view', 'workorders.update'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "piece_received_{$piece->id}",
            'data' => [
                'work_order_number' => $woNo,
                'piece_id' => $piece->id,
                'barcode' => $piece->barcode,
                'gross_weight' => $piece->gross_weight,
            ],
        ]);
    }

    /* ------------------------------------------------------------------------
     * CERTIFICATION & HALLMARKING WORKFLOWS
     * ------------------------------------------------------------------------ */

    /**
     * When a received piece requires certification, notify responsible user.
     */
    public static function notifyCertificationRequired(
        WorkOrder $order,
        ?WorkOrderReceivedPiece $piece = null,
        ?int $actorId = null
    ): array {
        $woNo = $order->work_order_number;
        $tag = $piece ? ($piece->barcode ?: "Piece #{$piece->piece_number}") : "Work Order {$woNo}";

        return self::send([
            'type' => 'certification_required',
            'title' => "Certification Required: {$tag}",
            'message' => "{$tag} ({$order->product_name}) requires diamond/gemstone certification inspection.",
            'work_order_id' => $order->id,
            'piece_id' => $piece?->id,
            'entity_type' => 'certification',
            'entity_id' => $piece?->id ?: $order->id,
            'action_url' => "/job-order/receive?order_id={$order->id}&tab=history",
            'roles' => ['Manager', 'Admin'],
            'permissions' => ['workorders.update', 'workorders.view'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "cert_req_{$order->id}_" . ($piece?->id ?? 'wo'),
            'data' => [
                'work_order_number' => $woNo,
                'piece_id' => $piece?->id,
            ],
        ]);
    }

    /**
     * When certification is completed, notify user responsible for Hallmarking or Next Stage.
     */
    public static function notifyCertificationCompleted(
        WorkOrder $order,
        ?WorkOrderReceivedPiece $piece = null,
        string $certNo = '',
        ?int $actorId = null
    ): array {
        $woNo = $order->work_order_number;
        $tag = $piece ? ($piece->barcode ?: "Piece #{$piece->piece_number}") : "Work Order {$woNo}";
        $certStr = $certNo ? " (Cert #{$certNo})" : '';

        return self::send([
            'type' => 'certification_completed',
            'title' => "Certification Complete: {$tag}",
            'message' => "Certification {$certStr} recorded for {$tag}. Ready for Hallmarking / Final Posting.",
            'work_order_id' => $order->id,
            'piece_id' => $piece?->id,
            'entity_type' => 'certification',
            'entity_id' => $piece?->id ?: $order->id,
            'action_url' => "/job-order/receive?order_id={$order->id}&tab=history",
            'roles' => ['Manager', 'Admin'],
            'permissions' => ['workorders.update', 'workorders.view'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "cert_done_{$order->id}_" . ($piece?->id ?? 'wo'),
            'data' => [
                'work_order_number' => $woNo,
                'certificate_number' => $certNo,
                'piece_id' => $piece?->id,
            ],
        ]);
    }

    /**
     * When a piece requires hallmarking (BIS HUID), notify responsible user.
     */
    public static function notifyHallmarkingRequired(
        WorkOrder $order,
        ?WorkOrderReceivedPiece $piece = null,
        ?int $actorId = null
    ): array {
        $woNo = $order->work_order_number;
        $tag = $piece ? ($piece->barcode ?: "Piece #{$piece->piece_number}") : "Work Order {$woNo}";

        return self::send([
            'type' => 'hallmarking_required',
            'title' => "Hallmarking Required: {$tag}",
            'message' => "{$tag} ({$order->product_name}) requires BIS Hallmarking / HUID verification.",
            'work_order_id' => $order->id,
            'piece_id' => $piece?->id,
            'entity_type' => 'hallmarking',
            'entity_id' => $piece?->id ?: $order->id,
            'action_url' => "/job-order/receive?order_id={$order->id}&tab=history",
            'roles' => ['Manager', 'Admin'],
            'permissions' => ['workorders.update', 'workorders.view'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "hallmark_req_{$order->id}_" . ($piece?->id ?? 'wo'),
            'data' => [
                'work_order_number' => $woNo,
                'piece_id' => $piece?->id,
            ],
        ]);
    }

    /**
     * When hallmarking is completed (HUID recorded), notify user responsible for Final Inventory Entry.
     */
    public static function notifyHallmarkingCompleted(
        WorkOrder $order,
        ?WorkOrderReceivedPiece $piece = null,
        string $huid = '',
        ?int $actorId = null
    ): array {
        $woNo = $order->work_order_number;
        $tag = $piece ? ($piece->barcode ?: "Piece #{$piece->piece_number}") : "Work Order {$woNo}";
        $huidStr = $huid ? " (HUID: {$huid})" : '';

        return self::send([
            'type' => 'hallmarking_completed',
            'title' => "Hallmarking Complete: {$tag}",
            'message' => "BIS Hallmarking{$huidStr} confirmed for {$tag}. Piece is now eligible for Final Inventory Posting.",
            'work_order_id' => $order->id,
            'piece_id' => $piece?->id,
            'entity_type' => 'hallmarking',
            'entity_id' => $piece?->id ?: $order->id,
            'action_url' => "/job-order/receive?order_id={$order->id}&tab=history",
            'roles' => ['Manager', 'Admin'],
            'permissions' => ['workorders.view', 'inventory.create'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "hallmark_done_{$order->id}_" . ($piece?->id ?? 'wo'),
            'data' => [
                'work_order_number' => $woNo,
                'huid' => $huid,
                'piece_id' => $piece?->id,
            ],
        ]);
    }

    /**
     * Notify when piece has cleared all downstream gates and is posted to finished inventory.
     */
    public static function notifyInventoryPosted(
        WorkOrder $order,
        ?WorkOrderReceivedPiece $piece = null,
        ?Product $product = null,
        ?int $actorId = null
    ): array {
        $woNo = $order->work_order_number;
        $tag = $piece ? ($piece->barcode ?: "Piece #{$piece->piece_number}") : "Work Order {$woNo}";
        $prodName = $product?->name ?: $order->product_name ?: 'Finished Jewelry Piece';

        return self::send([
            'type' => 'inventory_posted',
            'title' => "Inventory Posted: {$prodName}",
            'message' => "{$prodName} ({$tag}) has passed all gates and successfully added to live showroom inventory.",
            'work_order_id' => $order->id,
            'piece_id' => $piece?->id,
            'entity_type' => 'inventory',
            'entity_id' => $product?->id ?: ($piece?->id ?: $order->id),
            'action_url' => $product ? "/inventory/products/{$product->id}" : "/inventory",
            'roles' => ['Super Admin', 'Admin', 'Manager', 'Staff'],
            'permissions' => ['inventory.view'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "inv_posted_{$order->id}_" . ($piece?->id ?? 'wo'),
            'data' => [
                'work_order_number' => $woNo,
                'product_id' => $product?->id,
                'barcode' => $piece?->barcode,
            ],
        ]);
    }

    /* ------------------------------------------------------------------------
     * INVENTORY SHORTAGE & TRANSACTION NOTIFICATIONS
     * ------------------------------------------------------------------------ */

    /**
     * Notify authorized users when inventory shortage or negative vault balance needs review.
     */
    public static function notifyStockShortage(
        string $itemName,
        float $currentQty,
        float $minThreshold = 1.0,
        ?int $actorId = null
    ): array {
        return self::send([
            'type' => 'stock_shortage',
            'title' => "Inventory Alert: Low Stock for {$itemName}",
            'message' => "Stock level for '{$itemName}' is at {$currentQty} (minimum required: {$minThreshold}). Review and restock required.",
            'entity_type' => 'inventory',
            'action_url' => "/inventory",
            'roles' => ['Super Admin', 'Admin', 'Manager'],
            'permissions' => ['inventory.view', 'inventory.edit'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "shortage_{$itemName}_" . date('Y-m-d'),
            'data' => [
                'item_name' => $itemName,
                'current_qty' => $currentQty,
                'min_threshold' => $minThreshold,
            ],
        ]);
    }

    /* ------------------------------------------------------------------------
     * SALES & PURCHASE WORKFLOW NOTIFICATIONS
     * ------------------------------------------------------------------------ */

    /**
     * Notify when a sales order / invoice is created.
     */
    public static function notifySalesCreated(
        int $saleId,
        string $invoiceNo,
        string $clientName,
        float $grandTotal,
        ?int $actorId = null
    ): array {
        return self::send([
            'type' => 'sales_created',
            'title' => "New Sale Invoice: {$invoiceNo}",
            'message' => "Sale invoice {$invoiceNo} created for customer {$clientName}. Total: Rs. " . number_format($grandTotal, 2),
            'entity_type' => 'sales_invoice',
            'entity_id' => $saleId,
            'action_url' => "/sales/{$saleId}",
            'roles' => ['Super Admin', 'Admin', 'Manager'],
            'permissions' => ['billing.view', 'reports.view'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "sale_created_{$saleId}",
            'data' => [
                'sale_id' => $saleId,
                'invoice_no' => $invoiceNo,
                'client_name' => $clientName,
                'grand_total' => $grandTotal,
            ],
        ]);
    }

    /**
     * Notify when a purchase entry / order is created or received.
     */
    public static function notifyPurchaseCreated(
        int $purchaseId,
        string $billNo,
        string $supplierName,
        float $netAmount,
        ?int $actorId = null
    ): array {
        return self::send([
            'type' => 'purchase_created',
            'title' => "New Purchase Entry: {$billNo}",
            'message' => "Purchase bill {$billNo} recorded from supplier {$supplierName}. Net Amount: Rs. " . number_format($netAmount, 2),
            'entity_type' => 'purchase_entry',
            'entity_id' => $purchaseId,
            'action_url' => "/purchase/details",
            'roles' => ['Super Admin', 'Admin', 'Manager'],
            'permissions' => ['inventory.view', 'inventory.create'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "purchase_created_{$purchaseId}",
            'data' => [
                'purchase_id' => $purchaseId,
                'bill_no' => $billNo,
                'supplier_name' => $supplierName,
                'net_amount' => $netAmount,
            ],
        ]);
    }

    /**
     * Notify when purchase payment status changes or payment is recorded.
     */
    public static function notifyPurchasePaymentStatusChanged(
        int $purchaseId,
        string $billNo,
        string $supplierName,
        string $status,
        float $paidAmount,
        float $remainingBalance,
        ?int $actorId = null
    ): array {
        $statusLabel = ucfirst($status);
        $message = "Payment status for {$billNo} ({$supplierName}) updated to {$statusLabel}. Paid: Rs. " . number_format($paidAmount, 2) . ", Balance: Rs. " . number_format($remainingBalance, 2);
        if (strtolower($status) === 'paid' || strtolower($status) === 'fully paid') {
            $title = "Purchase Paid: {$billNo}";
            $message = "Purchase bill {$billNo} from {$supplierName} is now Fully Paid (Rs. " . number_format($paidAmount, 2) . ").";
        } elseif (strtolower($status) === 'partial') {
            $title = "Partial Payment Recorded: {$billNo}";
        } else {
            $title = "Payment Status Updated: {$billNo}";
        }

        return self::send([
            'type' => 'purchase_payment_update',
            'title' => $title,
            'message' => $message,
            'entity_type' => 'purchase_entry',
            'entity_id' => $purchaseId,
            'action_url' => "/purchase/details",
            'roles' => ['Super Admin', 'Admin', 'Manager'],
            'permissions' => ['inventory.view'],
            'exclude_user_id' => $actorId,
            'idempotency_key' => "purchase_pay_status_{$purchaseId}_" . strtolower($status) . "_" . round($paidAmount, 2),
            'data' => [
                'purchase_id' => $purchaseId,
                'bill_no' => $billNo,
                'supplier_name' => $supplierName,
                'status' => $status,
                'paid_amount' => $paidAmount,
                'remaining_balance' => $remainingBalance,
            ],
        ]);
    }

    /**
     * Notify due date reminder for credit purchase (7 days before, 2 days before, on due date).
     */
    public static function notifyPurchaseDueReminder(
        int $purchaseId,
        string $billNo,
        string $supplierName,
        float $remainingBalance,
        int $daysRemaining,
        string $dueDate
    ): array {
        if ($daysRemaining <= 0) {
            $title = "Payment Due TODAY: {$billNo}";
            $message = "Reminder: Payment of Rs. " . number_format($remainingBalance, 2) . " for purchase {$billNo} ({$supplierName}) is DUE TODAY ({$dueDate}).";
        } elseif ($daysRemaining <= 2) {
            $title = "Payment Due in {$daysRemaining} Days: {$billNo}";
            $message = "Upcoming Due: Payment of Rs. " . number_format($remainingBalance, 2) . " for purchase {$billNo} ({$supplierName}) is due in {$daysRemaining} days on {$dueDate}.";
        } else {
            $title = "Payment Due in 1 Week: {$billNo}";
            $message = "Upcoming Due Notice: Payment of Rs. " . number_format($remainingBalance, 2) . " for purchase {$billNo} ({$supplierName}) is due in {$daysRemaining} days on {$dueDate}.";
        }

        $todayStr = date('Y-m-d');
        return self::send([
            'type' => 'purchase_due_reminder',
            'title' => $title,
            'message' => $message,
            'entity_type' => 'purchase_entry',
            'entity_id' => $purchaseId,
            'action_url' => "/purchase/details",
            'roles' => ['Super Admin', 'Admin', 'Manager'],
            'permissions' => ['inventory.view'],
            'idempotency_key' => "purchase_due_{$purchaseId}_{$todayStr}_{$daysRemaining}d",
            'data' => [
                'purchase_id' => $purchaseId,
                'bill_no' => $billNo,
                'supplier_name' => $supplierName,
                'remaining_balance' => $remainingBalance,
                'days_remaining' => $daysRemaining,
                'due_date' => $dueDate,
            ],
        ]);
    }
}

