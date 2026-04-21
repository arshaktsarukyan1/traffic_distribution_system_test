<?php

namespace App\Services\Public;

use App\Services\WeightedDistributionService;
use App\Support\UserAgentDevice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

final class PublicClickService
{
    public function __construct(
        private readonly WeightedDistributionService $weightedDistributionService,
        private readonly CampaignPublicLookup $campaignPublicLookup,
        private readonly RiskSignals $riskSignals,
        private readonly TargetingOfferMatcher $targetingOfferMatcher,
        private readonly UrlQueryService $urlQueryService,
    ) {
    }

    /**
     * @return array{destination: string, use_campaign_fallback: bool}|null  null when campaign not found
     */
    public function resolveDestination(Request $request, string $campaignSlug, string $sessionUuid): ?array
    {
        $campaign = $this->campaignPublicLookup->bySlugAndHost(
            $campaignSlug,
            (string) $request->getHost(),
            ['active', 'paused'],
        );

        if (! $campaign) {
            return null;
        }

        $session = null;
        if ($sessionUuid !== '') {
            $session = DB::table('sessions')
                ->where('session_uuid', $sessionUuid)
                ->first();
        }

        $isAnomalyFallback = false;
        if (! $session) {
            Log::warning('Click fallback anomaly detected', [
                'campaign_slug' => $campaignSlug,
                'reason' => $sessionUuid === '' ? 'missing_token' : 'unknown_token',
                'session_uuid' => $sessionUuid === '' ? null : $sessionUuid,
                'ip' => $request->ip(),
            ]);

            $session = $this->createFallbackSession($request, $sessionUuid);
            $isAnomalyFallback = true;
        }

        $selectedOffer = $this->selectOfferForSession((int) $campaign->id, $session, $isAnomalyFallback);

        if (! $selectedOffer) {
            return [
                'destination' => (string) $campaign->destination_url,
                'use_campaign_fallback' => true,
            ];
        }

        $clickUuid = (string) Str::uuid();
        $riskFlags = json_encode($this->riskSignals->snapshotForRequest($request));

        DB::table('clicks')->insert([
            'click_uuid' => $clickUuid,
            'campaign_id' => $campaign->id,
            'session_id' => $session->id,
            'offer_id' => $selectedOffer['id'],
            'country_code' => $session->country_code,
            'device_type' => $session->device_type,
            'risk_flags' => $riskFlags,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $destination = $this->urlQueryService->mergeQuery((string) $selectedOffer['url'], [
            'click_id' => $clickUuid,
            'campaign' => $campaign->slug,
        ]);

        return [
            'destination' => $destination,
            'use_campaign_fallback' => false,
        ];
    }

    private function selectOfferForSession(int $campaignId, object $session, bool $forceDefaultOfferSplit = false): ?array
    {
        if (! $forceDefaultOfferSplit) {
            $ruleMatch = $this->selectTargetedOffer($campaignId, $session);
            if ($ruleMatch !== null) {
                return $ruleMatch;
            }
        }

        $offers = $this->getDefaultOfferSplit($campaignId);
        if (count($offers) === 0) {
            return null;
        }

        try {
            return $this->weightedDistributionService->pickWeighted($offers);
        } catch (\InvalidArgumentException) {
            return $offers[array_rand($offers)];
        }
    }

    private function selectTargetedOffer(int $campaignId, object $session): ?array
    {
        return $this->targetingOfferMatcher->firstMatchingOffer(
            $this->getTargetingRules($campaignId),
            $session->country_code,
            $session->device_type,
        );
    }

    private function getTargetingRules(int $campaignId): array
    {
        $ttl = (int) config('tds.redirect_cache_ttl_seconds', 60);

        return Cache::remember(
            sprintf('click:targeting-rules:%d', $campaignId),
            $ttl,
            fn (): array => DB::table('targeting_rules')
                ->join('offers', 'offers.id', '=', 'targeting_rules.offer_id')
                ->where('targeting_rules.campaign_id', $campaignId)
                ->where('targeting_rules.is_active', true)
                ->whereNotNull('targeting_rules.offer_id')
                ->select(
                    'targeting_rules.country_code',
                    'targeting_rules.device_type',
                    'targeting_rules.priority',
                    'offers.id as offer_id',
                    'offers.url as offer_url'
                )
                ->orderByRaw("CASE
                    WHEN targeting_rules.country_code IS NOT NULL AND targeting_rules.device_type IS NOT NULL THEN 1
                    WHEN targeting_rules.country_code IS NOT NULL THEN 2
                    WHEN targeting_rules.device_type IS NOT NULL THEN 3
                    ELSE 4
                END")
                ->orderBy('targeting_rules.priority')
                ->get()
                ->map(fn ($row): array => [
                    'country_code' => $row->country_code,
                    'device_type' => $row->device_type,
                    'priority' => (int) $row->priority,
                    'offer_id' => (int) $row->offer_id,
                    'offer_url' => (string) $row->offer_url,
                ])
                ->all()
        );
    }

    private function getDefaultOfferSplit(int $campaignId): array
    {
        $ttl = (int) config('tds.redirect_cache_ttl_seconds', 60);

        return Cache::remember(
            sprintf('click:offers:%d', $campaignId),
            $ttl,
            fn (): array => DB::table('campaign_offers')
                ->join('offers', 'offers.id', '=', 'campaign_offers.offer_id')
                ->where('campaign_offers.campaign_id', $campaignId)
                ->where('campaign_offers.is_active', true)
                ->select('offers.id', 'offers.url', 'campaign_offers.weight_percent', 'campaign_offers.is_active')
                ->get()
                ->map(fn ($row): array => [
                    'id' => (int) $row->id,
                    'url' => (string) $row->url,
                    'weight_percent' => (int) $row->weight_percent,
                    'is_active' => (bool) $row->is_active,
                ])
                ->all()
        );
    }

    private function createFallbackSession(Request $request, string $sessionUuid): object
    {
        $resolvedSessionUuid = $sessionUuid !== '' ? $sessionUuid : (string) Str::uuid();

        $sessionPayload = [
            'session_uuid' => $resolvedSessionUuid,
            'ip' => $request->ip(),
            'country_code' => null,
            'region' => null,
            'city' => null,
            'device_type' => UserAgentDevice::infer($request->userAgent()),
            'browser' => substr((string) $request->userAgent(), 0, 255),
            'os' => null,
            'language' => substr((string) $request->header('Accept-Language'), 0, 10),
            'referrer' => $request->headers->get('referer'),
            'created_at' => now(),
            'updated_at' => now(),
        ];

        $id = DB::table('sessions')->insertGetId($sessionPayload);

        return (object) array_merge(['id' => $id], $sessionPayload);
    }
}
