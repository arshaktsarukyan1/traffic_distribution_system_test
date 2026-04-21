<?php

namespace App\Support;

/**
 * Mirrors device detection in {@see \App\Services\Public\PublicTrackerService::javascriptForCampaign}
 * so server-side events get consistent device_type for KPI / filter dimensions.
 */
final class UserAgentDevice
{
    public static function infer(?string $userAgent): string
    {
        $low = strtolower((string) $userAgent);

        if ($low === '') {
            return 'desktop';
        }

        if (preg_match('/tablet|ipad/', $low) === 1) {
            return 'tablet';
        }

        if (preg_match('/mobile|iphone|android/', $low) === 1) {
            return 'mobile';
        }

        return 'desktop';
    }
}
