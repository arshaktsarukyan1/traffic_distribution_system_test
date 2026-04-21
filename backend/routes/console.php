<?php

use App\Jobs\AggregateKpi15mJob;
use App\Jobs\RollupKpiDailyJob;
use Illuminate\Support\Facades\Schedule;

Schedule::job(new AggregateKpi15mJob)->everyFifteenMinutes()->withoutOverlapping();

Schedule::job(new RollupKpiDailyJob)->dailyAt('00:35')->withoutOverlapping();

Schedule::command('tds:ops-monitor-kpi-sync')->everyFiveMinutes()->withoutOverlapping();
