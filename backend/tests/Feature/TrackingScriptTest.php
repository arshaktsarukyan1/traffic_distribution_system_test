<?php

namespace Tests\Feature;

use App\Models\Campaign;
use App\Models\TrafficSource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrackingScriptTest extends TestCase
{
    use RefreshDatabase;

    public function test_script_loads_and_posts_event_payload(): void
    {
        $trafficSource = TrafficSource::query()->create(['name' => 'Meta', 'slug' => 'meta']);
        $campaign = Campaign::query()->create([
            'traffic_source_id' => $trafficSource->id,
            'name' => 'Script campaign',
            'slug' => 'script-campaign',
            'status' => 'active',
            'destination_url' => 'https://example.com',
        ]);

        $response = $this->get('/api/tracker/' . $campaign->id . '.js');
        $content = $response->getContent();

        $response->assertOk();
        $this->assertStringContainsString('/api/v1/tracking/events', (string) $content);
        $this->assertStringContainsString('localStorage.setItem', (string) $content);
        $this->assertStringContainsString('device_type', (string) $content);
    }

    public function test_session_token_persists_across_events(): void
    {
        $trafficSource = TrafficSource::query()->create(['name' => 'Meta', 'slug' => 'meta']);
        $campaign = Campaign::query()->create([
            'traffic_source_id' => $trafficSource->id,
            'name' => 'Persist campaign',
            'slug' => 'persist-campaign',
            'status' => 'active',
            'destination_url' => 'https://example.com',
        ]);

        $first = $this->postJson('/api/v1/tracking/events', [
            'campaign_id' => $campaign->id,
            'session_uuid' => '7f9ee3aa-5d4d-4d3b-90f7-2d3b1d58e6b1',
        ])->assertAccepted();

        $second = $this->postJson('/api/v1/tracking/events', [
            'campaign_id' => $campaign->id,
            'session_uuid' => '7f9ee3aa-5d4d-4d3b-90f7-2d3b1d58e6b1',
        ])->assertAccepted();

        $this->assertSame('7f9ee3aa-5d4d-4d3b-90f7-2d3b1d58e6b1', $first['session_uuid']);
        $this->assertSame('7f9ee3aa-5d4d-4d3b-90f7-2d3b1d58e6b1', $second['session_uuid']);
    }
}
