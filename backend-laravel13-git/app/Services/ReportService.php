<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\AuditLog;
use App\Models\Building;
use App\Models\Crop;
use App\Models\CropHarvest;
use App\Models\CropOperation;
use App\Models\CropSale;
use App\Models\EggProduction;
use App\Models\EggSale;
use App\Models\Enclosure;
use App\Models\Farm;
use App\Models\FinancialTransaction;
use App\Models\FishHarvest;
use App\Models\FishMonitoring;
use App\Models\FishPond;
use App\Models\FishSale;
use App\Models\LayerBatch;
use App\Models\Plot;
use App\Models\StockItem;
use App\Models\StockMovement;
use App\Models\Task;
use Illuminate\Support\Collection;
use ZipArchive;

class ReportService
{
    public function overview(int $farmId): array
    {
        return [
            'farms' => Farm::query()->whereKey($farmId)->count(),
            'tasks' => Task::query()->where('farm_id', $farmId)->count(),
            'alerts' => Alert::query()->where('farm_id', $farmId)->count(),
            'audit_logs' => AuditLog::query()->where('farm_id', $farmId)->count(),
            'layers' => LayerBatch::query()->where('farm_id', $farmId)->count(),
            'pondeuses_production' => EggProduction::query()->where('farm_id', $farmId)->sum('eggs_produced'),
            'pondeuses_sales' => EggSale::query()->where('farm_id', $farmId)->sum('amount_paid'),
            'pisciculture_biomass' => FishPond::query()->where('farm_id', $farmId)->sum('biomass_kg'),
            'pisciculture_sales' => FishSale::query()->where('farm_id', $farmId)->sum('amount_paid'),
            'cultures_area' => Crop::query()->where('farm_id', $farmId)->sum('area'),
            'cultures_sales' => CropSale::query()->where('farm_id', $farmId)->sum('amount_paid'),
            'stocks' => StockItem::query()->where('farm_id', $farmId)->count(),
            'finances_income' => FinancialTransaction::query()->where('farm_id', $farmId)->where('type', 'income')->sum('amount'),
            'finances_expense' => FinancialTransaction::query()->where('farm_id', $farmId)->where('type', 'expense')->sum('amount'),
            'buildings' => Building::query()->where('farm_id', $farmId)->count(),
            'enclosures' => Enclosure::query()->where('farm_id', $farmId)->count(),
        ];
    }

