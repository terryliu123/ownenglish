#!/usr/bin/env python3
"""Migration script to add task_group_shares table."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.db.session import engine, Base
from app.models import TaskGroupShare


async def migrate():
    """Create task_group_shares table."""
    async with engine.begin() as conn:
        # Check if table exists
        result = await conn.execute(text("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='task_group_shares'
        """))
        if result.scalar_one_or_none():
            print("Table task_group_shares already exists")
            return

        # Create table
        await conn.execute(text("""
            CREATE TABLE task_group_shares (
                id VARCHAR(36) PRIMARY KEY,
                share_token VARCHAR(64) UNIQUE NOT NULL,
                task_group_id VARCHAR(36) NOT NULL,
                shared_by VARCHAR(36) NOT NULL,
                share_name VARCHAR(200) NOT NULL,
                share_description TEXT,
                is_active BOOLEAN DEFAULT 1,
                view_count INTEGER DEFAULT 0,
                copy_count INTEGER DEFAULT 0,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (task_group_id) REFERENCES live_task_groups(id),
                FOREIGN KEY (shared_by) REFERENCES teacher_profiles(user_id)
            )
        """))

        # Create indexes
        await conn.execute(text("""
            CREATE INDEX idx_task_group_shares_token ON task_group_shares(share_token)
        """))
        await conn.execute(text("""
            CREATE INDEX idx_task_group_shares_group ON task_group_shares(task_group_id)
        """))

        print("Table task_group_shares created successfully")


if __name__ == "__main__":
    asyncio.run(migrate())
