<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;

class TrackerEventRequest extends FormRequest
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
        return [
            'campaign_id' => ['required', 'integer', 'exists:campaigns,id'],
            'session_uuid' => ['nullable', 'uuid'],
            'ts' => ['nullable', 'string', 'max:40'],
            'referrer' => ['nullable', 'string', 'max:2000'],
            'language' => ['nullable', 'string', 'max:10'],
            'user_agent' => ['nullable', 'string', 'max:500'],
            'country_code' => ['nullable', 'string', 'size:2'],
            'region' => ['nullable', 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:120'],
            'device_type' => ['nullable', 'in:desktop,mobile,tablet'],
            'os' => ['nullable', 'string', 'max:120'],
        ];
    }
}
