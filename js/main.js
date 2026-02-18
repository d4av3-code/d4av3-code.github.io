/* ================================================
   D4av3 — main.js
   Navigation · Terminals · Dynamic content loader
   ================================================ */

// ─────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav-link');

function showSection(id) {
  sections.forEach(s => s.classList.remove('active'));
  navLinks.forEach(l => l.classList.remove('active'));

  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
    // load dynamic content on first visit
    if (!target.dataset.loaded) {
      target.dataset.loaded = 'true';
      if (id === 'scripts')  loadScripts();
      if (id === 'projects') loadProjects();
      if (id === 'blog')     loadBlog();
    }
  }

  document.querySelectorAll(`.nav-link[data-section="${id}"]`).forEach(l => l.classList.add('active'));

  // close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
}

// click any element with data-section
document.addEventListener('click', function(e) {
  const el = e.target.closest('[data-section]');
  if (el && !el.classList.contains('tag-lang')) {
    e.preventDefault();
    showSection(el.dataset.section);
  }
});

// hamburger
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ─────────────────────────────────────
// MULTI-TERMINAL PANELS
// ─────────────────────────────────────
const panels = Array.from(document.querySelectorAll('.term-panel'));
let autoTimer   = null;
let autoIndex   = 0;
let userClicked = false;

function collapsePanel(p) {
  p.classList.remove('expanded');
  // Remove inline styles so CSS transitions take over cleanly on next expand
  p.querySelectorAll('.to').forEach(t => {
    t.style.removeProperty('opacity');
    t.style.removeProperty('transform');
    t.style.removeProperty('transition-delay');
  });
}

function expandPanel(panel) {
  const isAlreadyOpen = panel.classList.contains('expanded');

  // Collapse all panels first
  panels.forEach(p => collapsePanel(p));

  if (isAlreadyOpen) return; // clicking open panel just closes it

  // Force a reflow so the browser registers the collapsed state
  // before we add 'expanded' — this makes transitions re-fire every time
  void panel.offsetHeight;

  panel.classList.add('expanded');
}

panels.forEach(panel => {
  panel.querySelector('.term-bar').addEventListener('click', () => {
    userClicked = true;
    clearTimeout(autoTimer);
    expandPanel(panel);
  });
});

// Auto-cycle: open each panel in sequence, close it, then open the next
function autoCycle() {
  if (userClicked) return;
  const panel = panels[autoIndex % panels.length];
  autoIndex++;

  // Close everything first, wait for collapse animation, then expand
  panels.forEach(p => collapsePanel(p));
  void panel.offsetHeight; // force reflow
  panel.classList.add('expanded');

  autoTimer = setTimeout(autoCycle, 3400);
}

setTimeout(() => {
  if (!userClicked) autoCycle();
}, 900);

// ─────────────────────────────────────
// SKILLS → SCRIPTS filter bridge
// ─────────────────────────────────────
document.querySelectorAll('.tag-lang').forEach(tag => {
  tag.addEventListener('click', () => {
    const lang = tag.dataset.lang;
    showSection('scripts');
    // wait for section to render, then apply filter
    setTimeout(() => applyFilter(lang), 80);
  });
});

// ─────────────────────────────────────
// SCRIPT FILTER
// ─────────────────────────────────────
let currentFilter = 'all';

function applyFilter(lang) {
  currentFilter = lang;

  // update filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === lang);
  });

  // show/hide cards
  document.querySelectorAll('.script-card').forEach(card => {
    const cardLang = card.dataset.lang || '';
    card.classList.toggle('hidden', lang !== 'all' && cardLang !== lang);
  });
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
});

// toggle script body open/close
function toggleScript(header) {
  const card   = header.closest('.script-card');
  const body   = card.querySelector('.script-body');
  const toggle = header.querySelector('.script-toggle');
  if (!body) return;
  const isOpen = body.classList.toggle('open');
  if (toggle) toggle.textContent = isOpen ? '▲ hide' : '▼ view';
}
// expose globally for onclick in injected HTML
window.toggleScript = toggleScript;

// ─────────────────────────────────────
// DYNAMIC LOADERS
// ─────────────────────────────────────

