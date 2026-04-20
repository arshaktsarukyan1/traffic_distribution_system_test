<?php

namespace App\Services\Cost;

use App\Contracts\TrafficSourceCostAdapterInterface;
use App\Contracts\TrafficSourceCostSyncServiceInterface;
use App\Models\Campaign;
use App\Models\CostEntry;
use App\Models\CostSyncRun;
use App\Models\Visit;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use DateTimeInterface;
use Illuminate\Support\Facades\Log;
use Throwable;

final class TaboolaCostSyncService implements TrafficSourceCostSyncServiceInterface
{
    public function __construct(
        private readonly TrafficSourceCostAdapterInterface $costAdapter,
    ) {}

    public function sync(DateTimeInterface $windowFromUtc, DateTimeInterface $windowToUtc): CostSyncRun
    {
        $run = CostSyncRun::query()->create([
            'source' => $this->costAdapter->getSourceKey(),
            'status' => CostSyncRun::STATUS_RUNNING,
            'window_from' => $windowFromUtc,
            'window_to' => $windowToUtc,
            'rows_upserted' => 0,
            'started_at' => now(),
        ]);

        $rowsUpserted = 0;
        $meta = ['warnings' => []];

        try {
            $campaigns = Campaign::query()
                ->with('trafficSource')
                ->whereHas('trafficSource', fn ($q) => $q->where('slug', 'taboola'))
                ->whereNotNull('external_traffic_campaign_id')
                ->get();

            if ($campaigns->isEmpty()) {
                $meta['message'] = 'No Taboola campaigns with external_traffic_campaign_id configured.';
                $run->update([
                    'status' => CostSyncRun::STATUS_SUCCESS,
                    'rows_upserted' => 0,
                    'finished_at' => now(),
                    'meta' => $meta,
                ]);

                $run->refresh();

                return $run;
            }

            $fromDate = Carbon::instance($windowFromUtc)->utc()->toDateString();
            $toDate = Carbon::instance($windowToUtc)->utc()->toDateString();

            $externalIds = $campaigns->pluck('external_traffic_campaign_id')
                ->map(fn ($id) => (string) $id)
                ->unique()
                ->values()
                ->all();

            $dayRows = $this->costAdapter->fetchSpendByDay($fromDate, $toDate, $externalIds);

            $extToCampaignIds = $campaigns
                ->groupBy(fn (Campaign $c) => (string) $c->external_traffic_campaign_id)
                ->map(fn ($group) => $group->map(fn (Campaign $c) => $c->id)->all());

            $byId = $campaigns->keyBy('id');

            foreach ($dayRows as $dayRow) {
                $targets = $extToCampaignIds->get($dayRow->externalCampaignId, []);
                if ($targets === []) {
                    $meta['warnings'][] = "Spend for unknown Taboola campaign id {$dayRow->externalCampaignId} on {$dayRow->day} ignored.";

                    continue;
                }

                foreach ($targets as $campaignId) {
                    $campaign = $byId->get((int) $campaignId);
                    if (!$campaign instanceof Campaign) {
                        continue;
                    }

                    $rowsUpserted += $this->ingestDaySpendForCampaign($campaign, $dayRow);
                }
            }

            $status = $meta['warnings'] !== [] ? CostSyncRun::STATUS_PARTIAL : CostSyncRun::STATUS_SUCCESS;

            $run->update([
                'status' => $status,
                'rows_upserted' => $rowsUpserted,
                'finished_at' => now(),
                'meta' => $meta,
            ]);
        } catch (Throwable $e) {
            Log::error('taboola.cost_sync aborted', ['error' => $e->getMessage()]);
            $run->update([
                'status' => CostSyncRun::STATUS_FAILED,
                'error_message' => $e->getMessage(),
                'finished_at' => now(),
                'meta' => $meta,
            ]);

            throw $e;
        }

        $run->refresh();

        return $run;
    }

    public function getSourceKey(): string
    {
        return 'taboola';
    }

