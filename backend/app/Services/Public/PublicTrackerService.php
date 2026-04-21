<?php

namespace App\Services\Public;

use App\Support\UserAgentDevice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class PublicTrackerService
{
    public function __construct(private readonly RiskSignals $riskSignals)
    {
    }

    public function campaignExists(int $campaignId): bool
    {
        return DB::table('campaigns')->where('id', $campaignId)->exists();
    }

    public function javascriptForCampaign(int $campaignId, string $apiPath = '/api/v1/tracking/events'): string
    {
        return <<<JS
(function () {
  const key = 'tds_session_uuid';
  let sid = localStorage.getItem(key);
  if (!sid) {
    sid = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(16).slice(2);
    localStorage.setItem(key, sid);
  }
  document.cookie = key + '=' + sid + '; path=/; max-age=' + (60 * 60 * 24 * 30);
  const userAgent = navigator.userAgent || null;
  const lowUa = (userAgent || '').toLowerCase();
  const deviceType = /tablet|ipad/.test(lowUa)
    ? 'tablet'
    : (/mobile|iphone|android/.test(lowUa) ? 'mobile' : 'desktop');
  const os = /windows/.test(lowUa)
    ? 'Windows'
    : (/mac os|macintosh/.test(lowUa) ? 'macOS' : (/android/.test(lowUa) ? 'Android' : (/iphone|ipad|ios/.test(lowUa) ? 'iOS' : null)));
  const payload = {
    campaign_id: {$campaignId},
    session_uuid: sid,
    ts: new Date().toISOString(),
    referrer: document.referrer || null,
    language: navigator.language || null,
    user_agent: userAgent,
    device_type: deviceType,
    os: os
  };
  fetch('{$apiPath}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true
  }).catch(() => {});
})();
JS;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{session_uuid: string}|null  null when campaign does not exist
     */
    public function recordEvent(array $payload, Request $request): ?array
    {
        $campaignExists = DB::table('campaigns')
            ->where('id', $payload['campaign_id'])
            ->exists();

        if (! $campaignExists) {
            return null;
        }

        $sessionUuid = $payload['session_uuid'] ?? $request->cookie('tds_session_uuid', (string) Str::uuid());
        $session = DB::table('sessions')->where('session_uuid', $sessionUuid)->first();

        $uaForDevice = (string) ($payload['user_agent'] ?? $request->userAgent());
        $inferredDevice = UserAgentDevice::infer($uaForDevice);
        $resolvedDevice = isset($payload['device_type']) && $payload['device_type'] !== null
            ? (string) $payload['device_type']
            : (($session !== null && $session->device_type !== null) ? (string) $session->device_type : $inferredDevice);

        $sessionPayload = [
            'ip' => $request->ip(),
            'country_code' => isset($payload['country_code']) ? strtoupper((string) $payload['country_code']) : null,
            'region' => $payload['region'] ?? null,
            'city' => $payload['city'] ?? null,
            'device_type' => $resolvedDevice,
            'language' => $payload['language'] ?? null,
            'browser' => substr((string) ($payload['user_agent'] ?? $request->userAgent()), 0, 255),
            'os' => isset($payload['os']) ? substr((string) $payload['os'], 0, 120) : null,
            'referrer' => $payload['referrer'] ?? null,
            'updated_at' => now(),
        ];

        if ($session) {
            DB::table('sessions')->where('id', $session->id)->update($sessionPayload);
            $sessionId = (int) $session->id;
        } else {
            $sessionId = (int) DB::table('sessions')->insertGetId(array_merge($sessionPayload, [
                'session_uuid' => $sessionUuid,
                'created_at' => now(),
            ]));
        }

        DB::table('visits')->insert([
            'campaign_id' => $payload['campaign_id'],
            'session_id' => $sessionId,
            'lander_id' => null,
            'country_code' => $sessionPayload['country_code'],
            'device_type' => $sessionPayload['device_type'],
            'risk_flags' => json_encode($this->riskSignals->snapshotForRequest($request)),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ['session_uuid' => $sessionUuid];
    }
}
