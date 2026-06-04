# DADDY's Bakery POS — PRD

## Original problem
Build a luxurious POS for a bakery & confectionary using brand colors `#ede7c7` (cream) and `#8B0000` (burgundy). Modules: POS billing, monthly sales graphs, inventory, employee salaries, retailer payables, online orders inbox from the website (https://khanasif47.github.io/Daddy-s/). Later: integrate the website to send live orders to the POS, support barcode scanners, manage bakery contact info & website menu from the POS, generate a Windows .exe via Tauri, deploy on `daddyss.org`.

## Architecture
- **Backend**: FastAPI (single `server.py`) + Motor/Mongo + JWT (httpOnly cookie + Bearer fallback). Idempotent admin & data seeding on startup, including backfills for new fields added in later iterations.
- **Frontend**: React 19 + react-router 7 + Tailwind + shadcn/ui + Recharts + sonner. Custom logo splash on app boot.
- **Database collections**: `users`, `products`, `sales`, `employees`, `payroll`, `suppliers`, `supplier_payments`, `online_orders`, `bakery_settings`.
- **Website ↔ POS**: bakery's static GitHub Pages site fetches `/api/menu` and `/api/settings` on load, and POSTs orders to `/api/online-orders`.
- **Desktop**: Tauri 2 wrapper at `/app/frontend/src-tauri/` produces a Windows `.exe` (instructions at `/app/frontend/TAURI_BUILD_INSTRUCTIONS.md`).

## Implemented (Apr 2026)
### Iteration 1 (initial MVP)
- JWT auth, admin: `admin@daddysbakery.com` / `admin123`
- POS billing (search, category filter, cart, GST 5%, discount, payment, print receipt)
- Dashboard analytics (12-month area, 30-day bar, category donut, recent transactions, top items, low-stock)
- Inventory CRUD, employees + monthly payroll, supplier payables
- Online Orders Kanban (5 columns, advance/reject/push-to-POS) + public POST endpoint

### Iteration 2 (website + barcodes)
- Patched `/app/website/{script.js, index.html}` so the bakery website POSTs orders to the POS in real time
- Per-product `barcode` + global keyboard scanner capture in POS + visible scan input + product-by-barcode endpoint

### Iteration 3 (this iteration)
- **Bakery Settings page** — single source of truth for name/tagline/address/phone/whatsapp/email/instagram/facebook/maps_url/hours/established_year. Editable from POS.
- **Public `/api/settings` and `/api/menu`** — the bakery website hydrates its footer + menu from these endpoints; updates are live without redeploying the website.
- **Website Menu page in POS** — toggle `show_on_website` per product + optional `website_price` (defaults to POS price).
- **WhatsApp click-to-open** — every online order has a "WhatsApp" button (forwards order details to owner's number) and a "Reply" button (chat with the customer).
- **Browser notifications + chime** when a new order arrives in the Online Orders queue.
- **Splash screen** with the user's custom logo on cream background — appears once per session.
- **Tauri scaffold** at `/app/frontend/src-tauri/` (Cargo, tauri.conf.json, main.rs, build.rs, icons/icon.png) + `TAURI_BUILD_INSTRUCTIONS.md`.
- Updated brand info to: Mau, UP · est 2014 · WhatsApp +91 9919520765 · admin@daddyss.org · @_daddys_bakery.
- Backfills on startup for `description`, `show_on_website`, `barcode` to keep legacy DB rows compliant.

## What's deferred / nice-to-haves
- P1: Auto-update for the Tauri desktop app (Tauri Updater plugin)
- P1: Per-cashier sales reports + role gates (admin vs cashier)
- P1: Daily/weekly/yearly toggle on dashboard chart
- P2: Customer database & loyalty (frequent buyers, birthdays)
- P2: Stock-in / purchase orders linked to suppliers
- P2: PWA manifest + service worker
- P2: Custom-cake order flow tied to `daddys_custom_cake_order.html`
- P2: WhatsApp Business / Twilio integration for *automatic* customer notifications (currently click-to-open)

## Deployment paths
- **POS web app** → Deploy via Emergent UI, point e.g. `app.daddyss.org` (CNAME) at the Emergent production URL.
- **Bakery website** → Keep on GitHub Pages with custom-domain `daddyss.org` (Settings → Pages → Custom domain). Update `POS_API_URL` in `script.js` to the production POS URL after deploy.
- **Desktop .exe** → Run `yarn tauri build` on a Windows PC; produces an MSI + NSIS `.exe` installer (5–10 MB).

## Files of interest
- Backend: `/app/backend/server.py`, `/app/backend/.env`
- Frontend pages: `/app/frontend/src/pages/{Login,Dashboard,POS,Inventory,WebsiteMenu,Employees,Retailers,OnlineOrders,Settings}.jsx`
- Frontend context: `/app/frontend/src/context/{AuthContext,SettingsContext}.jsx`
- Splash & layout: `/app/frontend/src/components/{Splash,Layout,PageHeader}.jsx`
- Logo asset: `/app/frontend/public/daddys-logo.png`
- Website integration: `/app/website/{script.js,index.html,styles.css,daddys_custom_cake_order.html,INTEGRATION_README.md}`
- Tauri: `/app/frontend/src-tauri/*` + `/app/frontend/TAURI_BUILD_INSTRUCTIONS.md`
- Test creds: `/app/memory/test_credentials.md`
