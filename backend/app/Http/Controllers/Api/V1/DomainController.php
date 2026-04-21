<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreDomainRequest;
use App\Http\Requests\Api\V1\UpdateDomainRequest;
use App\Services\DomainService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class DomainController extends Controller
{
    public function __construct(private readonly DomainService $domainService)
    {
    }

    public function index(): JsonResponse
    {
        return response()->json($this->domainService->paginateIndex((int) Auth::id()));
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(['data' => $this->domainService->findForShow((int) Auth::id(), $id)]);
    }

    public function store(StoreDomainRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->domainService->create((int) Auth::id(), $request->validated())], 201);
    }

    public function update(UpdateDomainRequest $request, int $id): JsonResponse
    {
        return response()->json(['data' => $this->domainService->update((int) Auth::id(), $id, $request->validated())]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->domainService->delete((int) Auth::id(), $id);

        return response()->json([], 204);
    }
}
