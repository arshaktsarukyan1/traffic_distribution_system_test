<?php

namespace App\Services;

use App\Models\Offer;

final class OfferService
{
    public function paginateIndex(int $userId): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        return Offer::query()
            ->where(fn ($q) => $q->whereNull('user_id')->orWhere('user_id', $userId))
            ->latest('id')
            ->paginate(20);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(int $userId, array $attributes): Offer
    {
        $attributes['user_id'] = $userId;

        return Offer::query()->create($attributes);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(int $userId, int $id, array $attributes): Offer
    {
        $offer = Offer::query()->where('user_id', $userId)->findOrFail($id);
        $offer->fill($attributes)->save();

        return $offer;
    }

    public function delete(int $userId, int $id): void
    {
        Offer::query()->where('user_id', $userId)->findOrFail($id)->delete();
    }
}
