# 🌾 FarmPulse v2

Multi-tenant SaaS platform for agricultural operations — loads, commodities, fields, customers, income & expenses.

## Architecture

- **Auth & Orgs**: Clerk (each farm = one Clerk Organization)
- **Database**: PostgreSQL on Railway
- **Backend**: Node.js + Express
- **Frontend**: React + Vite + Tailwind

## Roles

| Role | Access |
|------|--------|
| Admin | Full access — dashboard, financials, all CRUD |
| Employee | Log loads only |
| Trucker | View loads across linked farms (read-only) |

## Local Development

### 1. Environment setup

**server/.env**
```
DATABASE_URL=your_railway_postgres_url
CLERK_SECRET_KEY=sk_test_...
PORT=3001
NODE_ENV=development
```

**client/.env**
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### 2. Install & migrate

```bash
cd server && npm install
node src/db/migrate.js   # Run once to create tables

cd ../client && npm install
```

### 3. Run

```bash
# Terminal 1
cd server && node src/index.js

# Terminal 2
cd client && npm run dev
```

Open http://localhost:5173

---

## Deploy to Railway

### First deploy

1. Push this repo to GitHub
2. Go to railway.app → New Project → Deploy from GitHub repo
3. Select this repo
4. Add these environment variables in Railway dashboard:

```
DATABASE_URL          = (auto-linked from your Postgres service)
CLERK_SECRET_KEY      = sk_live_...
CLERK_PUBLISHABLE_KEY = pk_live_...
NODE_ENV              = production
CLIENT_URL            = https://your-app.railway.app
```

5. Railway auto-builds and deploys

### Run migration on first deploy

In Railway dashboard → your service → Shell:
```bash
node server/src/db/migrate.js
```

### Update Clerk for production

In Clerk dashboard:
1. Add your Railway URL to **Allowed Origins**
2. Create **Production** instance for live keys

---

## Adding a Trucker (cross-farm loads)

To link a trucker to multiple farms, insert into the `trucker_farm_links` table:

```sql
INSERT INTO trucker_farm_links (clerk_user_id, farm_id)
VALUES ('user_xxx', 'farm-uuid-here');
```

A UI for this will be added in a future update.

---

## Security Notes

- All data is scoped by `farm_id` at the database level
- Soft deletes — nothing is permanently destroyed immediately  
- Employees cannot view financials (income/expenses/dashboard) — enforced server-side
- API keys should be rotated after initial setup
