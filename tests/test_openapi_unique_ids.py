"""Los operationId del OpenAPI deben ser únicos (FastAPI avisa si se repiten)."""

from __future__ import annotations

import warnings
from collections import Counter

from fastapi.testclient import TestClient

from app.main import app

_METHODS = {"get", "put", "post", "delete", "options", "head", "patch", "trace"}


def test_operation_ids_are_unique() -> None:
    app.openapi_schema = None  # fuerza a regenerar el esquema
    with warnings.catch_warnings():
        warnings.simplefilter("error")  # «Duplicate Operation ID» pasa a ser error
        spec = app.openapi()

    ids = [
        op["operationId"]
        for path_item in spec["paths"].values()
        for method, op in path_item.items()
        if method in _METHODS and "operationId" in op
    ]
    repeated = [i for i, n in Counter(ids).items() if n > 1]
    assert ids, "el esquema no tiene operaciones"
    assert not repeated, f"operationId repetidos: {repeated}"


def test_head_and_get_still_routed_for_sitemap_and_og_image() -> None:
    with TestClient(app) as client:
        for path in ("/sitemap.xml", "/og-image.png"):
            # 200 con el front compilado, 404 sin él; lo que no debe dar es 405.
            assert client.head(path).status_code in (200, 404)
            assert client.get(path).status_code in (200, 404)
