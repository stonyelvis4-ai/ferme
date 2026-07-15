<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'user_id',
        'module',
        'entity_type',
        'entity_id',
        'action',
        'old_value',
        'new_value',
        'source'
    ];
}

