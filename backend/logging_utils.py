"""Structured, redacted logging helpers shared by backend modules."""

import logging
import re
import uuid

_SENSITIVE_KEYS = re.compile(
    r"(password|token|secret|api.?key|authorization|email|photo.?url|image.?url|storage.?path)",
    re.IGNORECASE,
)


def new_correlation_id(prefix: str = "req") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def normalize_correlation_id(value: str | None) -> str:
    if value and re.fullmatch(r"[A-Za-z0-9._-]{1,80}", value):
        return value
    return new_correlation_id()


def log_event(logger: logging.Logger, level: int, message: str, correlation_id: str | None = None, **fields):
    safe_fields = {
        key: value
        for key, value in fields.items()
        if not _SENSITIVE_KEYS.search(key)
    }
    if correlation_id:
        safe_fields["correlation_id"] = correlation_id
    details = " ".join(f"{key}={value!r}" for key, value in safe_fields.items())
    logger.log(level, "%s%s", message, f" {details}" if details else "")
