# CryptoVault — Crypto Dashboard

A full-stack crypto dashboard built with React, TypeScript, Vite, and Supabase.

## Features

- 📈 Real-time cryptocurrency prices via CoinGecko API
- 💼 Portfolio tracking with profit/loss analysis
- 🔔 Price alerts (above/below thresholds)
- 📊 Market analysis & trends
- 🔐 Secure authentication via Supabase Auth (JWT)
- 💾 Persistent storage with PostgreSQL (Supabase)
- 🌗 Dark/light theme
- 📱 Responsive design

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd crypto-api-virtual-money
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Get these from your Supabase project: **Settings → API**.

### 3. Set up the database

In your Supabase dashboard, go to **SQL Editor** and run the migration files in order:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_...
```

Or run the full schema directly:

```sql
-- In Supabase SQL Editor, run:
-- supabase/schema.sql
```

### 4. Run the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest unit tests |
| `npm run test:coverage` | Run tests with coverage |
| `npm run test:e2e` | Run Playwright e2e tests |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui, Radix UI |
| State | Zustand, React Query |
| Charts | Recharts, Chart.js |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| Testing | Jest, React Testing Library, Playwright |

## Architecture

```
src/
├── components/     # Reusable UI components
├── hooks/          # Custom React hooks (auth, data, etc.)
├── pages/          # Page components
├── services/       # API service layer (CoinGecko, etc.)
├── store/          # Zustand global state
├── lib/            # Utilities (supabase client, decimal math)
├── contexts/       # React contexts (SimulatorContext)
├── types/          # TypeScript type definitions
└── utils/          # Helper utilities

supabase/
├── schema.sql           # Full database schema
├── migrations/          # Incremental schema migrations
└── functions/           # Edge functions (price refresh, alerts)
```

## Database Schema

| Table | Description |
|-------|-------------|
| `portfolio` | User crypto holdings |
| `trades` | Trade history |
| `alerts` | Price alerts |
| `wallet` | Virtual wallet balance |
| `preferences` | User settings |
| `pending_orders` | Limit orders |

All tables use Row-Level Security (RLS) so users can only access their own data.

## Authentication

Authentication is handled by Supabase Auth:
- Email/password sign up & sign in
- Session persistence via localStorage
- JWT tokens automatically refreshed
- Password reset via email

## Deployment

The app is configured for [Netlify](https://netlify.com) deployment (see `netlify.toml`).

1. Push to your repository
2. Connect to Netlify
3. Set environment variables in Netlify dashboard
4. Deploy

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run tests: `npm test`
4. Submit a pull request
