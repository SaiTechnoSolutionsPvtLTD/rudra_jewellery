<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderNotification;
use App\Models\WorkOrderReceivedPiece;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_retrieves_only_their_notifications_and_unread_count(): void
    {
        $manager = User::factory()->create([
            'role' => 'Manager',
            'status' => 'active',
        ]);
        $staff = User::factory()->create([
            'role' => 'Staff',
            'status' => 'active',
        ]);

        // Create 2 notifications for manager (1 unread, 1 read)
        WorkOrderNotification::create([
            'user_id' => $manager->id,
            'title' => 'Manager WO Alert',
            'message' => 'New WO assigned to supervisor',
            'type' => 'work_order_created',
            'is_read' => false,
            'action_url' => '/job-orders',
        ]);

        WorkOrderNotification::create([
            'user_id' => $manager->id,
            'title' => 'Manager QC Alert',
            'message' => 'Piece passed QC',
            'type' => 'qc_passed',
            'is_read' => true,
            'action_url' => '/receiver-work',
        ]);

        // Create 1 notification for staff
        WorkOrderNotification::create([
            'user_id' => $staff->id,
            'title' => 'Staff Alert',
            'message' => 'Staff duty reminder',
            'type' => 'staff_notice',
            'is_read' => false,
            'action_url' => '/inventory',
        ]);

        // Authenticate as Manager
        Sanctum::actingAs($manager);

        // Check unread-count
        $countResponse = $this->getJson('/api/notifications/unread-count');
        $countResponse->assertOk()
            ->assertJsonPath('unread_count', 1);

        // Check index
        $indexResponse = $this->getJson('/api/notifications');
        $indexResponse->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('unread_count', 1);

        // Ensure Manager does NOT see Staff alert
        $titles = collect($indexResponse->json('data'))->pluck('title')->all();
        $this->assertContains('Manager WO Alert', $titles);
        $this->assertContains('Manager QC Alert', $titles);
        $this->assertNotContains('Staff Alert', $titles);
    }

    public function test_mark_as_read_and_mark_all_as_read_are_isolated_to_authenticated_user(): void
    {
        $user1 = User::factory()->create(['role' => 'Manager', 'status' => 'active']);
        $user2 = User::factory()->create(['role' => 'Admin', 'status' => 'active']);

        $n1 = WorkOrderNotification::create([
            'user_id' => $user1->id,
            'title' => 'User1 Notif 1',
            'message' => 'Msg',
            'type' => 'info',
            'is_read' => false,
        ]);
        $n2 = WorkOrderNotification::create([
            'user_id' => $user1->id,
            'title' => 'User1 Notif 2',
            'message' => 'Msg',
            'type' => 'info',
            'is_read' => false,
        ]);
        $n3 = WorkOrderNotification::create([
            'user_id' => $user2->id,
            'title' => 'User2 Notif',
            'message' => 'Msg',
            'type' => 'info',
            'is_read' => false,
        ]);

        Sanctum::actingAs($user1);

        // Mark individual notification as read via PATCH
        $markOne = $this->patchJson("/api/notifications/{$n1->id}/read");
        $markOne->assertOk()->assertJsonPath('data.is_read', true);

        $this->assertTrue($n1->fresh()->is_read);
        $this->assertFalse($n2->fresh()->is_read);
        $this->assertFalse($n3->fresh()->is_read);

        // Attempting to mark user2's notification as user1 must fail with 404 (not found in user scope)
        $unauthorizedMark = $this->patchJson("/api/notifications/{$n3->id}/read");
        $unauthorizedMark->assertNotFound();

        // Mark all as read for user1
        $markAll = $this->postJson('/api/notifications/mark-all-read');
        $markAll->assertOk()->assertJsonPath('status', 'success');

        $this->assertTrue($n1->fresh()->is_read);
        $this->assertTrue($n2->fresh()->is_read);
        // CRITICAL CHECK: User2's unread notification must NOT be affected!
        $this->assertFalse($n3->fresh()->is_read);
    }

    public function test_idempotency_prevents_duplicate_notifications(): void
    {
        $manager = User::factory()->create(['role' => 'Manager', 'status' => 'active']);

        $service = app(NotificationService::class);

        // Send first notification with an idempotency key
        $createdFirst = $service->sendToUsers(
            [$manager->id],
            [
                'title' => 'Idempotent Alert',
                'message' => 'Only send once',
                'type' => 'wo_alert',
                'idempotency_key' => 'unique_event_test_key_101',
            ]
        );
        $this->assertCount(1, $createdFirst);
        $this->assertDatabaseCount('work_order_notifications', 1);

        // Attempt second notification with identical idempotency key
        $createdSecond = $service->sendToUsers(
            [$manager->id],
            [
                'title' => 'Duplicate Alert',
                'message' => 'Should be skipped',
                'type' => 'wo_alert',
                'idempotency_key' => 'unique_event_test_key_101',
            ]
        );
        $this->assertCount(0, $createdSecond);
        $this->assertDatabaseCount('work_order_notifications', 1);
    }

    public function test_qc_action_creates_piece_level_notification_with_targeted_navigation(): void
    {
        $admin = User::factory()->create(['role' => 'Super Admin', 'status' => 'active']);
        $qcInspector = User::factory()->create(['role' => 'Manager', 'status' => 'active']);

        $order = WorkOrder::create([
            'work_order_number' => 'WO-NOTIF-TEST-001',
            'product_name' => 'Royal Necklace',
            'status' => 'in_progress',
            'karigar_name' => 'Mohan Craftsman',
            'allotted_date' => now()->toDateString(),
        ]);

        $piece = WorkOrderReceivedPiece::create([
            'work_order_id' => $order->id,
            'tag_number' => 'TAG-TEST-001',
            'piece_number' => 1,
            'design_no' => 'DSN-001',
            'status' => 'qc_pending',
            'gross_weight' => 24.5,
        ]);

        $service = app(NotificationService::class);
        $service->notifyQcPassed($order, piece: $piece, actorId: $qcInspector->id);

        // Recipient should be Admin or Manager (excluding actor $qcInspector)
        $this->assertDatabaseHas('work_order_notifications', [
            'user_id' => $admin->id,
            'type' => 'qc_passed',
            'work_order_id' => $order->id,
            'piece_id' => $piece->id,
            'action_url' => "/job-order/receive?order_id={$order->id}",
        ]);

        // Verify recipient can fetch it via API
        Sanctum::actingAs($admin);
        $res = $this->getJson('/api/notifications');
        $res->assertOk();
        $this->assertSame($order->id, $res->json('data.0.work_order_id'));
        $this->assertSame($piece->id, $res->json('data.0.piece_id'));
    }

    public function test_qc_rework_and_resubmit_workflows_generate_targeted_notifications(): void
    {
        $admin = User::factory()->create(['role' => 'Super Admin', 'status' => 'active']);
        $qcUser = User::factory()->create(['role' => 'Manager', 'status' => 'active']);

        $order = WorkOrder::create([
            'work_order_number' => 'WO-NOTIF-REWORK-001',
            'product_name' => 'Kada Bracelet',
            'status' => 'in_progress',
            'allotted_date' => now()->toDateString(),
        ]);

        $piece = WorkOrderReceivedPiece::create([
            'work_order_id' => $order->id,
            'tag_number' => 'TAG-REWORK-001',
            'piece_number' => 1,
            'design_no' => 'DSN-KADA',
            'status' => 'qc_rejected',
            'gross_weight' => 18.2,
        ]);

        $service = app(NotificationService::class);

        // 1. Piece returned for rework
        $service->notifyQcReworkReturned($order, piece: $piece, reason: 'Stone loose', actorId: $qcUser->id);
        $this->assertDatabaseHas('work_order_notifications', [
            'type' => 'returned',
            'work_order_id' => $order->id,
            'piece_id' => $piece->id,
        ]);

        // 2. Reworked piece resubmitted for QC
        $service->notifyQcReworkResubmitted($order, piece: $piece, actorId: $admin->id);
        $this->assertDatabaseHas('work_order_notifications', [
            'type' => 'rework_resubmitted',
            'work_order_id' => $order->id,
            'piece_id' => $piece->id,
        ]);
    }

    public function test_sales_and_purchase_and_inventory_notifications(): void
    {
        $admin = User::factory()->create(['role' => 'Super Admin', 'status' => 'active']);
        $manager = User::factory()->create(['role' => 'Manager', 'status' => 'active']);
        $service = app(NotificationService::class);

        // Sales notification created by admin -> delivered to manager
        $service->notifySalesCreated(101, 'INV-2026-999', 'Gold Customer', 55000.0, actorId: $admin->id);
        $this->assertDatabaseHas('work_order_notifications', [
            'user_id' => $manager->id,
            'type' => 'sales_created',
            'entity_type' => 'sales_invoice',
            'entity_id' => 101,
        ]);

        // Purchase notification created by admin -> delivered to manager
        $service->notifyPurchaseCreated(202, 'PUR-2026-888', 'Bullion Mart Ltd', 250000.0, actorId: $admin->id);
        $this->assertDatabaseHas('work_order_notifications', [
            'user_id' => $manager->id,
            'type' => 'purchase_created',
            'entity_type' => 'purchase_entry',
            'entity_id' => 202,
        ]);

        // Stock shortage alert
        $service->notifyStockShortage('22K Raw Gold', 0.0, 50.0);
        $this->assertDatabaseHas('work_order_notifications', [
            'type' => 'stock_shortage',
            'entity_type' => 'inventory',
        ]);
    }

    public function test_notification_pagination_and_deletion(): void
    {
        $admin = User::factory()->create(['role' => 'Super Admin', 'status' => 'active']);
        Sanctum::actingAs($admin);

        for ($i = 1; $i <= 15; $i++) {
            WorkOrderNotification::create([
                'user_id' => $admin->id,
                'title' => "Alert #{$i}",
                'message' => "Message for alert #{$i}",
                'type' => 'system_alert',
                'is_read' => false,
            ]);
        }

        // Test paginated request with per_page = 5
        $paginatedRes = $this->getJson('/api/notifications?paginate=1&per_page=5&page=1');
        $paginatedRes->assertOk()
            ->assertJsonPath('pagination.current_page', 1)
            ->assertJsonPath('pagination.per_page', 5)
            ->assertJsonPath('pagination.total', 15)
            ->assertJsonCount(5, 'data');

        // Test delete single notification
        $firstId = $paginatedRes->json('data.0.id');
        $deleteRes = $this->deleteJson("/api/notifications/{$firstId}");
        $deleteRes->assertOk();

        $this->assertDatabaseMissing('work_order_notifications', ['id' => $firstId]);
    }
}