    private function ingestDaySpendForCampaign(Campaign $campaign, CostSpendDayRow $row): int
    {
        $campaignId = (int) $campaign->id;
        $amount = $row->amount;

        $dayStartUtc = CarbonImmutable::parse($row->day, 'UTC')->startOfDay();
        $dayEndUtc = $dayStartUtc->endOfDay();

        $visitsQuery = Visit::query()
            ->where('campaign_id', $campaignId)
            ->whereBetween('created_at', [$dayStartUtc, $dayEndUtc]);

        if ($row->countryCode !== null && $row->countryCode !== '') {
            $visitsQuery->where('country_code', strtoupper(substr($row->countryCode, 0, 2)));
        }

        $visits = $visitsQuery->get(['created_at', 'lander_id', 'country_code']);

        $sourceKey = $this->costAdapter->getSourceKey();
        $countryStored = $row->countryCode ? strtoupper(substr($row->countryCode, 0, 2)) : null;

        if ($visits->isEmpty()) {
            CostEntry::query()->updateOrCreate(
                [
                    'campaign_id' => $campaignId,
                    'source' => $sourceKey,
                    'country_code' => $countryStored,
                    'bucket_start' => $dayStartUtc,
                ],
                [
                    'external_campaign_id' => (string) $campaign->external_traffic_campaign_id,
                    'amount' => round($amount, 2),
                    'metadata' => [
                        'lander_shares' => [],
                        'note' => 'no_visits_for_day_allocation_fallback',
                    ],
                ]
            );

            return 1;
        }

        $bucketWeights = [];
        $bucketLanderWeights = [];

        foreach ($visits as $v) {
            $bucket = $this->bucketStartUtc(Carbon::parse($v->created_at));
            $bk = $bucket->toIso8601String();
            $bucketWeights[$bk] = ($bucketWeights[$bk] ?? 0) + 1;

            $landerKey = $v->lander_id ?? 0;
            $bucketLanderWeights[$bk] ??= [];
            $bucketLanderWeights[$bk][$landerKey] = ($bucketLanderWeights[$bk][$landerKey] ?? 0) + 1;
        }

        $bucketAmounts = $this->splitProportionally($bucketWeights, $amount);

        $upserts = 0;
        foreach ($bucketAmounts as $bk => $bucketAmount) {
            $bucketStart = CarbonImmutable::parse($bk);
            $landers = $bucketLanderWeights[$bk] ?? [];
            $landerAmounts = $this->splitProportionally($landers, (float) $bucketAmount);

            $landerShares = [];
            foreach ($landerAmounts as $landerKey => $amt) {
                if ((int) $landerKey === 0) {
                    $landerShares[] = [
                        'lander_id' => null,
                        'allocated_amount' => round((float) $amt, 2),
                    ];

                    continue;
                }
                $landerShares[] = [
                    'lander_id' => (int) $landerKey,
                    'allocated_amount' => round((float) $amt, 2),
                ];
            }

            CostEntry::query()->updateOrCreate(
                [
                    'campaign_id' => $campaignId,
                    'source' => $sourceKey,
                    'country_code' => $countryStored,
                    'bucket_start' => $bucketStart,
                ],
                [
                    'external_campaign_id' => (string) $campaign->external_traffic_campaign_id,
                    'amount' => round((float) $bucketAmount, 2),
                    'metadata' => ['lander_shares' => $landerShares],
                ]
            );
            ++$upserts;
        }

        return $upserts;
    }

    private function bucketStartUtc(Carbon $at): CarbonImmutable
    {
        $t = CarbonImmutable::instance($at)->utc();
        $slotMinutes = intdiv((int) $t->minute, 15) * 15;

        return $t->startOfHour()->addMinutes($slotMinutes)->setSecond(0)->setMicrosecond(0);
    }

    /**
     * @param  array<int|string, float|int>  $weights
     * @return array<int|string, float>
     */
    private function splitProportionally(array $weights, float $total): array
    {
        $keys = array_keys($weights);
        $sum = (float) array_sum($weights);
        if ($keys === [] || $sum <= 0) {
            return array_fill_keys($keys, 0.0);
        }

        $out = [];
        $allocated = 0.0;
        $lastKey = $keys[array_key_last($keys)];

        foreach ($keys as $k) {
            if ($k === $lastKey) {
                $out[$k] = round($total - $allocated, 2);

                continue;
            }

            $portion = round($total * ((float) $weights[$k] / $sum), 2);
            $out[$k] = $portion;
            $allocated += $portion;
        }

        return $out;
    }
}
