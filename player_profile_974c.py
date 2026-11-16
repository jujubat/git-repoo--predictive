
"""Visible reference-player enhancement for canonical player HTML."""

import re


STYLE = """
<style id="ksn974c-styles">
#ksn974c-nav {
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin:18px 0;
  border-bottom:1px solid #283c4c;
  padding-bottom:12px;
}
#ksn974c-nav a {
  flex:1 1 110px;
  text-align:center;
  padding:13px 10px;
  background:#14212a;
  color:#e5f2fd;
  border:1px solid #304655;
  border-radius:8px;
  font-weight:700;
  text-decoration:none;
}
#ksn974c-nav a:hover,
#ksn974c-nav a:focus-visible {
  border-color:#389cff;
  color:#70c9ff;
}
.ksn974c-section {
  background:#101b23;
  border:1px solid #30404d;
  border-radius:12px;
  margin:16px 0;
  padding:20px;
  color:#edf5fc;
}
.ksn974c-section h2 {
  margin:0 0 16px;
  font-size:21px;
}
.ksn974c-grid {
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(185px,1fr));
  gap:12px;
}
.ksn974c-item {
  background:#172631;
  padding:15px;
  border-radius:9px;
  border:1px solid #304655;
}
.ksn974c-item strong {
  display:block;
  font-size:15px;
  margin-bottom:7px;
}
.ksn974c-item small {
  display:block;
  color:#b7c9d8;
}
.ksn974c-metrics {
  display:flex;
  flex-wrap:wrap;
  gap:15px;
  margin-top:12px;
  font-size:13px;
}
.ksn974c-metrics b { color:#fff; }
.ksn974c-seasons {
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin:15px 0;
}
.ksn974c-seasons button,
.ksn974c-more {
  padding:9px 13px;
  border:1px solid #3a647e;
  background:#182a38;
  color:#fff;
  border-radius:8px;
  cursor:pointer;
}
.ksn974c-seasons button.active {
  background:#17619a;
  border-color:#50baff;
}
.ksn974c-match {
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:14px;
  border-bottom:1px solid #30404d;
  padding:15px 0;
}
.ksn974c-match-main { flex:1 1 200px; }
.ksn974c-match-main small {
  color:#b7c9d8;
  display:block;
  margin-top:6px;
}
.ksn974c-rating {
  background:#1b4939;
  border-radius:7px;
  padding:8px 11px;
  min-width:56px;
  text-align:center;
}
.ksn974c-match a { color:#67c8ff; }
.ksn974c-muted { color:#b7c9d8; }
#ksn974c-profile,
#ksn974c-matches,
#ksn974c-stats { scroll-margin-top:75px; }
</style>
"""

