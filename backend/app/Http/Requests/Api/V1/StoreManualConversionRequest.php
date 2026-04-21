<?php

namespace App\Http\Requests\Api\V1;

use App\Http\Requests\Concerns\ValidatesUserOrGlobalIds;
use App\Models\Campaign;
use App\Models\Click;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreManualConversionRequest extends FormRequest
{
    use ValidatesUserOrGlobalIds;

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
            'campaign_id' => ['required', 'integer', Rule::exists(Campaign::class, 'id')->where('user_id', $userId)],
            'amount' => ['required', 'numeric', 'min:0'],
            'converted_at' => ['required', 'date'],
            'click_id' => ['sometimes', 'nullable', 'integer', Rule::exists(Click::class, 'id')],
            'click_uuid' => ['sometimes', 'nullable', 'uuid', Rule::exists(Click::class, 'click_uuid')],
            'offer_id' => ['sometimes', 'nullable', 'integer', $this->ruleIdOwnedByUserOrShared('offers', $userId)],
            'lander_id' => ['sometimes', 'nullable', 'integer', $this->ruleIdOwnedByUserOrShared('landers', $userId)],
            'note' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'source' => ['sometimes', 'nullable', 'string', 'max:64'],
        ];
    }
}
