# KasiScore — Quick Setup Guide

## Run Locally (most common)

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Copy env and add your API-Football key
cp .env.example .env
# Edit .env → set AFOOT_API_KEY=your_key_here

# 3. Start the server
python server.py
# → FastAPI runs on http://127.0.0.1:8000

# 4. Open the dashboard
# Visit http://127.0.0.1:8000  (server auto-serves index.html)
# OR open index.html directly in your browser — it auto-detects localhost
```

The dashboard detects your environment automatically:
- **localhost / 127.0.0.1** → connects to `http://127.0.0.1:8000`
- **LAN IP (192.168.x.x)** → connects to `http://<your-ip>:8000`
- **file://** → connects to `http://127.0.0.1:8000`
- **Netlify / cloud** → uses the `/api` proxy (see Netlify section below)

### Override the API URL at runtime

Open the browser console on any page and run:
```js
setApiBase('http://192.168.1.10:8000')  // point to a different server
setApiBase('')                            // reset to auto-detect
```

---

## Deploy to Netlify

1. **Deploy the FastAPI server** somewhere public (Render, Railway, Fly.io, VPS, etc.)
   ```bash
   python server.py  # or use uvicorn / gunicorn in production
   ```

2. **Deploy the frontend** to Netlify:
   - Go to [app.netlify.com](https://app.netlify.com) → Add new site → Deploy manually
   - Drag the project folder (everything in this zip) to Netlify

3. **Set the `BACKENDURL` env var** in Netlify:
   - Netlify → Site configuration → Environment variables
   - Add: `BACKENDURL` = `https://your-fastapi-server.com`

4. **Redeploy** — the `/api/*` proxy will forward to your FastAPI server.

---

## Static Assets (manifest, icons, sw.js)

When running `server.py` directly, all static assets are now served automatically:
- `/manifest.webmanifest` — PWA manifest (fixes browser 404 warnings)
- `/sw.js` — service worker
- `/icons/*` — app icons
- `/robots.txt` — search engine robots
- `/sitemap.xml` — SEO sitemap (dynamic or static file)

No separate static file server needed.