SCRIPT = r"""
<script id="ksn974c-script">
(function () {
  "use strict";
  if (location.pathname !== "/players/19465") return;

  const E = v => String(v == null ? "?" : v)
    .replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",
      '"':"&quot;","'":"&#39;"
    }[c]));

  const number = v => {
    const n = Number(v);
    return Number.isSafeInteger(n) && n > 0 ? n : 0;
  };

  function mount() {
    const root = document.getElementById("page");

    if (!root || document.getElementById("ksn974c-nav"))
      return false;

    const headings = Array.from(
      root.querySelectorAll("h1,h2,h3")
    );

    const name = headings.find(h =>
      h.textContent.trim().toLowerCase() === "david raya"
    );

    const statsHeading = headings.find(h =>
      /season statistics/i.test(h.textContent)
    );

    if (!name || !statsHeading) return false;

    const profile = name.closest(".card") ||
                    name.parentElement;
    const stats = statsHeading.closest(".card") ||
                  statsHeading.parentElement;

    if (!profile || !stats) return false;

    profile.id = "ksn974c-profile";
    stats.id = "ksn974c-stats";

    const nav = document.createElement("nav");
    nav.id = "ksn974c-nav";
    nav.setAttribute("aria-label", "Player sections");
    nav.innerHTML = `
      <a href="#ksn974c-profile">PROFILE</a>
      <a href="#ksn974c-matches">MATCHES</a>
      <a href="#ksn974c-stats">STATS</a>
    `;

    profile.after(nav);

    const container = document.createElement("div");
    container.id = "ksn974c-content";
    container.innerHTML = `
      <section class="ksn974c-section" id="ksn974c-overview">
        <h2>Goalkeeper performance</h2>
        <div class="ksn974c-grid" id="ksn974c-overview-data">
          <p class="ksn974c-muted">Loading verified statistics?</p>
        </div>
      </section>
      <section class="ksn974c-section" id="ksn974c-matches">
        <h2>Player match history</h2>
        <p class="ksn974c-muted">
          Verified appearances, competitions and individual ratings.
        </p>
        <div class="ksn974c-seasons" id="ksn974c-seasons"></div>
        <p class="ksn974c-muted" id="ksn974c-coverage"></p>
        <div id="ksn974c-match-list"></div>
        <button class="ksn974c-more" id="ksn974c-more"
                type="button" hidden>Load more matches</button>
      </section>
      <section class="ksn974c-section">
        <h2>Career, transfers and trophies</h2>
        <div id="ksn974c-career">
          <p class="ksn974c-muted">Loading verified history?</p>
        </div>
      </section>
    `;

    nav.after(container);
    void loadProfile();
    setupMatches();
    return true;
  }

  async function loadProfile() {
    const target = document.getElementById("ksn974c-overview-data");
    const career = document.getElementById("ksn974c-career");

    try {
      const response = await fetch(
        "/player/profile?player=19465",
        {cache:"no-store"}
      );
      if (!response.ok) throw Error("Profile HTTP " + response.status);

      const d = await response.json();
      const stats = Array.isArray(d.statistics) ? d.statistics : [];

      target.innerHTML = stats.map(s => {
        const league = s.league || {};
        const team = s.team || {};
        const games = s.games || {};
        const goals = s.goals || {};
        const penalty = s.penalty || {};

        return `<article class="ksn974c-item">
          <strong>${E(league.name)}</strong>
          <small>${E(team.name)} ? ${E(league.season)}</small>
          <div class="ksn974c-metrics">
            <span><b>${E(games.appearences ?? games.appearances)}</b> Apps</span>
            <span><b>${E(games.minutes)}</b> Minutes</span>
            <span><b>${E(games.rating)}</b> Rating</span>
            <span><b>${E(goals.saves)}</b> Saves</span>
            <span><b>${E(goals.conceded)}</b> Conceded</span>
            <span><b>${E(penalty.saved)}</b> Penalty saves</span>
          </div>
        </article>`;
      }).join("") ||
        '<p class="ksn974c-muted">Statistics unavailable.</p>';

      const transfers = Array.isArray(d.transfers) ? d.transfers : [];
      const trophies = Array.isArray(d.trophies) ? d.trophies : [];

      career.innerHTML = `
        <h3>Transfers (${transfers.length})</h3>
        <div class="ksn974c-grid">
        ${transfers.map(t => `
          <div class="ksn974c-item">
            <strong>${E(t.date)}</strong>
            <small>${E(t.type)}</small>
          </div>`).join("") ||
          '<p class="ksn974c-muted">No verified transfers returned.</p>'}
        </div>
        <h3>Trophies (${trophies.length})</h3>
        <div class="ksn974c-grid">
        ${trophies.map(t => `
          <div class="ksn974c-item">
            <strong>${E(t.league)}</strong>
            <small>${E(t.season)} ? ${E(t.place || t.status)}</small>
          </div>`).join("") ||
          '<p class="ksn974c-muted">No verified trophies returned.</p>'}
        </div>
      `;
    } catch (err) {
      target.textContent = "Verified statistics could not be loaded.";
      career.textContent = "Career details are temporarily unavailable.";
    }
  }

  function setupMatches() {
    const seasons = document.getElementById("ksn974c-seasons");
    const list = document.getElementById("ksn974c-match-list");
    const coverage = document.getElementById("ksn974c-coverage");
    const more = document.getElementById("ksn974c-more");

    let selected = 2026;
    let offset = 0;
    let busy = false;

    async function load(reset) {
      if (busy) return;
      busy = true;

      if (reset) {
        list.replaceChildren();
        offset = 0;
      }

      more.hidden = true;
      coverage.textContent = "Loading stored match history?";

      try {
        const params = new URLSearchParams({
          player:"19465",
          season:String(selected),
          limit:"25",
          offset:String(offset)
        });

        const response = await fetch(
          "/player/matches?" + params,
          {cache:"no-store"}
        );

        if (!response.ok)
          throw Error("Match API HTTP " + response.status);

        const data = await response.json();

        if (!Array.isArray(data.matches))
          throw Error("Invalid match-history response");

        for (const m of data.matches) {
          const row = document.createElement("article");
          row.className = "ksn974c-match";
          const fid = number(m.fixtureId);
          const score = m.score || {};
          const result = score.home == null || score.away == null
            ? "?" : E(score.home) + "?" + E(score.away);

          row.innerHTML = `
            <div class="ksn974c-match-main">
              <strong>${E(m.home?.name)} ${result}
                      ${E(m.away?.name)}</strong>
              <small>${E(m.date?.slice(0,10))} ?
                     ${E(m.competition?.name)} ?
                     ${E(m.minutes)} minutes</small>
            </div>
            <div class="ksn974c-rating">
              ${m.rating == null ? "?" : E(m.rating)}
            </div>
            ${fid ? `<a href="/match/football/${fid}">
              Match Centre</a>` : ""}
          `;
          list.appendChild(row);
        }

        offset += data.matches.length;
        const total = Number(data.total || 0);

        coverage.textContent =
          `${total} verified cached appearances for ${selected}. ` +
          `${Number(data.missingMatchSnapshots || 0)} candidate ` +
          `fixtures have incomplete snapshots.`;

        if (data.scanTruncated)
          coverage.textContent += " Cache scan is partial.";

        if (total === 0)
          list.innerHTML =
            '<p class="ksn974c-muted">No verified appearances ' +
            'indexed for this season yet.</p>';

        more.hidden = !data.hasMore;
      } catch (err) {
        coverage.textContent =
          "Match history is temporarily unavailable.";
      } finally {
        busy = false;
      }
    }

    for (let y = 2026; y >= 2020; y--) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(y);

      if (y === selected) button.className = "active";

      button.addEventListener("click", () => {
        if (busy || selected === y) return;
        selected = y;
        seasons.querySelectorAll("button").forEach(b =>
          b.classList.toggle("active", b === button)
        );
        void load(true);
      });

      seasons.appendChild(button);
    }

    more.addEventListener("click", () => void load(false));
    void load(true);
  }

  if (!mount()) {
    const observer = new MutationObserver(() => {
      if (mount()) observer.disconnect();
    });
    observer.observe(document.documentElement, {
      childList:true, subtree:true
    });
  }
})();
</script>
"""


def enhance_player_document(document):
    """Enrich canonical player HTML; preserve the existing document."""
    payload = STYLE + SCRIPT
    if 'id="ksn974c-script"' in document:
        return document
    return re.sub(
        r"</body\s*>",
        lambda match: payload + match.group(0),
        document,
        count=1,
        flags=re.I,
    )
