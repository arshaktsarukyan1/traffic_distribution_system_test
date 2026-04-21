<?php

namespace Tests\Feature;

use App\Models\Campaign;
use App\Models\Click;
use App\Models\Conversion;
use App\Models\Kpi15mAggregate;
use App\Models\Lander;
use App\Models\Offer;
use App\Models\Session;
use App\Models\TrafficSource;
use Database\Seeders\KpiAggregationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Str;
use Tests\TestCase;

class ConversionTrackingTest extends TestCase
{
    use RefreshDatabase;

    private function internalHeaders(): array
    {
        return ['Authorization' => 'Bearer test-internal-token'];
    }

    /**
     * @return object{campaign: Campaign, click: Click, clickUuid: string, offer: Offer}
     */
    private function seedClickGraph(?string $clickUuid = null): object
    {
        $clickUuid ??= (string) Str::uuid();

        $uniq = Str::uuid()->toString();
        $source = TrafficSource::query()->create([
            'name' => 'Src '.$uniq,
            'slug' => 'src-'.$uniq,
            'is_active' => true,
        ]);

        $campaign = Campaign::query()->create([
            'traffic_source_id' => $source->id,
            'name' => 'Camp',
            'slug' => 'camp-'.$uniq,
            'status' => 'active',
            'destination_url' => 'https://example.com/out',
        ]);

        $session = Session::query()->create([
            'session_uuid' => (string) Str::uuid(),
            'country_code' => 'US',
            'device_type' => 'desktop',
        ]);

        $offer = Offer::query()->create([
            'name' => 'Offer',
            'url' => 'https://example.com/offer',
        ]);

        $click = Click::query()->create([
            'click_uuid' => $clickUuid,
            'campaign_id' => $campaign->id,
            'session_id' => $session->id,
            'offer_id' => $offer->id,
            'country_code' => 'US',
            'device_type' => 'desktop',
        ]);

        return (object) [
            'campaign' => $campaign,
            'click' => $click,
            'clickUuid' => $clickUuid,
            'offer' => $offer,
        ];
    }

    private function postShopifyOrdersWebhook(array $payload, ?string $rawOverride = null, ?string $shopifyWebhookId = null): \Illuminate\Testing\TestResponse
    {
        $raw = $rawOverride ?? json_encode($payload, JSON_THROW_ON_ERROR);

        $server = [
            'HTTP_ACCEPT' => 'application/json',
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SHOPIFY_HMAC_SHA256' => $this->shopifyHmac($raw),
            'CONTENT_LENGTH' => (string) strlen($raw),
        ];

        if ($shopifyWebhookId !== null && $shopifyWebhookId !== '') {
            $server['HTTP_X_SHOPIFY_WEBHOOK_ID'] = $shopifyWebhookId;
        }

        return $this->call('POST', '/webhooks/shopify/orders', [], [], [], $server, $raw);
    }

    private function shopifyHmac(string $raw): string
    {
        $secret = (string) config('tds.shopify_webhook_secret', '');

        return base64_encode(hash_hmac('sha256', $raw, $secret, true));
    }

    public function test_shopify_webhook_accepts_note_attributes_click_mapping(): void
    {
        $g = $this->seedClickGraph();

        $payload = [
            'id' => 55_001,
            'total_price' => '19.99',
            'currency' => 'USD',
            'created_at' => '2026-04-10T12:34:56-00:00',
            'note_attributes' => [
                ['name' => 'click_uuid', 'value' => $g->clickUuid],
            ],
            'line_items' => [
                [
                    'id' => 1,
                    'title' => 'Widget',
                    'quantity' => 2,
                    'sku' => 'W-1',
                    'price' => '9.99',
                ],
            ],
        ];

        $this->postShopifyOrdersWebhook($payload)->assertAccepted();

        $row = Conversion::query()->where('external_order_id', '55001')->first();
        $this->assertNotNull($row);
        $this->assertSame('shopify', $row->source);
        $this->assertEqualsWithDelta(19.99, (float) $row->amount, 0.001);
        $this->assertSame($g->campaign->id, $row->campaign_id);
        $this->assertSame($g->click->id, $row->click_id);
        $this->assertSame('US', $row->country_code);
        $this->assertSame('desktop', $row->device_type);
        $this->assertIsArray($row->metadata);
        $this->assertSame('Widget', $row->metadata['line_items'][0]['title'] ?? null);
    }

    public function test_duplicate_shopify_order_does_not_duplicate_conversions(): void
    {
        $g = $this->seedClickGraph();

        $payload = [
            'id' => 77_002,
            'total_price' => '10.00',
            'created_at' => '2026-04-11T10:00:00-00:00',
            'click_id' => $g->clickUuid,
        ];

        $this->postShopifyOrdersWebhook($payload)->assertAccepted();
        $this->postShopifyOrdersWebhook(array_merge($payload, ['total_price' => '12.00']))->assertAccepted();

        $this->assertSame(1, Conversion::query()->where('external_order_id', '77002')->count());
        $this->assertEqualsWithDelta(12.0, (float) Conversion::query()->where('external_order_id', '77002')->value('amount'), 0.001);
    }

