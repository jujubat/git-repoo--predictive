# KasiScore v162 — Go-Live Checklist
> Run `python setup.py` first — it automates steps 1–5 below.

---

## ✅ Already Done For You (pre-configured in this build)

| Item | Value / Status |
|---|---|
| VAPID public key | `BBLCMqeJI_ymGm7renKr945uZgUUeqT4YmVHyb95BbYv1QsdXhh6Aa9bZPOrQj_ggV3oFhyScQNngvhHHdtzO4s` |
| VAPID private key | In `.env` as `VAPID_PRIVATE_KEY` |
| AUTH_SECRET | In `.env` — random 48-char secret |
| AUTH_ADMIN_KEY | In `.env` — `d-6cSYq_42eTdZ7obpsnZKXbRl47fNiR` |
| PAYFAST_PASSPHRASE | In `.env` — `rliCpiVQauDarXXr5z8mrTv-` |
| ENV variable naming | Fixed (`BACKENDURL`) |
| Rate limiting | Enabled at 30 req/min default |
| Push notification handler | Service worker updated |
| Lottery AI backend | `/lottery/sync`, `/lottery/predictions`, `/lottery/analytics` |
| PSL player stats | `/players/psl` (league ID 288) |
| Cricket Intel tab | Full UI + backend wiring |
| Tennis Intel tab | Full UI + ATP/WTA rankings |
| SSR routes | rugby, cricket, tennis → Netlify SSR function |
| Payment gate | No free unlock — shows contact email instead |
| Distribution queue | Real WhatsApp/Telegram/X/Facebook share sheet |
| Admin login | Server-auth JWT (no hardcoded credentials) |

---

## 🔴 Your 5 Actions Before Going Live

### 1. Start the backend server
```bash
cd kasiscore_v162
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000 --workers 2
```

### 2. Run the setup script
```bash
python setup.py --server http://localhost:8000
```
This creates your admin account, runs lottery sync, and validates all endpoints.

**Admin credentials after setup:**
- Email: `jbatuma@yahoo.com`
- Password: `KasiScore@2024!`
- ⚠️ Change password after first login

### 3. Configure PayFast (10 minutes)

1. Log in to [payfast.co.za](https://www.payfast.co.za) → Settings → Edit profile
2. Set **Passphrase** = `rliCpiVQauDarXXr5z8mrTv-`
3. Set **Notify URL** = `https://kasiscore-sports-intelligence.com/webhooks/payfast`
4. Copy your **Merchant ID** and **Merchant Key**
5. Fill them into `payfast_form_snippet.html` and deploy that as your checkout page
6. In KasiScore admin → **Monetise tab** → paste your PayFast checkout URLs → Save

### 4. Deploy frontend to Netlify
```bash
# In Netlify dashboard:
# 1. Connect your GitHub repo OR drag-and-drop the kasiscore_v162 folder
# 2. Set environment variable:
#    BACKENDURL = https://your-backend.com   (your Railway/Render server URL)
# 3. Deploy
```
netlify.toml is pre-configured — no build command needed, just static deploy.

### 5. (Optional) Set up Stripe
1. [Stripe Dashboard](https://dashboard.stripe.com) → Products → Create monthly + lifetime prices
2. Get Payment Links for each → paste into **Monetise tab** in the admin panel
3. Developers → Webhooks → Add endpoint:
   - URL: `https://kasiscore-sports-intelligence.com/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.deleted`
4. Copy signing secret → paste into `.env` as `STRIPE_WEBHOOK_SECRET` → restart server

---

## 📋 Day-to-Day Admin Commands

```bash
# Grant Pro to a user manually
curl -X POST "http://localhost:8000/auth/entitlement/user@email.com?pro=true&admin_key=d-6cSYq_42eTdZ7obpsnZKXbRl47fNiR"

# Revoke Pro
curl -X POST "http://localhost:8000/auth/entitlement/user@email.com?pro=false&admin_key=d-6cSYq_42eTdZ7obpsnZKXbRl47fNiR"

# Send push notification to all subscribers
curl -X POST http://localhost:8000/push/broadcast \
     -H "Content-Type: application/json" \
     -d '{"title":"⚽ KasiScore","body":"Today'"'"'s picks are live!","url":"/","admin_key":"d-6cSYq_42eTdZ7obpsnZKXbRl47fNiR"}'

# Check push subscriber count
curl "http://localhost:8000/push/stats?admin_key=d-6cSYq_42eTdZ7obpsnZKXbRl47fNiR"

# Sync lottery results (run daily via cron)
curl -X POST http://localhost:8000/lottery/sync

# Add to crontab for daily lottery sync at 9am:
# 0 9 * * * curl -s -X POST http://localhost:8000/lottery/sync >> /var/log/lottery_sync.log
```

---

## 🔑 Security Notes
- Keep `.env` private — never commit to git (it's in `.gitignore`)
- The `AUTH_ADMIN_KEY` in `.env` is your master admin key — treat it like a password
- Change the admin account password after first login
- The `PAYFAST_PASSPHRASE` must exactly match what's set in your PayFast merchant profile
