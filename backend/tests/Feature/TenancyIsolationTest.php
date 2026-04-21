<?php

namespace Tests\Feature;

use App\Models\TrafficSource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenancyIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_cannot_read_each_others_domains(): void
    {
        $tokenA = (string) $this->postJson('/api/v1/auth/register', [
            'name' => 'Tenant A',
            'email' => 'tenant-a@example.com',
            'password' => 'super-secret-password',
        ])->assertCreated()->json('data.token');

        $tokenB = (string) $this->postJson('/api/v1/auth/register', [
            'name' => 'Tenant B',
            'email' => 'tenant-b@example.com',
            'password' => 'super-secret-password',
        ])->assertCreated()->json('data.token');

        $domainId = (int) $this->withToken($tokenA)
            ->postJson('/api/v1/domains', [
                'name' => 'tenant-a-domain.test',
                'status' => 'active',
                'is_active' => true,
            ])
            ->assertCreated()
            ->json('data.id');

        $this->withToken($tokenB)
            ->getJson('/api/v1/domains')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->withToken($tokenB)
            ->getJson('/api/v1/domains/'.$domainId)
            ->assertNotFound();
    }

    public function test_users_cannot_reference_other_tenants_assets_in_campaign_create(): void
    {
        $tokenA = (string) $this->postJson('/api/v1/auth/register', [
            'name' => 'Campaign Owner',
            'email' => 'campaign-owner@example.com',
            'password' => 'super-secret-password',
        ])->assertCreated()->json('data.token');

        $tokenB = (string) $this->postJson('/api/v1/auth/register', [
            'name' => 'Other Tenant',
            'email' => 'other-tenant@example.com',
            'password' => 'super-secret-password',
        ])->assertCreated()->json('data.token');

        $domainId = (int) $this->withToken($tokenA)
            ->postJson('/api/v1/domains', [
                'name' => 'campaign-owner-domain.test',
                'status' => 'active',
                'is_active' => true,
            ])
            ->assertCreated()
            ->json('data.id');

        $landerId = (int) $this->withToken($tokenA)
            ->postJson('/api/v1/landers', [
                'name' => 'Private Lander',
                'url' => 'https://example.com/private-lander',
            ])
            ->assertCreated()
            ->json('data.id');

        $offerId = (int) $this->withToken($tokenA)
            ->postJson('/api/v1/offers', [
                'name' => 'Private Offer',
                'url' => 'https://example.com/private-offer',
            ])
            ->assertCreated()
            ->json('data.id');

        $source = TrafficSource::query()->create([
            'name' => 'Tenant source',
            'slug' => 'tenant-source',
        ]);

        $this->withToken($tokenB)
            ->postJson('/api/v1/campaigns', [
                'domain_id' => $domainId,
                'traffic_source_id' => $source->id,
                'name' => 'Cross-tenant attempt',
                'slug' => 'cross-tenant-attempt',
                'status' => 'draft',
                'destination_url' => 'https://example.com/checkout',
                'landers' => [
                    ['id' => $landerId, 'weight_percent' => 100, 'is_active' => true],
                ],
                'offers' => [
                    ['id' => $offerId, 'weight_percent' => 100, 'is_active' => true],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['domain_id', 'landers.0.id', 'offers.0.id']);
    }
}
