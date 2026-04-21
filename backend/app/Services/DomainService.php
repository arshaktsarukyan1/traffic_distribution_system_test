<?php

namespace App\Services;

use App\Models\Domain;

final class DomainService
{
    public function paginateIndex(int $userId): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        return Domain::query()
            ->where(fn ($q) => $q->whereNull('user_id')->orWhere('user_id', $userId))
            ->withCount('campaigns')
            ->latest('id')
            ->paginate(20);
    }

    public function findForShow(int $userId, int $id): Domain
    {
        return Domain::query()
            ->where(fn ($q) => $q->whereNull('user_id')->orWhere('user_id', $userId))
            ->withCount('campaigns')
            ->with([
                'campaigns' => static fn ($q) => $q
                    ->select(['id', 'name', 'slug', 'status', 'domain_id'])
                    ->orderByDesc('id'),
            ])
            ->findOrFail($id);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(int $userId, array $attributes): Domain
    {
        $attributes['user_id'] = $userId;

        return Domain::query()->create($attributes);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(int $userId, int $id, array $attributes): Domain
    {
        $domain = Domain::query()->where('user_id', $userId)->findOrFail($id);
        $domain->fill($attributes);
        $domain->save();

        return $domain;
    }

    public function delete(int $userId, int $id): void
    {
        $domain = Domain::query()->where('user_id', $userId)->findOrFail($id);
        $domain->delete();
    }
}
