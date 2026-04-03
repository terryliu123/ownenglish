from __future__ import annotations

import base64
import hashlib
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import get_settings

settings = get_settings()


class WeChatPayError(Exception):
    pass


class WeChatPayConfigError(WeChatPayError):
    pass


def _configured_value(key: str) -> str:
    """Get configuration value from environment variables only (no database)."""
    # Primary: environment variable / .env file
    value = getattr(settings, key, None)
    if value:
        return str(value)

    # Alternative key mappings for backward compatibility
    alt_keys = {
        "WECHAT_PAY_APP_ID": ["WECHAT_PAY_APPID"],
        "WECHAT_PAY_API_V3_KEY": ["WECHAT_PAY_KEY"],
        "WECHAT_PAY_MCH_SERIAL_NO": ["WECHAT_PAY_CERT_SERIAL_NO"],
        "WECHAT_PAY_PRIVATE_KEY_PATH": ["WECHAT_PAY_KEY_PATH"],
        "WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH": ["WECHAT_PAY_PUBLIC_CERT_PATH"],
    }

    for alt_key in alt_keys.get(key, []):
        value = getattr(settings, alt_key, None)
        if value:
            return str(value)

    return ""


def _load_private_key():
    raw_key = _configured_value("WECHAT_PAY_PRIVATE_KEY").strip()
    key_path = _configured_value("WECHAT_PAY_PRIVATE_KEY_PATH").strip()
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Loading private key from: {key_path} (exists: {os.path.exists(key_path) if key_path else False})")
    if not raw_key and key_path:
        path = key_path
        # Try relative to current working directory
        if not os.path.isabs(path) and not os.path.exists(path):
            abs_path = os.path.join(os.getcwd(), path)
            if os.path.exists(abs_path):
                path = abs_path
                logger.info(f"Using absolute path: {path}")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as handle:
                raw_key = handle.read().strip()
            logger.info(f"Loaded private key, length: {len(raw_key)}")
        else:
            logger.error(f"Private key file not found: {path}")
    if not raw_key:
        raise WeChatPayConfigError("WeChat Pay private key is not configured")
    return serialization.load_pem_private_key(raw_key.encode("utf-8"), password=None)


def _load_platform_public_key():
    raw_key = _configured_value("WECHAT_PAY_PLATFORM_PUBLIC_KEY").strip()
    key_path = _configured_value("WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH").strip()
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Loading platform public key from: {key_path} (exists: {os.path.exists(key_path) if key_path else False})")
    if not raw_key and key_path:
        path = key_path
        # Try relative to current working directory
        if not os.path.isabs(path) and not os.path.exists(path):
            abs_path = os.path.join(os.getcwd(), path)
            if os.path.exists(abs_path):
                path = abs_path
                logger.info(f"Using absolute path: {path}")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as handle:
                raw_key = handle.read().strip()
            logger.info(f"Loaded platform public key, length: {len(raw_key)}")
        else:
            logger.error(f"Platform public key file not found: {path}")
    if not raw_key:
        raise WeChatPayConfigError("WeChat Pay platform public key is not configured")
    return serialization.load_pem_public_key(raw_key.encode("utf-8"))


def _validate_config() -> None:
    required = {
        "WECHAT_PAY_APP_ID": _configured_value("WECHAT_PAY_APP_ID"),
        "WECHAT_PAY_MCH_ID": _configured_value("WECHAT_PAY_MCH_ID"),
        "WECHAT_PAY_MCH_SERIAL_NO": _configured_value("WECHAT_PAY_MCH_SERIAL_NO"),
        "WECHAT_PAY_NOTIFY_URL": _configured_value("WECHAT_PAY_NOTIFY_URL"),
        "WECHAT_PAY_API_V3_KEY": _configured_value("WECHAT_PAY_API_V3_KEY"),
    }
    missing = [key for key, value in required.items() if not str(value or "").strip()]
    if missing:
        raise WeChatPayConfigError(f"WeChat Pay config missing: {', '.join(missing)}")
    api_v3_key = _configured_value("WECHAT_PAY_API_V3_KEY")
    if len(api_v3_key.encode("utf-8")) != 32:
        raise WeChatPayConfigError("WECHAT_PAY_API_V3_KEY must be 32 bytes")


def is_wechat_pay_configured() -> bool:
    try:
        _validate_config()
        _load_private_key()
        _load_platform_public_key()
        return True
    except WeChatPayError:
        return False


def _build_signature(method: str, canonical_url: str, body: str, timestamp: str, nonce: str) -> str:
    message = f"{method}\n{canonical_url}\n{timestamp}\n{nonce}\n{body}\n"
    private_key = _load_private_key()
    signature = private_key.sign(
        message.encode("utf-8"),
        padding.PKCS1v15(),
        hashes.SHA256(),
    )
    return base64.b64encode(signature).decode("utf-8")


