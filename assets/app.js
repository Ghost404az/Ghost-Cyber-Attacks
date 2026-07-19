// ============================================================
// APP.JS — يجلب ملفات Markdown من الريبو عبر GitHub API (قراءة عامة،
// بدون توكن) ويعرضها كموقع منظم بأقسام. Hash-routing بسيط:
//   #/                -> قائمة كل المحتوى
//   #/item/<slug>      -> عرض مقال/بحث كامل
// ============================================================

const CFG = window.SITE_CONFIG;
const API_BASE = `https://api.github.com/repos/${CFG.GITHUB_OWNER}/${CFG.GITHUB_REPO}`;

let ALL_ITEMS = null; // cache

function slugify(filename){
  return filename.replace(/\.md$/i, "");
}

// -------- Frontmatter parser بسيط (YAML مبسط) --------
function parseFrontmatter(raw){
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if(!match) return { meta:{}, body: raw };
  const [, fmBlock, body] = match;
  const meta = {};
  fmBlock.split("\n").forEach(line=>{
    const m = line.match(/^([\w-]+):\s*(.*)$/);
    if(!m) return;
    let [, key, val] = m;
    val = val.trim();
    if(val.startsWith("[") && val.endsWith("]")){
      meta[key] = val.slice(1,-1).split(",").map(s=>s.trim().replace(/^["']|["']$/g,"")).filter(Boolean);
    } else {
      meta[key] = val.replace(/^["']|["']$/g,"");
    }
  });
  return { meta, body: body.trim() };
}

async function fetchDirListing(){
  const res = await fetch(`${API_BASE}/contents/${CFG.CONTENT_PATH}?ref=${CFG.GITHUB_BRANCH}`);
  if(!res.ok) throw new Error("تعذّر جلب قائمة الملفات من الريبو (تأكد من اسم المستخدم/الريبو بـ config.js)");
  return res.json();
}

async function fetchAllItems(){
  if(ALL_ITEMS) return ALL_ITEMS;
  const files = await fetchDirListing();
  const mdFiles = files.filter(f => f.type === "file" && f.name.endsWith(".md"));
  const items = await Promise.all(mdFiles.map(async f=>{
    const res = await fetch(f.download_url);
    const raw = await res.text();
    const { meta, body } = parseFrontmatter(raw);
    return {
      slug: slugify(f.name),
      title: meta.title || slugify(f.name),
      category: meta.category || "blog",
      date: meta.date || "",
      tags: meta.tags || [],
      summary: meta.summary || "",
      body
    };
  }));
  items.sort((a,b)=> (b.date||"").localeCompare(a.date||""));
  ALL_ITEMS = items;
  return items;
}

function categoryLabel(key){
  const c = CFG.CATEGORIES.find(c=>c.key===key);
  return c ? c.label : key;
}

// -------- Rendering --------
function renderTopbar(activeRoute){
  return `
  <div class="topbar"><div class="shell topbar-inner">
    <a href="#/" class="brand mono">${CFG.SITE_HANDLE}<span class="caret">_</span></a>
    <nav class="nav">
      ${CFG.CATEGORIES.map(c=>`<a href="#/?cat=${c.key}">${c.label}</a>`).join("")}
    </nav>
  </div></div>`;
}

function renderCard(item){
  return `
  <a class="card" href="#/item/${item.slug}" style="text-decoration:none;color:inherit;">
    <div class="card-top">
      <span>${item.date || "—"}</span>
      <span class="tag-pill">${categoryLabel(item.category)}</span>
    </div>
    <h3>${item.title}</h3>
    <p>${item.summary || ""}</p>
    <div class="card-foot">
      <span>${(item.tags||[]).slice(0,3).join(" · ")}</span>
      <span class="read-link">اقرأ &larr;</span>
    </div>
  </a>`;
}

async function renderList(container, filterCat){
  container.innerHTML = renderTopbar() + `
    <div class="shell">
      <div class="hero">
        <div class="hero-tag">${CFG.HERO_TAG}</div>
        <h1>${CFG.HERO_TITLE_LINE1} <span class="accent">${CFG.HERO_TITLE_ACCENT}</span></h1>
        <p class="lede">${CFG.HERO_LEDE}</p>
        <div class="hero-meta" id="hero-meta"></div>
      </div>
      <div class="filterbar" id="filterbar"></div>
      <div class="cmd-header">
        <span class="prompt">$</span><span class="cmd">ls ./${CFG.CONTENT_PATH}</span>
        <span class="count" id="item-count"></span>
      </div>
      <div class="grid" id="grid"><div class="empty-state">جاري التحميل...</div></div>
    </div>
    <div class="shell"><div class="footer">
      <span>&copy; ${new Date().getFullYear()} ${CFG.SITE_TITLE}</span>
      <a href="https://github.com/${CFG.GITHUB_OWNER}/${CFG.GITHUB_REPO}" target="_blank">GitHub Repo</a>
    </div></div>
  `;

  try{
    const items = await fetchAllItems();
    document.getElementById("hero-meta").innerHTML =
      `<span><strong>${items.length}</strong> ملف منشور</span>
       <span><strong>${new Set(items.map(i=>i.category)).size}</strong> تصنيف</span>`;

    const filterbar = document.getElementById("filterbar");
    filterbar.innerHTML = [{key:"all",label:"الكل"}, ...CFG.CATEGORIES].map(c=>
      `<button class="filter-btn ${(!filterCat && c.key==='all') || filterCat===c.key ? 'active':''}" data-cat="${c.key}">${c.label}</button>`
    ).join("");
    filterbar.querySelectorAll(".filter-btn").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const cat = btn.dataset.cat;
        location.hash = cat === "all" ? "#/" : `#/?cat=${cat}`;
      });
    });

    const filtered = filterCat ? items.filter(i=>i.category===filterCat) : items;
    const grid = document.getElementById("grid");
    document.getElementById("item-count").textContent = `${filtered.length} entries`;
    grid.innerHTML = filtered.length
      ? filtered.map(renderCard).join("")
      : `<div class="empty-state">ما في محتوى بهاد التصنيف بعد.</div>`;
  }catch(err){
    document.getElementById("grid").innerHTML = `<div class="empty-state">${err.message}</div>`;
  }
}

async function renderArticle(container, slug){
  container.innerHTML = renderTopbar() + `<div class="shell article-wrap" id="article-root">
    <a class="back-link" href="#/">&larr; رجوع لكل المحتوى</a>
    <div class="empty-state" style="margin-top:24px;">جاري التحميل...</div>
  </div>`;
  try{
    const items = await fetchAllItems();
    const item = items.find(i=>i.slug===slug);
    if(!item) throw new Error("هالملف مش موجود.");
    const html = window.marked ? window.marked.parse(item.body) : item.body;
    document.getElementById("article-root").innerHTML = `
      <a class="back-link" href="#/">&larr; رجوع لكل المحتوى</a>
      <div class="article-meta-row">
        <span class="tag-pill">${categoryLabel(item.category)}</span>
        <span>${item.date || ""}</span>
        <span>${(item.tags||[]).join(" · ")}</span>
      </div>
      <h1 class="article-title">${item.title}</h1>
      <div class="article-body">${html}</div>
    `;
  }catch(err){
    document.getElementById("article-root").innerHTML += `<div class="empty-state">${err.message}</div>`;
  }
}

function router(){
  const root = document.getElementById("root");
  const hash = location.hash || "#/";
  const itemMatch = hash.match(/^#\/item\/(.+)$/);
  if(itemMatch){
    renderArticle(root, decodeURIComponent(itemMatch[1]));
    return;
  }
  const catMatch = hash.match(/[?&]cat=([\w-]+)/);
  renderList(root, catMatch ? catMatch[1] : null);
}

window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", router);
