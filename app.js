const DOWNLOAD_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg>`;

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
    const releaseRes = await fetch(
      `https://api.github.com/repos/${app.repo}/releases/latest`,
    );
    if (!releaseRes.ok) throw new Error("No release found");
    const release = await releaseRes.json();

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
    return `
      <div class="app-card error">
        <h2 class="app-name">${app.name}</h2>
        <p>Error loading release info</p>
      </div>
    `;
  }
}

loadApps();
