<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->string('role')->default('viewer');
            $t->boolean('is_active')->default(true);
        });
        Schema::create('drivers', function (Blueprint $t) {
            $t->id();
            $t->string('first_name');
            $t->string('middle_name')->nullable();
            $t->string('last_name');
            $t->string('display_name');
            $t->string('contact_number', 40)->nullable();
            $t->boolean('is_active')->default(true);
            $t->text('notes')->nullable();
            $t->timestamps();
        });
        Schema::create('etrikes', function (Blueprint $t) {
            $t->id();
            $t->string('plate_number', 30)->unique();
            $t->string('unit_code', 30);
            $t->text('description')->nullable();
            $t->foreignId('default_driver_id')->nullable()->constrained('drivers')->restrictOnDelete();
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });
        Schema::create('statuses', function (Blueprint $t) {
            $t->id();
            $t->string('code')->unique();
            $t->string('name');
            $t->text('description')->nullable();
            $t->unsignedSmallInteger('sort_order')->default(0);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });
        Schema::create('daily_reports', function (Blueprint $t) {
            $t->id();
            $t->date('report_date')->unique();
            $t->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $t->timestampTz('submitted_at')->nullable();
            $t->string('status')->default('draft');
            $t->text('notes')->nullable();
            $t->unsignedInteger('version')->default(1);
            $t->timestampsTz();
        });
        Schema::create('daily_report_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('daily_report_id')->constrained()->restrictOnDelete();
            $t->foreignId('etrike_id')->constrained()->restrictOnDelete();
            $t->foreignId('driver_id')->nullable()->constrained()->restrictOnDelete();
            $t->foreignId('status_id')->constrained('statuses')->restrictOnDelete();
            $t->string('plate_number');
            $t->string('driver_name')->nullable();
            $t->decimal('rental_amount', 12, 2)->default(0);
            $t->text('remarks')->nullable();
            $t->foreignId('updated_by')->constrained('users')->restrictOnDelete();
            $t->timestampsTz();
            $t->unique(['daily_report_id', 'etrike_id']);
            $t->index('etrike_id');
            $t->index('driver_id');
            $t->index('status_id');
        });
        Schema::create('share_links', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->char('token_hash', 64)->unique();
            $t->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $t->timestampTz('expires_at')->nullable();
            $t->timestampTz('revoked_at')->nullable();
            $t->timestampsTz();
        });
        Schema::create('audit_logs', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->nullable()->constrained('users')->restrictOnDelete();
            $t->string('action');
            $t->string('entity_type');
            $t->unsignedBigInteger('entity_id');
            $t->jsonb('old_values')->nullable();
            $t->jsonb('new_values')->nullable();
            $t->timestampTz('created_at')->useCurrent();
            $t->index(['entity_type', 'entity_id']);
        });
        Schema::create('settings', function (Blueprint $t) {
            $t->string('key')->primary();
            $t->jsonb('value');
        });
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin','operator','viewer'))");
        DB::statement("ALTER TABLE daily_reports ADD CONSTRAINT report_state_check CHECK (status IN ('draft','submitted','locked'))");
        DB::statement('ALTER TABLE daily_report_items ADD CONSTRAINT rental_nonnegative CHECK (rental_amount >= 0)');
    }

    public function down(): void
    {
        foreach (['settings', 'audit_logs', 'share_links', 'daily_report_items', 'daily_reports', 'statuses', 'etrikes', 'drivers'] as $table) {
            Schema::dropIfExists($table);
        }
        DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['role', 'is_active']));
    }
};
