<?php

namespace App\Console\Commands;

use App\Models\Campaign;
use App\Models\Click;
use App\Models\Conversion;
use App\Models\CostEntry;
use App\Models\Visit;
use Database\Seeders\PhaseOneCoreSeeder;
use Database\Seeders\SyntheticEventSeeder;
use Illuminate\Console\Command;

final class SeedPhase1Command extends Command
{
    protected $signature = 'tds:seed-phase1';

    protected $description = 'Seeds phase 1 data, synthetic events, and aggregates KPI';

    public function handle(): int
    {
        $this->call('db:seed', ['--class' => PhaseOneCoreSeeder::class, '--force' => true]);
        $this->call('db:seed', ['--class' => SyntheticEventSeeder::class, '--force' => true]);
        $this->call('tds:aggregate-kpi');

        $campaign = Campaign::query()->with(['landers', 'offers'])->first();
        if ($campaign === null) {
            $this->error('No campaign created.');

            return self::FAILURE;
        }

        $this->info(sprintf(
            'Seed complete: campaign=%s landers=%d offers=%d visits=%d clicks=%d conversions=%d costs=%d',
            $campaign->slug,
            $campaign->landers()->count(),
            $campaign->offers()->count(),
            Visit::query()->count(),
            Click::query()->count(),
            Conversion::query()->count(),
            CostEntry::query()->count()
        ));

        return self::SUCCESS;
    }
}
