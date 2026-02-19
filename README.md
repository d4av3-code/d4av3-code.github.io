# D4av3 Portfolio — How everything works

## File structure

```txt
d4av3-code.github.io/
│
├── index.html                  ← The whole portfolio (single page app)
├── css/style.css
├── js/main.js
│
├── scripts/
│   ├── index.json              ← LIST of scripts to show (edit this to add scripts)
│   ├── backup.sh               ← The actual script files (loaded and displayed)
│   ├── sysinfo.sh
│   └── your_script.sh
│
├── projects/
│   ├── index.json              ← LIST of projects/groups (edit to add projects)
│   ├── games/
│   │   ├── snake/
│   │   │   ├── project.json    ← Name, icon/image, description, tags, link
│   │   │   └── index.html
│   │   └── chess/
│   │       ├── project.json
│   │       └── index.html
│   ├── games/arcade/
│   │   ├── pacman/
│   │   └── ping-pong/
│   ├── tmp     ← flat (no group) projects go directly on projects
│   │   ├── project.json
│   │   └── index.html
│   └── _TEMPLATE/
│       └── project.json        ← copy this for new projects
│
├── blog/
│   ├── index.json              ← LIST of post folder names (edit to add posts)
│   ├── lamp-server-debian/
│   │   ├── post.json           ← Title, date, tag, description
│   │   └── index.html          ← The actual blog post
│   ├── _TEMPLATE/
│   │   ├── post.json           ← Copy this for new post metadata
│   │   └── index.html          ← Copy this for new post content
│   └── ...
│
└── cv/
    └── cv-david-badal.pdf      ← My CV here
```

---

## How to add a SCRIPT

1. Put the script file in `scripts/` (e.g. `scripts/firewall.sh`)
2. Add one line to `scripts/index.json`:

   ```json
   { "file": "firewall.sh", "name": "firewall.sh", "lang": "bash", "desc": "Sets up iptables rules for a basic server." }
   ```

   Available `lang` values: `bash`, `powershell`, `python`, `js`, `html`

That's it. The site loads the file content automatically.

---

## How to add a PROJECT

Projects support **flat entries** and **groups**. Mix them freely in `projects/index.json`.

### Flat (no group)

```json
[
  "my-tool"
]
```

→ looks for `projects/my-tool/project.json`

### Grouped

```json
[
  { "group": "games",        "projects": ["snake", "chess"] },
  { "group": "games/arcade", "projects": ["pacman", "ping-pong"] }
]
```

→ looks for `projects/games/snake/project.json`, `projects/games/arcade/pacman/project.json`, etc.
The group name is shown as a label above its cards (e.g. `games/` or `games/arcade/`).
Leave `"group": ""` for a group with no label.

### Steps

1. Create the folder at the right path (e.g. `projects/games/snake/`)
2. Add `project.json` inside it:

   ```json
   {
     "name":  "Snake",
     "icon":  "🐍",
     "image": "preview.png",
     "desc":  "Classic snake game built with HTML5 Canvas.",
     "tags":  ["HTML", "Canvas", "JS"],
     "link":  "index.html"
   }
   ```

   - `image` — filename of a screenshot inside the same folder. Leave `""` to show the icon instead.
   - `link`  — file to open when the card is clicked (relative to the project folder).
3. Add the slug to the right entry in `projects/index.json`.

That's it — no touching `index.html`.

---

## How to add a BLOG POST

1. Create a folder: `blog/my-post-slug/`
2. Create `blog/my-post-slug/post.json`:

   ```json
   {
     "title": "How I configured SSH key auth",
     "date":  "2025-03-20",
     "tag":   "Linux",
     "desc":  "Short description shown on the card."
   }
   ```

3. Copy `blog/_TEMPLATE/index.html` to `blog/my-post-slug/index.html` and write your content
4. Add the slug to `blog/index.json`:

   ```json
   ["lamp-server-debian", "my-post-slug"]
   ```

The card on the main page pulls everything from `post.json` — you never need to touch `index.html`.

---

## The terminal panels (home page)

The 4 panels on the home page auto-cycle and expand one at a time.
Click any panel to stop auto-cycle and manually control them.

To edit the content, open `index.html` and find `<div class="term-panel" data-index="0">` etc.
Each panel has a `.term-output` div with `.to` rows — just edit the text.

---

## Script filtering

On the Scripts page there's a filter bar. Clicking a language filters by `lang` from `index.json`.

On the Skills page, the coding language tags (Bash, PowerShell, etc.) are clickable —
they jump to Scripts with that language pre-filtered.

---

## Contact form

The form currently just shows a message. To make it send real emails:

1. Create a free account at ![formspree.io](https://formspree.io)
2. In `index.html`, change the form:

   ```html
   <form class="contact-form" id="contact-form" action="https://formspree.io/f/YOUR_ID" method="POST">
   ```

3. Remove the submit listener from `js/main.js` (the form will submit normally)

---

## CV

Put `cv-david-badal.pdf` in the `cv/` folder. The download button in Contact will work automatically.
