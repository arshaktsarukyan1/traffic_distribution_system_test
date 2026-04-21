<?php

namespace App\Console\Commands;

use App\Models\IngestionIdempotencyKey;
use App\Services\Cost\TrafficSourceCostSyncRegistry;
use App\Services\Ingestion\IngestionIdempotency;
use App\Services\Observability\Metrics;
use Carbon\Carbon;
use Illuminate\Console\Command;

final class SyncCostCommand extends Command
{
    protected $signature = 'tds:sync-cost {source=taboola} {--from=} {--to=} {--idempotency-key=}';

    protected $description = 'Runs cost sync for a traffic source';

    public function handle(
        IngestionIdempotency $idempotency,
        TrafficSourceCostSyncRegistry $registry,
        Metrics $metrics,
    ): int {
        $fromOpt = $this->option('from');
        $toOpt = $this->option('to');
        $sourceKey = strtolower(trim((string) $this->argument('source')));

        $from = $fromOpt
            ? Carbon::parse((string) $fromOpt)->utc()->startOfDay()
            : now()->subDay()->utc()->startOfDay();
        $to = $toOpt
            ? Carbon::parse((string) $toOpt)->utc()->endOfDay()
            : now()->utc()->endOfDay();

        $idemKey = (string) $this->option('idempotency-key');
        $scope = $sourceKey === 'taboola'
            ? IngestionIdempotencyKey::SCOPE_TABOOLA_COST_SYNC
            : 'cost_sync_'.$sourceKey;

        if ($idemKey !== '' && ! $idempotency->tryAcquire($scope, $idemKey)) {
            $this->warn('Duplicate idempotency key — skipping sync.');

            return self::SUCCESS;
        }

        try {
            $run = $registry->sync($sourceKey, $from, $to);
            $metrics->increment("sync.{$sourceKey}.success");
            $this->info(ucfirst($sourceKey)." sync finished: run_id={$run->id} status={$run->status} rows={$run->rows_upserted}");

            return self::SUCCESS;
        } catch (\Throwable $e) {
            if ($idemKey !== '') {
                $idempotency->release($scope, $idemKey);
            }
            $metrics->increment("sync.{$sourceKey}.errors");

            throw $e;
        }
    }
}
