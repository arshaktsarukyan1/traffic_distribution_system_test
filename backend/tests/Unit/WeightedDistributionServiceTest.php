<?php

namespace Tests\Unit;

use App\Services\WeightedDistributionService;
use InvalidArgumentException;
use Tests\TestCase;

class WeightedDistributionServiceTest extends TestCase
{
    public function test_it_rejects_malformed_split_config(): void
    {
        $service = new WeightedDistributionService();

        $this->expectException(InvalidArgumentException::class);
        $service->validateSplitConfig([
            ['id' => 1, 'weight_percent' => 60, 'is_active' => true],
            ['id' => 2, 'weight_percent' => 30, 'is_active' => true],
        ]);
    }

    public function test_deterministic_selection_is_repeatable_for_same_seed(): void
    {
        $service = new WeightedDistributionService();
        $split = [
            ['id' => 10, 'weight_percent' => 80, 'is_active' => true],
            ['id' => 20, 'weight_percent' => 20, 'is_active' => true],
        ];

        $first = $service->pickWeighted($split, 12345);
        $second = $service->pickWeighted($split, 12345);

        $this->assertSame($first['id'], $second['id']);
    }

    public function test_inactive_rows_are_excluded_and_active_weights_must_sum_to_100(): void
    {
        $service = new WeightedDistributionService();
        $split = [
            ['id' => 1, 'weight_percent' => 50, 'is_active' => true],
            ['id' => 2, 'weight_percent' => 50, 'is_active' => true],
            ['id' => 3, 'weight_percent' => 50, 'is_active' => false],
        ];

        $normalized = $service->validateSplitConfig($split);
        $this->assertCount(2, $normalized);
        $this->assertSame(100, array_sum(array_column($normalized, 'weight_percent')));
    }

    public function test_random_selection_distribution_approximates_weights_over_10k_runs(): void
    {
        $service = new WeightedDistributionService();
        $split = [
            ['id' => 1, 'weight_percent' => 70, 'is_active' => true],
            ['id' => 2, 'weight_percent' => 30, 'is_active' => true],
        ];

        $counts = [1 => 0, 2 => 0];
        $runs = 10000;

        for ($i = 0; $i < $runs; $i++) {
            $selected = $service->pickWeighted($split);
            $counts[$selected['id']]++;
        }

        $ratioA = ($counts[1] / $runs) * 100;
        $ratioB = ($counts[2] / $runs) * 100;

        $this->assertTrue(abs($ratioA - 70) <= 2.0, 'Split A distribution is outside tolerance.');
        $this->assertTrue(abs($ratioB - 30) <= 2.0, 'Split B distribution is outside tolerance.');
    }

    public function test_pick_weighted_preserves_url_from_split_rows(): void
    {
        $service = new WeightedDistributionService();
        $split = [
            ['id' => 1, 'url' => 'https://a.example/', 'weight_percent' => 100, 'is_active' => true],
        ];

        $selected = $service->pickWeighted($split, 1);

        $this->assertSame('https://a.example/', $selected['url']);
    }
}
