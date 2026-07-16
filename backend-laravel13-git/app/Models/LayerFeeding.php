<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LayerFeeding extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'layer_batch_id',
        'stock_item_id',
        'feeding_date',
        'feeding_time',
        'quantity',
        'unit',
        'unit_cost',
        'total_cost',
        'notes',
        'stock_movement_id',
        'financial_transaction_id',
    ];

    protected $casts = [
        'feeding_date' => 'date',
        'quantity' => 'decimal:2',
        'unit_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(LayerBatch::class, 'layer_batch_id');
    }

    public function stockItem(): BelongsTo
    {
        return $this->belongsTo(StockItem::class);
    }

    public function stockMovement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class);
    }

    public function financialTransaction(): BelongsTo
    {
        return $this->belongsTo(FinancialTransaction::class);
    }
}
