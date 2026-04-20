<?php

namespace App\Support;

/**
 * Canonical API error codes. Prefer these over raw strings so HTTP status ↔ code stays consistent.
 */
enum ApiErrorCode: string
{
    case BadRequest = 'bad_request';
    case Unauthenticated = 'unauthenticated';
    case Forbidden = 'forbidden';
    case NotFound = 'not_found';
    case MethodNotAllowed = 'method_not_allowed';
    case Conflict = 'conflict';
    /** Laravel validation failures (422) */
    case ValidationFailed = 'validation_failed';
    case Locked = 'locked';
    case PageExpired = 'page_expired';
    case TooManyRequests = 'too_many_requests';
    case ServerError = 'server_error';
    case ServiceUnavailable = 'service_unavailable';
    /** Domain-specific: still 422 but not validation */
    case ManualConversionFailed = 'manual_conversion_failed';
    /** Any HTTP status without a dedicated case */
    case HttpError = 'http_error';

    public static function fromHttpStatus(int $status): self
    {
        return match ($status) {
            400 => self::BadRequest,
            401 => self::Unauthenticated,
            403 => self::Forbidden,
            404 => self::NotFound,
            405 => self::MethodNotAllowed,
            409 => self::Conflict,
            419 => self::PageExpired,
            422 => self::ValidationFailed,
            423 => self::Locked,
            429 => self::TooManyRequests,
            500 => self::ServerError,
            503 => self::ServiceUnavailable,
            default => self::HttpError,
        };
    }
}
