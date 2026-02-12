# PolyNews

**Prediction market data as a news feed.** PolyNews transforms Polymarket prediction markets into a scannable dashboard of "living questions with evolving answers." See what's likely to happen across politics, crypto, sports, and tech — powered by crowd wisdom, not editorial opinion.

## Architecture

```
Polymarket API → Celery Worker → PostgreSQL → Redis Cache → FastAPI → React/Next.js
                 (every 15min)    (snapshots)   (5min TTL)    (REST)    (SSR + SPA)
```

**Three-tier batch-oriented architecture:**

1. **Ingestion Layer** — Celery tasks fetch market data from Polymarket's Gamma API every 15 minutes, storing append-only snapshots in PostgreSQL
2. **API Layer** — FastAPI serves pre-computed feeds from Redis cache and Postgres materialized views
3. **Frontend** — Next.js with React Query handles client-side caching and background refetching

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, React Query, Chart.js |
| Backend | Python, FastAPI, Celery, Redis |
| Database | PostgreSQL 16, Redis 7 |
| Infrastructure | Docker Compose |

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local frontend dev)
- Python 3.12+ (for local backend dev)

### Run with Docker Compose

```bash
# Clone and start all services
docker compose up --build

# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API docs: http://localhost:8000/docs
```

### Local Development

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start FastAPI
uvicorn app.main:app --reload --port 8000

# Start Celery worker (separate terminal)
celery -A app.celery_app worker --loglevel=info

# Start Celery beat (separate terminal)
celery -A app.celery_app beat --loglevel=info
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Trigger Initial Data Ingestion

After services are running, trigger the first ingestion manually:

```bash
# Via Celery
docker compose exec celery-worker python -c "from app.celery_app import ingest_markets; ingest_markets.delay()"

# Or via API (if you add a trigger endpoint)
curl -X POST http://localhost:8000/api/ingest
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/markets` | Paginated feed with filtering and sorting |
| GET | `/api/markets/{id}` | Single market detail with 7-day price history |
| GET | `/api/categories` | Categories with market counts |
| GET | `/api/health` | System health and data freshness |

### Query Parameters for `/api/markets`

| Param | Values | Default |
|-------|--------|---------|
| `category` | politics, crypto, sports, tech, other | all |
| `sort` | interesting, trending | interesting |
| `limit` | 1-100 | 50 |
| `offset` | 0+ | 0 |

## Features

- **Curated Feed** — 50-100 most liquid markets as scannable cards with probability gauges
- **Category Filtering** — Politics, Crypto, Sports, Tech, Other with featured markets
- **Market Detail** — 7-day sparkline chart, volume, resolution countdown
- **Trending Algorithm** — Surfaces biggest 24h probability movements
- **Bookmarks** — localStorage-based watchlist (no account needed)
- **Onboarding** — First-time overlay explaining prediction markets
- **Data Freshness** — Transparent staleness indicators and timestamps

## Data Model

- **Markets** — Core prediction questions with metadata
- **Snapshots** — Append-only time-series of price/volume (every 15min)
- **Trending View** — Materialized view for 24h delta calculations

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

See `.env.example` for all available configuration options.

## Project Structure

```
polynews/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── init.sql                    # Database schema
│   └── app/
│       ├── main.py                 # FastAPI application
│       ├── config.py               # Settings
│       ├── database.py             # Async SQLAlchemy
│       ├── models.py               # ORM models
│       ├── schemas.py              # Pydantic schemas
│       ├── cache.py                # Redis caching
│       ├── scoring.py              # Ranking algorithms
│       ├── celery_app.py           # Celery configuration
│       ├── api/
│       │   ├── markets.py          # Market endpoints
│       │   ├── categories.py       # Category endpoints
│       │   └── health.py           # Health check
│       └── ingestion/
│           ├── polymarket.py       # Polymarket API client
│           └── tasks.py            # Celery ingestion tasks
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── next.config.js
    └── src/
        ├── app/
        │   ├── layout.tsx          # Root layout with providers
        │   ├── page.tsx            # Home page
        │   ├── globals.css         # Design tokens & global styles
        │   └── market/[id]/page.tsx # Market detail deep-link page
        ├── components/
        │   ├── Header.tsx
        │   ├── Feed.tsx
        │   ├── MarketCard.tsx
        │   ├── MarketDetail.tsx
        │   ├── ProbabilityGauge.tsx
        │   ├── TrendArrow.tsx
        │   ├── SparklineChart.tsx
        │   ├── CategoryFilter.tsx
        │   ├── SortToggle.tsx
        │   ├── BookmarkButton.tsx
        │   ├── OnboardingOverlay.tsx
        │   └── StalenessBar.tsx
        ├── hooks/
        │   ├── useMarkets.ts
        │   └── useBookmarks.ts
        ├── lib/
        │   ├── api.ts
        │   ├── types.ts
        │   └── utils.ts
        └── providers/
            └── QueryProvider.tsx
```
