from __future__ import annotations

import logging
from typing import Any


def log_live_transport(logger: logging.Logger, event: str, **fields: Any) -> None:
    ordered = []
    for key in sorted(fields):
        value = fields[key]
        if value is None:
            continue
        ordered.append(f"{key}={value}")
    suffix = " " + " ".join(ordered) if ordered else ""
    logger.info("[live.transport] event=%s%s", event, suffix)
