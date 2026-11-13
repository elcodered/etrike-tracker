# E-Trike Rent & Status Tracking System

A full-stack fleet operations application for 17 electric tricycles. Operators update one auto-populated daily report; owners see submitted status, rental collections, and history without waiting for a typed message.

## Stack and structure

- **Frontend:** React 19, Vite, JSX, React Router, Axios, Tailwind CSS 4, Lucide React, Recharts.
- **Backend:** Laravel 12, Sanctum, Form Requests, authorization policy, API Resources, service classes, Eloquent.
- **Database:** PostgreSQL; foreign keys, unique constraints, numeric money, DATE report dates, JSONB audit records.
- **Timezone:** Asia/Manila for report-day rules and display.

```text
frontend/
  src/api/          Axios client and error normalization
  src/components/   Fleet table, report editor rows, summaries, forms, dialogs
  src/context/      Cookie-session authentication and notifications
  src/hooks/        API loading, error, refresh, and polling state
  src/layouts/      Responsive sidebar and navigation
  src/pages/        Reports, fleet, management, analytics, sharing
  src/routes/       Protected routes and role restrictions
  src/utils/        Currency, Manila dates, report text
backend/
  app/Http/         Controllers, validation requests, middleware, resources
  app/Models/       Eloquent entities and relationships
  app/Policies/     Daily-report role and lifecycle rules
  app/Services/     Reports, analytics, settings, audit events
  database/         PostgreSQL migrations and seeders
  tests/Feature/    Integration tests on a separate PostgreSQL database
  routes/          API and administrator creation command
deploy/             Nginx same-origin deployment configuration
compose.yaml        PHP-FPM + Nginx + PostgreSQL deployment
scripts/check.sh    Backend tests/style and frontend tests/build
```

## Implemented workflow

1. Sign in as an administrator or operator, then open **Today’s report**.
2. Create the report. The API inserts every active unit, suggesting its most recent prior submitted driver assignment (or its default driver if no prior entry exists). Previous repair statuses are not copied. An unavailable or unassigned driver produces **No Driver**, with zero rental.
3. Use quick status buttons or dropdowns, choose a driver, enter a custom rental, and add remarks. Full-day and half-day amounts are suggestions, not restrictions. **Save draft** persists the changes transactionally.
4. Review totals in the submission dialog, then submit. Owners and share links immediately read the published record on their next fetch; open fleet/shared pages refresh every 15 seconds and dashboard pages every 30 seconds.
5. Inspect report, unit, and driver history. Administrators can reopen and correct a submitted or locked report; all edits are audited.

**Download PDF** beside **Copy as text** on a daily report exports a dated landscape PDF with saved driver/plate snapshots, statuses, custom rentals, remarks, notes, summary totals, and page numbers. Save unsaved draft edits before downloading. Draft PDFs are labeled clearly, and download access follows the report’s existing permissions.

Also includes e-trike/driver CRUD and archiving, search and pagination, user management, rental settings, monthly charts, availability, downtime counts, bulk updates, report text copying, expiring/revocable/regenerable sharing links, mobile navigation and card layouts, validation/loading/error/empty states, and protection against leaving unsaved edits.

## Native development requirements

- PHP **8.2+** (8.3+ recommended) with PDO PostgreSQL, mbstring, XML/DOM, ctype, curl, fileinfo, OpenSSL, tokenizer, session, and standard Laravel extensions.
- Composer 2.
- Node.js 22 and npm.
- PostgreSQL 15+.

### Database

Create a dedicated application role and databases. From an account allowed to create them:

```bash
createuser --pwprompt etrike_app
createdb --owner=etrike_app etrike_tracking
createdb --owner=etrike_app etrike_testing
```

Use a unique generated password. The test database is separate because integration tests migrate and reset it.

### Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Set PostgreSQL values in `backend/.env`:

```dotenv
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=etrike_tracking
DB_USERNAME=etrike_app
DB_PASSWORD=<your-generated-database-password>
```

Then:

```bash
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8017
```

In `APP_ENV=local` or `testing`, the seeder creates:

