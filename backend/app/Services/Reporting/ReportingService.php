<?php

namespace App\Services\Reporting;

use App\Models\Click;
use App\Models\CostEntry;
use App\Models\Kpi15mAggregate;
use App\Services\Kpi\KpiComputationService;
use App\Services\Kpi\VariantWinnerRecommendationService;
use App\Services\Kpi\WinnerThresholds;
use Carbon\CarbonInterface;

final class ReportingService
{
    public function __construct(
        private readonly KpiComputationService $kpiComputation,
        private readonly VariantWinnerRecommendationService $winnerRecommendation,
    ) {
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public function buildKpiReport(int $userId, array $validated): array
    {
        $to = isset($validated['to']) ? now()->parse((string) $validated['to']) : now();
        $from = isset($validated['from']) ? now()->parse((string) $validated['from']) : now()->subDays(7);

        $from = $from->copy()->startOfDay();
        $to = $to->copy()->endOfDay();

        if ($from->greaterThan($to)) {
            [$from, $to] = [$to, $from];
        }

        $seconds = max(60, $to->diffInSeconds($from));
        $prevTo = $from->copy()->subSecond();
        $prevFrom = $prevTo->copy()->subSeconds($seconds)->addSecond();

        $current = $this->readKpiTotals($userId, $validated, $from, $to);
        $previous = $this->readKpiTotals($userId, $validated, $prevFrom, $prevTo);
        $delta = $this->computeDelta($current, $previous);

        return [
            'window' => [
                'from' => $from->toIso8601String(),
                'to' => $to->toIso8601String(),
            ],
            'filters' => [
                'campaign_id' => isset($validated['campaign_id']) ? (int) $validated['campaign_id'] : null,
                'traffic_source_id' => isset($validated['traffic_source_id']) ? (int) $validated['traffic_source_id'] : null,
                'country_code' => isset($validated['country_code']) ? strtoupper((string) $validated['country_code']) : null,
                'device_type' => $validated['device_type'] ?? null,
            ],
            'current' => $current,
            'previous' => $previous,
            'delta' => $delta,
        ];
    }

    /**
     * @return list<string>
     */
    public function listCountryCodes(int $userId): array
    {
        /** @var list<string> $codes */
        $codes = Kpi15mAggregate::query()
            ->join('campaigns', 'campaigns.id', '=', 'kpi_15m_aggregates.campaign_id')
            ->where('campaigns.user_id', $userId)
            ->whereNotNull('kpi_15m_aggregates.country_code')
            ->distinct()
            ->orderBy('kpi_15m_aggregates.country_code')
            ->pluck('kpi_15m_aggregates.country_code')
            ->map(static fn (string $code): string => strtoupper($code))
            ->values()
            ->all();

        return $codes;
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public function buildAbTestsReport(int $userId, array $validated): array
    {
        $campaignId = (int) $validated['campaign_id'];
        $days = (int) ($validated['days'] ?? 30);
        $from = isset($validated['from']) ? now()->parse((string) $validated['from'])->startOfDay() : now()->subDays($days);
        $to = isset($validated['to']) ? now()->parse((string) $validated['to'])->endOfDay() : now();
        if ($from->greaterThan($to)) {
            [$from, $to] = [$to, $from];
        }

        $countryCode = isset($validated['country_code']) && $validated['country_code'] !== null
            ? strtoupper((string) $validated['country_code'])
            : null;
        $deviceType = $validated['device_type'] ?? null;

        $totalClicks = (int) Click::query()
            ->join('campaigns', 'campaigns.id', '=', 'clicks.campaign_id')
            ->where('campaigns.user_id', $userId)
            ->where('clicks.campaign_id', $campaignId)
            ->whereBetween('clicks.created_at', [$from, $to])
            ->when($countryCode !== null, fn ($q) => $q->where('clicks.country_code', $countryCode))
            ->when($deviceType !== null, fn ($q) => $q->where('clicks.device_type', $deviceType))
            ->count();

        $totalCost = (float) CostEntry::query()
            ->join('campaigns', 'campaigns.id', '=', 'cost_entries.campaign_id')
            ->where('campaigns.user_id', $userId)
            ->where('cost_entries.campaign_id', $campaignId)
            ->whereBetween('bucket_start', [$from, $to])
            ->when($countryCode !== null, fn ($q) => $q->where('country_code', $countryCode))
            ->sum('amount');

        $aggregated = Click::query()
            ->join('campaigns', 'campaigns.id', '=', 'clicks.campaign_id')
            ->leftJoin('conversions', 'conversions.click_id', '=', 'clicks.id')
            ->where('campaigns.user_id', $userId)
            ->where('clicks.campaign_id', $campaignId)
            ->whereBetween('clicks.created_at', [$from, $to])
            ->whereNotNull('clicks.offer_id')
            ->when($countryCode !== null, fn ($q) => $q->where('clicks.country_code', $countryCode))
            ->when($deviceType !== null, fn ($q) => $q->where('clicks.device_type', $deviceType))
            ->groupBy('clicks.offer_id')
            ->selectRaw('
                clicks.offer_id as offer_id,
                COUNT(*) as clicks,
                COUNT(conversions.id) as conversions,
                COALESCE(SUM(conversions.amount), 0) as revenue
            ')
            ->orderBy('clicks.offer_id')
            ->get();

        $variants = [];
        foreach ($aggregated as $row) {
            $c = (int) $row->clicks;
            $allocatedCost = $totalClicks > 0 ? $totalCost * ($c / $totalClicks) : 0.0;
            $key = 'offer:'.(int) $row->offer_id;
            $k = $this->kpiComputation->compute(0, $c, (int) $row->conversions, (float) $row->revenue, $allocatedCost);
            $variants[] = [
                'variant_key' => $key,
                'offer_id' => (int) $row->offer_id,
                'visits' => 0,
                'clicks' => $c,
                'conversions' => (int) $row->conversions,
                'revenue' => $k->revenue,
                'cost' => $k->cost,
                'kpi' => $k->toArray(),
            ];
        }

        $winnerInput = array_map(static function (array $v): array {
            return [
                'variant_key' => $v['variant_key'],
                'visits' => $v['visits'],
                'clicks' => $v['clicks'],
                'conversions' => $v['conversions'],
                'revenue' => $v['revenue'],
                'cost' => $v['cost'],
            ];
        }, $variants);

        $thresholds = new WinnerThresholds(
            minClicks: (int) config('tds.winner_recommendation.min_clicks', 100),
            confidenceFloorPercent: (float) config('tds.winner_recommendation.confidence_floor_percent', 1.0),
            profitTieRelativeEpsilon: (float) config('tds.winner_recommendation.profit_tie_relative_epsilon', 0.01),
        );

        $recommendation = $this->winnerRecommendation->recommend($winnerInput, $thresholds);

        return [
            'campaign_id' => $campaignId,
            'window_days' => $days,
            'window' => [
                'from' => $from->toIso8601String(),
                'to' => $to->toIso8601String(),
            ],
            'filters' => [
                'country_code' => $countryCode,
                'device_type' => $deviceType,
            ],
            'recommendation' => $recommendation->toArray(),
            'variants' => $variants,
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function readKpiTotals(int $userId, array $filters, CarbonInterface $from, CarbonInterface $to): array
    {
        $countryCode = isset($filters['country_code']) && $filters['country_code'] !== null
            ? strtoupper((string) $filters['country_code'])
            : null;
        $deviceType = $filters['device_type'] ?? null;
        $trafficSourceId = isset($filters['traffic_source_id']) && $filters['traffic_source_id'] !== null
            ? (int) $filters['traffic_source_id']
            : null;
        $campaignId = isset($filters['campaign_id']) && $filters['campaign_id'] !== null
            ? (int) $filters['campaign_id']
            : null;

        $query = Kpi15mAggregate::query()
            ->join('campaigns', 'campaigns.id', '=', 'kpi_15m_aggregates.campaign_id')
            ->where('campaigns.user_id', $userId)
            ->when(
                $trafficSourceId !== null,
                fn ($q) => $q
                    ->where('campaigns.traffic_source_id', $trafficSourceId)
            )
            ->when($campaignId !== null, fn ($q) => $q->where('kpi_15m_aggregates.campaign_id', $campaignId))
            ->when($countryCode !== null, fn ($q) => $q->where('kpi_15m_aggregates.country_code', $countryCode))
            ->when($deviceType !== null, fn ($q) => $q->where('kpi_15m_aggregates.device_type', $deviceType))
            ->whereBetween('kpi_15m_aggregates.bucket_start', [$from, $to]);

        $totals = $query->selectRaw('
                COALESCE(SUM(kpi_15m_aggregates.visits), 0) as visits,
                COALESCE(SUM(kpi_15m_aggregates.clicks), 0) as clicks,
                COALESCE(SUM(kpi_15m_aggregates.conversions), 0) as conversions,
                COALESCE(SUM(kpi_15m_aggregates.revenue), 0) as revenue,
                COALESCE(SUM(kpi_15m_aggregates.cost), 0) as cost
            ')->first();

        $kpi = $this->kpiComputation->compute(
            (int) ($totals->visits ?? 0),
            (int) ($totals->clicks ?? 0),
            (int) ($totals->conversions ?? 0),
            (float) ($totals->revenue ?? 0),
            (float) ($totals->cost ?? 0),
        );

        return $kpi->toArray();
    }

    /**
     * @param  array<string, mixed>  $current
     * @param  array<string, mixed>  $previous
     * @return array<string, array{abs: float|null, pct: float|null}>
     */
    private function computeDelta(array $current, array $previous): array
    {
        $out = [];
        foreach ($current as $key => $curVal) {
            $prevVal = $previous[$key] ?? null;
            if ($curVal === null || $prevVal === null) {
                $out[$key] = ['abs' => null, 'pct' => null];
                continue;
            }

            $cur = (float) $curVal;
            $prev = (float) $prevVal;
            $abs = round($cur - $prev, 2);
            $pct = $prev != 0.0 ? round((($cur - $prev) / abs($prev)) * 100, 2) : null;
            $out[$key] = ['abs' => $abs, 'pct' => $pct];
        }

        return $out;
    }
}
