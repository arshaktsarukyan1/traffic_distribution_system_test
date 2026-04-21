<?php

namespace App\Providers;

use App\Contracts\TrafficSourceCostAdapterInterface;
use App\Http\Middleware\RecordPublicRouteMetrics;
use App\Services\Cost\TaboolaCostAdapter;
use App\Services\Cost\TrafficSourceCostSyncRegistry;
use App\Services\Ingestion\IngestionIdempotency;
use App\Services\Observability\KpiSyncHeartbeat;
use App\Services\Observability\Metrics;
use App\Support\ApiError;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Exceptions\Handler;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(Metrics::class);
        $this->app->singleton(KpiSyncHeartbeat::class);
        $this->app->singleton(IngestionIdempotency::class);
        $this->app->singleton(RecordPublicRouteMetrics::class);
        $this->app->bind(TrafficSourceCostAdapterInterface::class, TaboolaCostAdapter::class);
        $this->app->singleton(TrafficSourceCostSyncRegistry::class, function ($app): TrafficSourceCostSyncRegistry {
            /** @var array<int, class-string> $serviceClasses */
            $serviceClasses = config('tds.cost_sync_services', []);
            $services = [];

            foreach ($serviceClasses as $serviceClass) {
                if (!is_string($serviceClass) || $serviceClass === '') {
                    continue;
                }

                $services[] = $app->make($serviceClass);
            }

            return new TrafficSourceCostSyncRegistry($services);
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('auth.register', function (Request $request): Limit {
            return Limit::perMinute((int) config('tds.auth_register_rate_limit_per_minute', 10))
                ->by((string) $request->ip());
        });

        RateLimiter::for('auth.login', function (Request $request): Limit {
            $email = strtolower((string) $request->input('email', ''));
            $key = $email !== '' ? $email.'|'.(string) $request->ip() : (string) $request->ip();

            return Limit::perMinute((int) config('tds.auth_login_rate_limit_per_minute', 10))
                ->by($key);
        });

        RateLimiter::for('tracking', function (Request $request): Limit {
            return Limit::perMinute((int) config('tds.tracking_rate_limit_per_minute', 120))
                ->by((string) $request->ip());
        });

        RateLimiter::for('webhooks', function (Request $request): Limit {
            $by = (string) ($request->header('X-Shopify-Shop-Domain')
                ?: $request->header('X-Forwarded-For')
                ?: $request->ip());

            return Limit::perMinute((int) config('tds.webhook_rate_limit_per_minute', 120))->by($by);
        });

        RateLimiter::for('redirect', function (Request $request): Limit {
            return Limit::perMinute((int) config('tds.redirect_rate_limit_per_minute', 600))
                ->by((string) $request->ip());
        });

        RateLimiter::for('click', function (Request $request): Limit {
            return Limit::perMinute((int) config('tds.click_rate_limit_per_minute', 600))
                ->by((string) $request->ip());
        });

        RateLimiter::for('tracker_script', function (Request $request): Limit {
            return Limit::perMinute((int) config('tds.tracker_script_rate_limit_per_minute', 240))
                ->by((string) $request->ip());
        });

        $this->app->make(Handler::class)->respondUsing(
            function (SymfonyResponse $response, \Throwable $e, Request $request): SymfonyResponse {
                return ApiError::finalizeExceptionJsonEnvelope($response, $e, $request);
            }
        );
    }
}
