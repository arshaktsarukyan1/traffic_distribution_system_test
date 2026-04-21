<?php

namespace App\Services\Conversion;

use App\Models\Click;
use App\Models\Conversion;
use Illuminate\Support\Carbon;

final class ManualConversionService
{
    /**
     * @param  array<string, mixed>  $validated
     * @return array{conversion: Conversion}|array{error: string}
     */
    public function createFromValidated(int $userId, array $validated): array
    {
        $campaignId = (int) $validated['campaign_id'];
        $click = $this->resolveClick($userId, $validated);

        if ($click !== null && (int) $click->campaign_id !== $campaignId) {
            return ['error' => 'Click does not belong to the given campaign.'];
        }

        $metadata = [];
        if (array_key_exists('offer_id', $validated) && $validated['offer_id'] !== null) {
            $metadata['offer_id'] = (int) $validated['offer_id'];
        }
        if (array_key_exists('lander_id', $validated) && $validated['lander_id'] !== null) {
            $metadata['lander_id'] = (int) $validated['lander_id'];
        }

        $campaignBelongsToUser = \App\Models\Campaign::query()
            ->where('user_id', $userId)
            ->where('id', $campaignId)
            ->exists();

        if (! $campaignBelongsToUser) {
            return ['error' => 'Campaign was not found.'];
        }

        $conversion = Conversion::query()->create([
            'campaign_id' => $campaignId,
            'click_id' => $click?->id,
            'source' => $validated['source'] ?? 'manual',
            'external_order_id' => null,
            'amount' => $validated['amount'],
            'country_code' => $click?->country_code,
            'device_type' => $click?->device_type,
            'converted_at' => Carbon::parse($validated['converted_at']),
            'note' => $validated['note'] ?? null,
            'metadata' => $metadata === [] ? null : $metadata,
        ]);

        return ['conversion' => $conversion];
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function resolveClick(int $userId, array $validated): ?Click
    {
        if (! empty($validated['click_id'])) {
            return Click::query()
                ->join('campaigns', 'campaigns.id', '=', 'clicks.campaign_id')
                ->where('campaigns.user_id', $userId)
                ->where('clicks.id', (int) $validated['click_id'])
                ->select('clicks.*')
                ->first();
        }
        if (! empty($validated['click_uuid'])) {
            return Click::query()
                ->join('campaigns', 'campaigns.id', '=', 'clicks.campaign_id')
                ->where('campaigns.user_id', $userId)
                ->where('clicks.click_uuid', $validated['click_uuid'])
                ->select('clicks.*')
                ->first();
        }

        return null;
    }
}
