"""Thin psycopg3 wrapper: plain SQL, dict rows, one pooled connection source."""
from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

from .config import get_settings

_pool: ConnectionPool | None = None


def pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        url = get_settings().database_url
        if not url:
            raise RuntimeError("DATABASE_URL is not set in .env")
        _pool = ConnectionPool(
            url,
            min_size=1,
            max_size=8,
            timeout=20,
            kwargs={"row_factory": dict_row, "autocommit": True, "prepare_threshold": None},
            open=True,
        )
    return _pool


@contextmanager
def conn() -> Iterator[psycopg.Connection]:
    with pool().connection() as c:
        yield c


def q(sql: str, params: Any = None) -> list[dict]:
    with conn() as c:
        return c.execute(sql, params).fetchall()


def one(sql: str, params: Any = None) -> dict | None:
    with conn() as c:
        return c.execute(sql, params).fetchone()


def run(sql: str, params: Any = None) -> int:
    with conn() as c:
        return c.execute(sql, params).rowcount


def js(value: Any) -> Jsonb:
    return Jsonb(value)


def init_schema() -> None:
    sql = (Path(__file__).parent / "schema.sql").read_text(encoding="utf-8")
    with conn() as c:
        c.execute(sql)
