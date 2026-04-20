<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ApiJsonErrorHandlingTest extends TestCase
{
    use RefreshDatabase;

    private function authHeaders(): array
    {
        return ['Authorization' => 'Bearer test-internal-token'];
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
        Route::middleware(['api', 'internal.api'])->get('/api/v1/__test_403', fn () => abort(403, 'Not allowed for this test.'));

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

        Route::middleware(['api', 'internal.api'])->get('/api/v1/__test_500', function (): void {
            throw new \RuntimeException('forced test exception');
        });

        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/v1/__test_500');

        $response->assertStatus(500)
            ->assertJsonStructure(['message', 'error', 'correlation_id'])
            ->assertJsonPath('error', 'server_error')
            ->assertJsonPath('message', 'Server Error');
    }

    public function test_middleware_returns_503_when_internal_token_not_configured(): void
    {
        $previous = config('tds.internal_api_token');
        Config::set('tds.internal_api_token', '');

        try {
            $this->withHeaders($this->authHeaders())
                ->getJson('/api/v1/domains')
                ->assertStatus(503)
                ->assertJsonPath('error', 'service_unavailable')
                ->assertJsonPath('message', 'Internal API token is not configured.')
                ->assertJsonStructure(['message', 'error', 'correlation_id']);
        } finally {
            Config::set('tds.internal_api_token', $previous);
        }
    }
}
