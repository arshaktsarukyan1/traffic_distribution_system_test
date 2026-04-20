<?php

namespace App\Services\Auth;

use App\Models\PersonalAccessToken;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthService
{
    /**
     * @param  array{name: string, email: string, password: string}  $payload
     * @return array{user: User, token: string, expires_at: string}
     */
    public function register(array $payload): array
    {
        $user = User::query()->create([
            'name' => $payload['name'],
            'email' => $payload['email'],
            'password' => $payload['password'],
        ]);

        $token = $this->issueToken($user, 'registration');

        return [
            'user' => $user,
            'token' => $token['plain_text_token'],
            'expires_at' => $token['expires_at'],
        ];
    }

    /**
     * @param  array{email: string, password: string}  $payload
     * @return array{user: User, token: string, expires_at: string}|null
     */
    public function attemptLogin(array $payload): ?array
    {
        $user = User::query()->where('email', $payload['email'])->first();
        if ($user === null || ! Hash::check($payload['password'], $user->password)) {
            return null;
        }

        $token = $this->issueToken($user, 'login');

        return [
            'user' => $user,
            'token' => $token['plain_text_token'],
            'expires_at' => $token['expires_at'],
        ];
    }

    public function logoutByTokenId(int $tokenId): void
    {
        if ($tokenId <= 0) {
            return;
        }

        PersonalAccessToken::query()->whereKey($tokenId)->delete();
    }

    /**
     * @return array{id: int, name: string, email: string, created_at: ?string, updated_at: ?string}
     */
    public function serializeUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'created_at' => $user->created_at?->toIso8601String(),
            'updated_at' => $user->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @return array{plain_text_token: string, expires_at: string}
     */
    private function issueToken(User $user, string $tokenName): array
    {
        $plainTextToken = Str::random(80);
        $expiresAt = now()->addMinutes((int) config('tds.auth_token_ttl_minutes', 1440));

        PersonalAccessToken::query()->create([
            'user_id' => $user->id,
            'name' => $tokenName,
            'token_hash' => hash('sha256', $plainTextToken),
            'expires_at' => $expiresAt,
        ]);

        return [
            'plain_text_token' => $plainTextToken,
            'expires_at' => $expiresAt->toIso8601String(),
        ];
    }
}