| Account | Role |
|---|---|
| `admin@etrike.local` | Administrator |
| `operator@etrike.local` | Operator / Reporter |
| `viewer@etrike.local` | Owner / Viewer |

Set `DEMO_ADMIN_PASSWORD` in the local environment before seeding, or the seeder prints a newly generated random local password. Existing accounts are never overwritten when seeding again. For this prepared workspace, the generated credentials are in the ignored **LOCAL_ACCESS.md** file. Do not commit that file or local environment files.

Seeders include the requested 17 plates, 21 driver names, eight standardized statuses, and six sample historical reports (August 29/31 and September 1–4, 2026). The historical reports are explicitly sample development data. Today’s report is left for the operator to create. Production seeding creates reference fleet data and statuses, with **no demo accounts or sample reports**.

### Frontend

In another terminal:

```bash
cd frontend
npm ci
cp .env.example .env
npm run dev
```

Open **http://localhost:5183**. Vite forwards `/api` and `/sanctum` to `http://127.0.0.1:8017`. Keep `VITE_API_URL` empty for this same-origin setup. If the port is occupied, Vite prints its actual selected URL. Update relevant environment settings for a directly hosted cross-origin setup.

## Authentication and authorization

The SPA uses **Sanctum with Laravel cookie sessions**, not tokens in browser storage:

1. `GET /sanctum/csrf-cookie`.
2. `POST /api/login` with email/password and the `X-XSRF-TOKEN` header.
3. Axios sends session cookies and CSRF headers on subsequent requests.
4. `POST /api/logout` invalidates the session and regenerates the CSRF token.

The API route group explicitly applies Laravel's `web` middleware, enabling sessions and CSRF enforcement on every state-changing request, including login. Private routes additionally require `auth:sanctum` and an active account. Login is rate-limited by email/IP and IP. Other API requests are rate-limited. Passwords use Laravel hashing and are hidden in responses and audit logs.

For separate frontend/backend subdomains, set `FRONTEND_URL` to the exact permitted origin, `SESSION_DOMAIN` to the shared parent domain, and `SESSION_SECURE_COOKIE=true` under HTTPS. The included CORS configuration permits credentials only from configured origins. Set `VITE_API_URL` to the API origin and rebuild. Prefer the included same-origin Nginx deployment to avoid cross-site cookie limitations.

| Capability | Administrator | Operator | Owner / Viewer |
|---|---|---|---|
| Read submitted fleet, history, collections, analytics | Yes | Yes | Yes |
| Read drafts | Yes | Yes | No |
| Create/edit today's draft | Yes | Yes | No |
| Create/edit previous dates | Yes | No | No |
| Reopen or lock reports | Yes | No | No |
| Manage units/drivers | Yes | No | No |
| Manage users/settings/share links/audit logs | Yes | No | No |

User administration prevents disabling/demoting the current administrator and removing the final active administrator. Disabling any account blocks its existing authenticated session from API access. There is no public registration or public editing.

## Data and reporting rules

