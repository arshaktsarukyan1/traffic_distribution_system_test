<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDomainRequest extends FormRequest
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
        $id = (int) $this->route('id');
        $userId = (int) $this->user()->id;

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('domains', 'name')->where('user_id', $userId)->ignore($id)],
            'status' => ['sometimes', 'required', 'in:pending,active,disabled'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