    public function test_shopify_webhook_rejects_bad_hmac_when_secret_configured(): void
    {
        Config::set('tds.shopify_webhook_secret', 'real-secret');

        $g = $this->seedClickGraph();
        $payload = [
            'id' => 88_003,
            'total_price' => '1.00',
            'created_at' => '2026-04-12T10:00:00-00:00',
            'click_id' => $g->clickUuid,
        ];
        $raw = json_encode($payload, JSON_THROW_ON_ERROR);

        $this->call('POST', '/webhooks/shopify/orders', [], [], [], [
            'HTTP_ACCEPT' => 'application/json',
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SHOPIFY_HMAC_SHA256' => base64_encode(hash_hmac('sha256', $raw, 'wrong-secret', true)),
            'CONTENT_LENGTH' => (string) strlen($raw),
        ], $raw)->assertUnauthorized();
    }

    public function test_shopify_webhook_rejects_when_secret_missing_and_insecure_bypass_disabled(): void
    {
        Config::set('tds.shopify_webhook_secret', '');
        Config::set('tds.allow_insecure_shopify_webhooks', false);

        $g = $this->seedClickGraph();
        $payload = [
            'id' => 88_013,
            'total_price' => '1.00',
            'created_at' => '2026-04-12T10:00:00-00:00',
            'click_id' => $g->clickUuid,
        ];
        $raw = json_encode($payload, JSON_THROW_ON_ERROR);

        $this->call('POST', '/webhooks/shopify/orders', [], [], [], [
            'HTTP_ACCEPT' => 'application/json',
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SHOPIFY_HMAC_SHA256' => base64_encode(hash_hmac('sha256', $raw, 'anything', true)),
            'CONTENT_LENGTH' => (string) strlen($raw),
        ], $raw)->assertUnauthorized();
    }

    public function test_manual_conversion_entry_persists_and_kpi_report_reflects_aggregates(): void
    {
        $g = $this->seedClickGraph();
        $lander = Lander::query()->create([
            'name' => 'L',
            'url' => 'https://example.com/lander',
        ]);

        $body = [
            'campaign_id' => $g->campaign->id,
            'amount' => 42.5,
            'converted_at' => '2026-04-10T14:07:00Z',
            'click_uuid' => $g->clickUuid,
            'offer_id' => $g->offer->id,
            'lander_id' => $lander->id,
            'note' => 'Phone sale',
            'source' => 'manual_adjustment',
        ];

        $this->withHeaders($this->internalHeaders())
            ->postJson('/api/v1/conversions/manual', $body)
            ->assertCreated()
            ->assertJsonPath('data.amount', 42.5)
            ->assertJsonPath('data.note', 'Phone sale')
            ->assertJsonPath('data.metadata.offer_id', $g->offer->id)
            ->assertJsonPath('data.metadata.lander_id', $lander->id);

        $this->assertSame(1, Conversion::query()->where('campaign_id', $g->campaign->id)->count());

        Artisan::call('db:seed', ['--class' => KpiAggregationSeeder::class, '--force' => true]);

        $this->assertGreaterThanOrEqual(
            1,
            Kpi15mAggregate::query()->where('campaign_id', $g->campaign->id)->sum('conversions')
        );

        $kpi = $this->withHeaders($this->internalHeaders())
            ->getJson('/api/v1/reports/kpi')
            ->assertOk()
            ->json('data.current');

        $this->assertGreaterThanOrEqual(1, (int) ($kpi['conversions'] ?? 0));
        $this->assertGreaterThanOrEqual(42.5, (float) ($kpi['revenue'] ?? 0));
    }

    public function test_shopify_webhook_id_dedupes_replays_without_changing_conversion(): void
    {
        Config::set('tds.shopify_webhook_secret', 'whk-secret');

        $g = $this->seedClickGraph();
        $payload = [
            'id' => 120_001,
            'total_price' => '5.00',
            'created_at' => '2026-04-14T09:00:00-00:00',
            'click_id' => $g->clickUuid,
        ];

        $whid = 'gid://shopify/Webhook/120001';

        $this->postShopifyOrdersWebhook($payload, null, $whid)->assertAccepted();
        $this->postShopifyOrdersWebhook(array_merge($payload, ['total_price' => '9.00']), null, $whid)
            ->assertOk()
            ->assertJsonPath('deduped', true);

        $this->assertSame(1, Conversion::query()->where('external_order_id', '120001')->count());
        $this->assertEqualsWithDelta(5.0, (float) Conversion::query()->where('external_order_id', '120001')->value('amount'), 0.001);
    }

    public function test_legacy_api_v1_shopify_route_still_works(): void
    {
        $g = $this->seedClickGraph();
        $payload = [
            'id' => 99_004,
            'total_price' => '3.00',
            'created_at' => '2026-04-13T08:00:00-00:00',
            'click_uuid' => $g->clickUuid,
        ];
        $raw = json_encode($payload, JSON_THROW_ON_ERROR);

        $this->call('POST', '/api/v1/webhooks/shopify/orders', [], [], [], [
            'HTTP_ACCEPT' => 'application/json',
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SHOPIFY_HMAC_SHA256' => $this->shopifyHmac($raw),
            'CONTENT_LENGTH' => (string) strlen($raw),
        ], $raw)->assertAccepted();

        $this->assertTrue(Conversion::query()->where('external_order_id', '99004')->exists());
    }
}
