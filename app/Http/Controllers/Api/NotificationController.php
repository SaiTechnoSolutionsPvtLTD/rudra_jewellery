<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkOrderNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * Get notifications filtered strictly for the authenticated user.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 401);
        }

        $query = WorkOrderNotification::with([
            'workOrder:id,work_order_number,product_name,status,current_stage,karigar_name',
            'piece:id,work_order_id,piece_number,tag_number,receive_order_number,design_no,gross_weight,is_inventory_posted',
        ])->latest('id');

        // User scoping: Each user sees their own notifications.
        // If Super Admin or Admin, also include legacy notifications where user_id was null.
        if ($user->isSuperAdmin() || in_array(strtolower(str_replace(' ', '_', $user->role ?? '')), ['super_admin', 'admin'])) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhereNull('user_id');
            });
        } else {
            $query->where('user_id', $user->id);
        }

        // Filter by read/unread
        $filter = $request->query('filter', 'all');
        if ($filter === 'unread') {
            $query->where('is_read', false);
        } elseif ($filter === 'read') {
            $query->where('is_read', true);
        }

        // Filter by type
        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }

        // Filter by category
        if ($request->filled('category') && $request->query('category') !== 'all') {
            $cat = $request->query('category');
            if ($cat === 'qc') {
                $query->whereIn('type', ['qc_submitted', 'submitted', 'qc_passed', 'approved', 'returned', 'rework_resubmitted']);
            } elseif ($cat === 'work_order') {
                $query->whereIn('type', ['work_order_created', 'work_order_updated', 'assigned', 'progress_update', 'delay', 'completed', 'job_added']);
            } elseif ($cat === 'receive') {
                $query->whereIn('type', ['ready_for_receive', 'piece_received', 'certification_completed', 'hallmarking_completed', 'inventory_posted']);
            } elseif ($cat === 'sales_purchase') {
                $query->whereIn('type', ['sales_created', 'purchase_created', 'stock_shortage']);
            }
        }

        // Search in title, message, or linked work order number
        if ($request->filled('search')) {
            $search = trim($request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('message', 'like', "%{$search}%")
                  ->orWhereHas('workOrder', function ($wq) use ($search) {
                      $wq->where('work_order_number', 'like', "%{$search}%");
                  });
            });
        }

        // Compute unread count for current user
        $unreadCountQuery = WorkOrderNotification::where('is_read', false);
        if ($user->isSuperAdmin() || in_array(strtolower(str_replace(' ', '_', $user->role ?? '')), ['super_admin', 'admin'])) {
            $unreadCountQuery->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhereNull('user_id');
            });
        } else {
            $unreadCountQuery->where('user_id', $user->id);
        }
        $unreadCount = $unreadCountQuery->count();

        // Pagination or feed limit
        if ($request->boolean('paginate')) {
            $perPage = min(100, max(5, (int) $request->query('per_page', 20)));
            $page = max(1, (int) $request->query('page', 1));
            $paginated = $query->paginate($perPage, ['*'], 'page', $page);

            return response()->json([
                'status' => 'success',
                'unread_count' => $unreadCount,
                'data' => $paginated->items(),
                'pagination' => [
                    'current_page' => $paginated->currentPage(),
                    'last_page' => $paginated->lastPage(),
                    'per_page' => $paginated->perPage(),
                    'total' => $paginated->total(),
                ],
            ]);
        }

        $limit = min(50, max(1, (int) $request->query('limit', 20)));
        $notifications = $query->limit($limit)->get();

        return response()->json([
            'status' => 'success',
            'unread_count' => $unreadCount,
            'data' => $notifications,
        ]);
    }

    /**
     * Fast lightweight endpoint for polling unread count.
     */
    public function unreadCount(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['status' => 'error', 'unread_count' => 0], 401);
        }

        $query = WorkOrderNotification::where('is_read', false);
        if ($user->isSuperAdmin() || in_array(strtolower(str_replace(' ', '_', $user->role ?? '')), ['super_admin', 'admin'])) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhereNull('user_id');
            });
        } else {
            $query->where('user_id', $user->id);
        }

        $cnt = $query->count();
        return response()->json([
            'status' => 'success',
            'unread_count' => $cnt,
            'data' => [
                'unread_count' => $cnt,
            ],
        ]);
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(Request $request, $id)
    {
        $user = Auth::user();
        $query = WorkOrderNotification::where('id', $id);

        // Security check: Must belong to user (or super admin / null legacy)
        if (!($user->isSuperAdmin() || in_array(strtolower(str_replace(' ', '_', $user->role ?? '')), ['super_admin', 'admin']))) {
            $query->where('user_id', $user->id);
        }

        $notification = $query->firstOrFail();
        $notification->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Notification marked as read',
            'data' => $notification,
        ]);
    }

    /**
     * Mark all of the authenticated user's notifications as read.
     */
    public function markAllAsRead(Request $request)
    {
        $user = Auth::user();
        $query = WorkOrderNotification::where('is_read', false);

        if ($user->isSuperAdmin() || in_array(strtolower(str_replace(' ', '_', $user->role ?? '')), ['super_admin', 'admin'])) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhereNull('user_id');
            });
        } else {
            $query->where('user_id', $user->id);
        }

        $count = $query->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Marked {$count} notifications as read",
            'updated_count' => $count,
        ]);
    }

    /**
     * Delete or dismiss a notification for the authenticated user.
     */
    public function destroy(Request $request, $id)
    {
        $user = Auth::user();
        $query = WorkOrderNotification::where('id', $id);

        if (!($user->isSuperAdmin() || in_array(strtolower(str_replace(' ', '_', $user->role ?? '')), ['super_admin', 'admin']))) {
            $query->where('user_id', $user->id);
        }

        $notification = $query->firstOrFail();
        $notification->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Notification dismissed',
        ]);
    }
}
