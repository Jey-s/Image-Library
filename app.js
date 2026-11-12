/* =========================================
   1. PROCEDURAL OBSIDIAN CANVAS TEXTURE
   ========================================= */
function generateObsidianTexture() {
    const canvas = document.getElementById('obsidian-canvas');
    const ctx = canvas.getContext('2d');
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        drawTexture();
    }

    function drawTexture() {
        const w = canvas.width;
        const h = canvas.height;
        
        // Base dark tone
        ctx.fillStyle = '#050506';
        ctx.fillRect(0, 0, w, h);

        // Draw massive faceted polygons to simulate shattering
        const shards = [
            { points: [[0,0], [w*0.6,0], [w*0.2, h*0.7]], color: ['#121218', '#050506'] },
            { points: [[w,0], [w, h*0.5], [w*0.4, h*0.3]], color: ['#1a1a24', '#0a0a0c'] },
            { points: [[0,h], [w*0.3, h], [w*0.5, h*0.4], [0, h*0.6]], color: ['#0f0f14', '#050506'] },
            { points: [[w,h], [w*0.6, h], [w*0.8, h*0.2]], color: ['#16161f', '#07070a'] },
            { points: [[w*0.2, h*0.2], [w*0.7, h*0.1], [w*0.5, h*0.8]], color: ['#111117', '#08080b'] }
        ];

        shards.forEach(shard => {
            ctx.beginPath();
            ctx.moveTo(shard.points[0][0], shard.points[0][1]);
            for(let i = 1; i < shard.points.length; i++) {
                ctx.lineTo(shard.points[i][0], shard.points[i][1]);
            }
            ctx.closePath();

            // Gradient per shard
            let grad = ctx.createLinearGradient(shard.points[0][0], shard.points[0][1], shard.points[1][0], shard.points[1][1]);
            grad.addColorStop(0, shard.color[0]);
            grad.addColorStop(1, shard.color[1]);
            ctx.fillStyle = grad;
            ctx.fill();

            // Subtle gold edge highlight
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.05)';
            ctx.stroke();
        });

        // Add Film Grain / Stone micro-texture
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            let noise = Math.random() * 15; // Grain intensity
            data[i] += noise;     // Red
            data[i+1] += noise;   // Green
            data[i+2] += noise;   // Blue
        }
        ctx.putImageData(imgData, 0, 0);
    }

    window.addEventListener('resize', resize);
    resize();
}

generateObsidianTexture(); // Run on load

/* =========================================
   2. GITHUB REPO LOGIC & UI
   ========================================= */
const USERNAME = "Jey-s";
const REPOSITORY = "Image-Library";
const BRANCH = "Images";
const BASE_URL = `https://${USERNAME}.github.io/${REPOSITORY}/`;
const EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|avif|svg|bmp)$/i;

const ICON_COPY = '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const ICON_LINK = '<svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';

const $ = id => document.getElementById(id);
const gallery = $("gallery"), search = $("search"), tabsEl = $("filter-tabs"),
      lightbox = $("lightbox"), lbImg = $("lb-img"), toast = $("toast");

let items = [], view = [], activeFolder = "All", current = 0, toastTimer;

const urlFor = p => BASE_URL + p.split("/").map(encodeURIComponent).join("/");
const folderOf = p => p.includes("/") ? p.split("/")[0] : "Archive";

function say(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}

async function copyURL(path) {
    try {
        await navigator.clipboard.writeText(urlFor(path));
        say("Asset Link Copied");
    } catch {
        window.prompt("Manual Copy Required:", urlFor(path));
    }
}

async function loadImages() {
    try {
        const api = `https://api.github.com/repos/${USERNAME}/${REPOSITORY}/git/trees/${encodeURIComponent(BRANCH)}?recursive=1`;
        const response = await fetch(api);
        if (!response.ok) throw new Error("Unable to authenticate with the archive.");
        const data = await response.json();
        
        items = data.tree.filter(f => f.type === "blob" && EXTENSIONS.test(f.path));
        
        renderTabs();
        buildGallery();
        renderGallery();
    } catch (error) {
        gallery.innerHTML = `<div class="empty-state">${error.message}</div>`;
    }
}

