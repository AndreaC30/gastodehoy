"""Record unexpected failures without user data or exception text."""

from __future__ import annotations

import logging

from fastapi import Request

_log = logging.getLogger(__name__)


def record_unhandled(request: Request, exc: BaseException) -> None:
    """Log the exception class and the request coordinates.

    The message is the class name only. ``str(exc)`` and the traceback can
    carry a password, a token, SQL, or a database DSN.
    """
    request_id = getattr(request.state, "request_id", None) or "-"
    _log.error(
        "%s request_id=%s method=%s path=%s",
        type(exc).__name__,
        request_id,
        request.method,
        request.url.path,
    )
