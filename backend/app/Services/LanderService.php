<?php

namespace App\Services;

use App\Models\Lander;

final class LanderService
{
    public function paginateIndex(int $userId): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        return Lander::query()
            ->where(fn ($q) => $q->whereNull('user_id')->orWhere('user_id', $userId))
            ->latest('id')
            ->paginate(20);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(int $userId, array $attributes): Lander
    {
        $attributes['user_id'] = $userId;

        return Lander::query()->create($attributes);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(int $userId, int $id, array $attributes): Lander
    {
        $lander = Lander::query()->where('user_id', $userId)->findOrFail($id);
        $lander->fill($attributes)->save();

        return $lander;
    }

    public function delete(int $userId, int $id): void
    {
        Lander::query()->where('user_id', $userId)->findOrFail($id)->delete();
    }
}
