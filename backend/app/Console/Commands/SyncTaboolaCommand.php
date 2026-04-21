<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

final class SyncTaboolaCommand extends Command
{
    protected $signature = 'tds:sync-taboola {--from=} {--to=} {--idempotency-key=}';

    protected $description = 'Runs Taboola cost sync';

    public function handle(): int
    {
        $this->call('tds:sync-cost', [
            'source' => 'taboola',
            '--from' => $this->option('from'),
            '--to' => $this->option('to'),
            '--idempotency-key' => $this->option('idempotency-key'),
        ]);

        return self::SUCCESS;
    }
}
