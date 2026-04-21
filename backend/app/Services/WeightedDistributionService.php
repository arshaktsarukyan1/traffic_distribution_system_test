<?php

namespace App\Services;

use InvalidArgumentException;

class WeightedDistributionService
{
    public function pickWeighted(array $rows, ?int $seed = null): array
    {
        $normalizedRows = $this->validateSplitConfig($rows);
        $totalWeight = array_sum(array_column($normalizedRows, 'weight_percent'));
        $roll = $this->roll($totalWeight, $seed);
        $cumulative = 0;

        foreach ($normalizedRows as $row) {
            $cumulative += $row['weight_percent'];

            if ($roll <= $cumulative) {
                return $row;
            }
        }

        return $normalizedRows[array_key_last($normalizedRows)];
    }

    public function validateSplitConfig(array $rows): array
    {
        if (count($rows) === 0) {
            throw new InvalidArgumentException('Split configuration cannot be empty.');
        }

        $normalizedRows = [];
        $seenIds = [];
        $total = 0;

        foreach ($rows as $index => $row) {
            if (!is_array($row)) {
                throw new InvalidArgumentException(sprintf('Split row at index %d must be an object.', $index));
            }

            $id = (int) ($row['id'] ?? 0);
            $weight = (int) ($row['weight_percent'] ?? 0);
            $isActive = (bool) ($row['is_active'] ?? true);

            if ($id <= 0) {
                throw new InvalidArgumentException(sprintf('Split row at index %d has an invalid id.', $index));
            }

            if ($weight < 1 || $weight > 100) {
                throw new InvalidArgumentException(sprintf('Split row at index %d has invalid weight_percent.', $index));
            }

            if (isset($seenIds[$id])) {
                throw new InvalidArgumentException(sprintf('Split row id %d is duplicated.', $id));
            }

            $seenIds[$id] = true;

            if ($isActive) {
                $total += $weight;
                $entry = [
                    'id' => $id,
                    'weight_percent' => $weight,
                    'is_active' => true,
                ];
                if (array_key_exists('url', $row)) {
                    $entry['url'] = (string) $row['url'];
                }
                $normalizedRows[] = $entry;
            }
        }

        if (count($normalizedRows) === 0) {
            throw new InvalidArgumentException('At least one active split is required.');
        }

        if ($total !== 100) {
            throw new InvalidArgumentException(sprintf('Active split must total 100%%. Current total: %d%%.', $total));
        }

        return $normalizedRows;
    }

    private function roll(int $totalWeight, ?int $seed = null): int
    {
        if ($seed === null) {
            return random_int(1, $totalWeight);
        }

        return (abs(crc32((string) $seed)) % $totalWeight) + 1;
    }
}
