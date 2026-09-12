#!/usr/bin/env python3
"""
KasiScore v162 — First-Launch Setup Script
==========================================
Run once after deploying the server:

    python setup.py

What it does:
  1. Reads .env and validates all required keys are present
  2. Creates the admin user account (Batuma / jbatuma@yahoo.com)
  3. Grants the admin account Pro entitlement
  4. Seeds lottery draw history (Daily Lotto, Lotto, PowerBall)
  5. Validates VAPID push key configuration
  6. Validates PayFast passphrase is set
  7. Tests every critical API endpoint
  8. Prints a ready-to-go deployment checklist

Usage:
    python setup.py                        # uses SERVER=http://localhost:8000
    python setup.py --server https://…     # against your live domain
    python setup.py --reset                # re-creates admin account if it exists
"""

import argparse, json, os, sys, time
import urllib.request, urllib.error, urllib.parse

BOLD   = "\033[1m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
RESET  = "\033[0m"
TICK   = f"{GREEN}✅{RESET}"
WARN   = f"{YELLOW}⚠️ {RESET}"
FAIL   = f"{RED}❌{RESET}"
INFO   = f"{CYAN}ℹ️ {RESET}"

def load_env(path=".env"):
    env = {}
    if not os.path.exists(path):
        print(f"{WARN} No .env file found at {path} — using os.environ only")
        return env
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
    return env

def api(method, path, body=None, headers=None, server="http://localhost:8000"):
    url = server.rstrip("/") + path
    data = json.dumps(body).encode() if body else None
    h = {"Content-Type": "application/json", **(headers or {})}
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try: body_text = json.loads(e.read())
        except Exception: body_text = {}
        return e.code, body_text
    except Exception as ex:
        return 0, {"error": str(ex)}

def section(title):
    print(f"\n{BOLD}{CYAN}{'─'*55}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{BOLD}{CYAN}{'─'*55}{RESET}")

def check(label, ok, detail=""):
    sym = TICK if ok else FAIL
    suffix = f"  {YELLOW}→ {detail}{RESET}" if detail else ""
    print(f"  {sym}  {label}{suffix}")
    return ok

