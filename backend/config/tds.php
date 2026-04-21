<?php

return [
    'auth_token_ttl_minutes' => (int) env('AUTH_TOKEN_TTL_MINUTES', 1440),
    'auth_register_rate_limit_per_minute' => (int) env('AUTH_REGISTER_RATE_LIMIT_PER_MINUTE', 10),
    'auth_login_rate_limit_per_minute' => (int) env('AUTH_LOGIN_RATE_LIMIT_PER_MINUTE', 10),
    'shopify_webhook_secret' => env('SHOPIFY_WEBHOOK_SECRET', ''),
    'tracking_rate_limit_per_minute' => (int) env('TRACKING_RATE_LIMIT_PER_MINUTE', 120),
    'webhook_rate_limit_per_minute' => (int) env('WEBHOOK_RATE_LIMIT_PER_MINUTE', 120),
    'redirect_rate_limit_per_minute' => (int) env('REDIRECT_RATE_LIMIT_PER_MINUTE', 600),
    'click_rate_limit_per_minute' => (int) env('CLICK_RATE_LIMIT_PER_MINUTE', 600),
    'tracker_script_rate_limit_per_minute' => (int) env('TRACKER_SCRIPT_RATE_LIMIT_PER_MINUTE', 240),
    'redirect_cache_ttl_seconds' => (int) env('REDIRECT_CACHE_TTL_SECONDS', 60),

    'kpi_15m_lookback_hours' => (int) env('TDS_KPI_15M_LOOKBACK_HOURS', 6),

    /** Alert when the 15m KPI aggregate job has not succeeded within this many minutes */
    'kpi_sync_alert_after_minutes' => (int) env('TDS_KPI_SYNC_ALERT_AFTER_MINUTES', 22),

    'kpi_daily_rollup_lookback_days' => (int) env('TDS_KPI_DAILY_ROLLUP_LOOKBACK_DAYS', 45),

    'winner_recommendation' => [
        'min_clicks' => (int) env('TDS_WINNER_MIN_CLICKS', 100),
        'confidence_floor_percent' => (float) env('TDS_WINNER_CONFIDENCE_FLOOR_PERCENT', 1.0),
        'profit_tie_relative_epsilon' => (float) env('TDS_WINNER_PROFIT_TIE_EPSILON', 0.01),
    ],

    /*
    |--------------------------------------------------------------------------
    | Cost Sync Service Registry
    |--------------------------------------------------------------------------
    |
    | Class list for traffic source cost sync strategies. To add a new traffic
    | source sync implementation, add its service class here.
    |
    */
    'cost_sync_services' => [
        \App\Services\Cost\TaboolaCostSyncService::class,
    ],
];
