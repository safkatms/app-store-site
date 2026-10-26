const DOWNLOAD_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg>`;

// ── GitHub token ────────────────────────────────────────────
// Option A (quick): paste a fine-grained PAT with read-only "Contents" scope.
//   Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained
//   Permissions: Repository contents → Read-only  (no other scope needed for public repos)
// Option B (recommended): set VITE_GH_TOKEN / process.env in your build tool so
//   the token isn't committed to source.  For a plain static site served from
//   GitHub Pages you can bake it in here — it's read-only and scoped to contents.
const GH_TOKEN =
  "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"; // ← paste your PAT here, e.g. "github_pat_..."

const GH_HEADERS = GH_TOKEN
  ? {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: "application/vnd.github+json",
    }
  : { Accept: "application/vnd.github+json" };

// ── Helpers ─────────────────────────────────────────────────

const GRADIENTS = [
  "linear-gradient(135deg, #8b5cf6, #6d28d9)",
  "linear-gradient(135deg, #22d3ee, #0891b2)",
  "linear-gradient(135deg, #f472b6, #db2777)",
  "linear-gradient(135deg, #fb923c, #ea580c)",
  "linear-gradient(135deg, #34d399, #059669)",
];

function gradientFor(name) {
  let hash = 0;
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function skeletons(n) {
  return Array.from({ length: n }, () => `<div class="skeleton"></div>`).join(
    "",
  );
}

function iconMarkup(app) {
  const fallback = `<div class="app-icon-fallback" style="background:${gradientFor(app.name)}">${app.name.charAt(0).toUpperCase()}</div>`;
  if (!app.icon) return `<div class="app-icon-wrap">${fallback}</div>`;
  return `<div class="app-icon-wrap">
    <img src="${app.icon}" alt="${app.name} icon"
         onerror="this.parentElement.innerHTML = decodeURIComponent('${encodeURIComponent(fallback)}')">
  </div>`;
}

// ── Fetch with auth ──────────────────────────────────────────

async function ghFetch(url) {
  const res = await fetch(url, { headers: GH_HEADERS });
  if (res.status === 403 || res.status === 429) {
    const data = await res.json().catch(() => ({}));
    const msg = data.message || `HTTP ${res.status}`;
    // Surface rate-limit info if present
    const reset = res.headers.get("x-ratelimit-reset");
    const resetTime = reset
      ? ` Resets at ${new Date(Number(reset) * 1000).toLocaleTimeString()}.`
      : "";
    throw new Error(`GitHub API rate limit exceeded.${resetTime} ${msg}`);
  }
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

// ── Render ───────────────────────────────────────────────────

async function loadApps() {
  const container = document.getElementById("app-list");
  const res = await fetch("apps.json");
  const apps = await res.json();
  container.innerHTML = skeletons(apps.length);

  const cards = await Promise.all(apps.map(renderApp));
  container.innerHTML = cards.join("");
}

async function renderApp(app) {
  try {
    const release = await ghFetch(
      `https://api.github.com/repos/${app.repo}/releases/latest`,
    );

    const apkAsset = release.assets.find((a) => a.name.endsWith(".apk"));
    const downloadUrl = apkAsset ? apkAsset.browser_download_url : null;
    const version = release.tag_name;
    const changelog = (release.body || "No changelog provided.").trim();

    return `
      <div class="app-card">
        <div class="app-top">
          ${iconMarkup(app)}
          <div>
            <h2 class="app-name">${app.name}</h2>
            <span class="version-badge">${version}</span>
          </div>
        </div>
        <pre class="changelog">${changelog}</pre>
        ${
          downloadUrl
            ? `<a class="download-btn" href="${downloadUrl}">${DOWNLOAD_ICON} Download APK</a>`
            : `<div class="no-apk">No APK available</div>`
        }
      </div>
    `;
  } catch (err) {
    const isRateLimit = err.message.includes("rate limit");
    return `
      <div class="app-card error">
        ${iconMarkup(app)}
        <h2 class="app-name">${app.name}</h2>
        <p class="error-msg">${isRateLimit ? "⏳ " : "⚠ "}${err.message}</p>
        ${isRateLimit ? `<p class="error-hint">Add a GitHub token to <code>app.js</code> to raise the limit to 5,000 req/hr.</p>` : ""}
      </div>
    `;
  }
}

loadApps();
