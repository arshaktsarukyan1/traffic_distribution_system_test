<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LoginRequest;
use App\Http\Requests\Api\V1\RegisterRequest;
use App\Models\User;
use App\Services\Auth\AuthService;
use App\Support\ApiError;
use App\Support\ApiErrorCodeEnum;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(
        private readonly AuthService $authService,
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $authResult = $this->authService->register($request->validated());

        return response()->json([
            'data' => [
                'user' => $this->authService->serializeUser($authResult['user']),
                'token' => $authResult['token'],
                'token_type' => 'Bearer',
                'expires_at' => $authResult['expires_at'],
            ],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $authResult = $this->authService->attemptLogin($request->validated());
        if ($authResult === null) {
            return ApiError::respond(
                'The provided credentials are incorrect.',
                401,
                [],
                $request,
                ApiErrorCodeEnum::Unauthenticated,
            );
        }

        return response()->json([
            'data' => [
                'user' => $this->authService->serializeUser($authResult['user']),
                'token' => $authResult['token'],
                'token_type' => 'Bearer',
                'expires_at' => $authResult['expires_at'],
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logoutByTokenId((int) $request->attributes->get('access_token_id', 0));

        return response()->json([
            'data' => [
                'message' => 'Logged out successfully.',
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => $this->authService->serializeUser($user),
        ]);
    }
}
