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
    setTimeout(() => applyFilter(lang), 80);
  });
});

// ─────────────────────────────────────
// SCRIPT FILTER
// ─────────────────────────────────────
let currentFilter = 'all';

function applyFilter(tag) {
  currentFilter = tag;

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === tag);
  });

  if (tag === 'all') {
    // show everything, restore collapsed state
    document.querySelectorAll('.sc').forEach(c => c.classList.remove('sc-hidden'));
    document.querySelectorAll('.sg').forEach(g => g.classList.remove('sg-hidden'));
    return;
  }

  // 1. Show/hide individual script cards
  document.querySelectorAll('.sc').forEach(card => {
    const tags = (card.dataset.tags || '').split(',');
    card.classList.toggle('sc-hidden', !tags.includes(tag));
  });

  // 2. For each group bottom-up: visible if it has at least one visible child (card or sub-group)
  //    We process deepest groups first by reversing the NodeList
  const allGroups = [...document.querySelectorAll('.sg')].reverse();
  allGroups.forEach(group => {
    const hasVisibleCard  = [...group.querySelectorAll(':scope > .sg-children > .sc')]
                              .some(c => !c.classList.contains('sc-hidden'));
    const hasVisibleGroup = [...group.querySelectorAll(':scope > .sg-children > .sg')]
                              .some(g => !g.classList.contains('sg-hidden'));
    group.classList.toggle('sg-hidden', !hasVisibleCard && !hasVisibleGroup);
    // force-open groups that have matches so the tree is navigable
    if (!group.classList.contains('sg-hidden')) group.classList.add('sg-open');
  });
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
});

// ─────────────────────────────────────
// SCRIPTS — toggle group open/closed
// ─────────────────────────────────────
function toggleGroup(hdr) {
  hdr.closest('.sg').classList.toggle('sg-open');
}
window.toggleGroup = toggleGroup;

// toggle individual script code block
function toggleScript(row) {
  const card   = row.closest('.sc');
  const body   = card.querySelector('.sc-body');
  if (!body) return;
  const isOpen = body.classList.toggle('sc-body-open');
  row.classList.toggle('sc-open', isOpen);
}
window.toggleScript = toggleScript;

// ─────────────────────────────────────
// DYNAMIC LOADERS
// ─────────────────────────────────────

/* SCRIPTS — recursive tree
   scripts/index.json format:

   A script entry (leaf):
   {
     "file": "backup.sh",
     "name": "backup.sh",
     "lang": "bash",
     "tags": ["bash", "backup", "rsync"],
     "desc": "Short description."
   }

   A group entry (can contain scripts AND nested groups):
   {
     "group": "python",
     "icon": "🐍",          ← optional, default 📁
     "tags": ["python"],    ← inherited by all children for filtering
     "items": [
       { "file": "...", ... },
       { "group": "subgroup", "items": [...] }
     ]
   }

   Tags are INHERITED — a script's effective tags = its own tags UNION all ancestor group tags.
   Filter shows a group if ANY descendant script matches.
*/
async function loadScripts() {
  const container = document.getElementById('scripts-list');
  try {
    const manifest = await fetch('scripts/index.json').then(r => r.json());
    if (!manifest.length) {
      container.innerHTML = '<p class="loading-msg">No scripts yet.</p>';
      return;
    }

    const langClass = { bash:'sl-bash', powershell:'sl-ps', python:'sl-py', js:'sl-js', html:'sl-html', favorite:'sl-favorite' };

    // Pre-fetch all script files in parallel to avoid waterfall
    const fileCache = {};
    function collectFiles(items) {
      for (const item of items) {
        if (item.file) fileCache[item.file] = null;
        else if (item.items) collectFiles(item.items);
      }
    }
    collectFiles(manifest);
    await Promise.all(Object.keys(fileCache).map(async f => {
      try { fileCache[f] = await fetch(`scripts/${f}`).then(r => r.text()); }
      catch(_) { fileCache[f] = '# could not load file'; }
    }));

    // Count all leaf scripts in a group (for the badge)
    function countScripts(items) {
      let n = 0;
      for (const it of items) {
        if (it.file) n++;
        else if (it.items) n += countScripts(it.items);
      }
      return n;
    }

    // Render a script card (leaf)
    function renderScript(entry, ancestorTags) {
      const ownTags  = entry.tags || [];
      const allTags  = [...new Set([...ancestorTags, ...ownTags])];
      const cls      = langClass[entry.lang] || 'sl-bash';
      const pills    = ownTags.map(t => `<span class="stag">${escapeHtml(t)}</span>`).join('');
      const code     = escapeHtml(fileCache[entry.file] || '');
      return `
<div class="sc" data-tags="${allTags.join(',')}">
  <div class="sc-row" onclick="toggleScript(this)">
    <span class="sc-arrow">▶</span>
    <span class="sc-lang ${cls}">${entry.lang}</span>
    <span class="sc-name">${escapeHtml(entry.name)}</span>
    <span class="sc-desc">${escapeHtml(entry.desc)}</span>
    <div class="sc-tag-pills">${pills}</div>
  </div>
  <div class="sc-body">
    <pre><code>${code}</code></pre>
  </div>
</div>`;
    }

    // Render a group (recursive)
    function renderGroup(item, ancestorTags, depth) {
      const groupTags  = [...new Set([...ancestorTags, ...(item.tags || [])])];
      const icon       = item.icon || '📁';
      const name       = item.group || 'group';
      const count      = countScripts(item.items || []);
      const groupPills = (item.tags || []).map(t => `<span class="stag">${escapeHtml(t)}</span>`).join('');
      const childrenHtml = (item.items || []).map(child =>
        child.file ? renderScript(child, groupTags)
                   : renderGroup(child, groupTags, depth + 1)
      ).join('');

      // depth=0 groups start open
      const openClass = depth === 0 ? 'sg-open' : '';

      return `
<div class="sg ${openClass}">
  <button class="sg-hdr" onclick="toggleGroup(this)">
    <span class="sg-arrow">▶</span>
    <span class="sg-icon">${icon}</span>
    <span class="sg-name">${escapeHtml(name)}</span>
    <div class="sg-tag-pills">${groupPills}</div>
    <span class="sg-count">${count} script${count !== 1 ? 's' : ''}</span>
  </button>
  <div class="sg-children">
    ${childrenHtml}
  </div>
</div>`;
    }

    // Render top-level items
    const html = manifest.map(item =>
      item.file ? renderScript(item, [])
                : renderGroup(item, [], 0)
    ).join('');

    container.innerHTML = html;
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