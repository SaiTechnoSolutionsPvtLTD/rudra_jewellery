<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Karigar;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $users = User::with('karigar')->orderBy('id', 'desc')->get();
        return response()->json($users);
    }

    private function processAvatarInput(Request $request, $rawAvatar, int $userId): ?string
    {
        // 1. Check for directly uploaded file under any avatar/photo key
        $fileKeys = ['avatar_file', 'avatar', 'image', 'photo', 'profile_photo'];
        foreach ($fileKeys as $key) {
            if ($request->hasFile($key)) {
                $file = $request->file($key);
                if ($file && $file->isValid()) {
                    \Illuminate\Support\Facades\Storage::disk('public')->makeDirectory('users/avatars');
                    $path = $file->store('users/avatars', 'public');

                    // Also copy directly to public/storage/users/avatars for server compatibility (when storage:link is not present)
                    try {
                        $publicStorageDir = public_path('storage/users/avatars');
                        if (!file_exists($publicStorageDir)) {
                            @mkdir($publicStorageDir, 0755, true);
                        }
                        $sourcePath = storage_path('app/public/' . $path);
                        $targetPath = public_path('storage/' . $path);
                        if (file_exists($sourcePath)) {
                            @copy($sourcePath, $targetPath);
                        }
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::warning('Failed copying avatar to public storage: ' . $e->getMessage());
                    }

                    return '/storage/' . $path;
                }
            }
        }

        // 2. Fallback to string input from passed argument or request fields
        if (empty($rawAvatar)) {
            $rawAvatar = $request->input('avatar')
                      ?? $request->input('avatar_url')
                      ?? $request->input('photo')
                      ?? $request->input('image');
        }

        if (empty($rawAvatar) || $rawAvatar === 'null' || $rawAvatar === 'undefined') {
            return null;
        }

        $rawAvatar = trim((string)$rawAvatar);

        // 3. Handle base64 data URI (case-insensitive, all image formats, mime attributes)
        if (stripos($rawAvatar, 'data:image') === 0) {
            try {
                // Match type and base64 data accurately
                if (preg_match('/^data:image\/([a-zA-Z0-9\+\-\.]+)(?:;[a-zA-Z0-9\=\-]+)*;base64,(.*)$/is', $rawAvatar, $matches)) {
                    $rawType = strtolower($matches[1]);
                    $base64Data = $matches[2];
                } else {
                    $commaPos = strpos($rawAvatar, ',');
                    $header = substr($rawAvatar, 0, $commaPos);
                    $base64Data = substr($rawAvatar, $commaPos + 1);
                    preg_match('/data:image\/([a-zA-Z0-9\+\-\.]+)/i', $header, $typeMatch);
                    $rawType = strtolower($typeMatch[1] ?? 'png');
                }

                $extMap = [
                    'jpeg' => 'jpg',
                    'jpg' => 'jpg',
                    'png' => 'png',
                    'webp' => 'webp',
                    'gif' => 'gif',
                    'svg+xml' => 'svg',
                    'svg' => 'svg',
                    'avif' => 'avif',
                ];
                $ext = $extMap[$rawType] ?? 'png';

                // Fix potential space encoding in base64 data
                $base64Data = str_replace(' ', '+', trim($base64Data));
                $decoded = base64_decode($base64Data);

                if ($decoded !== false && strlen($decoded) > 0) {
                    \Illuminate\Support\Facades\Storage::disk('public')->makeDirectory('users/avatars');
                    $fileName = 'users/avatars/avatar_' . $userId . '_' . time() . '.' . $ext;
                    \Illuminate\Support\Facades\Storage::disk('public')->put($fileName, $decoded);

                    try {
                        $publicStorageDir = public_path('storage/users/avatars');
                        if (!file_exists($publicStorageDir)) {
                            @mkdir($publicStorageDir, 0755, true);
                        }
                        @file_put_contents(public_path('storage/' . $fileName), $decoded);
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::warning('Failed saving avatar to public storage: ' . $e->getMessage());
                    }

                    return '/storage/' . $fileName;
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Avatar base64 processing error: ' . $e->getMessage());
            }
        }

        // 4. If it's already a saved relative path or URL
        if (str_starts_with($rawAvatar, '/storage/') || str_starts_with($rawAvatar, 'storage/')) {
            return str_starts_with($rawAvatar, '/') ? $rawAvatar : '/' . $rawAvatar;
        }

        return $rawAvatar;
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'mobile_number' => 'nullable|string|max:20',
            'role' => 'required|string',
            'status' => 'nullable|in:active,inactive',
            'password' => 'required|string|min:6',
            'avatar' => 'nullable',
            'avatar_url' => 'nullable',
            'avatar_file' => 'nullable',
            'karigar_id' => 'nullable|integer',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'mobile_number' => $validated['mobile_number'] ?? null,
            'role' => $validated['role'],
            'status' => $validated['status'] ?? 'active',
            'password' => Hash::make($validated['password']),
        ]);

        $rawInput = $request->input('avatar') ?? $request->input('avatar_url') ?? $request->input('photo');
        $user->avatar = $this->processAvatarInput($request, $rawInput, $user->id);
        $user->save();

        if (!empty($validated['karigar_id'])) {
            $karigar = Karigar::find($validated['karigar_id']);
            if ($karigar) {
                $karigar->user_id = $user->id;
                if ($user->avatar) {
                    $karigar->avatar_url = $user->avatar;
                }
                $karigar->save();
            }
        } elseif (strtolower($user->role) === 'karigar') {
            $nextId = (Karigar::max('id') ?? 0) + 1;
            $code = 'K-' . sprintf('%04d', $nextId);
            Karigar::create([
                'user_id' => $user->id,
                'karigar_code' => $code,
                'name' => $user->name,
                'primary_phone' => $user->mobile_number ?? '+91 98765 00000',
                'email' => $user->email,
                'specialization' => 'Plain Gold & Jewellery',
                'experience_years' => 1,
                'status' => $user->status ?? 'active',
                'avatar_url' => $user->avatar ?? null,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'User created successfully',
            'user' => $user->fresh()->load('karigar')
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $user = User::with('karigar')->find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }
        return response()->json($user);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $id,
            'mobile_number' => 'nullable|string|max:20',
            'role' => 'required|string',
            'status' => 'nullable|in:active,inactive',
            'password' => 'nullable|string|min:6',
            'avatar' => 'nullable',
            'avatar_url' => 'nullable',
            'avatar_file' => 'nullable',
            'karigar_id' => 'nullable|integer',
        ]);

        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'mobile_number' => $validated['mobile_number'] ?? null,
            'role' => $validated['role'],
            'status' => $validated['status'] ?? $user->status ?? 'active',
        ];

        $hasAvatar = $request->hasFile('avatar') 
            || $request->hasFile('avatar_file') 
            || $request->hasFile('image')
            || $request->hasFile('photo')
            || $request->has('avatar') 
            || $request->has('avatar_url') 
            || $request->has('photo');

        if ($hasAvatar) {
            $rawInput = $request->input('avatar') ?? $request->input('avatar_url') ?? $request->input('photo');
            $updateData['avatar'] = $this->processAvatarInput($request, $rawInput, $user->id);
        }

        if (!empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        // Keep Karigar directory name and avatar in sync with User account
        $karigarSync = ['name' => $user->name];
        if (array_key_exists('avatar', $updateData)) {
            $karigarSync['avatar_url'] = $updateData['avatar'];
        }
        \App\Models\Karigar::where('user_id', $user->id)->update($karigarSync);

        if (isset($validated['karigar_id'])) {
            if ($validated['karigar_id']) {
                $karigar = Karigar::find($validated['karigar_id']);
                if ($karigar) {
                    $karigar->user_id = $user->id;
                    if ($user->avatar) {
                        $karigar->avatar_url = $user->avatar;
                    }
                    $karigar->save();
                }
            } else {
                Karigar::where('user_id', $user->id)->update(['user_id' => null]);
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'User updated successfully',
            'user' => $user->fresh()->load('karigar')
        ]);
    }

    public function uploadAvatar(Request $request, $id = null)
    {
        $userId = $id ? (int)$id : (auth()->id() ?? 0);
        $rawInput = $request->input('avatar') ?? $request->input('avatar_url') ?? $request->input('photo');
        $avatarPath = $this->processAvatarInput($request, $rawInput, $userId);

        if ($id) {
            $user = User::find($id);
            if ($user) {
                $user->avatar = $avatarPath;
                $user->save();
                \App\Models\Karigar::where('user_id', $user->id)->update(['avatar_url' => $avatarPath]);
                return response()->json([
                    'status' => 'success',
                    'message' => 'Avatar stored and saved successfully',
                    'avatar' => $avatarPath,
                    'user' => $user->fresh()->load('karigar')
                ]);
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Avatar stored successfully',
            'avatar' => $avatarPath,
            'avatar_url' => $avatarPath
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $user = User::findOrFail($id);
        
        // Prevent deleting Super Admin User ID 1 (Arvind)
        if ($user->id === 1 || $user->email === 'admin@rudrajewellers.com') {
            return response()->json([
                'status' => 'error',
                'message' => 'Super Administrator account cannot be deleted.'
            ], 422);
        }

        // Unlink Karigar
        Karigar::where('user_id', $user->id)->update(['user_id' => null]);
        
        $user->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'User deleted successfully'
        ]);
    }
}

