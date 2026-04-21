<?php

namespace App\Console\Commands;

use App\Services\Kpi\KpiAggregationService;
use Illuminate\Console\Command;

final class RebuildKpiCommand extends Command
{
    protected $signature = 'tds:rebuild-kpi {--from=} {--to=}';

    protected $description = 'Rebuilds all 15m KPI rows from raw events and rolls up daily aggregates';

    public function handle(KpiAggregationService $service): int
    {
        $service->recomputeAll15MinuteFromRaw();
        $service->rollupDailyRecent();
        $this->info('KPI rebuild complete (all 15m buckets from raw + daily rollup).');

        return self::SUCCESS;
    }
}
