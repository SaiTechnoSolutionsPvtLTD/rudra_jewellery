<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkOrderNotification;
use App\Models\Karigar;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * Get recent notifications filtered strictly by logged-in user role
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = WorkOrderNotification::with('workOrder:id,work_order_number,product_name,status,current_stage,karigar_name')
            ->latest('id');

        if ($user && $user->isKarigar()) {
            $karigarId = $user->karigar?->id ?? Karigar::where('email', $user->email)->orWhere('name', $user->name)->value('id');
            if ($karigarId) {
                // Karigars ONLY receive notifications intended for Karigars ('assigned', 'returned', 'rework', 'approved', 'material_issued') matching their assigned karigar_id
                $karigarTypes = ['assigned', 'returned', 'rework', 'approved', 'material_issued'];
                $query->where('karigar_id', $karigarId)
                      ->where(function ($q) use ($karigarTypes) {
                          $q->whereIn('type', $karigarTypes)
                            ->orWhere('data->target_role', 'karigar');
                      });
            } else {
                $query->whereRaw('1 = 0');
            }
        } else {
            // Admins / Receptionists / Managers receive notifications from Karigars & workshop updates ('submitted', 'rework_resubmitted', 'progress_update', 'timeline_update', 'delay', 'hold', 'system')
            $adminTypes = ['submitted', 'rework_resubmitted', 'progress_update', 'timeline_update', 'delay', 'hold', 'system'];
            $query->where(function ($q) use ($adminTypes) {
                $q->whereIn('type', $adminTypes)
                  ->orWhere('data->target_role', 'admin')
                  ->orWhereNull('karigar_id');
            });
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
     * Mark all role-relevant notifications as read
     */
    public function markAllAsRead(Request $request)
    {
        $user = Auth::user();
        $query = WorkOrderNotification::where('is_read', false);

        if ($user && $user->isKarigar()) {
            $karigarId = $user->karigar?->id ?? Karigar::where('email', $user->email)->orWhere('name', $user->name)->value('id');
            if ($karigarId) {
                $karigarTypes = ['assigned', 'returned', 'rework', 'approved', 'material_issued'];
                $query->where('karigar_id', $karigarId)
                      ->where(function ($q) use ($karigarTypes) {
                          $q->whereIn('type', $karigarTypes)
                            ->orWhere('data->target_role', 'karigar');
                      });
            } else {
                $query->whereRaw('1 = 0');
            }
        } else {
            $adminTypes = ['submitted', 'rework_resubmitted', 'progress_update', 'timeline_update', 'delay', 'hold', 'system'];
            $query->where(function ($q) use ($adminTypes) {
                $q->whereIn('type', $adminTypes)
                  ->orWhere('data->target_role', 'admin')
                  ->orWhereNull('karigar_id');
            });
        }

        $query->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'All role notifications marked as read',
        ]);
    }
}
