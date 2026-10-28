(function () {
  const M = window.MAX;
  const { esc, safeUrl: safe, parseVideo, parseSpotify, spotifyMeta } = M;
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

  /* ---------- portada: movimiento casi imperceptible del fondo con el ratón ---------- */
  const heroEl = $("#inicio"), heroBg = $(".hero-bg");
  if (heroEl && heroBg && !reduce && matchMedia("(hover:hover)").matches) {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const tick = () => {
      cx += (tx - cx) * 0.04; cy += (ty - cy) * 0.04;           // suaviza el movimiento
      heroBg.style.setProperty("--mx", cx.toFixed(3));
      heroBg.style.setProperty("--my", cy.toFixed(3));
      raf = (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) ? requestAnimationFrame(tick) : 0;
    };
    const go = () => { if (!raf) raf = requestAnimationFrame(tick); };
    heroEl.addEventListener("mousemove", (e) => {
      const r = heroEl.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      go();
    });
    heroEl.addEventListener("mouseleave", () => { tx = 0; ty = 0; go(); });
  }

  /* ---------- ventanas + ficha tipo cromo (común a todo) ---------- */
  const modal = $("#modal"), mbody = $("#modal-body");
  const pad = (x) => String(x).padStart(2, "0");
  const CUR = { k: null, i: 0 };
  const LIST = { m: () => MEM, p: () => phView, v: () => VIDS, n: () => NEWS, u: () => UP, e: () => PAST };
  function closeAll() {
    modal.hidden = true; mbody.innerHTML = ""; CUR.k = null;
    if (!nav.classList.contains("open")) document.body.style.overflow = "";
  }
  function openModal(html) { mbody.innerHTML = html; modal.hidden = false; document.body.style.overflow = "hidden"; }
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target === mbody || e.target.classList.contains("cromo-wrap") || e.target.closest(".modal-x")) return closeAll();
    const b = e.target.closest("[data-cr]");
    if (b && CUR.k) openCromo(CUR.k, CUR.i + Number(b.dataset.cr));
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
    if (!modal.hidden && CUR.k) {
      if (e.key === "ArrowRight") openCromo(CUR.k, CUR.i + 1);
      if (e.key === "ArrowLeft") openCromo(CUR.k, CUR.i - 1);
    }
  });
  let tx = 0;
  modal.addEventListener("touchstart", (e) => { tx = e.changedTouches[0].clientX; }, { passive: true });
  modal.addEventListener("touchend", (e) => {
    if (!CUR.k) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 60) openCromo(CUR.k, CUR.i + (dx < 0 ? 1 : -1));
  });
  function tilt(c, amt) {
    if (reduce || !matchMedia("(hover:hover)").matches) return;
    c.addEventListener("mousemove", (e) => {
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      c.style.setProperty("--ry", (x * amt).toFixed(1) + "deg"); c.style.setProperty("--rx", (-y * amt).toFixed(1) + "deg");
      c.style.setProperty("--sx", (130 - (x + 0.5) * 160).toFixed(0) + "%");
    });
    c.addEventListener("mouseleave", () => { c.style.setProperty("--ry", "0deg"); c.style.setProperty("--rx", "0deg"); });
  }

  const STAR = '<i class="cr-star">★</i>';
  const frame = (top, media, cap) => `<div class="cr-top"><span>Max ★ Estrella</span><span>${top}</span></div>${media}<div class="cr-cap">${cap}</div>`;
  const fmtDate = (iso) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function fichaEvento(ev, i, n, past) {
    const { y, m, d, wd } = evParts(ev), tk = past ? "" : safe(ev.ticket_url);
    const rows = [["Sala", ev.venue], ["Ubicación", ev.city]].filter((r) => r[1]);
    const media = `<div class="cr-date"><span class="wd">${esc(wd)}</span><b>${d}</b><span class="mo">${MONTHS[m - 1]} ${y}</span>${past ? '<em class="stamp">Finalizado</em>' : ""}</div>`;
    const cap = `<h3>${esc(ev.title)}</h3>${past ? '<p class="cr-role">Concierto ya celebrado</p>' : ""}
      ${rows.length ? `<ul class="cr-info">${rows.map((r) => `<li><small>${r[0]}</small><span>${esc(r[1])}</span></li>`).join("")}</ul>` : ""}
      ${ev.note ? `<p class="cr-bio">${esc(ev.note)}</p>` : ""}
      ${tk ? `<a class="btn sm" href="${esc(tk)}" target="_blank" rel="noopener">Comprar entradas</a>` : ""}`;
    return { cls: "ficha" + (past ? " past" : ""), tilt: 12, html: frame(past ? "Directo · pasado" : "Directo · " + pad(i + 1) + "/" + pad(n), media, cap) };
  }

  const BUILD = {
    m(m, i, n) {
      return { cls: "", tilt: 16, html: frame(`Nº ${pad(i + 1)} / ${pad(n)}`,
        `<div class="cr-photo"><img src="${esc(safe(m.photo_url) || "images/cartel.jpg")}" alt="${esc(m.name)}">${STAR}</div>`,
        `<h3>${esc(m.name)}</h3>${m.role ? `<p class="cr-role">${esc(m.role)}</p>` : ""}${m.bio ? `<p class="cr-bio">${esc(m.bio)}</p>` : ""}`) };
    },
    p(p, i, n) {
      return { cls: "foto", tilt: 10, html: frame(`Foto ${pad(i + 1)} / ${pad(n)}`,
        `<div class="cr-photo free"><img src="${esc(safe(p.url))}" alt="${esc(p.caption || "Foto de Max Estrella")}">${STAR}</div>`,
        `${p.caption ? `<h3>${esc(p.caption)}</h3>` : ""}${p.category ? `<p class="cr-role">${esc(p.category)}</p>` : ""}`) };
    },
    v(v, i, n) {
      const p = parseVideo(v.url), t = esc(v.title || "Vídeo"), u = esc(safe(v.url));
      let cls = "wide", media, extra = "";
      if (p.kind === "youtube") media = `<div class="cr-photo cr-video"><iframe src="https://www.youtube-nocookie.com/embed/${p.id}?autoplay=1&rel=0" title="${t}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
      else if (p.kind === "instagram") { cls = "tall"; media = `<div class="cr-photo cr-video ig"><iframe class="ig-embed" scrolling="no" src="https://www.instagram.com/reel/${p.id}/embed" title="${t}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe></div>`; }
      else if (p.kind === "tiktok") { cls = "tall"; media = `<div class="cr-photo cr-video"><iframe src="https://www.tiktok.com/embed/v2/${p.id}" title="${t}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe></div>`; }
      else if (p.kind === "mp4") media = `<div class="cr-photo free"><video src="${u}" controls autoplay playsinline></video></div>`;
      else {
        media = `<div class="cr-photo cr-video">${vThumb(v, p)}${STAR}</div>`;
        extra = p.kind === "link" && u ? `<a class="btn sm" href="${u}" target="_blank" rel="noopener">Abrir enlace</a>` : `<p class="cr-bio">Vídeo de ejemplo: añade el tuyo desde el panel de administración.</p>`;
      }
      return { cls, tilt: 6, html: frame(`Vídeo ${pad(i + 1)} / ${pad(n)}`, media, `<h3>${esc(v.title || "")}</h3><p class="cr-role">${PLAT[p.kind]}</p>${extra}`) };
    },
    n(nw, i, n) {
      const img = nw.image_url && safe(nw.image_url);
      return { cls: "noti", tilt: 8, html: frame(esc(fmtDate(nw.published_at)),
        img ? `<div class="cr-photo news"><img src="${esc(img)}" alt="">${STAR}</div>` : "",
        `<h3>${esc(nw.title)}</h3><div class="cr-text">${esc(nw.body || "")}</div>`) };
    },
    u: (ev, i, n) => fichaEvento(ev, i, n, false),
    e: (ev, i, n) => fichaEvento(ev, i, n, true)
  };

  function openCromo(k, i) {
    const L = LIST[k](); if (!L.length) return;
    const idx = (i + L.length) % L.length;
    CUR.k = k; CUR.i = idx;
    const b = BUILD[k](L[idx], idx, L.length);
    openModal(`<div class="cromo-wrap">
      <div class="cromo ${b.cls}" id="cromo">${b.html}</div>
      ${L.length > 1 ? `<div class="cr-nav"><button data-cr="-1" aria-label="Anterior">‹</button><span>${pad(idx + 1)} / ${pad(L.length)}</span><button data-cr="1" aria-label="Siguiente">›</button></div>` : ""}
    </div>`);
    igH = 0;
    if ($("#cromo iframe")) $("#cromo").classList.add("nofx");
    else tilt($("#cromo"), b.tilt);
    fitCromo();
  }

  /* Los cromos verticales (Instagram, TikTok) se reducen para caber en la pantalla, sin barras de desplazamiento */
  function fitCromo() {
    const c = $("#cromo"); if (!c) return;
    c.style.zoom = "";
    if (!c.classList.contains("tall")) return;
    const nv = $(".cr-nav", mbody);
    const avail = innerHeight * 0.96 - 28 - 14 - (nv ? nv.offsetHeight + 20 : 0);
    const h = c.offsetHeight;
    if (h > avail) c.style.zoom = Math.max(0.45, avail / h).toFixed(3);
  }
  addEventListener("resize", fitCromo);

  /* Instagram avisa de la altura real de su contenido: el iframe se ajusta y desaparece la barra interior */
  let igH = 0;
  addEventListener("message", (e) => {
    if (e.origin !== "https://www.instagram.com") return;
    let d = e.data;
    if (typeof d === "string") { try { d = JSON.parse(d); } catch (_) { return; } }
    if (!d || d.type !== "MEASURE" || !d.details || !d.details.height) return;
    const f = $("iframe.ig-embed"), h = Math.ceil(d.details.height);
    if (!f || f.contentWindow !== e.source || Math.abs(h - igH) < 3) return; // ignora avisos repetidos
    igH = h; f.style.height = h + "px"; fitCromo();
  });

  /* ---------- conciertos ---------- */
  function evParts(e) {
    const [y, m, d] = e.date.split("-").map(Number);
    return { y, m, d, wd: cap1(new Date(y, m - 1, d).toLocaleDateString("es-ES", { weekday: "long" })) };
  }
  function evHTML(e, past, i) {
    const { y, m, d, wd } = evParts(e);
    const place = [e.venue, e.city].filter(Boolean).join(" · ");
    const tk = past ? "" : safe(e.ticket_url);
    return `<li class="event${past ? " past" : ""} reveal" data-g="${past ? "e" : "u"}" data-i="${i}" role="button" tabindex="0" aria-label="Ver ficha: ${esc(e.title)}">
      <div class="ev-date"><b>${d}</b><span>${MONTHS[m - 1]} ${y}</span></div>
      <div class="ev-info"><small>${esc(wd)}</small><h3>${esc(e.title)}</h3><p>${esc(place)}</p>${e.note ? `<p class="ev-note">${esc(e.note)}</p>` : ""}</div>
      <div class="ev-act">${tk ? `<a class="btn sm" href="${esc(tk)}" target="_blank" rel="noopener">Entradas</a>` : ""}${past ? '<span class="ev-stamp">Finalizado</span>' : ""}</div>
    </li>`;
  }
  let UP = [], PAST = [], pastShown = 0;
  function morePast() {
    const s = PAST.slice(pastShown, pastShown + 4);
    $("#past").insertAdjacentHTML("beforeend", s.map((e, k) => evHTML(e, true, pastShown + k)).join(""));
    pastShown += s.length;
    $("#past-more").hidden = pastShown >= PAST.length;
    reveal($("#past"));
  }
  $("#past-more").addEventListener("click", morePast);
  function evOpen(e) {
    const li = e.target.closest("li.event");
    if (!li || e.target.closest("a")) return;
    openCromo(li.dataset.g, +li.dataset.i);
  }
  for (const id of ["#events", "#past"]) {
    $(id).addEventListener("click", evOpen);
    $(id).addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches("li.event")) { e.preventDefault(); evOpen(e); }
    });
  }
  function renderEvents(events) {
    const today = localToday();
    UP = events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    PAST = events.filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date));
    $("#events").innerHTML = UP.map((e, i) => evHTML(e, false, i)).join("");
    $("#events-empty").hidden = UP.length > 0;
    const ns = $("#next-show");
    if (UP.length) {
      const e = UP[0], { m, d } = evParts(e);
      ns.innerHTML = `<b>Próximo directo</b> ${d} ${MONTHS[m - 1]} · ${esc(e.venue || e.title)} →`;
      ns.hidden = false;
    }
    pastShown = 0; $("#past").innerHTML = ""; morePast();
    $("#past-wrap").hidden = !PAST.length;
  }

  /* ---------- música (Spotify) ---------- */
  let TRK = [], spApi = null, tAll = false;
  const TPREV = 4;                       // canciones que se ven en la franja resumen
  const PLAYSVG = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
  function renderTracks() {
    const g = $("#tgrid"), list = tAll ? TRK : TRK.slice(0, TPREV);
    g.innerHTML = list.map((t, i) => {
      const sp = parseSpotify(t.spotify_url), name = t.title || (sp ? "Escuchar en Spotify" : t.title || "");
      return `<article class="tc reveal" data-i="${i}">
        <button class="tc-btn" type="button" aria-label="Reproducir: ${esc(name)}" ${sp ? "" : "disabled"}>
          <span class="tc-cover"><span class="tc-ph">★</span></span>
        </button>
        <div class="tc-meta">
          <div class="tc-row"><h3>${esc(name)}</h3><button class="tc-go" type="button" aria-label="Reproducir: ${esc(name)}" ${sp ? "" : "disabled"}>${PLAYSVG}</button></div>
          <p>${t.description ? esc(t.description) : sp ? "Spotify" : "Próximamente"}</p>
          <button class="tc-close" type="button">Cerrar reproductor</button>
        </div>
      </article>`;
    }).join("");
    reveal(g);
    // carátula y nombre oficiales desde Spotify
    list.forEach((t, i) => {
      if (!parseSpotify(t.spotify_url)) return;
      spotifyMeta(t.spotify_url).then((m) => {
        if (!m) return;
        const card = g.querySelector(`.tc[data-i="${i}"]`); if (!card) return;
        if (m.thumb && safe(m.thumb)) card.querySelector(".tc-cover").innerHTML = `<img src="${esc(safe(m.thumb))}" alt="Carátula de ${esc(t.title || m.title || "la canción")}" loading="lazy">`;
        if (!t.title && m.title) { card.querySelector("h3").textContent = m.title; card.querySelectorAll(".tc-btn,.tc-go").forEach((b) => b.setAttribute("aria-label", "Reproducir: " + m.title)); }
      });
    });
  }
  $("#tmore").addEventListener("click", (e) => {
    tAll = !tAll; renderTracks();
    e.currentTarget.innerHTML = (tAll ? "Ver menos" : "Ver toda la música") + ' <span aria-hidden="true">→</span>';
  });
  function loadSpApi() {
    if (spApi) return spApi;
    spApi = new Promise((res, rej) => {
      window.onSpotifyIframeApiReady = (api) => res(api);
      const sc = document.createElement("script"); sc.src = "https://open.spotify.com/embed/iframe-api/v1"; sc.async = true;
      sc.onerror = () => rej(new Error("spotify api"));
      document.head.appendChild(sc);
      setTimeout(() => rej(new Error("timeout")), 6000);
    });
    spApi.catch(() => { spApi = null; });
    return spApi;
  }
  function stopTrack() {
    const c = $(".tc.playing"); if (!c) return;
    c.classList.remove("playing"); c.querySelector(".tc-player")?.remove();
  }
  function playTrack(card) {
    const sp = parseSpotify(TRK[+card.dataset.i]?.spotify_url); if (!sp || card.classList.contains("playing")) return;
    stopTrack();
    card.classList.add("playing");
    const holder = document.createElement("div"); holder.className = "tc-player";
    const target = document.createElement("div"); holder.appendChild(target); card.prepend(holder);
    const fallback = () => { holder.innerHTML = `<iframe src="${esc(sp.embed)}" width="100%" height="${sp.height}" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Reproductor de Spotify"></iframe>`; };
    loadSpApi().then((api) => api.createController(target, { uri: sp.uri, width: "100%", height: sp.height }, (ctrl) => { ctrl.addListener("ready", () => ctrl.play()); })).catch(fallback);
  }
  $("#tgrid").addEventListener("click", (e) => {
    const card = e.target.closest(".tc"); if (!card) return;
    if (e.target.closest(".tc-close")) return stopTrack();
    if (e.target.closest(".tc-btn, .tc-go")) playTrack(card);
  });

  /* ---------- vídeos ---------- */
  const PLAT = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok", mp4: "Vídeo", link: "Enlace", demo: "Próximamente" };
  let VIDS = [], vShown = 0;
  const VPAGE = 6;
  function vThumb(v, p) {
    if (v.poster_url && safe(v.poster_url)) return `<img src="${esc(safe(v.poster_url))}" alt="" loading="lazy">`;
    if (p.kind === "youtube") return `<img src="https://i.ytimg.com/vi/${p.id}/hqdefault.jpg" alt="" loading="lazy">`;
    if (p.kind === "mp4") return `<video src="${esc(safe(v.url))}#t=0.8" preload="metadata" muted playsinline></video>`;
    return `<div class="vph">${PLAT[p.kind]}</div>`;
  }
  function renderVideos() {
    const g = $("#vgrid");
    const slice = VIDS.slice(vShown, vShown + VPAGE);
    g.insertAdjacentHTML("beforeend", slice.map((v, k) => {
      const i = vShown + k, p = parseVideo(v.url);
      return `<button class="cc vc reveal" data-i="${i}" aria-label="Ver vídeo: ${esc(v.title || "vídeo")}">
        <div class="vt">${vThumb(v, p)}</div>
        ${v.featured ? '<i class="cc-star" title="Destacado">★</i>' : ""}
        <span class="mhint">Ver vídeo</span>
        <span class="vplay"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>
        <div class="cc-meta"><h3>${esc(v.title || "")}</h3><p class="cc-pill">${PLAT[p.kind]}</p></div>
      </button>`;
    }).join(""));
    vShown += slice.length;
    $("#vmore").hidden = vShown >= VIDS.length;
    reveal(g);
  }
  function renderVHero() {
    const b = $("#vhero"), v = VIDS[0];
    if (!v) { b.hidden = true; return; }
    const p = parseVideo(v.url);
    const src = (v.poster_url && safe(v.poster_url)) || (p.kind === "youtube" ? `https://i.ytimg.com/vi/${p.id}/hqdefault.jpg` : "images/escenario.jpg");
    b.innerHTML = `<img src="${esc(src)}" alt=""><span class="vplay"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>`;
    b.setAttribute("aria-label", "Ver vídeo: " + (v.title || "destacado"));
  }
  $("#vhero").addEventListener("click", () => openCromo("v", 0));
  $("#vgrid").addEventListener("click", (e) => { const b = e.target.closest(".cc"); if (b) openCromo("v", +b.dataset.i); });
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
    $("#masonry").insertAdjacentHTML("beforeend", slice.map((p, k) => {
      const meta = p.caption || p.category;
      return `<button class="cc ph${meta ? "" : " nometa"} reveal" data-i="${phShown + k}" aria-label="Ver foto${p.caption ? ": " + esc(p.caption) : ""}">
        <img src="${esc(safe(p.url))}" alt="${esc(p.caption || "Foto de Max Estrella")}" loading="lazy">
        <span class="mhint">Ver foto</span>
        ${meta ? `<div class="cc-meta">${p.caption ? `<h3>${esc(p.caption)}</h3>` : ""}${p.category ? `<p class="cc-pill">${esc(p.category)}</p>` : ""}</div>` : ""}
      </button>`;
    }).join(""));
    phShown += slice.length;
    $("#pmore").hidden = phShown >= phView.length;
    reveal($("#masonry"));
  }
  function renderPrev() {
    $("#pprev").innerHTML = PH.slice(0, 3).map((p, i) => `<button class="pv" data-i="${i}" aria-label="Ver foto${p.caption ? ": " + esc(p.caption) : ""}"><img src="${esc(safe(p.url))}" alt="${esc(p.caption || "Foto de Max Estrella")}" loading="lazy"></button>`).join("");
  }
  $("#pprev").addEventListener("click", (e) => {
    const b = e.target.closest(".pv"); if (!b) return;
    if (phView !== PH) { phCat = "Todas"; renderChips(); resetPhotos(); }   // el visor usa la lista completa
    openCromo("p", +b.dataset.i);
  });
  $("#chips").addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    phCat = b.dataset.c; renderChips(); resetPhotos();
  });
  $("#pmore").addEventListener("click", morePhotos);
  $("#masonry").addEventListener("click", (e) => { const b = e.target.closest(".cc"); if (b) openCromo("p", +b.dataset.i); });

  /* ---------- noticias ---------- */
  let NEWS = [], nShown = 0;
  function renderNews() {
    const g = $("#ngrid");
    const slice = NEWS.slice(nShown, nShown + 6);
    g.insertAdjacentHTML("beforeend", slice.map((n, k) => {
      const ex = (n.body || "").replace(/\s+/g, " ").slice(0, 100);
      const img = n.image_url && safe(n.image_url);
      return `<button class="cc nc reveal" data-i="${nShown + k}" aria-label="Leer noticia: ${esc(n.title)}">
        <div class="vt">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : '<div class="nc-ph">★</div>'}</div>
        <div class="nc-body"><time>${esc(fmtDate(n.published_at))}</time><h3>${esc(n.title)}</h3>${ex ? `<p class="nc-ex">${esc(ex)}${(n.body || "").length > 100 ? "…" : ""}</p>` : ""}<span class="nc-rm">Leer más →</span></div>
      </button>`;
    }).join(""));
    nShown += slice.length;
    $("#nmore").hidden = nShown >= NEWS.length;
    $("#news-empty").hidden = NEWS.length > 0;
    reveal(g);
  }
  $("#ngrid").addEventListener("click", (e) => { const b = e.target.closest(".cc"); if (b) openCromo("n", +b.dataset.i); });
  $("#nmore").addEventListener("click", renderNews);

  /* ---------- banda ---------- */
  let MEM = [];
  function renderMembers(ms) {
    MEM = ms;
    $("#mgrid").innerHTML = ms.map((m, i) => `<button class="cc mc reveal" data-i="${i}" aria-label="Ver la ficha de ${esc(m.name)}"><img src="${esc(safe(m.photo_url) || "images/cartel.jpg")}" alt="${esc(m.name)}" loading="lazy"><span class="mhint">Ver ficha</span><div class="cc-meta"><h3>${esc(m.name)}</h3>${m.role ? `<p class="cc-pill">${esc(m.role)}</p>` : ""}</div></button>`).join("");
  }
  $("#mgrid").addEventListener("click", (e) => { const b = e.target.closest(".cc"); if (b) openCromo("m", +b.dataset.i); });

  /* ---------- contacto / redes ---------- */
  const ICON = {
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".7" fill="currentColor"/>',
    youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.4v5.2l4.4-2.6z" fill="currentColor"/>',
    tiktok: '<path d="M14 3v11.2a3.6 3.6 0 1 1-3.6-3.6"/><path d="M14 3c.3 2.5 1.9 4.1 4.5 4.3"/>',
    facebook: '<path d="M14.5 21v-8h2.6l.4-3h-3V8.1c0-.9.3-1.5 1.6-1.5h1.5V3.9c-.3 0-1.2-.1-2.2-.1-2.3 0-3.800 1.400-3.800 3.900V10H8.500v3h2.600v8z"/>',
    spotify: '<circle cx="12" cy="12" r="9"/><path d="M7 9.6c3.6-1 7.200-.7 10.200 1.100M7.700 12.900c2.900-.8 5.700-.5 8.100 1M8.400 15.900c2.200-.6 4.300-.4 6.200.7"/>'
  };
  const SOCIAL = { instagram: "Instagram", youtube: "YouTube", tiktok: "TikTok", facebook: "Facebook", spotify: "Spotify" };
  function renderSettings(S) {
    if (S.hero_tagline) $("#tagline").textContent = S.hero_tagline;
    $("#bio").textContent = S.bio || "";
    const links = Object.keys(SOCIAL).filter((k) => safe(S[k])).map((k) => `<a href="${esc(safe(S[k]))}" target="_blank" rel="noopener">${SOCIAL[k]}</a>`).join("");
    $("#social").innerHTML = links; $("#social-foot").innerHTML = links;
    const icons = Object.keys(SOCIAL).filter((k) => safe(S[k])).map((k) => `<a href="${esc(safe(S[k]))}" target="_blank" rel="noopener" aria-label="${SOCIAL[k]}" title="${SOCIAL[k]}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg></a>`).join("");
    $("#social-nav").innerHTML = icons; $("#social-nav").hidden = !icons;
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

  /* ---------- botones "ver todo": despliegan la lista completa debajo de la franja ---------- */
  function toggler(btn, panel, openTxt, closeTxt) {
    const b = $(btn), p = $(panel);
    b.addEventListener("click", () => {
      const show = p.hidden; p.hidden = !show;
      b.setAttribute("aria-expanded", show);
      b.innerHTML = (show ? closeTxt : openTxt) + ' <span aria-hidden="true">→</span>';
      if (show) { reveal(p); p.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" }); }
    });
  }
  toggler("#vtoggle", "#vall", "Ver todos los vídeos", "Ocultar vídeos");
  toggler("#gtoggle", "#gall", "Ver galería", "Ocultar galería");
  toggler("#btoggle", "#ball", "Conoce a la banda", "Ocultar integrantes");

  /* ---------- carga ---------- */
  async function init() {
    reveal();
    const [events, tracks, videos, photos, news, members, S] = await Promise.all([M.get("events"), M.get("tracks"), M.get("videos"), M.get("photos"), M.get("news"), M.get("members"), M.settings()]);
    renderSettings(S);
    renderEvents(events);
    TRK = tracks;
    if (TRK.length) renderTracks(); else $("#tgrid").innerHTML = '<p class="empty">Muy pronto, música nueva.</p>';
    const spUrl = S.spotify && safe(S.spotify);
    $("#tmore").hidden = TRK.length <= TPREV;                 // más de 4 canciones: "Ver toda la música"
    if (spUrl) { $("#spotify-link").href = spUrl; $("#spotify-more").hidden = TRK.length > TPREV; }
    VIDS = videos; vShown = 0; $("#vgrid").innerHTML = "";
    if (VIDS.length) renderVideos(); else $("#vgrid").innerHTML = '<p class="empty">Muy pronto, vídeos nuevos.</p>';
    renderVHero();
    PH = photos; renderChips(); resetPhotos(); renderPrev();
    if (!PH.length) $("#pprev").innerHTML = $("#masonry").innerHTML = '<p class="empty">Muy pronto, fotos nuevas.</p>';
    NEWS = news; nShown = 0; $("#ngrid").innerHTML = ""; renderNews();
    renderMembers(members);
    reveal();
  }
  init();
})();