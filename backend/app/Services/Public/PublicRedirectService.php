<?php

namespace App\Services\Public;

use App\Services\WeightedDistributionService;
use App\Support\UserAgentDevice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class PublicRedirectService
{
    public function __construct(
        private readonly WeightedDistributionService $weightedDistributionService,
        private readonly CampaignPublicLookup $campaignPublicLookup,
        private readonly RiskSignals $riskSignals,
        private readonly UrlQueryService $urlQueryService,
    ) {
    }

    /**
     * @return array{destination: string, session_uuid: string, set_session_cookie: bool}|null  null when campaign not found
     */
    public function resolveRedirect(Request $request, string $campaignSlug): ?array
    {
        $campaign = $this->campaignPublicLookup->bySlugAndHost(
            $campaignSlug,
            (string) $request->getHost(),
            ['active'],
        );

        if (! $campaign) {
            return null;
        }

        $landers = $this->getActiveLanderSplit((int) $campaign->id);

        if (empty($landers)) {
            return [
                'destination' => (string) $campaign->destination_url,
                'session_uuid' => '',
                'set_session_cookie' => false,
            ];
        }

        try {
            $selectedLander = $this->weightedDistributionService->pickWeighted($landers);
        } catch (\InvalidArgumentException) {
            $selectedLander = $landers[array_rand($landers)];
        }

        $sessionUuid = (string) $request->query('sid', $request->cookie('tds_session_uuid', (string) Str::uuid()));

        $sessionData = $this->upsertSession($request, $sessionUuid);

        $riskFlags = json_encode($this->riskSignals->snapshotForRequest($request));

        DB::table('visits')->insert([
            'campaign_id' => $campaign->id,
            'session_id' => $sessionData['id'],
            'lander_id' => $selectedLander['id'],
            'country_code' => $sessionData['country_code'],
            'device_type' => $sessionData['device_type'],
            'risk_flags' => $riskFlags,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $destination = $this->urlQueryService->mergeQuery((string) $selectedLander['url'], [
            'sid' => $sessionUuid,
            'campaign' => $campaign->slug,
        ]);

        return [
            'destination' => $destination,
            'session_uuid' => $sessionUuid,
            'set_session_cookie' => true,
        ];
    }

    private function getActiveLanderSplit(int $campaignId): array
    {
        $ttl = (int) config('tds.redirect_cache_ttl_seconds', 60);

        $rows = Cache::remember(
            sprintf('redirect:landers:%d', $campaignId),
            $ttl,
            fn (): array => DB::table('campaign_landers')
                ->join('landers', 'landers.id', '=', 'campaign_landers.lander_id')
                ->where('campaign_landers.campaign_id', $campaignId)
                ->where('campaign_landers.is_active', true)
                ->select('landers.id', 'landers.url', 'campaign_landers.weight_percent', 'campaign_landers.is_active')
                ->get()
                ->map(fn ($row): array => [
                    'id' => (int) $row->id,
                    'url' => (string) $row->url,
                    'weight_percent' => (int) $row->weight_percent,
                    'is_active' => (bool) $row->is_active,
                ])
                ->all()
        );

        return is_array($rows) ? $rows : [];
    }

    private function upsertSession(Request $request, string $sessionUuid): array
    {
        $existing = DB::table('sessions')
            ->where('session_uuid', $sessionUuid)
            ->first();

        $uaDevice = UserAgentDevice::infer($request->userAgent());

        $payload = [
            'ip' => $request->ip(),
            'language' => substr((string) $request->header('Accept-Language'), 0, 10),
            'browser' => substr((string) $request->userAgent(), 0, 255),
            'referrer' => $request->headers->get('referer'),
            'updated_at' => now(),
        ];

        if ($existing) {
            $payload['device_type'] = $existing->device_type ?? $uaDevice;
            DB::table('sessions')->where('id', $existing->id)->update($payload);

            return [
                'id' => (int) $existing->id,
                'country_code' => $payload['country_code'] ?? $existing->country_code ?? null,
                'device_type' => $payload['device_type'],
            ];
        }

        $id = DB::table('sessions')->insertGetId(array_merge($payload, [
            'session_uuid' => $sessionUuid,
            'device_type' => $uaDevice,
            'created_at' => now(),
        ]));

        return [
            'id' => (int) $id,
            'country_code' => $payload['country_code'] ?? null,
            'device_type' => $uaDevice,
        ];
    }
}
