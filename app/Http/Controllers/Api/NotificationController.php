<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkOrderNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * Get recent notifications and unread count
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = WorkOrderNotification::with('workOrder:id,work_order_number,product_name,status,current_stage,karigar_name')
            ->latest('id');

        // If user is a Karigar, optionally filter by their karigar_id or general notifications
        if ($user && ($user->role === 'Karigar' || $user->role === 'Master Karigar' || $user->karigar)) {
            $karigarId = $user->karigar?->id;
            if ($karigarId) {
                $query->where(function ($q) use ($karigarId) {
                    $q->where('karigar_id', $karigarId)
                      ->orWhereNull('karigar_id');
                });
            }
        }

        $unreadCount = (clone $query)->where('is_read', false)->count();
        $notifications = $query->limit(20)->get();

        return response()->json([
            'status' => 'success',
            'unread_count' => $unreadCount,
            'data' => $notifications,
        ]);
    }

    /**
     * Mark a specific notification as read
     */
    public function markAsRead(Request $request, $id)
    {
        $notification = WorkOrderNotification::findOrFail($id);
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
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request)
    {
        WorkOrderNotification::where('is_read', false)->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'All notifications marked as read',
        ]);
    }
}