    public function dataset(int $farmId, string $section): array
    {
        return match ($section) {
            'finances' => [
                'title' => 'Rapport financier',
                'headers' => ['Date', 'Type', 'Montant', 'Categorie', 'Description', 'Source'],
                'rows' => FinancialTransaction::query()
                    ->where('farm_id', $farmId)
                    ->latest('occurred_at')
                    ->latest()
                    ->limit(200)
                    ->get()
                    ->map(fn (FinancialTransaction $item) => [
                        optional($item->occurred_at)->format('Y-m-d H:i') ?? '',
                        $item->type,
                        (string) $item->amount,
                        $item->category,
                        (string) ($item->description ?? ''),
                        (string) ($item->source_module ?? ''),
                    ])->all(),
            ],
            'tasks' => [
                'title' => 'Rapport des taches',
                'headers' => ['Titre', 'Priorite', 'Statut', 'Echeance', 'Rappel', 'Module'],
                'rows' => Task::query()
                    ->where('farm_id', $farmId)
                    ->latest()
                    ->limit(200)
                    ->get()
                    ->map(fn (Task $item) => [
                        $item->title,
                        (string) ($item->priority->value ?? $item->priority),
                        (string) ($item->status->value ?? $item->status),
                        optional($item->due_at)->format('Y-m-d H:i') ?? '',
                        optional($item->reminder_at)->format('Y-m-d H:i') ?? '',
                        (string) ($item->source_module ?? ''),
                    ])->all(),
            ],
            'alerts' => [
                'title' => 'Rapport des alertes',
                'headers' => ['Titre', 'Severite', 'Type', 'Statut', 'Module', 'Creation'],
                'rows' => Alert::query()
                    ->where('farm_id', $farmId)
                    ->latest()
                    ->limit(200)
                    ->get()
                    ->map(fn (Alert $item) => [
                        $item->title,
                        $item->severity,
                        $item->type,
                        $item->status,
                        (string) ($item->source_module ?? ''),
                        optional($item->created_at)->format('Y-m-d H:i') ?? '',
                    ])->all(),
            ],
            'stocks' => [
                'title' => 'Rapport des stocks',
                'headers' => ['Reference', 'Nom', 'Categorie', 'Quantite', 'Unite', 'Min', 'Max', 'Emplacement', 'Peremption', 'Valeur'],
                'rows' => StockItem::query()
                    ->where('farm_id', $farmId)
                    ->latest()
                    ->limit(200)
                    ->get()
                    ->map(fn (StockItem $item) => [
                        (string) ($item->reference ?? ''),
                        $item->name,
                        $item->category,
                        (string) $item->current_quantity,
                        $item->unit,
                        (string) $item->minimum_threshold,
                        (string) ($item->maximum_stock ?? ''),
                        (string) ($item->storage_location ?? $item->location ?? ''),
                        optional($item->expiration_date)->format('Y-m-d') ?? '',
                        (string) ($item->purchase_total_cost ?? 0),
                    ])->all(),
            ],
            'layers' => [
                'title' => 'Rapport pondeuses',
                'headers' => ['Lot', 'Race', 'Effectif', 'Mortalite', 'Production', 'Ventes'],
                'rows' => LayerBatch::query()
                    ->where('farm_id', $farmId)
                    ->latest()
                    ->limit(200)
                    ->get()
                    ->map(fn (LayerBatch $item) => [
                        $item->name,
                        $item->breed,
                        (string) $item->current_count,
                        (string) $item->mortality_total,
                        (string) $item->productions()->sum('eggs_produced'),
                        (string) $item->sales()->sum('amount_paid'),
                    ])->all(),
            ],
            'pisciculture' => [
                'title' => 'Rapport pisciculture',
                'headers' => ['Bassin', 'Espece', 'Biomasse', 'Mortalite', 'Recolte', 'Ventes'],
                'rows' => FishPond::query()
                    ->where('farm_id', $farmId)
                    ->latest()
                    ->limit(200)
                    ->get()
                    ->map(fn (FishPond $item) => [
                        $item->name,
                        $item->species,
                        (string) $item->biomass_kg,
                        (string) $item->mortality_total,
                        (string) $item->harvests()->sum('sellable_weight_kg'),
                        (string) $item->sales()->sum('amount_paid'),
                    ])->all(),
            ],
            'cultures' => [
                'title' => 'Rapport cultures',
                'headers' => ['Culture', 'Variete', 'Surface', 'Operations', 'Recolte', 'Ventes'],
                'rows' => Crop::query()
                    ->where('farm_id', $farmId)
                    ->latest()
                    ->limit(200)
                    ->get()
                    ->map(fn (Crop $item) => [
                        $item->name,
                        $item->variety,
                        (string) $item->area,
                        (string) $item->operations()->sum('total_cost'),
                        (string) $item->harvests()->sum('sellable_kg'),
                        (string) $item->sales()->sum('amount_paid'),
                    ])->all(),
            ],
            'infrastructures' => [
                'title' => 'Rapport infrastructures',
                'headers' => ['Nom', 'Type', 'Capacite', 'Affectation', 'Statut'],
                'rows' => array_merge(
                    Building::query()->where('farm_id', $farmId)->latest()->get()->map(fn (Building $item) => [
                        $item->name,
                        $item->type,
                        (string) $item->capacity,
                        (string) ($item->assigned_use ?? ''),
                        (string) $item->status,
                    ])->all(),
                    Enclosure::query()->where('farm_id', $farmId)->latest()->get()->map(fn (Enclosure $item) => [
                        $item->name,
                        $item->type,
                        (string) $item->capacity,
                        (string) ($item->assigned_use ?? ''),
                        (string) $item->status,
                    ])->all(),
                ),
            ],
            'audit' => [
                'title' => 'Journal d audit',
                'headers' => ['Date', 'Utilisateur', 'Module', 'Action', 'Type', 'Source'],
                'rows' => AuditLog::query()
                    ->where('farm_id', $farmId)
                    ->latest()
                    ->limit(200)
                    ->get()
                    ->map(fn (AuditLog $item) => [
                        optional($item->created_at)->format('Y-m-d H:i') ?? '',
                        (string) ($item->user_id ?? ''),
                        $item->module,
                        $item->action,
                        (string) ($item->entity_type ?? ''),
                        $item->source,
                    ])->all(),
            ],
            default => [
                'title' => 'Rapport',
                'headers' => ['Libelle', 'Valeur'],
                'rows' => collect($this->overview($farmId))->map(fn ($value, $key) => [$key, (string) $value])->values()->all(),
            ],
        };
    }

    public function downloadPdf(int $farmId, string $section): string
    {
        $dataset = $this->dataset($farmId, $section);
        $lines = array_merge(
            [$dataset['title']],
            [implode(' | ', $dataset['headers'])],
            array_map(fn ($row) => implode(' | ', $row), $dataset['rows'])
        );

        return $this->buildMinimalPdf($dataset['title'], $lines);
    }

