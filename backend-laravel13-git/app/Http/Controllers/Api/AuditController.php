<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $farmId = $request->user()?->farm_id;

        return response()->json([
            'data' => AuditLog::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->latest()
                ->limit(100)
                ->get(),
        ]);
    }
}

