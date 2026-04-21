<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreOfferRequest;
use App\Http\Requests\Api\V1\UpdateOfferRequest;
use App\Services\OfferService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class OfferController extends Controller
{
    public function __construct(private readonly OfferService $offerService)
    {
    }

    public function index(): JsonResponse
    {
        return response()->json($this->offerService->paginateIndex((int) Auth::id()));
    }

    public function store(StoreOfferRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->offerService->create((int) Auth::id(), $request->validated())], 201);
    }

    public function update(UpdateOfferRequest $request, int $id): JsonResponse
    {
        return response()->json(['data' => $this->offerService->update((int) Auth::id(), $id, $request->validated())]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->offerService->delete((int) Auth::id(), $id);

        return response()->json([], 204);
    }
}
