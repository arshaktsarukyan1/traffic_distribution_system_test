<?php

namespace App\Console\Commands;

use App\Models\Kpi15mAggregate;
use App\Models\KpiDailyAggregate;
use App\Services\Kpi\KpiAggregationService;
use Carbon\Carbon;
use Illuminate\Console\Command;

final class AggregateKpiCommand extends Command
{
    protected $signature = 'tds:aggregate-kpi {--from=} {--to=} {--full}';

    protected $description = 'Recomputes KPI aggregates (rolling, range, or full)';

    public function handle(KpiAggregationService $service): int
    {
        if ($this->option('full')) {
            $service->recomputeAll15MinuteFromRaw();
            $service->rollupDailyRecent();
        } elseif ($this->option('from') && $this->option('to')) {
            $service->recompute15MinuteRange(
                Carbon::parse((string) $this->option('from'))->utc(),
                Carbon::parse((string) $this->option('to'))->utc()
            );
            $service->rollupDailyRecent();
        } else {
            $service->recompute15MinuteRolling();
            $service->rollupDailyRecent();
        }

        $fifteenCount = Kpi15mAggregate::query()->count();
        $dailyCount = KpiDailyAggregate::query()->count();
        $this->info("KPI aggregation complete. 15m rows={$fifteenCount}, daily rows={$dailyCount}");

        return self::SUCCESS;
    }
}