- Exactly **one official report per date**. Correct existing reports by reopening; parallel report versions are intentionally not supported. Audit logs preserve the changes.
- Exactly one item per unit per report, with database unique constraints.
- `daily_report_items.status_id` references `statuses`; API responses also expose `operational_status` as the standardized code. No free-text statuses.
- Rentals use PostgreSQL `NUMERIC(12,2)`, reject negative values and more than two decimal places, and are summed in SQL. Arbitrary valid amounts, such as ₱200 or ₱200.25, are supported.
- Driver IDs and plate/driver-name snapshots belong to the daily entry. Editing a profile, changing a default driver, or archiving a unit does not rewrite history.
- Report creation uses the latest **earlier submitted report** for each unit's suggested driver. New entries start Running if assigned; unassigned units start No Driver. Inactive drivers are not newly assigned.
- Save/submit/bulk actions take a report `version`. A row lock and version check return **409** on stale data. Reload before retrying; unsaved edits are never silently overwritten by polling.
- Submitted and locked reports are read-only until an administrator reopens them. Reopening removes that report from owner/shared views until resubmission; the latest other submitted report becomes visible.
- Bulk **Mark assigned units Running** requires explicit confirmation and preserves units without drivers. **Set Running rental** leaves other statuses and amounts intact. Bulk actions require the editor's existing changes to be saved first.
- A draft retains its original unit roster. **Sync active units** adds newly activated/created units without deleting existing entries; submission validates that no active unit is missing. Newly synced units start No Driver and require review.
- Monthly availability = full running unit-days + 0.5 × half-days, divided by **recorded expected unit-days in submitted/locked reports**. Missing/unsubmitted report dates are excluded, not silently assumed operational. Rental averages use submitted report dates, not all calendar days. The analytics screen labels this denominator.
- Driver statistics reflect fleet operations and collections, **not payroll**.
- Dashboard status is explicitly the latest submitted report, not a GPS/telematics feed. Its date is always shown. A draft never masquerades as a current published report.
- Audit records capture actor, action, entity, old/new JSONB values, and timestamp in the same transaction as the relevant change. The API exposes no audit update/delete action.

## Secure owner sharing

Administrators create links in **Settings → Owner sharing**. Each uses 32 cryptographically random bytes (64 hexadecimal characters). Only a SHA-256 hash is stored; the raw link is shown once when created or regenerated. Links can expire or be revoked. Regeneration invalidates the old token; create a new link for an already expired share.

`/report/share/{token}` shows only the latest submitted report. It exposes no management controls, user accounts, driver contact information, or audit history. The shared endpoint works without login only for valid tokens. Responses use `Cache-Control: no-store` and `Referrer-Policy: no-referrer`. The supplied Nginx configuration disables access logging for share-token URLs and API routes. Treat a link as a bearer secret and send it only to intended viewers. Authenticated owners can separately access the full report history.

## REST API

All paths below are under `/api`. Responses use Laravel's normal 401, 403, 404, 409, 422, and 429 status codes. Validation failures include `message` and field-level `errors`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/login`, `/logout` | Cookie authentication |
| GET | `/me` | Current user |
| GET | `/dashboard`, `/fleet/current` | Latest submitted report and summary |
| GET/POST | `/etrikes`, `/drivers` | Search/paginate or create |
| GET/PUT/DELETE | `/etrikes/{id}`, `/drivers/{id}` | Read/update/archive |
| GET | `/etrikes/{id}/history`, `/drivers/{id}/history` | Paginated historical snapshots |
| GET | `/statuses` | Standard operational statuses |
| GET/POST | `/daily-reports` | Filter/paginate or create |
| GET/PUT | `/daily-reports/{id}` | Read or save items/notes transactionally |
| GET | `/daily-reports/{id}/pdf?version=1` | Download saved report PDF; optional version rejects stale exports |
| POST | `/daily-reports/{id}/submit` | Publish after validation |
| POST | `/daily-reports/{id}/reopen`, `/lock` | Administrator lifecycle controls |
| POST | `/daily-reports/{id}/bulk`, `/sync` | Bulk edits / add active units |
| GET | `/analytics?month=2026-09` | Monthly collections and availability |
| GET/POST | `/users` | Administrator user management |
| PUT | `/users/{id}` | Change role, profile, password, active status |
| GET/PUT | `/settings` | Read defaults / administrator update |
| GET/POST | `/share-links` | List or create secure links |
| DELETE | `/share-links/{id}` | Revoke link |
| POST | `/share-links/{id}/regenerate` | Replace token |
| GET | `/shared/{token}` | Public read-only report with valid token |
| GET | `/audit-logs` | Paginated administrator audit history |

Unit and driver lists accept `search`, `active=1|0`, `page`, and `per_page` (maximum 100). Reports accept `date`, `from`, `to`, `status`, `page`, and `per_page`. Report lists return resource pagination under `meta`; management lists use standard paginator properties at the top level.

Example save payload:

