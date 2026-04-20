<?php

use App\Http\Controllers\Webhooks\ShopifyWebhookController;
use App\Http\Middleware\AssignCorrelationId;
use App\Support\ApiError;
use App\Support\ApiErrorCode;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function (): void {
            Route::middleware(['api', 'throttle:webhooks'])
                ->post('/webhooks/shopify/orders', [ShopifyWebhookController::class, 'orders']);
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            AssignCorrelationId::class,
        ]);
        $middleware->alias([
            'internal.api' => \App\Http\Middleware\InternalApiAuth::class,
            'public.metrics' => \App\Http\Middleware\RecordPublicRouteMetrics::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request, \Throwable $e): bool => ApiError::wantsJson($request)
        );

        $exceptions->renderable(function (ValidationException $e, Request $request) {
            if (! ApiError::wantsJson($request)) {
                return null;
            }

            return ApiError::respond(
                $e->getMessage(),
                $e->status,
                $e->errors(),
                $request,
                ApiErrorCode::ValidationFailed,
            );
        });

        $exceptions->renderable(function (AuthenticationException $e, Request $request) {
            if (! ApiError::wantsJson($request)) {
                return null;
            }

            return ApiError::respond(
                $e->getMessage() ?: 'Unauthenticated.',
                401,
                [],
                $request,
                ApiErrorCode::Unauthenticated,
            );
        });

        $exceptions->renderable(function (NotFoundHttpException $e, Request $request) {
            if (! ApiError::wantsJson($request)) {
                return null;
            }

            $previous = $e->getPrevious();
            $message = $previous instanceof ModelNotFoundException
                ? ApiError::modelNotFoundMessage($previous)
                : ($e->getMessage() !== '' ? $e->getMessage() : 'Resource not found.');

            return ApiError::respond(
                $message,
                404,
                [],
                $request,
                ApiErrorCode::NotFound,
            );
        });

        $exceptions->renderable(function (AccessDeniedHttpException $e, Request $request) {
            if (! ApiError::wantsJson($request)) {
                return null;
            }

            $message = $e->getMessage() !== '' ? $e->getMessage() : 'This action is unauthorized.';

            return ApiError::respond(
                $message,
                403,
                [],
                $request,
                ApiErrorCode::Forbidden,
            );
        });

        $exceptions->renderable(function (HttpException $e, Request $request) {
            if (! ApiError::wantsJson($request)) {
                return null;
            }

            $status = $e->getStatusCode();
            $message = $e->getMessage() !== ''
                ? $e->getMessage()
                : (\Illuminate\Http\Response::$statusTexts[$status] ?? 'Error');

            return ApiError::respond(
                $message,
                $status,
                [],
                $request,
                ApiErrorCode::fromHttpStatus($status),
            );
        });
    })->create();