    public function downloadXlsx(int $farmId, string $section): string
    {
        $dataset = $this->dataset($farmId, $section);

        return $this->buildMinimalXlsx($dataset['title'], $dataset['headers'], $dataset['rows']);
    }

    private function buildMinimalPdf(string $title, array $lines): string
    {
        $escapedLines = array_map([$this, 'escapePdfText'], $lines);
        $content = "BT\n/F1 12 Tf\n50 790 Td\n";
        foreach ($escapedLines as $index => $line) {
            $content .= sprintf("(%s) Tj\n", $line);
            if ($index < count($escapedLines) - 1) {
                $content .= "0 -16 Td\n";
            }
        }
        $content .= "ET\n";

        $objects = [];
        $objects[] = "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj";
        $objects[] = "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj";
        $objects[] = "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj";
        $objects[] = sprintf("4 0 obj << /Length %d >> stream\n%s\nendstream endobj", strlen($content), $content);
        $objects[] = "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj";

        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objects as $object) {
            $offsets[] = strlen($pdf);
            $pdf .= $object . "\n";
        }

        $xref = strlen($pdf);
        $pdf .= "xref\n0 6\n0000000000 65535 f \n";
        foreach (array_slice($offsets, 1) as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }
        $pdf .= "trailer << /Size 6 /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF";

        return $pdf;
    }

    private function escapePdfText(string $text): string
    {
        $text = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $text);
        return preg_replace('/[^\PC\s]/u', '', $text) ?? '';
    }

    private function buildMinimalXlsx(string $title, array $headers, array $rows): string
    {
        $tmpFile = tempnam(sys_get_temp_dir(), 'ferm_xlsx_');
        $zip = new ZipArchive();
        $zip->open($tmpFile, ZipArchive::OVERWRITE | ZipArchive::CREATE);

        $zip->addFromString('[Content_Types].xml', $this->xlsxContentTypes());
        $zip->addFromString('_rels/.rels', $this->xlsxRels());
        $zip->addFromString('xl/workbook.xml', $this->xlsxWorkbook($title));
        $zip->addFromString('xl/_rels/workbook.xml.rels', $this->xlsxWorkbookRels());
        $zip->addFromString('xl/styles.xml', $this->xlsxStyles());
        $zip->addFromString('xl/worksheets/sheet1.xml', $this->xlsxSheet($headers, $rows));
        $zip->close();

        $binary = file_get_contents($tmpFile) ?: '';
        @unlink($tmpFile);

        return $binary;
    }

    private function xlsxContentTypes(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            .'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            .'<Default Extension="xml" ContentType="application/xml"/>'
            .'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            .'<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            .'<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            .'</Types>';
    }

    private function xlsxRels(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            .'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            .'</Relationships>';
    }

    private function xlsxWorkbook(string $title): string
    {
        $safeTitle = $this->xmlEscape(substr($title, 0, 31));
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            .'<sheets><sheet name="'.$safeTitle.'" sheetId="1" r:id="rId1"/></sheets>'
            .'</workbook>';
    }

    private function xlsxWorkbookRels(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            .'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            .'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            .'</Relationships>';
    }

    private function xlsxStyles(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            .'<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>'
            .'<fills count="1"><fill><patternFill patternType="none"/></fill></fills>'
            .'<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
            .'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            .'<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>'
            .'</styleSheet>';
    }

    private function xlsxSheet(array $headers, array $rows): string
    {
        $rowsXml = [];
        $rowIndex = 1;
        $rowsXml[] = $this->xlsxRow($rowIndex++, $headers);
        foreach ($rows as $row) {
            $rowsXml[] = $this->xlsxRow($rowIndex++, $row);
        }

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            .'<sheetData>'.implode('', $rowsXml).'</sheetData>'
            .'</worksheet>';
    }

    private function xlsxRow(int $rowIndex, array $values): string
    {
        $cells = [];
        foreach (array_values($values) as $index => $value) {
            $column = $this->xlsxColumn($index + 1);
            $cells[] = '<c r="'.$column.$rowIndex.'" t="inlineStr"><is><t>'.$this->xmlEscape((string) $value).'</t></is></c>';
        }

        return '<row r="'.$rowIndex.'">'.implode('', $cells).'</row>';
    }

    private function xlsxColumn(int $index): string
    {
        $letters = '';
        while ($index > 0) {
            $index--;
            $letters = chr(65 + ($index % 26)) . $letters;
            $index = intdiv($index, 26);
        }

        return $letters;
    }

    private function xmlEscape(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_COMPAT, 'UTF-8');
    }
}
