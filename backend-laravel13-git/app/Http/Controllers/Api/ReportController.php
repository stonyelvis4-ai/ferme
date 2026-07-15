<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;

class ReportController extends Controller
{
    public function __construct(private readonly ReportService $reportService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $farmId = $request->user()?->farm_id;

        return response()->json([
            'overview' => $farmId ? $this->reportService->overview($farmId) : [],
            'available_sections' => [
                'overview',
                'finances',
                'tasks',
                'alerts',
                'stocks',
                'layers',
                'pisciculture',
                'cultures',
                'infrastructures',
                'audit',
            ],
        ]);
    }

    public function show(Request $request, string $section): JsonResponse
    {
        $farmId = $request->user()?->farm_id;

        return response()->json([
            'section' => $section,
            'data' => $farmId ? $this->reportService->dataset($farmId, $section) : [],
        ]);
    }

    public function export(Request $request, string $section, string $format): Response|BinaryFileResponse
    {
        $farmId = $request->user()?->farm_id;
        $dataset = $this->reportService->dataset((int) $farmId, $section);

        if ($format === 'pdf') {
            $content = $this->reportService->downloadPdf((int) $farmId, $section);

            return response($content, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => sprintf('attachment; filename="%s-%s.pdf"', $section, now()->format('Ymd-His')),
            ]);
        }

        $content = $this->reportService->downloadXlsx((int) $farmId, $section);
        $tempFile = tempnam(sys_get_temp_dir(), 'ferm_report_');
        file_put_contents($tempFile, $content);

        return response()->download($tempFile, sprintf('%s-%s.xlsx', $section, now()->format('Ymd-His')))->deleteFileAfterSend(true);
    }
}
