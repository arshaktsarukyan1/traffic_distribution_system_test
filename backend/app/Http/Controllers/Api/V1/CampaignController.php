<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreCampaignRequest;
use App\Http\Requests\Api\V1\UpdateCampaignRequest;
use App\Services\Campaign\CampaignService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class CampaignController extends Controller
{
    public function __construct(private readonly CampaignService $campaignService)
    {
    }

    public function index(): JsonResponse
    {
        return response()->json($this->campaignService->paginateIndex((int) Auth::id()));
    }

    public function store(StoreCampaignRequest $request): JsonResponse
    {
        $campaign = $this->campaignService->create((int) Auth::id(), $request->validated());

        return response()->json(['data' => $campaign], 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(['data' => $this->campaignService->findForShow((int) Auth::id(), $id)]);
    }

    public function update(UpdateCampaignRequest $request, int $id): JsonResponse
    {
        $campaign = $this->campaignService->update((int) Auth::id(), $id, $request->validated());

        return response()->json(['data' => $campaign]);
    }

    public function activate(int $id): JsonResponse
    {
        return response()->json(['data' => $this->campaignService->setStatus((int) Auth::id(), $id, 'active')]);
    }

    public function pause(int $id): JsonResponse
    {
        return response()->json(['data' => $this->campaignService->setStatus((int) Auth::id(), $id, 'paused')]);
    }

    public function archive(int $id): JsonResponse
    {
        return response()->json(['data' => $this->campaignService->setStatus((int) Auth::id(), $id, 'archived')]);
    }
}
