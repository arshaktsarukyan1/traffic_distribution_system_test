<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ReportAbTestsRequest;
use App\Http\Requests\Api\V1\ReportKpiRequest;
use App\Services\Reporting\ReportingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class ReportController extends Controller
{
    public function __construct(private readonly ReportingService $reportingService)
    {
    }

    public function kpi(ReportKpiRequest $request): JsonResponse
    {
        return response()->json([
            'data' => $this->reportingService->buildKpiReport((int) Auth::id(), $request->validated()),
        ]);
    }

    public function abTests(ReportAbTestsRequest $request): JsonResponse
    {
        return response()->json([
            'data' => $this->reportingService->buildAbTestsReport((int) Auth::id(), $request->validated()),
        ]);
    }
}
