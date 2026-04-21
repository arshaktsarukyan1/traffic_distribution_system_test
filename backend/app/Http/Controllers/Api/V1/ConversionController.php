<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreManualConversionRequest;
use App\Services\Conversion\ManualConversionService;
use App\Support\ApiError;
use App\Support\ApiErrorCodeEnum;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class ConversionController extends Controller
{
    public function __construct(private readonly ManualConversionService $manualConversionService)
    {
    }

    public function manualStore(StoreManualConversionRequest $request): JsonResponse
    {
        $result = $this->manualConversionService->createFromValidated((int) Auth::id(), $request->validated());

        if (isset($result['error'])) {
            return ApiError::respond(
                $result['error'],
                422,
                [],
                $request,
                ApiErrorCodeEnum::ManualConversionFailed,
            );
        }

        $conversion = $result['conversion'];

        return response()->json([
            'data' => [
                'id' => $conversion->id,
                'campaign_id' => $conversion->campaign_id,
                'click_id' => $conversion->click_id,
                'amount' => (float) $conversion->amount,
                'converted_at' => $conversion->converted_at?->toIso8601String(),
                'source' => $conversion->source,
                'note' => $conversion->note,
                'metadata' => $conversion->metadata,
            ],
        ], 201);
    }
}
