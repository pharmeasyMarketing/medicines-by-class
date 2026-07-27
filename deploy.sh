#!/usr/bin/env bash
# Build for pharmeasy.in and package.
set -euo pipefail
cd "$(dirname "$0")"

# NOTE: do NOT use ${VAR:-default} when the default contains "}" — the brace
# inside {id} closes the expansion early and silently corrupts the URL.
: "${SITE_ORIGIN:=https://pharmeasy.in}"
: "${SITE_BASE:=/conditions}"
: "${ASSET_BASE:=/conditions/assets}"
: "${CART_API:=https://pharmeasy.in/api}"
: "${CART_URL:=https://pharmeasy.in/cart?src=conditions}"
: "${LOGIN_URL:=https://pharmeasy.in/login}"
[ -n "${PRICE_API:-}" ] || PRICE_API='https://api.pharmeasy.in/v5/product-details/{id}/dynamic'
export SITE_ORIGIN SITE_BASE ASSET_BASE CART_API CART_URL LOGIN_URL PRICE_API

case "$PRICE_API" in
  *'{id}'*) ;;
  *) echo "FATAL: PRICE_API lost its {id} placeholder: $PRICE_API"; exit 1 ;;
esac

node src/validate.mjs
node src/build.mjs
