<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FishSale extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'fish_pond_id',
        'fish_harvest_id',
        'sale_date',
        'customer_name',
        'kilograms_sold',
        'unit_price',
        'amount_paid',
        'remaining_due',
        'payment_method',
        'notes',
        'stock_movement_id',
        'financial_transaction_id',
    ];

    protected $casts = [
        'sale_date' => 'date',
        'kilograms_sold' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'remaining_due' => 'decimal:2',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function pond(): BelongsTo
    {
        return $this->belongsTo(FishPond::class, 'fish_pond_id');
    }

    public function harvest(): BelongsTo
    {
        return $this->belongsTo(FishHarvest::class, 'fish_harvest_id');
    }

    public function stockMovement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class, 'stock_movement_id');
    }

    public function financialTransaction(): BelongsTo
    {
        return $this->belongsTo(FinancialTransaction::class, 'financial_transaction_id');
    }
}