def _build_auth_header(method: str, canonical_url: str, body: str) -> str:
    timestamp = str(int(time.time()))
    nonce = uuid.uuid4().hex
    signature = _build_signature(method, canonical_url, body, timestamp, nonce)
    return (
        'WECHATPAY2-SHA256-RSA2048 '
        f'mchid="{_configured_value("WECHAT_PAY_MCH_ID")}",'
        f'nonce_str="{nonce}",'
        f'signature="{signature}",'
        f'timestamp="{timestamp}",'
        f'serial_no="{_configured_value("WECHAT_PAY_MCH_SERIAL_NO")}"'
    )


def _request_wechat_pay(method: str, path: str, payload: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    _validate_config()
    body = json.dumps(payload or {}, ensure_ascii=False, separators=(",", ":")) if payload is not None else ""
    base_url = "https://api.mch.weixin.qq.com"
    headers = {
        "Accept": "application/json",
        "Authorization": _build_auth_header(method, path, body),
        "Content-Type": "application/json",
        "User-Agent": "ownenglish/0.1.0",
    }
    request = urllib.request.Request(
        url=f"{base_url}{path}",
        data=body.encode("utf-8") if body else None,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="ignore")
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"WeChat Pay HTTP Error {exc.code}: {body_text}")
        try:
            payload = json.loads(body_text)
            # WeChat Pay v3 API returns errors in 'code' and 'message' fields
            message = payload.get("message") or payload.get("code") or body_text or str(exc)
            detail = payload.get("detail") or ""
            if detail:
                message = f"{message}: {detail}"
        except json.JSONDecodeError:
            message = body_text or str(exc)
        raise WeChatPayError(message) from exc
    except urllib.error.URLError as exc:
        raise WeChatPayError(str(exc)) from exc


def create_native_payment(
    *,
    order_no: str,
    description: str,
    amount_cents: int,
) -> dict[str, Any]:
    payload = {
        "appid": _configured_value("WECHAT_PAY_APP_ID"),
        "mchid": _configured_value("WECHAT_PAY_MCH_ID"),
        "description": description,
        "out_trade_no": order_no,
        "notify_url": _configured_value("WECHAT_PAY_NOTIFY_URL"),
        "amount": {
            "total": amount_cents,
            "currency": "CNY",
        },
    }
    result = _request_wechat_pay("POST", "/v3/pay/transactions/native", payload)
    # Log the response for debugging
    import logging
    logging.getLogger(__name__).info(f"WeChat Native Payment response: {result}")
    return result


def create_h5_payment(
    *,
    order_no: str,
    description: str,
    amount_cents: int,
    client_ip: str,
) -> dict[str, Any]:
    scene_info = {
        "payer_client_ip": client_ip or "127.0.0.1",
        "h5_info": {
            "type": "Wap",
            "app_name": "OwnEnglish",
            "app_url": _configured_value("WECHAT_PAY_H5_DOMAIN") or "https://example.com",
        },
    }
    payload = {
        "appid": _configured_value("WECHAT_PAY_APP_ID"),
        "mchid": _configured_value("WECHAT_PAY_MCH_ID"),
        "description": description,
        "out_trade_no": order_no,
        "notify_url": _configured_value("WECHAT_PAY_NOTIFY_URL"),
        "amount": {
            "total": amount_cents,
            "currency": "CNY",
        },
        "scene_info": scene_info,
    }
    return _request_wechat_pay("POST", "/v3/pay/transactions/h5", payload)


def query_order_status(order_no: str) -> dict[str, Any]:
    path = f"/v3/pay/transactions/out-trade-no/{urllib.parse.quote(order_no)}?mchid={urllib.parse.quote(_configured_value('WECHAT_PAY_MCH_ID'))}"
    return _request_wechat_pay("GET", path)


def verify_callback_signature(
    *,
    timestamp: str,
    nonce: str,
    body: str,
    signature: str,
) -> bool:
    public_key = _load_platform_public_key()
    message = f"{timestamp}\n{nonce}\n{body}\n"
    try:
        public_key.verify(
            base64.b64decode(signature),
            message.encode("utf-8"),
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
        return True
    except Exception:
        return False


def decrypt_callback_resource(resource: dict[str, Any]) -> dict[str, Any]:
    ciphertext = base64.b64decode(resource["ciphertext"])
    nonce = resource["nonce"].encode("utf-8")
    associated_data = str(resource.get("associated_data") or "").encode("utf-8")
    aesgcm = AESGCM(_configured_value("WECHAT_PAY_API_V3_KEY").encode("utf-8"))
    plain = aesgcm.decrypt(nonce, ciphertext, associated_data)
    return json.loads(plain.decode("utf-8"))


def build_payment_description(plan_name: str) -> str:
    return f"OwnEnglish {plan_name}"


def map_wechat_trade_state(state: str) -> str:
    normalized = (state or "").upper()
    if normalized in {"SUCCESS"}:
        return "paid"
    if normalized in {"CLOSED", "REVOKED"}:
        return "cancelled"
    if normalized in {"PAYERROR"}:
        return "failed"
    return "pending"


def parse_paid_at(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized).astimezone(timezone.utc)
    except ValueError:
        return None
