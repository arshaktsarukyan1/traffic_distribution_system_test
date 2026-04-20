<?php

namespace Tests\Feature;

use App\Models\PersonalAccessToken;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Tests\TestCase;

class ApiJsonErrorHandlingTest extends TestCase
{
    use RefreshDatabase;

    private function authHeaders(): array
    {
        $token = Str::random(80);
        $user = User::query()->create([
            'name' => 'Test User',
            'email' => 'test+'.Str::random(8).'@example.com',
            'password' => 'password-123456',
        ]);

        PersonalAccessToken::query()->create([
            'user_id' => $user->id,
            'name' => 'test-suite',
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addHour(),
        ]);

        return ['Authorization' => 'Bearer '.$token];
    }

    public function test_401_json_envelope_and_correlation_header(): void
    {
        $response = $this->getJson('/api/v1/domains');

        $response->assertUnauthorized()
            ->assertJsonStructure(['message', 'error', 'correlation_id'])
            ->assertJsonPath('error', 'unauthenticated')
            ->assertHeader('X-Correlation-Id');

        $this->assertNotSame('', $response->json('correlation_id'));
    }

    public function test_403_json_envelope(): void
    {
        Route::middleware(['api', 'auth.token'])->get('/api/v1/__test_403', fn () => abort(403, 'Not allowed for this test.'));

        $this->withHeaders($this->authHeaders())
            ->getJson('/api/v1/__test_403')
            ->assertForbidden()
            ->assertJsonStructure(['message', 'error', 'correlation_id'])
            ->assertJsonPath('error', 'forbidden')
            ->assertJsonPath('message', 'Not allowed for this test.');
    }

    public function test_404_json_envelope_for_missing_model(): void
    {
        $this->withHeaders($this->authHeaders())
            ->getJson('/api/v1/domains/999999999')
            ->assertNotFound()
            ->assertJsonPath('error', 'not_found')
            ->assertJsonPath('message', 'Domain was not found.');
    }

    public function test_422_validation_includes_errors_and_error_fields(): void
    {
        $response = $this->withHeaders($this->authHeaders())
            ->postJson('/api/v1/domains', []);

        $response->assertUnprocessable()
            ->assertJsonPath('error', 'validation_failed')
            ->assertJsonStructure([
                'message',
                'error',
                'correlation_id',
                'errors',
                'error_fields',
            ]);

        $fields = $response->json('error_fields');
        $this->assertIsArray($fields);
        $this->assertNotEmpty($fields);
        $this->assertArrayHasKey('field', $fields[0]);
        $this->assertArrayHasKey('messages', $fields[0]);
        $this->assertContains('name', array_column($fields, 'field'));
    }

    public function test_500_json_envelope_when_debug_disabled(): void
    {
        config(['app.debug' => false]);

        Route::middleware(['api', 'auth.token'])->get('/api/v1/__test_500', function (): void {
            throw new \RuntimeException('forced test exception');
        });

        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/v1/__test_500');

        $response->assertStatus(500)
            ->assertJsonStructure(['message', 'error', 'correlation_id'])
            ->assertJsonPath('error', 'server_error')
            ->assertJsonPath('message', 'Server Error');
    }
}
