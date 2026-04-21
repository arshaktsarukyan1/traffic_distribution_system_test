<?php

namespace App\Http\Requests\Webhooks;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class ShopifyWebhookOrdersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $raw = $this->getContent();
        $payload = json_decode($raw, true);
        if (! is_array($payload) || $payload === []) {
            throw new HttpResponseException(
                response()->json(['message' => 'Empty or invalid JSON payload'], 422)
            );
        }

        if (! $this->verifyShopifyHmac($raw)) {
            throw new HttpResponseException(
                response()->json(['message' => 'Invalid webhook signature'], 401)
            );
        }

        $this->merge($payload);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'id' => ['required_without:order_id'],
            'order_id' => ['required_without:id'],
            'total_price' => ['nullable', 'numeric'],
            'amount' => ['nullable', 'numeric'],
            'currency' => ['nullable', 'string', 'max:16'],
            'financial_status' => ['nullable', 'string', 'max:64'],
            'source_name' => ['nullable', 'string', 'max:128'],
            'campaign_id' => ['nullable', 'integer', 'min:1'],
            'campaign' => ['nullable', 'string', 'max:120'],
            'click_id' => ['nullable', 'string', 'max:128'],
            'click_uuid' => ['nullable', 'string', 'max:128'],
            'tds_click_id' => ['nullable', 'string', 'max:128'],
            'processed_at' => ['nullable', 'string', 'max:64'],
            'created_at' => ['nullable', 'string', 'max:64'],
            'updated_at' => ['nullable', 'string', 'max:64'],
            'line_items' => ['nullable', 'array', 'max:200'],
            'line_items.*' => ['array'],
            'note_attributes' => ['nullable', 'array', 'max:100'],
            'note_attributes.*.name' => ['nullable', 'string', 'max:120'],
            'note_attributes.*.value' => ['nullable', 'string', 'max:2000'],
        ];
    }

    private function verifyShopifyHmac(string $rawBody): bool
    {
        $secret = (string) config('tds.shopify_webhook_secret', '');
        if ($secret === '') {
            return $this->allowInsecureWebhookVerificationBypass();
        }

        $provided = (string) $this->header('X-Shopify-Hmac-Sha256', '');
        if ($provided === '') {
            return false;
        }

        $computed = base64_encode(hash_hmac('sha256', $rawBody, $secret, true));

        return hash_equals($computed, $provided);
    }

    private function allowInsecureWebhookVerificationBypass(): bool
    {
        if (! (bool) config('tds.allow_insecure_shopify_webhooks', false)) {
            return false;
        }

        return app()->environment(['local', 'testing']);
    }
}