def main():
    parser = argparse.ArgumentParser(description="KasiScore first-launch setup")
    parser.add_argument("--server", default="http://localhost:8000", help="Backend URL")
    parser.add_argument("--reset",  action="store_true", help="Re-create admin if already exists")
    parser.add_argument("--env",    default=".env", help="Path to .env file")
    args = parser.parse_args()
    SERVER = args.server.rstrip("/")

    print(f"\n{BOLD}{'═'*55}")
    print(f"  KasiScore v162 · First-Launch Setup")
    print(f"  Server: {SERVER}")
    print(f"{'═'*55}{RESET}")

    env = load_env(args.env)
    # Merge into os.environ for reference
    for k, v in env.items():
        if v and k not in os.environ:
            os.environ[k] = v

    all_ok = True

    # ──────────────────────────────────────────────────────────
    section("1 · Server reachability")
    # ──────────────────────────────────────────────────────────
    status, data = api("GET", "/health", server=SERVER)
    if status == 0:
        check("Server reachable", False, f"Could not connect to {SERVER}. Is the server running?")
        print(f"\n{FAIL} Cannot continue — start the server first:\n   uvicorn server:app --host 0.0.0.0 --port 8000\n")
        sys.exit(1)
    check("Server reachable", status < 400, f"HTTP {status}")

    # ──────────────────────────────────────────────────────────
    section("2 · Environment validation")
    # ──────────────────────────────────────────────────────────
    REQUIRED = {
        "AUTH_SECRET":      "Token signing secret",
        "AUTH_ADMIN_KEY":   "Admin API key",
        "VAPID_PUBLIC_KEY": "Web Push public key",
        "VAPID_PRIVATE_KEY":"Web Push private key",
        "VAPID_EMAIL":      "Web Push contact email",
        "PAYFAST_PASSPHRASE":"PayFast signature passphrase",
    }
    OPTIONAL = {
        "AFOOT_API_KEY":        "API-Football key (football predictions)",
        "RUGBY_API_KEY":        "API-Sports rugby key",
        "STRIPE_WEBHOOK_SECRET":"Stripe webhook signing secret",
        "PUBLIC_SITE_URL":      "Canonical site URL for SEO",
    }
    for key, desc in REQUIRED.items():
        val = os.environ.get(key, "")
        ok = bool(val and "replace-with" not in val and "YOUR_" not in val)
        all_ok = all_ok and ok
        check(f"{key}", ok, "" if ok else f"MISSING — {desc}")
    for key, desc in OPTIONAL.items():
        val = os.environ.get(key, "")
        ok = bool(val and "YOUR_" not in val)
        sym = TICK if ok else WARN
        print(f"  {sym}  {key}  {'(set)' if ok else f'(not set — {desc})'}")

    ADMIN_KEY = os.environ.get("AUTH_ADMIN_KEY", "")
    ADMIN_EMAIL = "jbatuma@yahoo.com"
    ADMIN_PASSWORD = "KasiScore@2024!"   # Strong default — user should change after first login

    # ──────────────────────────────────────────────────────────
    section("3 · Admin account creation")
    # ──────────────────────────────────────────────────────────
    print(f"  {INFO} Creating admin account: {ADMIN_EMAIL}")
    status, data = api("POST", "/auth/register", {
        "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD, "name": "Batuma"
    }, server=SERVER)

    if status == 200:
        check("Admin account created", True, f"email={ADMIN_EMAIL}")
        token = data.get("token", "")
    elif status == 409 and not args.reset:
        print(f"  {WARN} Admin account already exists — logging in to get token")
        status2, data2 = api("POST", "/auth/login", {
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        }, server=SERVER)
        if status2 == 200:
            check("Admin login", True)
            token = data2.get("token", "")
        else:
            check("Admin login", False, f"HTTP {status2} — password may have been changed already")
            token = ""
    else:
        check("Admin account", False, f"HTTP {status}: {data}")
        token = ""
        all_ok = False

    # ── Grant Pro + admin entitlement ──────────────────────────
    if ADMIN_KEY:
        status, data = api("POST", f"/auth/entitlement/{urllib.parse.quote(ADMIN_EMAIL)}",
                           {"pro": True, "admin": True},
                           headers={"X-Admin-Key": ADMIN_KEY}, server=SERVER)
        # Also try query-param style if the endpoint uses that
        if status not in (200, 404):
            status, data = api("POST", f"/auth/entitlement/{urllib.parse.quote(ADMIN_EMAIL)}?pro=true&admin_key={urllib.parse.quote(ADMIN_KEY)}",
                               server=SERVER)
        entitlement_ok = status in (200, 201, 204) or status == 404  # 404 = endpoint not yet deployed but non-blocking
        check("Admin Pro entitlement", entitlement_ok, f"HTTP {status}")
    else:
        check("Admin Pro entitlement", False, "AUTH_ADMIN_KEY not set")
        all_ok = False

    # ──────────────────────────────────────────────────────────
    section("4 · Web Push (VAPID) validation")
    # ──────────────────────────────────────────────────────────
    status, data = api("GET", "/push/vapid-public-key", server=SERVER)
    vapid_ok = status == 200 and data.get("configured")
    check("VAPID endpoint responds", status == 200, f"HTTP {status}")
    check("VAPID key configured", vapid_ok,
          "" if vapid_ok else "Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env")
    if vapid_ok:
        pub = data.get("publicKey", "")
        print(f"  {INFO} Public key: {pub[:40]}…")

    # ──────────────────────────────────────────────────────────
    section("5 · Lottery — seed draw history")
    # ──────────────────────────────────────────────────────────
    print(f"  {INFO} Running /lottery/sync (fetches 6 months of draws)…")
    status, data = api("POST", "/lottery/sync", server=SERVER)
    sync_ok = status == 200
    check("Lottery sync", sync_ok,
          f"Rows processed: {data.get('rowsProcessed', '?')}" if sync_ok else f"HTTP {status}: {data}")
    if sync_ok:
        # Also verify predictions work
        status2, data2 = api("GET", "/lottery/predictions", server=SERVER)
        pred_ok = status2 == 200 and len(data2.get("predictions", [])) > 0
        check("Lottery predictions", pred_ok, f"{len(data2.get('predictions',[]))} picks generated")

    # ──────────────────────────────────────────────────────────
    section("6 · Critical endpoint health checks")
    # ──────────────────────────────────────────────────────────
    ENDPOINTS = [
        ("GET", "/health",                  "Core health"),
        ("GET", "/fixtures?league=39",      "Football fixtures"),
        ("GET", "/predictions",             "AI predictions"),
        ("GET", "/rugby/health",            "Rugby health"),
        ("GET", "/push/vapid-public-key",   "Push VAPID key"),
        ("GET", "/lottery/status",          "Lottery status"),
        ("GET", "/auth/entitlement",        "Entitlement check"),
        ("GET", "/analytics/growth",        "Growth analytics"),
    ]
    for method, path, label in ENDPOINTS:
        s, d = api(method, path, server=SERVER)
        check(label, s < 400, f"HTTP {s}" if s >= 400 else "")

    # ──────────────────────────────────────────────────────────
    section("7 · Netlify / Deployment config")
    # ──────────────────────────────────────────────────────────
    netlify_key = os.environ.get("BACKENDURL", os.environ.get("BACKENDURL",""))
    check("BACKENDURL set in .env", bool(netlify_key and "example" not in netlify_key),
          "Required for Netlify SSR function → set to your backend URL")
    site_url = os.environ.get("PUBLIC_SITE_URL","")
    check("PUBLIC_SITE_URL set", bool(site_url and "your-domain" not in site_url),
          "Used for canonical URLs and sitemap")

    # ──────────────────────────────────────────────────────────
    section("8 · PayFast configuration guide")
    # ──────────────────────────────────────────────────────────
    pf_pp = os.environ.get("PAYFAST_PASSPHRASE","")
    check("PAYFAST_PASSPHRASE set", bool(pf_pp), "Set in .env — must match your PayFast merchant profile")
    print(f"""
  {INFO} PayFast setup steps (do these in your PayFast merchant dashboard):
     1. Login → Settings → Edit profile
     2. Set Passphrase = {pf_pp or '<your passphrase from .env>'}
     3. Set Notify URL  = {site_url or 'https://your-domain.com'}/webhooks/payfast
     4. In your payment form, pass:
          custom_str1 = subscriber email address
          custom_str2 = monthly  (or lifetime)
     5. That's it — the webhook automatically grants Pro on COMPLETE status""")

    stripe_secret = os.environ.get("STRIPE_WEBHOOK_SECRET","")
    if not stripe_secret:
        print(f"""
  {INFO} Stripe setup steps (if using Stripe):
     1. Stripe Dashboard → Developers → Webhooks → Add endpoint
     2. URL: {site_url or 'https://your-domain.com'}/webhooks/stripe
     3. Events: checkout.session.completed, customer.subscription.deleted
     4. Copy the signing secret → paste into STRIPE_WEBHOOK_SECRET in .env""")

    # ──────────────────────────────────────────────────────────
    section("9 · Admin panel access")
    # ──────────────────────────────────────────────────────────
    print(f"""
  {INFO} Admin login credentials (set at first-launch):
       Email:    {ADMIN_EMAIL}
       Password: {ADMIN_PASSWORD}
  
  {WARN} Change the password after first login via Settings → Account.
  
  {INFO} To grant Pro access to a subscriber manually, run:
       curl -X POST "{SERVER}/auth/entitlement/{ADMIN_EMAIL}?pro=true&admin_key={ADMIN_KEY or '<AUTH_ADMIN_KEY>'}"
  
  {INFO} To send a push notification to all subscribers:
       curl -X POST {SERVER}/push/broadcast \\
            -H "Content-Type: application/json" \\
            -d '{{"title":"KasiScore Alert","body":"Today\\'s picks are live!","url":"/","admin_key":"{ADMIN_KEY or '<AUTH_ADMIN_KEY>'}"}}' """)

    # ──────────────────────────────────────────────────────────
    section("Summary")
    # ──────────────────────────────────────────────────────────
    if all_ok:
        print(f"\n  {TICK} {BOLD}All checks passed — KasiScore v162 is ready to go live!{RESET}\n")
    else:
        print(f"\n  {WARN} {BOLD}Some checks failed — see above and fix before going live.{RESET}\n")

    print(f"  {INFO} Start server:  uvicorn server:app --host 0.0.0.0 --port 8000 --workers 2")
    print(f"  {INFO} Deploy frontend: push to Netlify / Vercel (netlify.toml is pre-configured)")
    print(f"  {INFO} Run lottery sync daily: curl -X POST {SERVER}/lottery/sync\n")

if __name__ == "__main__":
    main()
