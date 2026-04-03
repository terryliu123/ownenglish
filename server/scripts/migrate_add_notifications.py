#!/usr/bin/env python3
"""Migration script to add notifications table."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.db.session import engine, Base
from app.models import Notification


async def migrate():
    """Create notifications table."""
    async with engine.begin() as conn:
        # Check if table exists
        result = await conn.execute(text("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='notifications'
        """))
        if result.scalar_one_or_none():
            print("Table notifications already exists")
            return

        # Create table
        await conn.execute(text("""
            CREATE TABLE notifications (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(200) NOT NULL,
                content TEXT,
                data JSON,
                is_read BOOLEAN DEFAULT 0,
                read_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """))

        # Create indexes
        await conn.execute(text("""
            CREATE INDEX idx_notifications_user ON notifications(user_id)
        """))
        await conn.execute(text("""
            CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read)
        """))
        await conn.execute(text("""
            CREATE INDEX idx_notifications_created ON notifications(created_at DESC)
        """))

        print("Table notifications created successfully")


if __name__ == "__main__":
    asyncio.run(migrate())
