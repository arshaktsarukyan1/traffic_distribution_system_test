<?php

namespace Tests\Feature;

use App\Models\Campaign;
use App\Models\TrafficSource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiAccessControlTest extends TestCase
{
    use RefreshDatabase;

    public function test_protected_routes_require_auth_token(): void
    {
        $this->getJson('/api/v1/domains')
            ->assertUnauthorized()
            ->assertJsonStructure(['message', 'error', 'correlation_id'])
            ->assertJsonPath('error', 'unauthenticated');
    }

    public function test_public_tracking_route_works_without_login(): void
    {
        $trafficSource = TrafficSource::query()->create([
            'name' => 'Source',
            'slug' => 'source',
        ]);

        $campaign = Campaign::query()->create([
            'traffic_source_id' => $trafficSource->id,
            'name' => 'Tracking campaign',
            'slug' => 'tracking-campaign',
            'status' => 'active',
            'destination_url' => 'https://example.com/final',
        ]);

        $this->postJson('/api/v1/tracking/events', [
            'campaign_id' => $campaign->id,
            'session_uuid' => 'f2d8cf83-7f64-4aa9-bf47-b8e7a61516e9',
        ])->assertAccepted();
    }
}