/* SCRIPTS
   Reads scripts/index.json → array of { file, name, lang, desc }
   Then fetches each scripts/{file} and renders a card.

   index.json example:
   [
     { "file": "backup.sh",      "name": "backup.sh",      "lang": "bash",  "desc": "Automated timestamped backup" },
     { "file": "sysinfo.sh",     "name": "sysinfo.sh",     "lang": "bash",  "desc": "Quick system overview" },
     { "file": "user_create.ps1","name": "user_create.ps1","lang": "powershell","desc": "Bulk user creation from CSV" }
   ]
*/
async function loadScripts() {
  const container = document.getElementById('scripts-list');
  try {
    const manifest = await fetch('scripts/index.json').then(r => r.json());

    if (!manifest.length) {
      container.innerHTML = '<p class="loading-msg">No scripts yet. Add entries to scripts/index.json.</p>';
      return;
    }

    const langClass = { bash:'sl-bash', powershell:'sl-ps', python:'sl-py', js:'sl-js', html:'sl-html' };

    const cards = await Promise.all(manifest.map(async entry => {
      let code = '# (could not load file)';
      try {
        code = await fetch(`scripts/${entry.file}`).then(r => r.text());
      } catch(_) {}

      const cls  = langClass[entry.lang] || 'sl-bash';
      const safe = escapeHtml(code);

      return `
<div class="script-card" data-lang="${entry.lang}">
  <div class="script-header" onclick="toggleScript(this)">
    <div class="script-meta">
      <span class="script-lang ${cls}">${entry.lang}</span>
      <span class="script-name">${escapeHtml(entry.name)}</span>
    </div>
    <p class="script-desc">${escapeHtml(entry.desc)}</p>
    <span class="script-toggle">▼ view</span>
  </div>
  <div class="script-body">
    <pre><code>${safe}</code></pre>
  </div>
</div>`;
    }));

    container.innerHTML = cards.join('');

    // re-apply current filter after load
    applyFilter(currentFilter);

  } catch(err) {
    container.innerHTML = fetchErrorMsg('scripts/index.json', err);
  }
}


/* PROJECTS
   Reads projects/index.json — supports flat slugs AND groups.

   projects/index.json format — mix freely:
   [
     "standalone-project",
     { "group": "games",        "projects": ["snake", "chess"] },
     { "group": "games/arcade", "projects": ["pacman", "ping-pong"] }
   ]

   A flat "slug" looks in:          projects/slug/project.json
   A grouped entry { group, slug }  looks in:  projects/group/slug/project.json

   projects/snake/project.json:
   {
     "name":  "Snake",
     "icon":  "🐍",
     "image": "preview.png",   ← filename inside the same folder, or "" for none
     "desc":  "Classic snake game.",
     "tags":  ["HTML", "Canvas"],
     "link":  "index.html"
   }
*/
async function loadProjects() {
  const container = document.getElementById('projects-grid');
  try {
    const manifest = await fetch('projects/index.json').then(r => r.json());

    // Flatten manifest into { path, slug } entries
    // path = the full folder path relative to projects/  e.g. "games/snake"
    const entries = [];
    for (const item of manifest) {
      if (typeof item === 'string') {
        entries.push({ path: item, slug: item });
      } else if (item.group !== undefined) {
        for (const slug of item.projects) {
          const folder = item.group ? `${item.group}/${slug}` : slug;
          entries.push({ path: folder, slug });
        }
      }
    }

    // Build HTML — groups get a section header
    let html = '';
    let currentGroup = null;

    for (const item of manifest) {
      if (typeof item === 'string') {
        // Standalone project — no group header
        if (currentGroup !== null) {
          html += '</div></div>'; // close previous group
          currentGroup = null;
        }
        html += await buildProjectCard(`projects/${item}`, item);

      } else if (item.group !== undefined) {
        // Close previous group if open
        if (currentGroup !== null) html += '</div></div>';

        const groupLabel = item.group || 'Projects';
        html += `
<div class="project-group">
  <div class="project-group-header">
    <span class="project-group-label">${escapeHtml(groupLabel)}/</span>
  </div>
  <div class="projects-subgrid">`;

        for (const slug of item.projects) {
          const folder = item.group ? `${item.group}/${slug}` : slug;
          html += await buildProjectCard(`projects/${folder}`, slug);
        }

        html += '</div></div>';
        currentGroup = item.group;
      }
    }

    container.innerHTML = html || '<p class="loading-msg">No projects found.</p>';

  } catch(err) {
    container.innerHTML = fetchErrorMsg('projects/index.json', err);
  }
}

