from sqlalchemy import (
    Column,
    Text,
    Boolean,
    Integer,
    Float,
    Numeric,
    String,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Market(Base):
    __tablename__ = "markets"

    id = Column(Text, primary_key=True)
    question = Column(Text, nullable=False)
    description = Column(Text)
    category = Column(Text, nullable=False, default="other")
    resolution_date = Column(DateTime(timezone=True))
    closed_time = Column(DateTime(timezone=True))
    resolution_status = Column(Text)
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
        Index("idx_markets_closed_time", "closed_time"),
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


class MarketCluster(Base):
    __tablename__ = "market_clusters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(Text, nullable=False)
    cluster_type = Column(String(50), default="threshold")  # threshold, related, manual
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    cluster_markets = relationship("ClusterMarket", back_populates="cluster", cascade="all, delete-orphan")


class ClusterMarket(Base):
    __tablename__ = "cluster_markets"

    cluster_id = Column(Integer, ForeignKey("market_clusters.id", ondelete="CASCADE"), primary_key=True)
    market_id = Column(Text, ForeignKey("markets.id", ondelete="CASCADE"), primary_key=True)
    sort_value = Column(Float)  # threshold value for ordering within cluster

    cluster = relationship("MarketCluster", back_populates="cluster_markets")


class MarketContext(Base):
    __tablename__ = "market_contexts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    market_id = Column(Text, ForeignKey("markets.id", ondelete="CASCADE"), nullable=False, index=True)
    raw_context = Column(Text)
    summary = Column(Text)
    scraped_at = Column(DateTime(timezone=True))
    scrape_status = Column(String(20), default="pending")
    failure_reason = Column(Text)
    retry_count = Column(Integer, default=0)
    probability_at_scrape = Column(Float)
    needs_refresh = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
