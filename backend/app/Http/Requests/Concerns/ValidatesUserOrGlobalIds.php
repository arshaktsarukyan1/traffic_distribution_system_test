<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Validation\Rule;

trait ValidatesUserOrGlobalIds
{
    /**
     * Row is valid when owned by the user or shared globally (user_id null), e.g. seeded catalog rows.
     *
     * @param  non-empty-string  $table
     */
    protected function ruleIdOwnedByUserOrShared(string $table, int $userId): \Illuminate\Validation\Rules\Exists
    {
        return Rule::exists($table, 'id')->where(
            fn ($query) => $query->whereNull('user_id')->orWhere('user_id', $userId),
        );
    }
}
