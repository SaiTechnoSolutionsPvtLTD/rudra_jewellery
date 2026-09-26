<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    /**
     * User Login API
     * Accepts 'email' or 'login' (email/mobile_number) along with 'password'
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'nullable|string',
            'login' => 'nullable|string',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $loginInput = $request->input('login') ?? $request->input('email');

        if (empty($loginInput)) {
            return response()->json([
                'status' => false,
                'message' => 'Email or login identifier is required',
            ], 422);
        }

        // Search user by email or mobile_number
        $user = User::where('email', $loginInput)
            ->orWhere('mobile_number', $loginInput)
            ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'status' => false,
                'message' => 'Invalid credentials',
            ], 401);
        }

        if (($user->status ?? 'active') === 'inactive') {
            return response()->json([
                'status' => false,
                'message' => 'Your account is inactive. Please contact the system administrator.',
            ], 403);
        }

        // Create Sanctum Token
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status' => true,
            'message' => 'Login successful',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->formatUserData($user)
        ], 200);
    }

    /**
     * Logout API (Revoke Current Token)
     */
    public function logout(Request $request)
    {
        if ($request->user() && $request->user()->currentAccessToken()) {
            $request->user()->currentAccessToken()->delete();
        }

        return response()->json([
            'status' => true,
            'message' => 'Logged out successfully'
        ], 200);
    }

    /**
     * Get Authenticated User Profile
     */
    public function me(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['status' => false, 'message' => 'Unauthenticated'], 401);
        }

        if (($user->status ?? 'active') === 'inactive') {
            return response()->json(['status' => false, 'message' => 'Account inactive'], 403);
        }

        return response()->json([
            'status' => true,
            'user' => $this->formatUserData($user)
        ], 200);
    }

    private function formatUserData(User $user): array
    {
        $user->loadMissing('karigar');
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'mobile_number' => $user->mobile_number,
            'role' => $user->role,
            'status' => $user->status ?? 'active',
            'permissions' => $user->permissions,
            'karigar' => $user->karigar ? [
                'id' => $user->karigar->id,
                'karigar_code' => $user->karigar->karigar_code,
                'name' => $user->karigar->name,
                'specialization' => $user->karigar->specialization,
            ] : null,
        ];
    }
}
