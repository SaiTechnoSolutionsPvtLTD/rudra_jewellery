<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'mobile_number',
        'role',
        'status',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function karigar()
    {
        return $this->hasOne(Karigar::class);
    }

    public function isSuperAdmin(): bool
    {
        return in_array(strtolower(str_replace(' ', '_', $this->role)), ['super_admin', 'superadministrator']);
    }

    public function isKarigar(): bool
    {
        return strtolower(str_replace(' ', '_', $this->role)) === 'karigar' || !is_null($this->karigar);
    }

    public function getPermissionsAttribute(): array
    {
        if ($this->isSuperAdmin()) {
            $roleModel = Role::where('role_key', 'super_admin')->first();
            if ($roleModel && is_array($roleModel->permissions)) {
                return array_values($roleModel->permissions);
            }
            return ['*'];
        }

        $roleSlug = strtolower(str_replace(' ', '_', $this->role));
        $roleModel = Role::where('role_key', $roleSlug)->orWhere('display_name', $this->role)->first();
        if ($roleModel && is_array($roleModel->permissions)) {
            return array_values($roleModel->permissions);
        }

        return ['dashboard.view'];
    }

    public function hasPermission(string $permissionKey): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        $permissions = $this->permissions;
        return in_array('*', $permissions) || in_array($permissionKey, $permissions);
    }
}
