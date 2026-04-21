<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreLanderRequest;
use App\Http\Requests\Api\V1\UpdateLanderRequest;
use App\Services\LanderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class LanderController extends Controller
{
    public function __construct(private readonly LanderService $landerService)
    {
    }

    public function index(): JsonResponse
    {
        return response()->json($this->landerService->paginateIndex((int) Auth::id()));
    }

    public function store(StoreLanderRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->landerService->create((int) Auth::id(), $request->validated())], 201);
    }

    public function update(UpdateLanderRequest $request, int $id): JsonResponse
    {
        return response()->json(['data' => $this->landerService->update((int) Auth::id(), $id, $request->validated())]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->landerService->delete((int) Auth::id(), $id);

        return response()->json([], 204);
    }
}
