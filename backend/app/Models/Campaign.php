<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Model;

class Campaign extends Model
{
    protected $fillable = [
        'user_id',
        'domain_id',
        'traffic_source_id',
        'external_traffic_campaign_id',
        'name',
        'slug',
        'status',
        'destination_url',
        'timezone',
        'daily_budget',
        'monthly_budget',
    ];

    public function domain(): BelongsTo
    {
        return $this->belongsTo(Domain::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function trafficSource(): BelongsTo
    {
        return $this->belongsTo(TrafficSource::class);
    }

    public function landers(): BelongsToMany
    {
        return $this->belongsToMany(Lander::class, 'campaign_landers')
            ->withPivot(['weight_percent', 'is_active'])
            ->withTimestamps();
    }

    public function offers(): BelongsToMany
    {
        return $this->belongsToMany(Offer::class, 'campaign_offers')
            ->withPivot(['weight_percent', 'is_active'])
            ->withTimestamps();
    }

    public function targetingRules(): HasMany
    {
        return $this->hasMany(TargetingRule::class);
    }
}
