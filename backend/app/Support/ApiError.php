<?php

namespace App\Support;

use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Throwable;

/**
 * Single entry point for JSON API error bodies and structured logging.
 *
 * Use {@see self::respond()} from middleware/controllers. Exception renderables in
 * bootstrap/app.php should also use it so shape, correlation_id, and logging stay uniform.
 */
final class ApiError
{
    private const ATTR_LOGGED = 'api_error.logged';

    public static function wantsJson(Request $request): bool
    {
        return str_starts_with($request->path(), 'api/')
            || $request->expectsJson();
    }

    /**
     * Resolves correlation id from the request, or assigns a UUID (and mirrors middleware behaviour).
     */
    public static function resolveCorrelationId(Request $request): string
    {
        $existing = $request->attributes->get('correlation_id');
        if (is_string($existing) && $existing !== '') {
            return $existing;
        }

        $id = (string) Str::uuid();
        $request->attributes->set('correlation_id', $id);
        Log::withContext(['correlation_id' => $id]);

        return $id;
    }

    /**
     * @param  array<string, mixed>  $errors  Laravel-style validation map: field => list<string>
     */
    public static function respond(
        string $message,
        int $status,
        array $errors = [],
        ?Request $request = null,
        ?ApiErrorCode $code = null,
    ): JsonResponse {
        $request ??= request();
        $resolvedCode = $code ?? (self::nonEmptyErrors($errors)
            ? ApiErrorCode::ValidationFailed
            : ApiErrorCode::fromHttpStatus($status));

        $payload = self::buildPayload($request, $message, $resolvedCode, $status, $errors);

        $response = response()->json($payload, $status);
        $response->headers->set('X-Correlation-Id', $payload['correlation_id'], false);

        self::logApiError($request, $status, $resolvedCode, $message, $errors);

        return $response;
    }

    /**
     * Final pass for exception-rendered JSON (e.g. Laravel debug 500) so envelope stays consistent.
     */
    public static function finalizeExceptionJsonEnvelope(
        SymfonyResponse $response,
        Throwable $exception,
        Request $request,
    ): SymfonyResponse {
        if (! self::wantsJson($request) || ! $response instanceof JsonResponse) {
            return $response;
        }

        if ($response->getStatusCode() < 400) {
            return $response;
        }

        $data = $response->getData(true);
        if (! is_array($data)) {
            return $response;
        }

        $cid = self::resolveCorrelationId($request);
        $data['correlation_id'] = $cid;

        if (! isset($data['error']) || ! is_string($data['error']) || $data['error'] === '') {
            $data['error'] = ApiErrorCode::fromHttpStatus($response->getStatusCode())->value;
        }

        if (isset($data['errors']) && is_array($data['errors']) && ! isset($data['error_fields'])) {
            $normalized = self::normalizeValidationErrors($data['errors']);
            if ($normalized !== null) {
                $data['errors'] = $normalized['errors'];
                $data['error_fields'] = $normalized['error_fields'];
            }
        }

        $response->setData($data);
        $response->headers->set('X-Correlation-Id', $cid, false);

        return $response;
    }

    public static function modelNotFoundMessage(ModelNotFoundException $e): string
    {
        $model = class_basename($e->getModel());

        return Str::headline(Str::snake($model)).' was not found.';
    }

    /**
     * @param  array<string, mixed>  $errors
     * @return array{errors: array<string, list<string>>, error_fields: list<array{field: string, messages: list<string>}>}|null
     */
    public static function normalizeValidationErrors(array $errors): ?array
    {
        if ($errors === []) {
            return null;
        }

        $canonical = [];
        foreach ($errors as $field => $messages) {
            if (! is_string($field)) {
                return null;
            }
            $list = self::stringList($messages);
            if ($list === null) {
                return null;
            }
            $canonical[$field] = $list;
        }

        ksort($canonical);

        $fields = [];
        foreach ($canonical as $field => $messages) {
            $fields[] = ['field' => $field, 'messages' => $messages];
        }

        return ['errors' => $canonical, 'error_fields' => $fields];
    }

    /**
     * @param  array<string, mixed>  $errors
     * @return array<string, mixed>
     */
    private static function buildPayload(
        Request $request,
        string $message,
        ApiErrorCode $code,
        int $status,
        array $errors,
    ): array {
        $body = [
            'message' => $message,
            'error' => $code->value,
            'correlation_id' => self::resolveCorrelationId($request),
        ];

        if (self::nonEmptyErrors($errors)) {
            $normalized = self::normalizeValidationErrors($errors);
            if ($normalized !== null) {
                $body['errors'] = $normalized['errors'];
                $body['error_fields'] = $normalized['error_fields'];
            } else {
                $body['errors'] = $errors;
            }
        }

        return $body;
    }

    /**
     * @param  array<string, mixed>  $errors
     */
    private static function logApiError(
        Request $request,
        int $status,
        ApiErrorCode $code,
        string $message,
        array $errors,
    ): void {
        if ($request->attributes->get(self::ATTR_LOGGED)) {
            return;
        }
        $request->attributes->set(self::ATTR_LOGGED, true);

        $correlationId = self::resolveCorrelationId($request);
        $level = $status >= 500 ? 'error' : 'warning';

        $context = [
            'correlation_id' => $correlationId,
            'http_status' => $status,
            'error' => $code->value,
            'message' => $message,
            'path' => $request->path(),
            'method' => $request->method(),
        ];

        if ($errors !== []) {
            $context['validation_keys'] = array_keys($errors);
        }

        Log::log($level, 'api.http_error', $context);
    }

    /** @param  array<string, mixed>  $errors */
    private static function nonEmptyErrors(array $errors): bool
    {
        return $errors !== [];
    }

    private static function stringList(mixed $messages): ?array
    {
        if (is_string($messages)) {
            return [$messages];
        }

        if (! is_array($messages)) {
            return null;
        }

        $out = [];
        foreach ($messages as $item) {
            if (! is_string($item)) {
                return null;
            }
            $out[] = $item;
        }

        return $out;
    }
}
