#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
(cd "$project_dir/backend" && php artisan test && vendor/bin/pint --test)
(cd "$project_dir/frontend" && npm test && npm run build)
