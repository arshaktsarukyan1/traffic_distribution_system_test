<?php

namespace Tests\Feature;

use App\Models\Campaign;
use App\Models\Domain;
use App\Models\TrafficSource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class DomainApiShowTest extends TestCase
{
    use RefreshDatabase;

    public function test_domains_show_missing_returns_structured_json(): void
    {
        $this->withHeaders(['Authorization' => 'Bearer test-internal-token'])
            ->getJson('/api/v1/domains/999999999')
            ->assertNotFound()
            ->assertJsonStructure(['message', 'error', 'correlation_id'])
            ->assertJsonPath('error', 'not_found')
            ->assertJsonPath('message', 'Domain was not found.')
            ->assertHeader('X-Correlation-Id');
    }

    public function test_domains_show_includes_linked_campaigns(): void
    {
        $domain = Domain::query()->create([
            'name' => 'multi.example',
            'status' => 'active',
            'is_active' => true,
        ]);
        $source = TrafficSource::query()->create(['name' => 'S', 'slug' => 's-'.Str::uuid()]);
        $c1 = Campaign::query()->create([
            'domain_id' => $domain->id,
            'traffic_source_id' => $source->id,
            'name' => 'C1',
            'slug' => 'c1-'.Str::uuid(),
            'status' => 'draft',
            'destination_url' => 'https://example.com',
        ]);
        $c2 = Campaign::query()->create([
            'domain_id' => $domain->id,
            'traffic_source_id' => $source->id,
            'name' => 'C2',
            'slug' => 'c2-'.Str::uuid(),
            'status' => 'draft',
            'destination_url' => 'https://example.com',
        ]);

        $this->withHeaders(['Authorization' => 'Bearer test-internal-token'])
            ->getJson('/api/v1/domains/'.$domain->id)
            ->assertOk()
            ->assertJsonPath('data.campaigns_count', 2)
            ->assertJsonCount(2, 'data.campaigns');
    }
}