function renderTabs() {
    const counts = {};
    items.forEach(f => { const k = folderOf(f.path); counts[k] = (counts[k] || 0) + 1; });
    
    $("stat-total").textContent = items.length;
    $("stat-folders").textContent = Object.keys(counts).length;

    tabsEl.innerHTML = "";
    ["All", ...Object.keys(counts).sort()].forEach(name => {
        const btn = document.createElement("button");
        btn.className = "tab" + (name === activeFolder ? " active" : "");
        btn.textContent = name;
        btn.onclick = () => {
            activeFolder = name;
            Array.from(tabsEl.children).forEach(c => c.classList.remove("active"));
            btn.classList.add("active");
            renderGallery();
        };
        tabsEl.appendChild(btn);
    });
}

function buildGallery() {
    gallery.innerHTML = "";
    items.forEach(file => {
        const parts = file.path.split("/");
        const base = parts.pop();
        const folder = parts.length ? parts.join("/") : "Archive";

        const card = file.el = document.createElement("article");
        card.className = "card";

        const imgWrap = document.createElement("div");
        imgWrap.className = "card-img-wrap";
        imgWrap.onclick = () => openLightbox(view.indexOf(file));
        
        const img = document.createElement("img");
        img.loading = "lazy";
        img.onload = () => img.classList.add("ready");
        img.src = urlFor(file.path);
        imgWrap.appendChild(img);

        const info = document.createElement("div");
        info.className = "card-info";
        info.innerHTML = `
            <span class="card-folder">${folder}</span>
            <h3 class="card-title" title="${base}">${base}</h3>
        `;

        const actions = document.createElement("div");
        actions.className = "card-actions";
        
        const copyBtn = document.createElement("button");
        copyBtn.className = "btn-action";
        copyBtn.innerHTML = `${ICON_COPY} Copy`;
        copyBtn.onclick = (e) => { e.stopPropagation(); copyURL(file.path); };

        const openBtn = document.createElement("a");
        openBtn.className = "btn-action";
        openBtn.innerHTML = `${ICON_LINK} View`;
        openBtn.href = urlFor(file.path);
        openBtn.target = "_blank";
        openBtn.style.textDecoration = "none";

        actions.append(copyBtn, openBtn);
        info.appendChild(actions);

        card.append(imgWrap, info);
        gallery.appendChild(card);
    });
}

function renderGallery() {
    const q = search.value.trim().toLowerCase();
    view = items.filter(f => 
        (activeFolder === "All" || folderOf(f.path) === activeFolder) &&
        f.path.toLowerCase().includes(q)
    );
    
    const shown = new Set(view);
    items.forEach(f => { f.el.style.display = shown.has(f) ? "flex" : "none"; });

    if (view.length === 0) {
        let empty = gallery.querySelector(".empty-state");
        if (!empty) {
            empty = document.createElement("div");
            empty.className = "empty-state";
            gallery.appendChild(empty);
        }
        empty.textContent = "No assets match your criteria.";
        empty.style.display = "block";
    } else {
        const empty = gallery.querySelector(".empty-state");
        if (empty) empty.style.display = "none";
    }
}

function showAt(i) {
    if (!view.length) return;
    current = (i + view.length) % view.length;
    const f = view[current];
    lbImg.src = urlFor(f.path);
    $("lb-title").textContent = f.path.split("/").pop();
    
    const cNum = String(current + 1).padStart(2, '0');
    const tNum = String(view.length).padStart(2, '0');
    $("lb-count").textContent = `${cNum} / ${tNum}`;
}

function openLightbox(i) { showAt(i); lightbox.showModal(); }

$("prev").onclick = () => showAt(current - 1);
$("next").onclick = () => showAt(current + 1);
$("lb-close").onclick = () => lightbox.close();
lightbox.addEventListener("click", e => { 
    if (e.target === lightbox || e.target.classList.contains("lb-stage")) lightbox.close(); 
});
lightbox.addEventListener("close", () => { lbImg.removeAttribute("src"); });

document.addEventListener("keydown", e => {
    if (lightbox.open) {
        if (e.key === "ArrowLeft") showAt(current - 1);
        if (e.key === "ArrowRight") showAt(current + 1);
    }
});

search.addEventListener("input", renderGallery);
loadImages();
