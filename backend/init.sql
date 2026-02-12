-- Follow The Signal Database Schema

CREATE TABLE IF NOT EXISTS markets (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'other',
    resolution_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'active',
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    outcomes JSONB,
    image_url TEXT,
    slug TEXT
);

CREATE INDEX idx_markets_category ON markets(category);
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_featured ON markets(is_featured) WHERE is_featured = TRUE;

CREATE TABLE IF NOT EXISTS snapshots (
    market_id TEXT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    yes_price DECIMAL(5,4) NOT NULL,
    no_price DECIMAL(5,4) NOT NULL,
    volume DECIMAL(20,2) NOT NULL DEFAULT 0,
    open_interest DECIMAL(20,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (market_id, timestamp)
);

CREATE INDEX idx_snapshots_timestamp ON snapshots(timestamp DESC);
CREATE INDEX idx_snapshots_market_time ON snapshots(market_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS ingestion_errors (
    id SERIAL PRIMARY KEY,
    market_id TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_message TEXT NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_ingestion_errors_market ON ingestion_errors(market_id);
CREATE INDEX idx_ingestion_errors_time ON ingestion_errors(timestamp DESC);

-- Materialized view for trending markets (24h price movement)
CREATE MATERIALIZED VIEW IF NOT EXISTS trending_view AS
WITH latest AS (
    SELECT DISTINCT ON (market_id)
        market_id,
        yes_price AS current_price,
        timestamp AS current_timestamp
    FROM snapshots
    ORDER BY market_id, timestamp DESC
),
day_ago AS (
    SELECT DISTINCT ON (market_id)
        market_id,
        yes_price AS price_24h_ago
    FROM snapshots
    WHERE timestamp <= NOW() - INTERVAL '24 hours'
    ORDER BY market_id, timestamp DESC
),
vol_rank AS (
    SELECT
        market_id,
        SUM(volume) AS total_volume,
        RANK() OVER (ORDER BY SUM(volume) DESC) AS volume_rank
    FROM snapshots
    WHERE timestamp >= NOW() - INTERVAL '24 hours'
    GROUP BY market_id
)
SELECT
    l.market_id,
    l.current_price,
    COALESCE(d.price_24h_ago, l.current_price) AS price_24h_ago,
    ABS(l.current_price - COALESCE(d.price_24h_ago, l.current_price)) AS delta,
    COALESCE(v.volume_rank, 9999) AS volume_rank
FROM latest l
LEFT JOIN day_ago d ON l.market_id = d.market_id
LEFT JOIN vol_rank v ON l.market_id = v.market_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trending_market ON trending_view(market_id);

-- Function to refresh materialized view concurrently
CREATE OR REPLACE FUNCTION refresh_trending_view()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY trending_view;
END;
$$ LANGUAGE plpgsql;