```json
{
  "version": 1,
  "notes": "Afternoon collection complete",
  "items": [
    {"id": 103, "driver_id": 9, "status_id": 2, "rental_amount": 200, "remarks": "Driver attended meeting"}
  ]
}
```

Use actual IDs from API responses; do not assume seeded IDs. Partial item lists are supported within a save. There is no standalone item endpoint: item changes are scoped to their report so ownership, transaction, lifecycle, and concurrency checks remain together.

## Verification

Create `backend/.env.testing` from `.env.testing.example`, configure its database password and an application key, and ensure `etrike_testing` exists. Never point tests at the application database. `phpunit.xml` explicitly selects `etrike_testing`.

```bash
cd backend
php artisan test
vendor/bin/pint --test
cd ../frontend
npm test
npm run build
```

Or run `./scripts/check.sh` from the project root.

The integration suite covers authentication, roles, inactive sessions, auto-population, history preservation, custom rentals, validation, atomic rollback, stale versions, lifecycle transitions, fleet synchronization, safe bulk edits, secure sharing, analytics, user safeguards, and Manila date boundaries. Frontend unit tests cover decimal totals, generated report text, and timezone formatting. Separate HTTP smoke checks exercise the Vite proxy, CSRF cookies and rejection, login/logout, private reads, and independent user sessions. Browser visual testing has not been performed.

## Deployment

**Active VPS deployment:** https://etrike.bnbtctracker.com. See [Hostinger production operations](deploy/hostinger/README.md) for the installed layout, HTTPS renewal, and update process. Production and local databases are separate. Existing accounts and reports were retained as requested.

This stack needs a PHP-capable host and PostgreSQL. Sites' Cloudflare Worker runtime cannot directly run the Laravel/PHP backend, so a Sites-only deployment is not provided. The complete application can run using the supplied Docker Compose setup or equivalent PHP-FPM/Nginx hosting.

### Docker Compose

1. Install Docker Engine and Compose.
2. Copy the root `.env.example` to `.env`. Generate independent secrets:

```bash
php -r 'echo "base64:".base64_encode(random_bytes(32)).PHP_EOL;'
php -r 'echo bin2hex(random_bytes(32)).PHP_EOL;'
```

Place the first value in `APP_KEY` and the second in `DB_PASSWORD`. Keep them private and persistent across redeployments.

3. Build/start and initialize the database:

```bash
docker compose up -d --build
docker compose exec app php artisan migrate --seed --force
docker compose exec app php artisan app:create-admin owner@example.com "Fleet Administrator"
```

The final command securely prompts for a strong password; it does not put a password in shell history. Production seeders create no login accounts. Open `http://localhost:8080` for local container access.

4. For a public production host, configure your HTTPS reverse proxy/domain, set `APP_URL` to its HTTPS origin and `SESSION_SECURE_COOKIE=true`, then recreate the app container. The web port binds to localhost by default for use behind the host's TLS proxy. PostgreSQL and PHP-FPM are never published as host ports.

5. Back up the PostgreSQL volume, retain the application key, apply migrations as a deployment step, and use `GET /up` for health checks. Restore database backups as part of your operational deployment process. Docker configuration is provided but was not built in this workspace because Docker is unavailable.

For native hosting, serve `frontend/dist` from Nginx and forward `/api`, `/sanctum`, and `/up` to `backend/public/index.php` via PHP-FPM. `deploy/nginx.conf` is the reference. Set `APP_ENV=production`, `APP_DEBUG=false`, encrypted database sessions, a unique `APP_KEY`, and HTTPS secure cookies. Configure writable `storage` and `bootstrap/cache` directories for the PHP worker user.

## Framework references

- [Laravel 12 Sanctum SPA authentication](https://laravel.com/docs/12.x/sanctum#spa-authentication)
- [Tailwind CSS Vite integration](https://tailwindcss.com/docs/installation/using-vite)

PDF generation uses [Laravel Dompdf](https://github.com/barryvdh/laravel-dompdf) with embedded DejaVu Sans for Unicode names and peso symbols. Remote resources, embedded PHP, and PDF JavaScript are disabled. No external rendering service is used.
