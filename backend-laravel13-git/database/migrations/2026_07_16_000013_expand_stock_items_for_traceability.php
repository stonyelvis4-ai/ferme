<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private function stockReferenceUniqueExists(): bool
    {
        $indexes = DB::select("PRAGMA index_list('stock_items')");

        foreach ($indexes as $index) {
            if (($index->name ?? null) === 'stock_items_farm_id_reference_unique') {
                return true;
            }
        }

        return false;
    }

    public function up(): void
    {
        if (! Schema::hasTable('stock_categories')) {
            Schema::create('stock_categories', function (Blueprint $table) {
                $table->id();
                $table->foreignId('farm_id')->nullable()->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->string('slug');
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->unique(['farm_id', 'slug']);
            });
        }

        if (! Schema::hasTable('suppliers')) {
            Schema::create('suppliers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->string('contact_name')->nullable();
                $table->string('phone')->nullable();
                $table->string('email')->nullable();
                $table->string('address')->nullable();
                $table->text('notes')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->unique(['farm_id', 'name']);
            });
        }

        Schema::table('stock_items', function (Blueprint $table) {
            if (! Schema::hasColumn('stock_items', 'reference')) {
                $table->string('reference')->nullable()->after('farm_id');
            }
            if (! Schema::hasColumn('stock_items', 'description')) {
                $table->text('description')->nullable()->after('name');
            }
            if (! Schema::hasColumn('stock_items', 'brand')) {
                $table->string('brand')->nullable()->after('description');
            }
            if (! Schema::hasColumn('stock_items', 'category_id')) {
                $table->foreignId('category_id')->nullable()->after('brand')->constrained('stock_categories')->nullOnDelete();
            }
            if (! Schema::hasColumn('stock_items', 'supplier_id')) {
                $table->foreignId('supplier_id')->nullable()->after('category_id')->constrained('suppliers')->nullOnDelete();
            }
            if (! Schema::hasColumn('stock_items', 'batch_number')) {
                $table->string('batch_number')->nullable()->after('supplier_id');
            }
            if (! Schema::hasColumn('stock_items', 'purchase_date')) {
                $table->date('purchase_date')->nullable()->after('batch_number');
            }
            if (! Schema::hasColumn('stock_items', 'manufacturing_date')) {
                $table->date('manufacturing_date')->nullable()->after('purchase_date');
            }
            if (! Schema::hasColumn('stock_items', 'expiration_date')) {
                $table->date('expiration_date')->nullable()->after('manufacturing_date');
            }
            if (! Schema::hasColumn('stock_items', 'storage_location')) {
                $table->string('storage_location')->nullable()->after('location');
            }
            if (! Schema::hasColumn('stock_items', 'maximum_stock')) {
                $table->decimal('maximum_stock', 14, 3)->nullable()->after('minimum_threshold');
            }
            if (! Schema::hasColumn('stock_items', 'purchase_total_cost')) {
                $table->decimal('purchase_total_cost', 14, 2)->default(0)->after('unit_cost');
            }
            if (! Schema::hasColumn('stock_items', 'currency')) {
                $table->string('currency', 10)->default('XOF')->after('purchase_total_cost');
            }
            if (! Schema::hasColumn('stock_items', 'image_path')) {
                $table->string('image_path')->nullable()->after('currency');
            }
            if (! Schema::hasColumn('stock_items', 'notes')) {
                $table->text('notes')->nullable()->after('image_path');
            }
            if (! Schema::hasColumn('stock_items', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('notes');
            }
            if (! Schema::hasColumn('stock_items', 'business_module')) {
                $table->string('business_module', 50)->default('general')->after('is_active');
            }
            if (! Schema::hasColumn('stock_items', 'related_type')) {
                $table->string('related_type', 100)->nullable()->after('business_module');
            }
            if (! Schema::hasColumn('stock_items', 'related_id')) {
                $table->unsignedBigInteger('related_id')->nullable()->after('related_type');
            }
        });

        if (! $this->stockReferenceUniqueExists()) {
            Schema::table('stock_items', function (Blueprint $table) {
                $table->unique(['farm_id', 'reference']);
            });
        }

        $driver = Config::get('database.default');
        $connection = DB::connection($driver);
        $isSqlite = $connection->getDriverName() === 'sqlite';

        if (! $isSqlite && Schema::hasColumn('stock_items', 'current_quantity')) {
            DB::statement('ALTER TABLE stock_items MODIFY current_quantity DECIMAL(14,3) NOT NULL DEFAULT 0');
        }
        if (! $isSqlite && Schema::hasColumn('stock_items', 'minimum_threshold')) {
            DB::statement('ALTER TABLE stock_items MODIFY minimum_threshold DECIMAL(14,3) NOT NULL DEFAULT 0');
        }
        if (! $isSqlite && Schema::hasColumn('stock_movements', 'quantity')) {
            DB::statement('ALTER TABLE stock_movements MODIFY quantity DECIMAL(14,3) NOT NULL');
        }

        DB::table('stock_items')
            ->whereNull('storage_location')
            ->update(['storage_location' => DB::raw('location')]);

        DB::table('stock_items')
            ->whereNull('reference')
            ->orderBy('id')
            ->get(['id', 'farm_id', 'category'])
            ->each(function (object $item): void {
                $slug = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', (string) $item->category) ?: 'ART', 0, 3));
                $reference = sprintf('%s-%03d', $slug ?: 'ART', (int) $item->id);
                DB::table('stock_items')->where('id', $item->id)->update(['reference' => $reference]);
            });

        $defaultCategories = [
            ['name' => 'Aliment', 'slug' => 'feed'],
            ['name' => 'Médicament', 'slug' => 'medicine'],
            ['name' => 'Vaccin', 'slug' => 'vaccine'],
            ['name' => 'Semence', 'slug' => 'seed'],
            ['name' => 'Engrais', 'slug' => 'fertilizer'],
            ['name' => 'Produit phytosanitaire', 'slug' => 'phytosanitary'],
            ['name' => 'Produit vétérinaire', 'slug' => 'veterinary'],
            ['name' => 'Matériel', 'slug' => 'material'],
            ['name' => 'Équipement', 'slug' => 'equipment'],
            ['name' => 'Outil', 'slug' => 'tool'],
            ['name' => 'Carburant', 'slug' => 'fuel'],
            ['name' => 'Emballage', 'slug' => 'packaging'],
            ['name' => 'Produit d’entretien', 'slug' => 'cleaning'],
            ['name' => 'Pièce de rechange', 'slug' => 'spare-part'],
            ['name' => 'Autre', 'slug' => 'other'],
        ];

        foreach ($defaultCategories as $category) {
            DB::table('stock_categories')->updateOrInsert(
                ['farm_id' => null, 'slug' => $category['slug']],
                [
                    'name' => $category['name'],
                    'description' => null,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }

    public function down(): void
    {
        Schema::table('stock_items', function (Blueprint $table) {
            if (Schema::hasColumn('stock_items', 'category_id')) {
                $table->dropConstrainedForeignId('category_id');
            }
            if (Schema::hasColumn('stock_items', 'supplier_id')) {
                $table->dropConstrainedForeignId('supplier_id');
            }
        });

        if ($this->stockReferenceUniqueExists()) {
            Schema::table('stock_items', function (Blueprint $table) {
                $table->dropUnique(['farm_id', 'reference']);
            });
        }

        Schema::table('stock_items', function (Blueprint $table) {
            $columns = array_values(array_filter([
                Schema::hasColumn('stock_items', 'reference') ? 'reference' : null,
                Schema::hasColumn('stock_items', 'description') ? 'description' : null,
                Schema::hasColumn('stock_items', 'brand') ? 'brand' : null,
                Schema::hasColumn('stock_items', 'batch_number') ? 'batch_number' : null,
                Schema::hasColumn('stock_items', 'purchase_date') ? 'purchase_date' : null,
                Schema::hasColumn('stock_items', 'manufacturing_date') ? 'manufacturing_date' : null,
                Schema::hasColumn('stock_items', 'expiration_date') ? 'expiration_date' : null,
                Schema::hasColumn('stock_items', 'storage_location') ? 'storage_location' : null,
                Schema::hasColumn('stock_items', 'maximum_stock') ? 'maximum_stock' : null,
                Schema::hasColumn('stock_items', 'purchase_total_cost') ? 'purchase_total_cost' : null,
                Schema::hasColumn('stock_items', 'currency') ? 'currency' : null,
                Schema::hasColumn('stock_items', 'image_path') ? 'image_path' : null,
                Schema::hasColumn('stock_items', 'notes') ? 'notes' : null,
                Schema::hasColumn('stock_items', 'is_active') ? 'is_active' : null,
                Schema::hasColumn('stock_items', 'business_module') ? 'business_module' : null,
                Schema::hasColumn('stock_items', 'related_type') ? 'related_type' : null,
                Schema::hasColumn('stock_items', 'related_id') ? 'related_id' : null,
            ]));

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });

        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('stock_categories');
    }
};
