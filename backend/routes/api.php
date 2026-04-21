<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\CampaignController;
use App\Http\Controllers\Api\V1\DomainController;
use App\Http\Controllers\Api\V1\TrafficSourceController;
use App\Http\Controllers\Api\V1\LanderController;
use App\Http\Controllers\Api\V1\OfferController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\TargetingRuleController;
use App\Http\Controllers\Api\V1\ConversionController;
use App\Http\Controllers\Api\V1\OpsController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Public\HealthController;
use App\Http\Controllers\Public\RedirectController;
use App\Http\Controllers\Public\TrackerController;
use App\Http\Controllers\Public\ClickController;
use App\Http\Controllers\Webhooks\ShopifyWebhookController;

Route::get('/health', [HealthController::class, 'index']);

Route::prefix('v1')->group(function (): void {
    Route::prefix('auth')->group(function (): void {
        Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth.register');
        Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth.login');
    });

    Route::prefix('tracking')->middleware('throttle:tracking')->group(function (): void {
        Route::post('/events', [TrackerController::class, 'event']);
    });
    Route::post('/events', [TrackerController::class, 'event'])->middleware('throttle:tracking');

    Route::middleware('auth.token')->group(function (): void {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);

        Route::get('/traffic-sources', [TrafficSourceController::class, 'index']);

        Route::get('/domains', [DomainController::class, 'index']);
        Route::post('/domains', [DomainController::class, 'store']);
        Route::get('/domains/{id}', [DomainController::class, 'show']);
        Route::patch('/domains/{id}', [DomainController::class, 'update']);
        Route::delete('/domains/{id}', [DomainController::class, 'destroy']);

        Route::get('/campaigns', [CampaignController::class, 'index']);
        Route::post('/campaigns', [CampaignController::class, 'store']);
        Route::get('/campaigns/{id}', [CampaignController::class, 'show']);
        Route::patch('/campaigns/{id}', [CampaignController::class, 'update']);
        Route::post('/campaigns/{id}/activate', [CampaignController::class, 'activate']);
        Route::post('/campaigns/{id}/pause', [CampaignController::class, 'pause']);
        Route::post('/campaigns/{id}/archive', [CampaignController::class, 'archive']);

        Route::get('/landers', [LanderController::class, 'index']);
        Route::post('/landers', [LanderController::class, 'store']);
        Route::patch('/landers/{id}', [LanderController::class, 'update']);
        Route::delete('/landers/{id}', [LanderController::class, 'destroy']);

        Route::get('/offers', [OfferController::class, 'index']);
        Route::post('/offers', [OfferController::class, 'store']);
        Route::patch('/offers/{id}', [OfferController::class, 'update']);
        Route::delete('/offers/{id}', [OfferController::class, 'destroy']);

        Route::get('/campaigns/{campaignId}/targeting-rules', [TargetingRuleController::class, 'index']);
        Route::post('/campaigns/{campaignId}/targeting-rules', [TargetingRuleController::class, 'store']);
        Route::patch('/campaigns/{campaignId}/targeting-rules/{id}', [TargetingRuleController::class, 'update']);
        Route::delete('/campaigns/{campaignId}/targeting-rules/{id}', [TargetingRuleController::class, 'destroy']);

        Route::post('/conversions/manual', [ConversionController::class, 'manualStore']);

        Route::get('/reports/kpi', [ReportController::class, 'kpi']);
        Route::get('/reports/countries', [ReportController::class, 'countries']);
        Route::get('/reports/ab-tests', [ReportController::class, 'abTests']);
        Route::get('/ops/sync-runs', [OpsController::class, 'syncRuns']);
    });

});

Route::middleware(['throttle:redirect', 'public.metrics'])->group(function (): void {
    Route::get('/campaign/{campaignSlug}', [RedirectController::class, 'handle'])->name('public.redirect');
    Route::get('/r/{campaignSlug}', [RedirectController::class, 'handle'])->name('public.redirect.legacy');
});

Route::middleware(['throttle:tracker_script', 'public.metrics'])->group(function (): void {
    Route::get('/tracker/{campaignId}.js', [TrackerController::class, 'script'])->name('public.tracker_script');
});

Route::middleware(['throttle:click', 'public.metrics'])->group(function (): void {
    Route::get('/click', [ClickController::class, 'handle'])->name('public.click');
});
