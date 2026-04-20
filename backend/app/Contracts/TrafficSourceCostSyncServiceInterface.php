<?php

namespace App\Contracts;

use App\Models\CostSyncRun;
use DateTimeInterface;

interface TrafficSourceCostSyncServiceInterface
{
    public function getSourceKey(): string;

    public function sync(DateTimeInterface $windowFromUtc, DateTimeInterface $windowToUtc): CostSyncRun;
}
