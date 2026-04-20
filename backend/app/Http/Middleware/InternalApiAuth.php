<?php

namespace App\Http\Middleware;

use App\Support\ApiError;
use App\Support\ApiErrorCode;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class InternalApiAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $expectedToken = (string) config('tds.internal_api_token', '');

        if ($expectedToken === '') {
            return ApiError::respond(
                'Internal API token is not configured.',
                503,
                [],
                $request,
                ApiErrorCode::ServiceUnavailable,
            );
        }

        $providedToken = (string) $request->bearerToken();

        if ($providedToken === '' || ! hash_equals($expectedToken, $providedToken)) {
            return $this->unauthorizedResponse($request);
        }

        return $next($request);
    }

    private function unauthorizedResponse(Request $request): JsonResponse
    {
        return ApiError::respond(
            'Unauthenticated.',
            401,
            [],
            $request,
            ApiErrorCode::Unauthenticated,
        );
    }
}
