<?php

namespace App\Services\Campaign;

use App\Models\Campaign;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

final class CampaignService
{
    public function paginateIndex(int $userId): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        return Campaign::query()
            ->where('user_id', $userId)
            ->with(['domain', 'trafficSource'])
            ->latest('id')
            ->paginate(20);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function create(int $userId, array $payload): Campaign
    {
        return DB::transaction(function () use ($userId, $payload): Campaign {
            $payload['user_id'] = $userId;
            $campaign = Campaign::query()->create(Arr::except($payload, ['landers', 'offers']));
            $this->syncSplits($campaign, $payload);

            return $campaign->load(['landers', 'offers', 'trafficSource', 'domain']);
        });
    }

    public function findForShow(int $userId, int $id): Campaign
    {
        return Campaign::query()
            ->where('user_id', $userId)
            ->with(['landers', 'offers', 'trafficSource', 'domain', 'targetingRules'])
            ->findOrFail($id);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function update(int $userId, int $id, array $payload): Campaign
    {
        $campaign = Campaign::query()->where('user_id', $userId)->findOrFail($id);

        return DB::transaction(function () use ($campaign, $payload): Campaign {
            $campaign->fill(Arr::except($payload, ['landers', 'offers']));
            $campaign->save();
            $this->syncSplits($campaign, $payload);

            return $campaign->load(['landers', 'offers', 'trafficSource', 'domain']);
        });
    }

    public function setStatus(int $userId, int $id, string $status): Campaign
    {
        $campaign = Campaign::query()->where('user_id', $userId)->findOrFail($id);
        $campaign->status = $status;
        $campaign->save();

        return $campaign;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function syncSplits(Campaign $campaign, array $payload): void
    {
        if (array_key_exists('landers', $payload)) {
            $rows = $payload['landers'];
            $campaign->landers()->sync(count($rows) ? $this->buildPivotMap($rows) : []);
        }

        if (array_key_exists('offers', $payload)) {
            $rows = $payload['offers'];
            $campaign->offers()->sync(count($rows) ? $this->buildPivotMap($rows) : []);
        }
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array<int, array{weight_percent: int, is_active: bool}>
     */
    private function buildPivotMap(array $rows): array
    {
        $mapped = [];

        foreach ($rows as $row) {
            $mapped[(int) $row['id']] = [
                'weight_percent' => (int) $row['weight_percent'],
                'is_active' => (bool) ($row['is_active'] ?? true),
            ];
        }

        return $mapped;
    }
}
