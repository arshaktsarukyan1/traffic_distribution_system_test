<?php

namespace App\Http\Middleware;

use App\Models\PersonalAccessToken;
use App\Support\ApiError;
use App\Support\ApiErrorCodeEnum;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class ApiTokenAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $providedToken = (string) $request->bearerToken();

        if ($providedToken === '') {
            return $this->unauthorizedResponse($request);
        }

        $token = PersonalAccessToken::query()
            ->where('token_hash', hash('sha256', $providedToken))
            ->with('user')
            ->first();

        if ($token === null || $token->isExpired()) {
            return $this->unauthorizedResponse($request);
        }

        $token->forceFill(['last_used_at' => now()])->save();
        Auth::setUser($token->user);
        $request->attributes->set('access_token_id', $token->id);

        return $next($request);
    }

    private function unauthorizedResponse(Request $request): JsonResponse
    {
        return ApiError::respond(
            'Unauthenticated.',
            401,
            [],
            $request,
            ApiErrorCodeEnum::Unauthenticated,
        );
    }
}
