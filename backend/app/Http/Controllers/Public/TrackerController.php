<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\TrackerEventRequest;
use App\Services\Public\PublicTrackerService;
use App\Support\ApiError;
use App\Support\ApiErrorCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class TrackerController extends Controller
{
    public function __construct(private readonly PublicTrackerService $trackerService)
    {
    }

    public function script(int $campaignId): Response
    {
        if (! $this->trackerService->campaignExists($campaignId)) {
            abort(404, 'Campaign not found');
        }

        $script = $this->trackerService->javascriptForCampaign($campaignId);

        return response($script, 200, ['Content-Type' => 'application/javascript']);
    }

    public function event(TrackerEventRequest $request): JsonResponse
    {
        $payload = $request->validated();

        $result = $this->trackerService->recordEvent($payload, $request);

        if ($result === null) {
            return ApiError::respond('Campaign not found.', 404, [], $request, ApiErrorCode::NotFound);
        }

        return response()
            ->json(['ok' => true, 'session_uuid' => $result['session_uuid']], 202)
            ->cookie('tds_session_uuid', $result['session_uuid'], 60 * 24 * 30);
    }
}
