<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateSettingsRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'message' => 'Farm settings scaffold.',
            'farm_id' => $request->user()?->farm_id
        ]);
    }

    public function update(UpdateSettingsRequest $request): JsonResponse
    {
        return response()->json([
            'message' => 'Farm settings update scaffold.',
            'data' => $request->validated()
        ]);
    }
}
