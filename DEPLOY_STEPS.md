# 🚀 DADDY's Bakery — Step-by-Step Deployment

You're three short tasks away from having a live, branded POS + website on `daddyss.org`.

---

## ✅ Pre-flight check (already done)

- App tested: 22/22 backend, 100% frontend
- Deployment-readiness scanned & cleared
- `.env` files unblocked from `.gitignore` so deploy can carry your config
- Website's `POS_API_URL` is now overridable without a code edit

---

## 1️⃣  Deploy the POS on Emergent (~3 min)

1. In the Emergent UI, click the **Deploy** button (top right).
2. Wait for the build → you'll get a **production URL** like
   `https://daddys-pos.emergent.host` (the exact format will be shown).
3. Test the production URL: log in with `admin@daddysbakery.com / admin123`.
4. (Optional but recommended) connect a custom subdomain:
   - In Emergent → **Deployments → Custom Domain** → add `app.daddyss.org`
   - Emergent shows you a CNAME target → in your domain registrar's DNS, add:
     `CNAME  app  →  <emergent-target>`
   - Wait 2-10 minutes for DNS to propagate. SSL is automatic.
5. Copy the final POS API URL (e.g. `https://app.daddyss.org/api`) — you'll paste this in step 3.

---

## 2️⃣  Publish the bakery website on `daddyss.org`

The patched website lives at `/app/website/`:

```
website/
├─ index.html                      ← updated contact info + IDs for hydration
├─ script.js                       ← live menu + settings fetch, real order POSTs
├─ styles.css                      ← unchanged
├─ daddys_custom_cake_order.html   ← unchanged
└─ INTEGRATION_README.md           ← reference
```

**To publish:**

1. Replace these files in your existing repo
   `https://github.com/khanasif47/Daddy-s` (or whatever the new repo is).
2. Commit & push.
3. In GitHub → **Settings → Pages → Custom domain** → enter `daddyss.org` → **Save**.
4. Tick "Enforce HTTPS" once GitHub finishes the cert.
5. In your domain registrar's DNS, add **two records**:

   | Type  | Host | Value                               |
   |-------|------|--------------------------------------|
   | A     | @    | 185.199.108.153                     |
   | A     | @    | 185.199.109.153                     |
   | A     | @    | 185.199.110.153                     |
   | A     | @    | 185.199.111.153                     |
   | CNAME | www  | `khanasif47.github.io`              |

   (these four A records are GitHub Pages' fixed IPs)

6. Visit `https://daddyss.org` → the bakery site is live.

---

## 3️⃣  Wire the website to your live POS

In `script.js`, the new override hook lets you switch the POS URL **without
editing code** — just paste **one line** before the `<script src="script.js"></script>`
tag in `index.html`:

```html
<script>
  window.POS_API_URL_OVERRIDE = "https://app.daddyss.org/api";
</script>
<script src="script.js"></script>
```

(replace `app.daddyss.org/api` with whatever production URL Emergent gave you).

Push that change → website now talks to your live POS. Place a test order on the
site → check that it appears in **Online Orders → New** in the POS within seconds.

---

## 4️⃣  (Optional) Build the Windows `.exe`

Follow `/app/frontend/TAURI_BUILD_INSTRUCTIONS.md` on a Windows PC. End result:
a 5-10 MB `.exe` installer that runs the POS as a native desktop app with the
DADDY's logo splash.

---

## 🆘 If anything breaks

- Browser shows "Could not send order to bakery": `POS_API_URL_OVERRIDE` isn't pointing at the live POS — recheck step 3.
- POS login refuses your password: re-deploy with the production env, or reset by editing `ADMIN_PASSWORD` in the Emergent deployment env vars and clicking "Restart".
- Website still shows old menu: you forgot to push to GitHub, or your browser is showing a cached page (hard refresh: Ctrl+Shift+R / Cmd+Shift+R).

You're good to go 🍰