async function buildProjectCard(folderPath, slug) {
  try {
    const p = await fetch(`${folderPath}/project.json`).then(r => r.json());
    const tags = (p.tags || []).map(t => `<span class="project-tag">${escapeHtml(t)}</span>`).join('');
    const thumb = p.image
      ? `<div class="project-thumb"><img src="${folderPath}/${p.image}" alt="${escapeHtml(p.name)}"></div>`
      : `<div class="project-thumb project-thumb-icon">${p.icon || '📁'}</div>`;
    return `
<a href="${folderPath}/${p.link || 'index.html'}" class="project-card">
  ${thumb}
  <div class="project-info">
    <h3>${escapeHtml(p.name)}</h3>
    <p>${escapeHtml(p.desc)}</p>
    <div class="project-tags">${tags}</div>
  </div>
</a>`;
  } catch(_) {
    return `<div class="project-card project-card-err"><div class="project-thumb project-thumb-icon">⚠️</div><div class="project-info"><h3>${escapeHtml(slug)}</h3><p>Missing project.json</p></div></div>`;
  }
}


/* BLOG
   Reads blog/index.json → array of folder names
   Then fetches blog/{slug}/post.json from each.

   blog/index.json example:
   ["lamp-server-debian", "vlans-packet-tracer", "bash-tips"]

   blog/lamp-server-debian/post.json example:
   {
     "title": "Setting up a LAMP server on Debian 12",
     "date":  "2025-01-10",
     "tag":   "Linux",
     "desc":  "Step-by-step guide to install Apache, MySQL and PHP on a fresh Debian install."
   }
   The actual post is blog/{slug}/index.html
*/
async function loadBlog() {
  const container = document.getElementById('blog-grid');
  try {
    const slugs = await fetch('blog/index.json').then(r => r.json());

    const cards = await Promise.all(slugs.map(async slug => {
      try {
        const p = await fetch(`blog/${slug}/post.json`).then(r => r.json());
        return `
<a href="blog/${slug}/index.html" class="blog-card">
  <div class="blog-meta">
    <span class="blog-date">${escapeHtml(p.date)}</span>
    <span class="blog-tag">${escapeHtml(p.tag)}</span>
  </div>
  <h3>${escapeHtml(p.title)}</h3>
  <p>${escapeHtml(p.desc)}</p>
  <span class="blog-read">Read →</span>
</a>`;
      } catch(_) {
        return `<div class="blog-card"><h3>${escapeHtml(slug)}</h3><p>Could not load post.json</p></div>`;
      }
    }));

    container.innerHTML = cards.join('') || '<p class="loading-msg">No posts yet. Add folders to blog/ and list them in blog/index.json.</p>';

  } catch(err) {
    container.innerHTML = fetchErrorMsg('blog/index.json', err);
  }
}

// ─────────────────────────────────────
// CONTACT FORM
// ─────────────────────────────────────
document.getElementById('contact-form').addEventListener('submit', function(e) {
  e.preventDefault();
  document.getElementById('form-feedback').textContent =
    '✓ Message sent! (connect to Formspree or similar to make this real)';
  this.reset();
});

// ─────────────────────────────────────
// UTILS
// ─────────────────────────────────────
function fetchErrorMsg(file, err) {
  const isLocal = location.protocol === 'file:';
  if (isLocal) {
    return `<p class="loading-msg">
      ⚠️ You're opening the site directly as a file (<code>file://</code>).<br>
      Browsers block <code>fetch()</code> on local files for security reasons.<br><br>
      <strong>To test locally, run a simple server:</strong><br>
      <code>python3 -m http.server 8000</code><br>
      Then open <a href="http://localhost:8000" style="color:var(--accent)">http://localhost:8000</a><br><br>
      On GitHub Pages this will work automatically.
    </p>`;
  }
  return `<p class="loading-msg">Could not load <code>${file}</code> — make sure the file exists.<br><small>${err.message}</small></p>`;
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}