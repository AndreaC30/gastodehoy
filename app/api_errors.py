"""One JSON body for unexpected endpoint failures.

HTTPException and RequestValidationError stay on FastAPI's own handlers.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

_log = logging.getLogger(__name__)

INTERNAL_ERROR_DETAIL = "Error interno. Inténtalo de nuevo."


def install(app: FastAPI) -> None:
    """Register the catch-all for exceptions a route did not handle."""

    @app.exception_handler(Exception)
    async def unhandled_exception(request: Request, exc: Exception) -> JSONResponse:
        _log.error("%s %s %s", request.method, request.url.path, type(exc).__name__)
        return JSONResponse(
            status_code=500,
            content={"detail": INTERNAL_ERROR_DETAIL},
        )
