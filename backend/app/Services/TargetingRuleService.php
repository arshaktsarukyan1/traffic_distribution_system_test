<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\TargetingRule;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class TargetingRuleService
{
    public function paginateForCampaign(int $userId, int $campaignId): LengthAwarePaginator
    {
        $campaign = Campaign::query()
            ->where('user_id', $userId)
            ->findOrFail($campaignId);

        return $campaign->targetingRules()
            ->with('offer')
            ->orderBy('priority')
            ->paginate(50);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createForCampaign(int $userId, int $campaignId, array $attributes): TargetingRule
    {
        Campaign::query()->where('user_id', $userId)->findOrFail($campaignId);
        $attributes['campaign_id'] = $campaignId;

        return TargetingRule::query()->create($attributes)->load('offer');
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(int $userId, int $campaignId, int $id, array $attributes): TargetingRule
    {
        Campaign::query()->where('user_id', $userId)->findOrFail($campaignId);

        $rule = TargetingRule::query()
            ->where('campaign_id', $campaignId)
            ->findOrFail($id);

        $rule->fill($attributes)->save();

        return $rule->load('offer');
    }

    public function delete(int $userId, int $campaignId, int $id): void
    {
        Campaign::query()->where('user_id', $userId)->findOrFail($campaignId);

        TargetingRule::query()
            ->where('campaign_id', $campaignId)
            ->findOrFail($id)
            ->delete();
    }
}
