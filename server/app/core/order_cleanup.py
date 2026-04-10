"""Background task to expire pending payment orders after 15 minutes."""
import asyncio
import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, update

from app.db.session import async_session_maker
from app.models import PaymentOrder

logger = logging.getLogger(__name__)

EXPIRE_AFTER_MINUTES = 15
CLEANUP_INTERVAL = 60  # seconds between runs


async def _expire_pending_orders() -> int:
    """Mark all pending orders older than EXPIRE_AFTER_MINUTES as expired. Returns count."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=EXPIRE_AFTER_MINUTES)
    async with async_session_maker() as session:
        result = await session.execute(
            update(PaymentOrder)
            .where(
                PaymentOrder.status == "pending",
                PaymentOrder.created_at < cutoff,
            )
            .values(status="expired", updated_at=datetime.now(timezone.utc))
        )
        count = result.rowcount  # type: ignore[union-attr]
        if count and count > 0:
            await session.commit()
            logger.info(f"[OrderCleanup] Expired {count} pending order(s)")
        return count


async def order_cleanup_loop() -> None:
    """Background loop — runs every CLEANUP_INTERVAL seconds."""
    while True:
        try:
            await _expire_pending_orders()
        except Exception as e:
            logger.error(f"[OrderCleanup] Error: {e}")
        await asyncio.sleep(CLEANUP_INTERVAL)
