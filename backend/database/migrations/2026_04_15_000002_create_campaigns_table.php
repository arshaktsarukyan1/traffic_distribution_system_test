<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('domain_id')->nullable()->constrained('domains')->nullOnDelete();
            $table->foreignId('traffic_source_id')->constrained('traffic_sources')->cascadeOnDelete();
            $table->string('external_traffic_campaign_id')->nullable();
            $table->string('name');
            $table->string('slug')->unique();
            $table->enum('status', ['draft', 'active', 'paused', 'archived'])->default('draft');
            $table->string('destination_url', 2048);
            $table->string('timezone')->default('UTC');
            $table->decimal('daily_budget', 12, 2)->nullable();
            $table->decimal('monthly_budget', 12, 2)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'id']);
            $table->index(['status', 'traffic_source_id']);
            $table->index(['traffic_source_id', 'external_traffic_campaign_id'], 'campaigns_traffic_external_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};
