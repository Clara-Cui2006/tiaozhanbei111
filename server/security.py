from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any

from .config import settings


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 310_000)
    return f"pbkdf2_sha256$310000${base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(digest).decode()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations, salt_text, digest_text = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.urlsafe_b64decode(salt_text)
        expected = base64.urlsafe_b64decode(digest_text)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def create_token(user_id: int, session_version: int) -> str:
    now = int(time.time())
    header = _b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = _b64encode(json.dumps({
        "sub": str(user_id),
        "sv": session_version,
        "iat": now,
        "exp": now + settings.token_ttl_minutes * 60,
    }, separators=(",", ":")).encode())
    signature = _b64encode(hmac.new(settings.jwt_secret.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest())
    return f"{header}.{payload}.{signature}"


def decode_token(token: str) -> dict[str, Any]:
    try:
        header, payload, signature = token.split(".")
        expected = _b64encode(hmac.new(settings.jwt_secret.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            raise ValueError("签名无效")
        claims = json.loads(_b64decode(payload))
        if int(claims["exp"]) < int(time.time()):
            raise ValueError("登录已过期")
        return claims
    except (ValueError, KeyError, json.JSONDecodeError) as exc:
        raise ValueError("无效的登录凭证") from exc
