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
    private const ALLOWED_SECTIONS = [
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
    ];

    private const ALLOWED_EXPORT_FORMATS = ['pdf', 'xlsx'];

    public function __construct(private readonly ReportService $reportService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $farmId = $request->user()?->farm_id;

        return response()->json([
            'overview' => $farmId ? $this->reportService->overview($farmId) : [],
            'available_sections' => self::ALLOWED_SECTIONS,
        ]);
    }

    public function show(Request $request, string $section): JsonResponse
    {
        abort_unless(in_array($section, self::ALLOWED_SECTIONS, true), 404);

        $farmId = $request->user()?->farm_id;

        return response()->json([
            'section' => $section,
            'data' => $farmId ? $this->reportService->dataset($farmId, $section) : [],
        ]);
    }

    public function export(Request $request, string $section, string $format): Response|BinaryFileResponse
    {
        abort_unless(in_array($section, self::ALLOWED_SECTIONS, true), 404);
        abort_unless(in_array($format, self::ALLOWED_EXPORT_FORMATS, true), 404);

        $farmId = $request->user()?->farm_id;
        $safeSection = preg_replace('/[^a-z0-9_-]/i', '-', $section) ?: 'report';
        $timestamp = now()->format('Ymd-His');

        if ($format === 'pdf') {
            $content = $this->reportService->downloadPdf((int) $farmId, $section);

            return response($content, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => sprintf('attachment; filename="%s-%s.pdf"', $safeSection, $timestamp),
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => 'no-store, private',
            ]);
        }

        $content = $this->reportService->downloadXlsx((int) $farmId, $section);
        $tempFile = tempnam(sys_get_temp_dir(), 'ferm_report_');
        file_put_contents($tempFile, $content);

        return response()
            ->download($tempFile, sprintf('%s-%s.xlsx', $safeSection, $timestamp), [
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => 'no-store, private',
            ])
            ->deleteFileAfterSend(true);
    }
}
