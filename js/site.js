(function () {
  const M = window.MAX;
  const { esc, safeUrl: safe, parseVideo } = M;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- utilidades ---------- */
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("show"), 3200);
  }
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { threshold: 0.1, rootMargin: "0px 0px -40px 0px" })
    : null;
  function reveal(root = document) {
    $$(".reveal:not(.in)", root).forEach((el, i) => {
      if (!el.style.getPropertyValue("--i")) el.style.setProperty("--i", i % 6);
      io ? io.observe(el) : el.classList.add("in");
    });
  }
  const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
  const localToday = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

  /* ---------- navegación ---------- */
  const nav = $("#nav"), burger = $("#burger");
  const onScroll = () => nav.classList.toggle("scrolled", scrollY > 30);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    burger.setAttribute("aria-expanded", open);
    document.body.style.overflow = open ? "hidden" : "";
  });
  $("#menu").addEventListener("click", (e) => {
    if (e.target.closest("a")) { nav.classList.remove("open"); burger.setAttribute("aria-expanded", false); document.body.style.overflow = ""; }
  });
  if (io) {
    const links = $$("#menu a");
    const so = new IntersectionObserver((en) => en.forEach((x) => {
      if (x.isIntersecting) links.forEach((a) => a.setAttribute("aria-current", a.getAttribute("href") === "#" + x.target.id));
    }), { rootMargin: "-45% 0px -50% 0px" });
    $$("main section[id]").forEach((s) => so.observe(s));
  }

  /* ---------- cartel con efecto 3D ---------- */
  const pw = $("#posterWrap"), poster = $("#poster");
  if (!reduce && matchMedia("(hover:hover)").matches) {
    pw.addEventListener("mousemove", (e) => {
      const r = pw.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      poster.style.setProperty("--ry", (x * 14).toFixed(2) + "deg");
      poster.style.setProperty("--rx", (-y * 14).toFixed(2) + "deg");
    });
    pw.addEventListener("mouseleave", () => { poster.style.setProperty("--ry", "0deg"); poster.style.setProperty("--rx", "0deg"); });
  }

  /* ---------- ventanas ---------- */
  const modal = $("#modal"), mbody = $("#modal-body"), lb = $("#lb");
  function closeAll() {
    modal.hidden = true; mbody.innerHTML = ""; lb.hidden = true;
    if (!nav.classList.contains("open")) document.body.style.overflow = "";
  }
  modal.addEventListener("click", (e) => { if (e.target === modal || e.target.closest(".modal-x")) closeAll(); });
  lb.addEventListener("click", (e) => { if (e.target === lb || e.target.closest(".modal-x")) closeAll(); });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
    if (!lb.hidden) { if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); }
    if (!modal.hidden && $("#cromo")) { if (e.key === "ArrowRight") openMember(mi + 1); if (e.key === "ArrowLeft") openMember(mi - 1); }
  });
  function openModal(html) { mbody.innerHTML = html; modal.hidden = false; document.body.style.overflow = "hidden"; }

  /* ---------- conciertos ---------- */
  function evHTML(e, past) {
    const [y, m, d] = e.date.split("-").map(Number);
    const wd = new Date(y, m - 1, d).toLocaleDateString("es-ES", { weekday: "long" });
    const place = [e.venue, e.city].filter(Boolean).join(" · ");
    const tk = past ? "" : safe(e.ticket_url);
    return `<li class="event${past ? " past" : ""} reveal">
      <div class="ev-date"><b>${d}</b><span>${MONTHS[m - 1]} ${y}</span></div>
      <div class="ev-info"><small>${esc(wd)}</small><h3>${esc(e.title)}</h3><p>${esc(place)}</p>${e.note ? `<p class="ev-note">${esc(e.note)}</p>` : ""}</div>
      ${tk ? `<a class="btn sm" href="${esc(tk)}" target="_blank" rel="noopener">Entradas</a>` : ""}
    </li>`;
  }
  let PAST = [], pastShown = 0;
  function morePast() {
    const s = PAST.slice(pastShown, pastShown + 4);
    $("#past").insertAdjacentHTML("beforeend", s.map((e) => evHTML(e, true)).join(""));
    pastShown += s.length;
    $("#past-more").hidden = pastShown >= PAST.length;
    reveal($("#past"));
  }
  $("#past-more").addEventListener("click", morePast);
  function renderEvents(events) {
    const today = localToday();
    const up = events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    PAST = events.filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date));
    $("#events").innerHTML = up.map((e) => evHTML(e, false)).join("");
    $("#events-empty").hidden = up.length > 0;
    const ns = $("#next-show");
    if (up.length) {
      const e = up[0], [y, m, d] = e.date.split("-").map(Number);
      ns.innerHTML = `<b>Próximo directo</b> ${d} ${MONTHS[m - 1]} · ${esc(e.venue || e.title)} →`;
      ns.hidden = false;
    }
    pastShown = 0; $("#past").innerHTML = ""; morePast();
    $("#past-wrap").hidden = !PAST.length;
  }

  /* ---------- vídeos ---------- */
  const PLAT = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok", mp4: "Vídeo", link: "Enlace", demo: "Próximamente" };
  let VIDS = [], vShown = 0;
  const VPAGE = 7;
  function vThumb(v, p) {
    if (v.poster_url && safe(v.poster_url)) return `<img src="${esc(safe(v.poster_url))}" alt="" loading="lazy">`;
    if (p.kind === "youtube") return `<img src="https://i.ytimg.com/vi/${p.id}/hqdefault.jpg" alt="" loading="lazy">`;
    if (p.kind === "mp4") return `<video src="${esc(safe(v.url))}#t=0.8" preload="metadata" muted playsinline></video>`;
    return `<div class="vph">${PLAT[p.kind]}</div>`;
  }
  function renderVideos() {
    const g = $("#vgrid");
    const slice = VIDS.slice(vShown, vShown + (vShown === 0 ? VPAGE : 6));
    g.insertAdjacentHTML("beforeend", slice.map((v, k) => {
      const i = vShown + k, p = parseVideo(v.url);
      return `<button class="vcard reveal${i === 0 && VIDS.length > 2 ? " big" : ""}" data-v="${i}" aria-label="Reproducir: ${esc(v.title || "vídeo")}">
        <div class="vt">${vThumb(v, p)}</div>
        <span class="vplay"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>
        <div class="vmeta"><em>${PLAT[p.kind]}</em><strong>${esc(v.title || "")}</strong></div>
      </button>`;
    }).join(""));
    vShown += slice.length;
    $("#vmore").hidden = vShown >= VIDS.length;
    reveal(g);
  }
  $("#vgrid").addEventListener("click", (e) => {
    const b = e.target.closest(".vcard"); if (!b) return;
    const v = VIDS[+b.dataset.v], p = parseVideo(v.url);
    if (p.kind === "demo") return toast("Vídeo de ejemplo: añade el tuyo desde el panel de administración.");
    if (p.kind === "link") return window.open(safe(v.url) || "#", "_blank", "noopener");
    let html;
    if (p.kind === "youtube") html = `<div class="vframe"><iframe src="https://www.youtube-nocookie.com/embed/${p.id}?autoplay=1&rel=0" title="${esc(v.title || "Vídeo")}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
    else if (p.kind === "instagram") html = `<div class="vframe tall"><iframe src="https://www.instagram.com/reel/${p.id}/embed" title="${esc(v.title || "Reel")}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe></div>`;
    else if (p.kind === "tiktok") html = `<div class="vframe tall"><iframe src="https://www.tiktok.com/embed/v2/${p.id}" title="${esc(v.title || "TikTok")}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe></div>`;
    else html = `<div class="vframe free"><video src="${esc(safe(v.url))}" controls autoplay playsinline></video></div>`;
    openModal(html);
  });
  $("#vmore").addEventListener("click", renderVideos);

  /* ---------- fotos ---------- */
  let PH = [], phView = [], phShown = 0, phCat = "Todas";
  const PPAGE = 12;
  function renderChips() {
    const cats = ["Todas", ...new Set(PH.map((p) => (p.category || "").trim()).filter(Boolean))];
    const c = $("#chips");
    c.hidden = cats.length < 3;
    c.innerHTML = cats.map((k) => `<button class="chip${k === phCat ? " on" : ""}" data-c="${esc(k)}" role="tab" aria-selected="${k === phCat}">${esc(k)}</button>`).join("");
  }
  function resetPhotos() {
    phView = phCat === "Todas" ? PH : PH.filter((p) => (p.category || "").trim() === phCat);
    phShown = 0; $("#masonry").innerHTML = ""; morePhotos();
  }
  function morePhotos() {
    const slice = phView.slice(phShown, phShown + PPAGE);
    $("#masonry").insertAdjacentHTML("beforeend", slice.map((p, k) =>
      `<button class="ph reveal" data-p="${phShown + k}" aria-label="Ampliar foto${p.caption ? ": " + esc(p.caption) : ""}"><img src="${esc(safe(p.url))}" alt="${esc(p.caption || "Foto de Max Estrella")}" loading="lazy">${p.caption ? `<span>${esc(p.caption)}</span>` : ""}</button>`).join(""));
    phShown += slice.length;
    $("#pmore").hidden = phShown >= phView.length;
    reveal($("#masonry"));
  }
  $("#chips").addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    phCat = b.dataset.c; renderChips(); resetPhotos();
  });
  $("#pmore").addEventListener("click", morePhotos);
  let cur = 0;
  function show(i) {
    cur = (i + phView.length) % phView.length;
    const p = phView[cur];
    $("#lb-img").src = safe(p.url); $("#lb-img").alt = p.caption || "";
    $("#lb-cap").textContent = p.caption || "";
  }
  function step(d) { show(cur + d); }
  $("#masonry").addEventListener("click", (e) => {
    const b = e.target.closest(".ph"); if (!b) return;
    show(+b.dataset.p); lb.hidden = false; document.body.style.overflow = "hidden";
  });
  $(".lb-nav.prev").addEventListener("click", (e) => { e.stopPropagation(); step(-1); });
  $(".lb-nav.next").addEventListener("click", (e) => { e.stopPropagation(); step(1); });
  let tx = 0;
  lb.addEventListener("touchstart", (e) => { tx = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => { const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); });

  /* ---------- noticias ---------- */
  let NEWS = [], nShown = 0;
  const fmtDate = (iso) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  function renderNews() {
    const g = $("#ngrid");
    const slice = NEWS.slice(nShown, nShown + 6);
    g.insertAdjacentHTML("beforeend", slice.map((n, k) => {
      const ex = (n.body || "").replace(/\s+/g, " ").slice(0, 130);
      return `<button class="ncard reveal" data-n="${nShown + k}">
        <div class="ni">${n.image_url && safe(n.image_url) ? `<img src="${esc(safe(n.image_url))}" alt="" loading="lazy">` : "★"}</div>
        <div class="nb"><time>${esc(fmtDate(n.published_at))}</time><h3>${esc(n.title)}</h3><p>${esc(ex)}${(n.body || "").length > 130 ? "…" : ""}</p><span class="rm">Leer más →</span></div>
      </button>`;
    }).join(""));
    nShown += slice.length;
    $("#nmore").hidden = nShown >= NEWS.length;
    $("#news-empty").hidden = NEWS.length > 0;
    reveal(g);
  }
  $("#ngrid").addEventListener("click", (e) => {
    const b = e.target.closest(".ncard"); if (!b) return;
    const n = NEWS[+b.dataset.n];
    openModal(`<article class="article">${n.image_url && safe(n.image_url) ? `<img src="${esc(safe(n.image_url))}" alt="">` : ""}<div class="ab"><time>${esc(fmtDate(n.published_at))}</time><h3>${esc(n.title)}</h3><div class="txt">${esc(n.body || "")}</div></div></article>`);
  });
  $("#nmore").addEventListener("click", renderNews);

  /* ---------- banda (fichas tipo cromo) ---------- */
  let MEM = [], mi = 0;
  function renderMembers(ms) {
    MEM = ms;
    $("#mgrid").innerHTML = ms.map((m, i) => `<button class="mcard reveal" data-m="${i}" aria-label="Ver la ficha de ${esc(m.name)}"><img src="${esc(safe(m.photo_url) || "images/cartel.jpg")}" alt="${esc(m.name)}" loading="lazy"><span class="mhint">Ver ficha</span><div><h3>${esc(m.name)}</h3>${m.role ? `<p>${esc(m.role)}</p>` : ""}</div></button>`).join("");
  }
  function openMember(i) {
    if (!MEM.length) return;
    mi = (i + MEM.length) % MEM.length;
    const m = MEM[mi], n = (x) => String(x).padStart(2, "0");
    openModal(`<div class="cromo-wrap">
      <div class="cromo" id="cromo">
        <div class="cr-top"><span>Max ★ Estrella</span><span>Nº ${n(mi + 1)} / ${n(MEM.length)}</span></div>
        <div class="cr-photo"><img src="${esc(safe(m.photo_url) || "images/cartel.jpg")}" alt="${esc(m.name)}"><i class="cr-star">★</i></div>
        <div class="cr-cap"><h3>${esc(m.name)}</h3>${m.role ? `<p class="cr-role">${esc(m.role)}</p>` : ""}${m.bio ? `<p class="cr-bio">${esc(m.bio)}</p>` : ""}</div>
      </div>
      ${MEM.length > 1 ? `<div class="cr-nav"><button data-cr="-1" aria-label="Anterior">‹</button><span>${n(mi + 1)} / ${n(MEM.length)}</span><button data-cr="1" aria-label="Siguiente">›</button></div>` : ""}
    </div>`);
    const c = $("#cromo");
    if (!reduce && matchMedia("(hover:hover)").matches) {
      c.addEventListener("mousemove", (e) => {
        const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        c.style.setProperty("--ry", (x * 16).toFixed(1) + "deg"); c.style.setProperty("--rx", (-y * 16).toFixed(1) + "deg");
        c.style.setProperty("--sx", (130 - (x + 0.5) * 160).toFixed(0) + "%");
      });
      c.addEventListener("mouseleave", () => { c.style.setProperty("--ry", "0deg"); c.style.setProperty("--rx", "0deg"); });
    }
  }
  $("#mgrid").addEventListener("click", (e) => { const b = e.target.closest(".mcard"); if (b) openMember(+b.dataset.m); });
  modal.addEventListener("click", (e) => { const b = e.target.closest("[data-cr]"); if (b) openMember(mi + Number(b.dataset.cr)); });

  /* ---------- contacto / redes ---------- */
  const SOCIAL = { instagram: "Instagram", youtube: "YouTube", tiktok: "TikTok", facebook: "Facebook", spotify: "Spotify" };
  function renderSettings(S) {
    if (S.hero_tagline) $("#tagline").textContent = S.hero_tagline;
    $("#bio").textContent = S.bio || "";
    const links = Object.keys(SOCIAL).filter((k) => safe(S[k])).map((k) => `<a href="${esc(safe(S[k]))}" target="_blank" rel="noopener">${SOCIAL[k]}</a>`).join("");
    $("#social").innerHTML = links; $("#social-foot").innerHTML = links;
    const mail = S.contact_email || M.config.CONTACT_EMAIL;
    if (mail) { $("#direct-mail").hidden = false; const a = $("#mail-link"); a.textContent = mail; a.href = "mailto:" + mail; }
    window.__mail = mail;
  }
  $("#booking").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, d = Object.fromEntries(new FormData(f)), msg = $("#form-msg"), btn = f.querySelector("button");
    msg.className = "form-msg";
    if (d.website) { msg.textContent = "¡Gracias!"; return; } // anti-spam
    if (!d.name.trim() || !/^\S+@\S+\.\S+$/.test(d.email)) { msg.textContent = "Escribe tu nombre y un email válido."; msg.classList.add("err"); return; }
    if (M.live) {
      btn.disabled = true; msg.textContent = "Enviando…";
      const { error } = await M.sb.from("inquiries").insert({ name: d.name, email: d.email, kind: d.kind, date_place: d.date_place, message: d.message });
      btn.disabled = false;
      if (error) { msg.textContent = "No se pudo enviar. Inténtalo de nuevo o escríbenos por email."; msg.classList.add("err"); return; }
      msg.textContent = "¡Mensaje enviado! Te responderemos muy pronto."; msg.classList.add("ok"); f.reset();
    } else {
      const body = `Nombre: ${d.name}\nEmail: ${d.email}\nTipo: ${d.kind}\nFecha y lugar: ${d.date_place}\n\n${d.message}`;
      location.href = `mailto:${window.__mail || ""}?subject=${encodeURIComponent("Contratación Max Estrella")}&body=${encodeURIComponent(body)}`;
      msg.textContent = "Se abrirá tu correo con el mensaje listo (modo demo)."; msg.classList.add("ok");
    }
  });
  $("#year").textContent = new Date().getFullYear();

  /* ---------- carga ---------- */
  async function init() {
    reveal();
    const [events, videos, photos, news, members, S] = await Promise.all([M.get("events"), M.get("videos"), M.get("photos"), M.get("news"), M.get("members"), M.settings()]);
    renderSettings(S);
    renderEvents(events);
    VIDS = videos; vShown = 0; $("#vgrid").innerHTML = "";
    if (VIDS.length) renderVideos(); else $("#vgrid").innerHTML = '<p class="empty">Muy pronto, vídeos nuevos.</p>';
    PH = photos; renderChips(); resetPhotos();
    if (!PH.length) $("#masonry").innerHTML = '<p class="empty">Muy pronto, fotos nuevas.</p>';
    NEWS = news; nShown = 0; $("#ngrid").innerHTML = ""; renderNews();
    renderMembers(members);
    reveal();
  }
  init();
})();
