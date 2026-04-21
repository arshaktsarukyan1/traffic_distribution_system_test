<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreTargetingRuleRequest;
use App\Http\Requests\Api\V1\UpdateTargetingRuleRequest;
use App\Services\TargetingRuleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class TargetingRuleController extends Controller
{
    public function __construct(private readonly TargetingRuleService $targetingRuleService)
    {
    }

    public function index(int $campaignId): JsonResponse
    {
        return response()->json($this->targetingRuleService->paginateForCampaign((int) Auth::id(), $campaignId));
    }

    public function store(StoreTargetingRuleRequest $request, int $campaignId): JsonResponse
    {
        $rule = $this->targetingRuleService->createForCampaign((int) Auth::id(), $campaignId, $request->validated());

        return response()->json(['data' => $rule], 201);
    }

    public function update(UpdateTargetingRuleRequest $request, int $campaignId, int $id): JsonResponse
    {
        return response()->json(['data' => $this->targetingRuleService->update((int) Auth::id(), $campaignId, $id, $request->validated())]);
    }

    public function destroy(int $campaignId, int $id): JsonResponse
    {
        $this->targetingRuleService->delete((int) Auth::id(), $campaignId, $id);

        return response()->json([], 204);
    }
}
