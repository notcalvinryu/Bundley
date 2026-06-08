# Deploying Bundley

The app has two halves that ship separately:

1. **Storefront + discount function** → shipped to Shopify with `npm run deploy`.
2. **Admin app** (the Remix server in `app/`) → hosted on **Fly.io** (this guide).

The admin app now uses **PostgreSQL** (it used SQLite for local-only dev). You need
a Postgres database for both local dev and production.

---

## 1. Local development with Postgres

`npm run dev` no longer works with the old SQLite file — set `DATABASE_URL` to a
Postgres database. Easiest is a free one from **Neon** (https://neon.tech) or
**Supabase**.

1. Create a free Postgres DB and copy its connection string.
2. Add it to your local `.env` (this file is gitignored):
   ```
   DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
   ```
3. Apply the schema and start:
   ```powershell
   npx prisma migrate deploy
   npm run dev
   ```

---

## 2. Production on Fly.io

### One-time setup

1. **Install flyctl** and sign in:
   ```powershell
   # Install (PowerShell):
   iwr https://fly.io/install.ps1 -useb | iex
   fly auth login
   ```

2. **Launch the app** (from `Z:\Projects\Bundley`). This reads the committed
   `fly.toml` and `Dockerfile`. Say **No** to deploying immediately:
   ```powershell
   fly launch --no-deploy
   ```
   - If the app name `bundley` is taken, it will pick/prompt a new one and update
     `fly.toml`. Note the final name → your URL is `https://<app-name>.fly.dev`.

3. **Provision and attach Postgres** (sets `DATABASE_URL` as a secret automatically):
   ```powershell
   fly postgres create --name bundley-db --region iad
   fly postgres attach bundley-db
   ```
   (Or attach any external Postgres by setting `DATABASE_URL` yourself in step 4.)

4. **Set the app secrets** (values from your Shopify Partner dashboard / `.env`):
   ```powershell
   fly secrets set `
     SHOPIFY_API_KEY=xxxxx `
     SHOPIFY_API_SECRET=xxxxx `
     SCOPES=write_products,read_products `
     SHOPIFY_APP_URL=https://<app-name>.fly.dev
   ```
   (`SCOPES` must match `shopify.app.toml`. `DATABASE_URL` is already set if you
   attached Fly Postgres.)

5. **Deploy:**
   ```powershell
   fly deploy
   ```
   The `release_command` in `fly.toml` runs `prisma migrate deploy` before the new
   version goes live, creating the tables on first deploy.

### Point Shopify at the hosted URL

After the first successful deploy, update the app URLs so Shopify talks to Fly
instead of the dev tunnel:

1. In `shopify.app.toml`, set:
   ```toml
   application_url = "https://<app-name>.fly.dev"

   [auth]
   redirect_urls = [ "https://<app-name>.fly.dev/auth/callback" ]
   ```
2. Push the config to Shopify:
   ```powershell
   npm run deploy
   ```
   (or update the URLs in the Partner dashboard → App setup).

### Redeploys

```powershell
fly deploy        # admin app
npm run deploy    # storefront extension + discount function
```
