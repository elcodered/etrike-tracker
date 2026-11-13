# Hostinger VPS production deployment

Live application: **https://etrike.bnbtctracker.com**

This VPS serves E-Trike with Nginx and PHP 8.5 FPM. The React production build is served directly; neither Vite nor `php artisan serve` is needed for the public application.

## Installed layout

- Source workspace: `/root/system/etrike-tracker`
- Active release symlink: `/var/www/etrike/current`
- Versioned releases: `/var/www/etrike/releases/`
- Private production environment: `/var/www/etrike/shared/backend.env`
- Writable application storage: `/var/www/etrike/shared/storage`
- Production database: `etrike_production`, owned by the dedicated `etrike_prod` role
- PHP worker account: `etrike`; pool: `/etc/php/8.5/fpm/pool.d/etrike.conf`
- PHP socket: `/run/php/etrike.sock`
- Nginx site: `/etc/nginx/sites-available/etrike-bnbtctracker`
- Nginx application snippet: `/etc/nginx/snippets/etrike-app.conf`
- HTTPS certificate: `/etc/letsencrypt/live/etrike.bnbtctracker.com/`

The production environment is separate from `backend/.env`. Keep it outside source control. Production uses its own application key, database credentials, encrypted session cookies, and secure-cookie flag. Debug output is disabled.

## Initial data transfer

At the user's request, existing accounts and records were copied from `etrike_tracking`. Password hashes were preserved, so existing logins still work. The initial transfer contained 3 accounts, 22 drivers, 17 units, 7 reports, and 119 report entries. All current reports, including the requested sample/history and draft records, were retained. Session/cache records and personal access tokens were reset in the new database so users sign in afresh.

A consistent PostgreSQL custom-format backup of the original database is stored privately under `/var/backups/etrike/initial-local-*.dump`. Existing Nginx site definitions were backed up under `/var/backups/etrike/nginx-before-deployment/`.

**Enter real operational updates through the production URL from now on.** Production and development databases are independent; later local changes are not synchronized automatically. Do not overwrite production with another local database dump.

## Service operations

```bash
sudo systemctl status nginx php8.5-fpm
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl reload php8.5-fpm
```

Nginx and PHP-FPM start automatically at boot. Health endpoint: `https://etrike.bnbtctracker.com/up`.

For application commands:

```bash
cd /var/www/etrike/current/backend
sudo -u etrike php artisan migrate:status
```

The current release uses `php artisan optimize` to cache configuration, routes, and views. After changing production environment values, rebuild the configuration cache as the application user and reload PHP-FPM. Cache files contain configuration secrets and must remain private to the application account.

## Future application updates

1. Make and verify changes in the source workspace. Build the frontend with `npm run build` in `frontend/`.
2. Back up **the production database** before applying migrations; preserve all existing production records.
3. Stage a new directory under `releases/`, copying backend source and the built `frontend/dist`. Exclude development environments, tests, vendor directories, caches, and local storage.
4. Link that release's `backend/.env` to the private production environment and `backend/storage` to shared storage. Install backend packages with `composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction`.
5. Give `etrike` write access only to shared storage and the release's `bootstrap/cache`; keep code root-owned. Run required migrations and `php artisan optimize` as `etrike` with a restrictive umask.
6. Switch `/var/www/etrike/current` atomically to the validated release and reload PHP-FPM. Verify HTTPS login, report reads, and PDF downloads.

Changing files in `/root/system/etrike-tracker` alone does **not** publish them. Do not run seeders or development integration tests against the production database.

## TLS renewal

The certificate uses Certbot's webroot challenge at `/var/www/letsencrypt`. HTTP requests redirect to HTTPS except `/.well-known/acme-challenge/`. `certbot.timer` is enabled, and `/etc/letsencrypt/renewal-hooks/deploy/etrike-nginx-reload` reloads Nginx after renewal for this domain.

```bash
sudo certbot renew --cert-name etrike.bnbtctracker.com --dry-run
```

The main `bnbtctracker.com` and `data.bnbtctracker.com` site configurations are untouched.

## Verification completed

- Trusted HTTPS response and HTTP-to-HTTPS redirect.
- Production Laravel health and anonymous API protection.
- Cookie login/logout, CSRF enforcement, and separate admin/operator/viewer sessions.
- Report/history/management API reads and authenticated PDF download.
- Source/production account, driver, unit, report, item counts and rental sums matched at transfer.
- No browser visual testing was performed during this server deployment.
