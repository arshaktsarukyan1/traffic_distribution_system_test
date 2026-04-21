<?php

namespace Tests\Feature;

use App\Models\PersonalAccessToken;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withServerVariables([
            'REMOTE_ADDR' => '127.0.0.1',
        ]);

        RateLimiter::clear('john@example.com|127.0.0.1');
        RateLimiter::clear('jane@example.com|127.0.0.1');
        RateLimiter::clear('mia@example.com|127.0.0.1');
        RateLimiter::clear('127.0.0.1');
        RateLimiter::clear('john@example.com|::1');
        RateLimiter::clear('jane@example.com|::1');
        RateLimiter::clear('mia@example.com|::1');
        RateLimiter::clear('::1');
    }

    public function test_register_returns_user_and_bearer_token(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'password' => 'super-secret-password',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.user.email', 'jane@example.com')
            ->assertJsonPath('data.token_type', 'Bearer');

        $this->assertDatabaseHas('users', [
            'email' => 'jane@example.com',
        ]);
    }

    public function test_login_issues_new_token_for_existing_user(): void
    {
        User::query()->create([
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'super-secret-password',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'john@example.com',
            'password' => 'super-secret-password',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.user.email', 'john@example.com')
            ->assertJsonPath('data.token_type', 'Bearer');
    }

    public function test_login_rejects_invalid_credentials(): void
    {
        User::query()->create([
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'correct-password',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'john@example.com',
            'password' => 'wrong-password',
        ])->assertUnauthorized()
            ->assertJsonPath('error', 'unauthenticated');
    }

    public function test_authenticated_user_can_fetch_me_and_logout(): void
    {
        $registerResponse = $this->postJson('/api/v1/auth/register', [
            'name' => 'Mia Doe',
            'email' => 'mia@example.com',
            'password' => 'super-secret-password',
        ])->assertCreated();

        $token = (string) $registerResponse->json('data.token');

        $this->withToken($token)
            ->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'mia@example.com');

        $this->withToken($token)
            ->postJson('/api/v1/auth/logout')
            ->assertOk();

        $this->withToken($token)
            ->getJson('/api/v1/me')
            ->assertUnauthorized()
            ->assertJsonPath('error', 'unauthenticated');
    }

    public function test_token_last_used_at_is_not_updated_on_every_request_within_touch_window(): void
    {
        config()->set('tds.auth_token_last_used_touch_interval_seconds', 300);

        $registerResponse = $this->postJson('/api/v1/auth/register', [
            'name' => 'Touch Window User',
            'email' => 'touch-window@example.com',
            'password' => 'super-secret-password',
        ])->assertCreated();

        $token = (string) $registerResponse->json('data.token');

        $this->withToken($token)
            ->getJson('/api/v1/me')
            ->assertOk();

        $accessToken = PersonalAccessToken::query()->firstOrFail();
        $firstLastUsedAt = $accessToken->last_used_at;

        $this->travel(120)->seconds();

        $this->withToken($token)
            ->getJson('/api/v1/me')
            ->assertOk();

        $accessToken->refresh();
        $this->assertTrue($accessToken->last_used_at?->equalTo($firstLastUsedAt));

        $this->travel(301)->seconds();

        $this->withToken($token)
            ->getJson('/api/v1/me')
            ->assertOk();

        $accessToken->refresh();
        $this->assertTrue($accessToken->last_used_at?->gt($firstLastUsedAt));
    }

    public function test_login_endpoint_is_throttled(): void
    {
        $testIp = '10.10.10.10';
        $email = 'john-throttle@example.com';
        $this->withServerVariables([
            'REMOTE_ADDR' => $testIp,
        ]);

        RateLimiter::clear($email.'|'.$testIp);
        config()->set('tds.auth_login_rate_limit_per_minute', 1);
        User::query()->create([
            'name' => 'John Doe',
            'email' => $email,
            'password' => 'super-secret-password',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => 'super-secret-password',
        ])->assertOk();

        $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => 'super-secret-password',
        ])->assertStatus(429);
    }

    public function test_register_endpoint_is_throttled(): void
    {
        $testIp = '10.10.10.11';
        $this->withServerVariables([
            'REMOTE_ADDR' => $testIp,
        ]);

        RateLimiter::clear($testIp);
        config()->set('tds.auth_register_rate_limit_per_minute', 1);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Jane Doe',
            'email' => 'jane-throttle@example.com',
            'password' => 'super-secret-password',
        ])->assertCreated();

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Jane Doe 2',
            'email' => 'jane2@example.com',
            'password' => 'super-secret-password',
        ])->assertStatus(429);
    }
}
