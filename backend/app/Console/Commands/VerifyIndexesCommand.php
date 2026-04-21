<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

final class VerifyIndexesCommand extends Command
{
    protected $signature = 'tds:verify-indexes';

    protected $description = 'Verifies expected performance indexes exist on core tables';

    public function handle(): int
    {
        $driver = DB::getDriverName();
        if (! in_array($driver, ['pgsql', 'mysql', 'mariadb'], true)) {
            $this->warn("Index verification supports pgsql, mysql, and mariadb. Current driver: {$driver}");

            return self::SUCCESS;
        }

        $expected = [
            'visits' => ['visits_campaign_id_created_at_index', 'visits_campaign_geo_device_created_idx'],
            'clicks' => ['clicks_campaign_id_created_at_index', 'clicks_campaign_geo_device_created_idx'],
            'conversions' => ['conversions_campaign_id_created_at_index', 'conversions_campaign_geo_device_created_idx'],
        ];

        foreach ($expected as $table => $indexes) {
            if ($driver === 'pgsql') {
                $rows = DB::select("SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = ?", [$table]);
                $actual = collect($rows)->pluck('indexname')->map(fn ($n) => strtolower((string) $n))->all();
            } else {
                $rows = DB::select(
                    'SELECT DISTINCT INDEX_NAME AS indexname FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ?',
                    [$table]
                );
                $actual = collect($rows)->pluck('indexname')->map(fn ($n) => strtolower((string) $n))->all();
            }

            $expectedLower = array_map(strtolower(...), $indexes);
            $missing = array_values(array_diff($expectedLower, $actual));

            if (count($missing) > 0) {
                $this->error($table.' missing indexes: '.implode(', ', $missing));
                continue;
            }

            $this->info($table.' indexes OK');
        }

        return self::SUCCESS;
    }
}
