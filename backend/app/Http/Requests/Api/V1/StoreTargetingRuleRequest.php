<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTargetingRuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $userId = (int) $this->user()->id;

        return [
            'offer_id' => ['required', 'nullable', 'integer', Rule::exists('offers', 'id')->where('user_id', $userId)],
            'country_code' => ['sometimes', 'nullable', 'string', 'size:2'],
            'region' => ['sometimes', 'nullable', 'string', 'max:255'],
            'device_type' => ['sometimes', 'nullable', 'in:desktop,mobile,tablet'],
            'priority' => ['sometimes', 'integer', 'min:1', 'max:9999'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
