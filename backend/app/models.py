from sqlalchemy import (
    Column,
    Text,
    Boolean,
    Integer,
    Numeric,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.database import Base


class Market(Base):
    __tablename__ = "markets"

    id = Column(Text, primary_key=True)
    question = Column(Text, nullable=False)
    description = Column(Text)
    category = Column(Text, nullable=False, default="other")
    resolution_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(Text, nullable=False, default="active")
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_featured = Column(Boolean, nullable=False, default=False)
    outcomes = Column(JSONB)
    image_url = Column(Text)
    slug = Column(Text)

    __table_args__ = (
        Index("idx_markets_category", "category"),
        Index("idx_markets_status", "status"),
    )


class Snapshot(Base):
    __tablename__ = "snapshots"

    market_id = Column(Text, ForeignKey("markets.id", ondelete="CASCADE"), primary_key=True)
    timestamp = Column(DateTime(timezone=True), primary_key=True, server_default=func.now())
    yes_price = Column(Numeric(5, 4), nullable=False)
    no_price = Column(Numeric(5, 4), nullable=False)
    volume = Column(Numeric(20, 2), nullable=False, default=0)
    open_interest = Column(Numeric(20, 2), nullable=False, default=0)

    __table_args__ = (
        Index("idx_snapshots_timestamp", "timestamp"),
        Index("idx_snapshots_market_time", "market_id", "timestamp"),
    )


class IngestionError(Base):
    __tablename__ = "ingestion_errors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    market_id = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    error_message = Column(Text, nullable=False)
    retry_count = Column(Integer, nullable=False, default=0)
