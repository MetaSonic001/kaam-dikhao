"""Clerk session verification, roles, audit trail and a tiny in-memory rate limiter."""
from __future__ import annotations

import time
import uuid
from collections import defaultdict, deque
from dataclasses import dataclass

import httpx
import jwt
from fastapi import Depends, Header, HTTPException, Request

from . import db
from .config import get_settings


@dataclass
class User:
    id: str
    email: str | None
    role: str = "citizen"
    lang: str = "en"

    @property
    def is_mod(self) -> bool:
        return self.role in ("moderator", "admin")


_jwks: jwt.PyJWKClient | None = None


def _clerk_claims(token: str) -> dict | None:
    """Verify a Clerk session JWT (RS256) against the instance JWKS. Returns the claims or None."""
    global _jwks
    s = get_settings()
    issuer = s.clerk_issuer
    if not issuer:
        return None
    try:
        if _jwks is None:
            _jwks = jwt.PyJWKClient(f"{issuer}/.well-known/jwks.json", cache_keys=True, lifespan=3600)
        key = _jwks.get_signing_key_from_jwt(token).key
        return jwt.decode(token, key, algorithms=["RS256"], issuer=issuer, leeway=15, options={"verify_aud": False})
    except Exception:  # noqa: BLE001  # expired, wrong issuer, bad signature, JWKS unreachable
        return None


def _clerk_user(sub: str) -> tuple[str | None, str | None]:
    """Email and display name from Clerk's Backend API (session tokens carry neither by default)."""
    s = get_settings()
    try:
        r = httpx.get(f"https://api.clerk.com/v1/users/{sub}", headers={"Authorization": f"Bearer {s.clerk_secret_key}"}, timeout=10)
        r.raise_for_status()
        u = r.json()
    except Exception:  # noqa: BLE001
        return None, None
    primary = u.get("primary_email_address_id")
    emails = u.get("email_addresses") or []
    email = next((e["email_address"] for e in emails if e.get("id") == primary), emails[0]["email_address"] if emails else None)
    name = " ".join(x for x in [u.get("first_name"), u.get("last_name")] if x) or None
    return email, name


def _profile(uid: str, email: str | None, name: str | None) -> User:
    s = get_settings()
    row = db.one("select id, email, role, lang from profiles where id=%s", (uid,))
    want_admin = bool(email and email.lower() in s.admin_set)
    if not row:
        row = db.one("insert into profiles(id,email,display_name,role) values(%s,%s,%s,%s) returning id,email,role,lang",
                     (uid, email, name, "admin" if want_admin else "citizen"))
    elif want_admin and row["role"] != "admin":
        db.run("update profiles set role='admin' where id=%s", (uid,))
        row["role"] = "admin"
    return User(id=str(row["id"]), email=row["email"], role=row["role"], lang=row["lang"])


def optional_user(authorization: str | None = Header(default=None), x_dev_user: str | None = Header(default=None)) -> User | None:
    s = get_settings()
    if s.is_dev and x_dev_user:  # local testing only, never active in production
        uid = str(uuid.uuid5(uuid.NAMESPACE_DNS, x_dev_user))
        return _profile(uid, x_dev_user, x_dev_user.split("@")[0])
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    claims = _clerk_claims(authorization.split(" ", 1)[1].strip())
    if not claims or not claims.get("sub"):
        return None
    uid = str(uuid.uuid5(uuid.NAMESPACE_URL, f"clerk:{claims['sub']}"))  # profiles.id is a uuid
    row = db.one("select email from profiles where id=%s", (uid,))
    email, name = (row["email"], None) if row and row["email"] else _clerk_user(claims["sub"])
    return _profile(uid, email, name)


def current_user(user: User | None = Depends(optional_user)) -> User:
    if not user:
        raise HTTPException(401, "Sign in to continue.")
    return user


def moderator(user: User = Depends(current_user)) -> User:
    if not user.is_mod:
        raise HTTPException(403, "Moderator access required.")
    return user


def admin(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(403, "Admin access required.")
    return user


# ---- rate limiting (per process; adequate for a single-node deployment, no Redis) ----
_hits: dict[str, deque] = defaultdict(deque)


def limit(name: str, max_calls: int, per_seconds: int):
    def dep(request: Request, user: User | None = Depends(optional_user)):
        key = f"{name}:{user.id if user else request.client.host if request.client else 'anon'}"
        now = time.time()
        dq = _hits[key]
        while dq and dq[0] < now - per_seconds:
            dq.popleft()
        if len(dq) >= max_calls:
            raise HTTPException(429, "Too many requests. Please try again in a few minutes.")
        dq.append(now)

    return dep


def audit(actor: User | None, action: str, target_type: str, target_id: str, before=None, after=None, reason: str | None = None) -> None:
    db.run(
        "insert into audit_log(actor, actor_role, action, target_type, target_id, before, after, reason) values(%s,%s,%s,%s,%s,%s,%s,%s)",
        (actor.id if actor else None, actor.role if actor else "system", action, target_type, target_id,
         db.js(before) if before is not None else None, db.js(after) if after is not None else None, reason),
    )
