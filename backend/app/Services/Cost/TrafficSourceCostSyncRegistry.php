<?php

namespace App\Services\Cost;

use App\Contracts\TrafficSourceCostSyncServiceInterface;
use App\Models\CostSyncRun;
use DateTimeInterface;
use InvalidArgumentException;

final class TrafficSourceCostSyncRegistry
{
    /**
     * @var array<string, TrafficSourceCostSyncServiceInterface>
     */
    private array $servicesBySource = [];

    /**
     * @param  iterable<TrafficSourceCostSyncServiceInterface>  $services
     */
    public function __construct(iterable $services)
    {
        foreach ($services as $service) {
            $sourceKey = strtolower(trim($service->getSourceKey()));
            if ($sourceKey === '') {
                continue;
            }

            if (isset($this->servicesBySource[$sourceKey])) {
                throw new InvalidArgumentException("Duplicate cost sync service for source [$sourceKey].");
            }

            $this->servicesBySource[$sourceKey] = $service;
        }
    }

    public function sync(string $sourceKey, DateTimeInterface $windowFromUtc, DateTimeInterface $windowToUtc): CostSyncRun
    {
        $service = $this->resolve($sourceKey);

        return $service->sync($windowFromUtc, $windowToUtc);
    }

    public function has(string $sourceKey): bool
    {
        $normalized = strtolower(trim($sourceKey));

        return isset($this->servicesBySource[$normalized]);
    }

    private function resolve(string $sourceKey): TrafficSourceCostSyncServiceInterface
    {
        $normalized = strtolower(trim($sourceKey));

        if (!isset($this->servicesBySource[$normalized])) {
            $available = implode(', ', array_keys($this->servicesBySource));
            throw new InvalidArgumentException(
                "Unsupported traffic source [$normalized] for cost sync. Available: [$available]."
            );
        }

        return $this->servicesBySource[$normalized];
    }
}
