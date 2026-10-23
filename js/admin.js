(function () {
  const M = window.MAX, { sb, live, esc, parseVideo } = M;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const app = $("#app");

  function toast(msg, bad) {
    const t = $("#toast");
    t.textContent = msg; t.className = "toast show" + (bad ? " bad" : "");
    clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("show"), 3800);
  }
  const fmt = (d) => (d ? d.split("-").reverse().join("/") : "");
  const fmtTs = (iso) => new Date(iso).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });

  /* ---------- sin Supabase: pantalla de puesta en marcha ---------- */
  if (!live) {
    app.innerHTML = `<div class="center"><div class="card wide">
      <div class="brand">MAX <i>★</i> ESTRELLA</div>
      <h1>Panel de administración</h1>
      <p>El panel necesita conectarse a Supabase (la base de datos gratuita donde se guardan conciertos, noticias, fotos y vídeos). Todavía no está configurado:</p>
      <ol>
        <li>Crea un proyecto en <b>supabase.com</b>.</li>
        <li>En <code>SQL Editor</code> pega y ejecuta el archivo <code>supabase/schema.sql</code>.</li>
        <li>En <code>Authentication → Users</code> crea los usuarios de la banda (email y contraseña).</li>
        <li>Copia la <code>Project URL</code> y la clave <code>anon</code> en <code>js/config.js</code>.</li>
      </ol>
      <p>Si ya lo hiciste y ves esto, comprueba la conexión a internet y que los dos datos estén bien pegados.</p>
      <a class="btn" href="index.html">Volver a la web</a>
    </div></div>`;
    return;
  }

  /* ---------- subida de archivos ---------- */
  async function resizeImage(file, max = 2000, q = 0.86) {
    if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
    try {
      const bmp = await createImageBitmap(file);
      const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", q));
      return blob || file;
    } catch (e) { return file; }
  }
  async function upload(blob, folder, ext) {
    const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await sb.storage.from("media").upload(name, blob, { cacheControl: "31536000", contentType: blob.type || undefined });
    if (error) throw error;
    return sb.storage.from("media").getPublicUrl(name).data.publicUrl;
  }
  async function uploadImage(file, folder) {
    const b = await resizeImage(file);
    const ext = b.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() || "png").toLowerCase();
    return upload(b, folder, ext);
  }
  async function removeStored(url) {
    const m = (url || "").match(/\/storage\/v1\/object\/public\/media\/(.+)$/);
    if (m) await sb.storage.from("media").remove([decodeURIComponent(m[1])]);
  }

  /* ---------- definición de secciones ---------- */
  const ENT = {
    events: {
      label: "Conciertos", table: "events", order: [["date", false]], files: [],
      fields: [
        { k: "date", l: "Fecha", t: "date", req: 1 },
        { k: "title", l: "Título", req: 1, ph: "Max Estrella en directo" },
        { k: "venue", l: "Sala o lugar", ph: "Sala Fun House" },
        { k: "city", l: "Ciudad y dirección", ph: "Madrid · C. Palafox, 8" },
        { k: "ticket_url", l: "Enlace de entradas", t: "url", help: "Opcional. Si lo dejas vacío no aparece el botón." },
        { k: "note", l: "Comentario (opcional)", t: "textarea", help: "Se muestra en la web debajo del concierto, también cuando ya haya pasado. Ej.: «Sala llena, gracias a todos»." }
      ],
      row: (r) => ({ t: r.title, s: `${fmt(r.date)} · ${[r.venue, r.city].filter(Boolean).join(" · ")}`, tag: r.date < new Date().toISOString().slice(0, 10) ? "pasado" : "" })
    },
    news: {
      label: "Noticias", table: "news", order: [["published_at", false]], files: ["image_url"],
      fields: [
        { k: "title", l: "Titular", req: 1 },
        { k: "body", l: "Texto de la noticia", t: "textarea", help: "Los saltos de línea se respetan." },
        { k: "image_url", l: "Foto (opcional)", t: "image", folder: "news" },
        { k: "published", l: "Visible en la web (desmarca para guardarla como borrador)", t: "check", def: true }
      ],
      row: (r) => ({ t: r.title, s: fmtTs(r.published_at), img: r.image_url, tag: r.published ? "" : "borrador" })
    },
    videos: {
      label: "Vídeos", table: "videos", order: [["featured", false], ["created_at", false]], files: ["url", "poster_url"],
      fields: [
        { k: "url", l: "Enlace del vídeo", t: "video", req: 1 },
        { k: "title", l: "Título", ph: "Directo en Fun House" },
        { k: "poster_url", l: "Miniatura (opcional)", t: "image", folder: "posters", help: "YouTube y los MP4 generan su miniatura solos; para Instagram y TikTok es recomendable subir una." },
        { k: "featured", l: "Destacado (aparece el primero y más grande)", t: "check" }
      ],
      row: (r) => ({ t: r.title || "(sin título)", s: r.url, img: r.poster_url || (parseVideo(r.url).kind === "youtube" ? `https://i.ytimg.com/vi/${parseVideo(r.url).id}/default.jpg` : ""), tag: r.featured ? "destacado" : "" })
    },
    photos: {
      label: "Fotos", table: "photos", order: [["sort", true], ["created_at", false]], files: ["url"], grid: true,
      fields: [
        { k: "caption", l: "Pie de foto", ph: "Concierto en Fun House" },
        { k: "category", l: "Categoría", ph: "Directos, Estudio, Banda…", help: "Las fotos con la misma categoría se pueden filtrar en la web." },
        { k: "sort", l: "Orden (número pequeño = antes)", t: "number", def: 0 }
      ]
    },
    members: {
      label: "La banda", table: "members", order: [["sort", true]], files: ["photo_url"],
      fields: [
        { k: "name", l: "Nombre", req: 1 },
        { k: "role", l: "Instrumento / papel", ph: "Voz y guitarra" },
        { k: "bio", l: "Leyenda de la ficha", t: "textarea", help: "Frase corta que aparece en la tarjeta al pulsar su foto en la web." },
        { k: "photo_url", l: "Foto", t: "image", folder: "members" },
        { k: "sort", l: "Orden (número pequeño = antes)", t: "number", def: 0 }
      ],
      row: (r) => ({ t: r.name, s: r.role || "", img: r.photo_url })
    }
  };
  const SETTINGS = [
    { k: "hero_tagline", l: "Frase de la portada" },
    { k: "bio", l: "Texto de «La banda»", t: "textarea" },
    { k: "contact_email", l: "Email de contacto", t: "email" },
    { k: "instagram", l: "Instagram (enlace)", t: "url" },
    { k: "youtube", l: "YouTube (enlace)", t: "url" },
    { k: "tiktok", l: "TikTok (enlace)", t: "url" },
    { k: "facebook", l: "Facebook (enlace)", t: "url" },
    { k: "spotify", l: "Spotify (enlace)", t: "url" }
  ];
  const TABS = [["events", "Conciertos"], ["news", "Noticias"], ["videos", "Vídeos"], ["photos", "Fotos"], ["members", "La banda"], ["inquiries", "Mensajes"], ["settings", "Ajustes"]];

  /* ---------- campos de formulario ---------- */
  function fieldHTML(f, v) {
    const id = "f_" + f.k, val = v ?? f.def ?? "";
    const help = f.help ? `<small>${esc(f.help)}</small>` : "";
    const req = f.req ? "required" : "";
    switch (f.t) {
      case "textarea":
        return `<div class="field"><label for="${id}">${esc(f.l)}</label><textarea id="${id}" data-k="${f.k}" ${req}>${esc(val)}</textarea>${help}</div>`;
      case "check":
        return `<div class="field"><label class="chk"><input type="checkbox" data-k="${f.k}" ${val === true || val === "true" ? "checked" : ""}> ${esc(f.l)}</label>${help}</div>`;
      case "image":
        return `<div class="field"><label>${esc(f.l)}</label>
          <div class="upl">${val ? `<img src="${esc(val)}" alt="" data-prev="${f.k}">` : `<img alt="" data-prev="${f.k}" hidden>`}
            <div><input type="file" accept="image/*" data-up="${f.k}" data-folder="${f.folder || "misc"}"><div class="st" data-st="${f.k}"></div></div></div>
          <input type="url" data-k="${f.k}" value="${esc(val)}" placeholder="…o pega aquí el enlace de una imagen">${help}</div>`;
      case "video":
        return `<div class="field"><label for="${id}">${esc(f.l)}</label>
          <input type="url" id="${id}" data-k="${f.k}" value="${esc(val)}" placeholder="Pega un enlace de YouTube, Instagram o TikTok" ${req}>
          <small data-det="${f.k}"></small>
          <div class="upl"><div><input type="file" accept="video/mp4,video/webm,video/quicktime" data-upvid="${f.k}"><div class="st" data-st="${f.k}">…o sube un archivo MP4 (máximo 50 MB en el plan gratuito).</div></div></div>${help}</div>`;
      default:
        return `<div class="field"><label for="${id}">${esc(f.l)}</label><input type="${f.t || "text"}" id="${id}" data-k="${f.k}" value="${esc(val)}" placeholder="${esc(f.ph || "")}" ${req}>${help}</div>`;
    }
  }
  function wireFields(form) {
    const det = () => $$("[data-det]", form).forEach((s) => {
      const inp = $(`[data-k="${s.dataset.det}"]`, form), p = parseVideo(inp.value);
      const names = { youtube: "✔ Detectado: vídeo de YouTube", instagram: "✔ Detectado: reel/post de Instagram", tiktok: "✔ Detectado: vídeo de TikTok", mp4: "✔ Detectado: archivo de vídeo", link: "⚠ Enlace no reconocido: se abrirá en una pestaña nueva", demo: "" };
      s.textContent = names[p.kind] || "";
    });
    $$("[data-det]", form).forEach((s) => $(`[data-k="${s.dataset.det}"]`, form).addEventListener("input", det)); det();
    $$("[data-up]", form).forEach((inp) => inp.addEventListener("change", async () => {
      const f = inp.files[0]; if (!f) return;
      const st = $(`[data-st="${inp.dataset.up}"]`, form); st.textContent = "Subiendo…";
      try {
        const url = await uploadImage(f, inp.dataset.folder);
        $(`[data-k="${inp.dataset.up}"]`, form).value = url;
        const pv = $(`[data-prev="${inp.dataset.up}"]`, form); pv.src = url; pv.hidden = false;
        st.textContent = "✔ Imagen subida";
      } catch (e) { st.textContent = "Error: " + (e.message || e); toast("No se pudo subir la imagen", true); }
    }));
    $$("[data-upvid]", form).forEach((inp) => inp.addEventListener("change", async () => {
      const f = inp.files[0]; if (!f) return;
      const st = $(`[data-st="${inp.dataset.upvid}"]`, form);
      if (f.size > 50 * 1024 * 1024) { st.textContent = "Ese archivo pesa más de 50 MB. Súbelo a YouTube y pega el enlace."; return; }
      st.textContent = "Subiendo vídeo… (puede tardar)";
      try {
        const ext = (f.name.split(".").pop() || "mp4").toLowerCase();
        const url = await upload(f, "videos", ext);
        const t = $(`[data-k="${inp.dataset.upvid}"]`, form); t.value = url; t.dispatchEvent(new Event("input"));
        st.textContent = "✔ Vídeo subido";
      } catch (e) { st.textContent = "Error: " + (e.message || e); toast("No se pudo subir el vídeo", true); }
    }));
  }
  function gather(form, fields) {
    const o = {};
    for (const f of fields) {
      const el = $(`[data-k="${f.k}"]`, form); if (!el) continue;
      if (f.t === "check") o[f.k] = el.checked;
      else if (f.t === "number") o[f.k] = el.value === "" ? 0 : Number(el.value);
      else { const v = el.value.trim(); o[f.k] = v === "" ? (f.req ? "" : null) : v; }
    }
    return o;
  }

  /* ---------- sesión ---------- */
  let user = null, tab = "events", main = null;
  sb.auth.onAuthStateChange((ev, session) => {
    const u = session?.user || null;
    setTimeout(() => {
      if (ev === "PASSWORD_RECOVERY") { user = u; return recoveryScreen(); }
      if ((u && u.id) === (user && user.id) && app.innerHTML) return;
      user = u; user ? dash() : login();
    }, 0);
  });
  sb.auth.getSession().then(({ data }) => { if (!data.session && !app.innerHTML) login(); });

  function login() {
    app.innerHTML = `<div class="center"><form class="card" id="lf">
      <div class="brand">MAX <i>★</i> ESTRELLA</div>
      <h1>Acceso de la banda</h1><p>Entra con tu email y contraseña.</p>
      <div class="field"><label for="le">Email</label><input type="email" id="le" required autocomplete="username"></div>
      <div class="field" style="margin-top:14px"><label for="lp">Contraseña</label><input type="password" id="lp" required autocomplete="current-password"></div>
      <p class="err" id="lerr"></p>
      <div class="fbar"><button class="btn" type="submit">Entrar</button><button class="btn ghost" type="button" id="forgot">He olvidado la contraseña</button><a class="btn ghost" href="index.html">Volver a la web</a></div>
    </form></div>`;
    $("#lf").addEventListener("submit", async (e) => {
      e.preventDefault(); $("#lerr").textContent = "";
      const { error } = await sb.auth.signInWithPassword({ email: $("#le").value.trim(), password: $("#lp").value });
      if (error) $("#lerr").textContent = error.message.includes("Invalid") ? "Email o contraseña incorrectos." : error.message;
    });
    $("#forgot").addEventListener("click", async () => {
      const em = $("#le").value.trim();
      if (!em) { $("#lerr").textContent = "Escribe primero tu email."; return; }
      const { error } = await sb.auth.resetPasswordForEmail(em, { redirectTo: location.href.split("#")[0] });
      $("#lerr").textContent = error ? error.message : "Te hemos enviado un email para crear una contraseña nueva.";
    });
  }
  function recoveryScreen() {
    app.innerHTML = `<div class="center"><form class="card" id="rf"><div class="brand">MAX <i>★</i> ESTRELLA</div><h1>Nueva contraseña</h1>
      <div class="field"><label for="np">Contraseña nueva (mínimo 8 caracteres)</label><input type="password" id="np" minlength="8" required autocomplete="new-password"></div>
      <p class="err" id="rerr"></p><div class="fbar"><button class="btn" type="submit">Guardar y entrar</button></div></form></div>`;
    $("#rf").addEventListener("submit", async (e) => {
      e.preventDefault();
      const { error } = await sb.auth.updateUser({ password: $("#np").value });
      if (error) $("#rerr").textContent = error.message; else { toast("Contraseña actualizada"); dash(); }
    });
  }

  /* ---------- panel ---------- */
  function dash() {
    app.innerHTML = `<div class="shell">
      <aside class="side"><div class="brand">MAX <i>★</i> ESTRELLA</div>
        ${TABS.map(([k, l]) => `<button class="tab${k === tab ? " on" : ""}" data-tab="${k}">${l}${k === "inquiries" ? ' <span class="badge" id="qcount" hidden></span>' : ""}</button>`).join("")}
        <div class="grow"></div>
        <a class="view" href="index.html" target="_blank">Ver la web ↗</a>
        <div class="who">${esc(user?.email || "")}</div>
        <button class="tab" id="out">Salir</button>
      </aside><section class="main" id="main"></section></div>`;
    main = $("#main");
    $$(".tab[data-tab]").forEach((b) => b.addEventListener("click", () => { tab = b.dataset.tab; $$(".tab[data-tab]").forEach((x) => x.classList.toggle("on", x === b)); route(); }));
    $("#out").addEventListener("click", () => sb.auth.signOut());
    refreshBadge();
    route();
  }
  function route() {
    closeInq(true);
    if (tab === "settings") return settingsView();
    if (tab === "inquiries") return inquiriesView();
    if (tab === "photos") return photosView();
    return listView(tab);
  }
  const fail = (e) => { console.error(e); toast("Error: " + (e.message || e), true); };

  /* ---------- listado genérico ---------- */
  async function listView(key) {
    const E = ENT[key];
    main.innerHTML = `<div class="top"><h2>${E.label}</h2><button class="btn" id="new">＋ Añadir</button></div><div id="l"><p class="empty">Cargando…</p></div>`;
    $("#new").addEventListener("click", () => formView(key, null));
    let q = sb.from(E.table).select("*"); E.order.forEach(([c, a]) => (q = q.order(c, { ascending: a })));
    const { data, error } = await q; if (error) return fail(error);
    const box = $("#l");
    if (!data.length) { box.innerHTML = `<p class="empty">Aún no hay nada aquí. Pulsa «Añadir» para crear el primero.</p>`; return; }
    box.className = "list";
    box.innerHTML = data.map((r) => { const o = E.row(r); return `<div class="row">
      ${o.img ? `<img class="thumb" src="${esc(o.img)}" alt="">` : `<div class="thumb ph">★</div>`}
      <div><div class="t">${esc(o.t)}${o.tag ? ` <span class="tag ${o.tag === "borrador" ? "draft" : o.tag === "destacado" ? "star" : ""}">${esc(o.tag)}</span>` : ""}</div><div class="s">${esc(o.s || "")}</div></div>
      <div class="acts"><button class="btn ghost sm" data-e="${r.id}">Editar</button><button class="btn danger sm" data-d="${r.id}">Borrar</button></div></div>`; }).join("");
    const byId = Object.fromEntries(data.map((r) => [r.id, r]));
    box.addEventListener("click", (ev) => {
      const e = ev.target.closest("[data-e]"), d = ev.target.closest("[data-d]");
      if (e) formView(key, byId[e.dataset.e]);
      if (d) removeRow(key, byId[d.dataset.d]);
    });
  }
  async function removeRow(key, row) {
    if (!confirm("¿Borrar definitivamente? Esta acción no se puede deshacer.")) return;
    const E = ENT[key];
    const { error } = await sb.from(E.table).delete().eq("id", row.id); if (error) return fail(error);
    for (const c of E.files) await removeStored(row[c]).catch(() => {});
    toast("Borrado"); route();
  }
  function formView(key, row) {
    const E = ENT[key];
    main.innerHTML = `<div class="top"><h2>${row ? "Editar" : "Añadir"} · ${E.label}</h2></div>
      <form class="form" id="f">${E.fields.map((f) => fieldHTML(f, row ? row[f.k] : undefined)).join("")}
        <p class="err" id="ferr"></p>
        <div class="fbar"><button class="btn" type="submit">Guardar</button><button class="btn ghost" type="button" id="cancel">Cancelar</button></div></form>`;
    const form = $("#f"); wireFields(form);
    $("#cancel").addEventListener("click", route);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const o = gather(form, E.fields), miss = E.fields.find((f) => f.req && !o[f.k]);
      if (miss) { $("#ferr").textContent = `Falta rellenar: ${miss.l}`; return; }
      const btn = form.querySelector("button[type=submit]"); btn.disabled = true;
      const res = row ? await sb.from(E.table).update(o).eq("id", row.id) : await sb.from(E.table).insert(o);
      btn.disabled = false;
      if (res.error) return fail(res.error);
      if (row) for (const c of E.files) if (row[c] && c in o && row[c] !== o[c]) await removeStored(row[c]).catch(() => {});
      toast("Guardado ✔"); route();
    });
  }

  /* ---------- fotos (subida múltiple) ---------- */
  async function photosView() {
    const E = ENT.photos;
    main.innerHTML = `<div class="top"><h2>Fotos</h2></div>
      <p class="hint">Arrastra aquí todas las fotos que quieras. Se reducen automáticamente a un tamaño ideal para la web (así no se llena el almacenamiento).</p>
      <div class="drop" id="drop"><b>Arrastra fotos aquí</b> o
        <div class="ctl"><input type="file" id="pf" accept="image/*" multiple>
        <input type="text" id="pc" list="cats" placeholder="Categoría (opcional)"><datalist id="cats"></datalist>
        <button class="btn" id="pgo">Subir fotos</button></div>
        <div class="bar" id="pbar" hidden><i></i></div><p class="st" id="pst"></p></div>
      <div id="pl"><p class="empty">Cargando…</p></div>`;
    let files = [];
    const drop = $("#drop");
    ["dragover", "dragenter"].forEach((n) => drop.addEventListener(n, (e) => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach((n) => drop.addEventListener(n, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", (e) => { files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/")); $("#pst").textContent = `${files.length} foto(s) listas. Pulsa «Subir fotos».`; });
    $("#pf").addEventListener("change", (e) => { files = [...e.target.files]; $("#pst").textContent = `${files.length} foto(s) listas.`; });
    $("#pgo").addEventListener("click", async () => {
      if (!files.length) { $("#pst").textContent = "Elige primero alguna foto."; return; }
      const cat = $("#pc").value.trim() || null, bar = $("#pbar"), fill = $("i", bar); bar.hidden = false; $("#pgo").disabled = true;
      let ok = 0;
      for (let i = 0; i < files.length; i++) {
        $("#pst").textContent = `Subiendo ${i + 1} de ${files.length}…`;
        try {
          const url = await uploadImage(files[i], "photos");
          const { error } = await sb.from("photos").insert({ url, category: cat, caption: null, sort: 0 });
          if (error) throw error; ok++;
        } catch (e) { console.error(e); toast(`Falló «${files[i].name}»`, true); }
        fill.style.width = ((i + 1) / files.length) * 100 + "%";
      }
      $("#pgo").disabled = false; files = []; toast(`${ok} foto(s) subidas ✔`); photosView();
    });
    const { data, error } = await sb.from("photos").select("*").order("sort", { ascending: true }).order("created_at", { ascending: false });
    if (error) return fail(error);
    $("#cats").innerHTML = [...new Set(data.map((p) => p.category).filter(Boolean))].map((c) => `<option value="${esc(c)}">`).join("");
    const pl = $("#pl");
    if (!data.length) { pl.innerHTML = `<p class="empty">Todavía no hay fotos.</p>`; return; }
    pl.className = "pgrid";
    pl.innerHTML = data.map((p) => `<div class="pcell"><img src="${esc(p.url)}" alt="" loading="lazy"><div class="pi"><b>${esc(p.caption || "(sin pie)")}</b><span>${esc(p.category || "sin categoría")}</span></div>
      <div class="acts"><button class="btn ghost sm" data-e="${p.id}">Editar</button><button class="btn danger sm" data-d="${p.id}">Borrar</button></div></div>`).join("");
    const byId = Object.fromEntries(data.map((r) => [r.id, r]));
    pl.addEventListener("click", (ev) => {
      const e = ev.target.closest("[data-e]"), d = ev.target.closest("[data-d]");
      if (e) formView("photos", byId[e.dataset.e]);
      if (d) removeRow("photos", byId[d.dataset.d]);
    });
  }

  /* ---------- ajustes ---------- */
  async function settingsView() {
    main.innerHTML = `<div class="top"><h2>Ajustes</h2></div><p class="hint">Textos y enlaces generales de la web.</p><p class="empty">Cargando…</p>`;
    const { data, error } = await sb.from("settings").select("*"); if (error) return fail(error);
    const S = Object.fromEntries(data.map((r) => [r.key, r.value]));
    main.innerHTML = `<div class="top"><h2>Ajustes</h2></div><p class="hint">Textos y enlaces generales de la web. Deja vacío lo que no quieras mostrar (por ejemplo, una red social).</p>
      <form class="form" id="sf">${SETTINGS.map((f) => fieldHTML(f, S[f.k] || "")).join("")}<p class="err" id="ferr"></p><div class="fbar"><button class="btn" type="submit">Guardar ajustes</button></div></form>`;
    $("#sf").addEventListener("submit", async (e) => {
      e.preventDefault();
      const o = gather(e.target, SETTINGS);
      const rows = SETTINGS.map((f) => ({ key: f.k, value: o[f.k] || "" }));
      const { error: er } = await sb.from("settings").upsert(rows); if (er) return fail(er);
      toast("Ajustes guardados ✔");
    });
  }

  /* ---------- mensajes de contratación ---------- */
  let INQ = [], VIEW = [], NAV = [], inqFilter = "all", curId = null, TPL = "";
  const DRAFTS = {};
  const isNew = (r) => r.read !== true;
  const byId = (id) => INQ.find((r) => String(r.id) === String(id));
  const FILTERS = [["all", "Todos"], ["new", "Sin leer"], ["replied", "Respondidos"]];
  const inFilter = (r, k) => (k === "new" ? isNew(r) : k === "replied" ? !!r.replied_at : true);

  async function refreshBadge() {
    const { count, error } = await sb.from("inquiries").select("id", { count: "exact", head: true }).eq("read", false);
    const q = $("#qcount"); if (!q || error) return;
    q.textContent = count || ""; q.hidden = !count;
  }

  async function inquiriesView() {
    closeInq(true);
    main.innerHTML = `<div class="top"><h2>Mensajes</h2></div>
      <p class="hint">Solicitudes enviadas desde el formulario de contratación. Pulsa un mensaje para leerlo en grande y responder por email desde aquí.</p>
      <div class="mf" id="mf"></div><div id="l"><p class="empty">Cargando…</p></div>`;
    const { data, error } = await sb.from("inquiries").select("*").order("created_at", { ascending: false });
    if (error) return fail(error);
    INQ = data || [];
    $("#mf").addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (b) { inqFilter = b.dataset.f; renderInq(); } });
    $("#l").addEventListener("click", (e) => {
      const d = e.target.closest("[data-d]"); if (d) return delInq(d.dataset.d);
      const row = e.target.closest("[data-o]"); if (row) { NAV = VIEW.map((r) => r.id); openInq(row.dataset.o); }
    });
    $("#l").addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches(".row.msg")) { e.preventDefault(); NAV = VIEW.map((r) => r.id); openInq(e.target.dataset.o); }
    });
    renderInq(); refreshBadge();
  }

  function renderInq() {
    const box = $("#l"), mf = $("#mf"); if (!box || !mf) return;
    mf.innerHTML = FILTERS.map(([k, l]) => `<button class="mf-b${k === inqFilter ? " on" : ""}" data-f="${k}">${l} <span>${INQ.filter((r) => inFilter(r, k)).length}</span></button>`).join("");
    VIEW = INQ.filter((r) => inFilter(r, inqFilter));
    if (!INQ.length) { box.className = ""; box.innerHTML = `<p class="empty">No hay mensajes todavía.</p>`; return; }
    if (!VIEW.length) { box.className = ""; box.innerHTML = `<p class="empty">No hay mensajes en este filtro.</p>`; return; }
    box.className = "list";
    box.innerHTML = VIEW.map((r) => `<div class="row msg${isNew(r) ? " unread" : ""}" data-o="${r.id}" tabindex="0" role="button" aria-label="Abrir mensaje de ${esc(r.name)}">
      <div class="thumb ph">${isNew(r) ? "●" : "✉"}</div>
      <div><div class="t">${esc(r.name)} <span class="tag">${esc(r.kind || "")}</span>${isNew(r) ? ' <span class="tag star">nuevo</span>' : ""}${r.replied_at ? ' <span class="tag">respondido</span>' : ""}</div>
        <div class="s">${esc(fmtTs(r.created_at))} · ${esc(r.email)}${r.date_place ? " · " + esc(r.date_place) : ""}</div>
        <div class="s pv">${esc(r.message || "")}</div></div>
      <div class="acts"><button class="btn ghost sm" data-o="${r.id}">Abrir</button><button class="btn danger sm" data-d="${r.id}">Borrar</button></div></div>`).join("");
  }

  async function setRead(r, val) {
    const { error } = await sb.from("inquiries").update({ read: val }).eq("id", r.id);
    if (error) { fail(error); return false; }
    r.read = val; renderInq(); refreshBadge(); return true;
  }
  async function loadReplies(id) {
    const { data, error } = await sb.from("inquiry_replies").select("*").eq("inquiry_id", id).order("created_at", { ascending: true });
    if (error) { console.error(error); return []; }   // si aún no se ejecutó el SQL, se puede leer igualmente
    return data || [];
  }
  async function delInq(id) {
    if (!confirm("¿Borrar este mensaje? Se borran también sus respuestas.")) return;
    const { error } = await sb.from("inquiries").delete().eq("id", id); if (error) return fail(error);
    INQ = INQ.filter((r) => String(r.id) !== String(id)); delete DRAFTS[id];
    closeInq(true); renderInq(); refreshBadge(); toast("Borrado");
  }

  async function openInq(id) {
    const r = byId(id); if (!r) return;
    saveDraft();
    curId = r.id;
    if (isNew(r)) setRead(r, true);
    const replies = await loadReplies(r.id);
    if (curId !== r.id) return;
    paintInq(r, replies);
  }
  function stepInq(d) {
    if (NAV.length < 2) return;
    const i = NAV.findIndex((x) => String(x) === String(curId));
    openInq(NAV[(i + d + NAV.length) % NAV.length]);
  }
  function saveDraft() {
    const ta = $("#rtext");
    if (ta && curId != null) { const v = ta.value.trim(); if (v && v !== TPL.trim()) DRAFTS[curId] = ta.value; else delete DRAFTS[curId]; }
  }
  const dirty = () => { const ta = $("#rtext"); return !!ta && ta.value.trim() !== "" && ta.value.trim() !== TPL.trim(); };

  function paintInq(r, replies) {
    const i = Math.max(0, NAV.findIndex((x) => String(x) === String(r.id))), n = NAV.length || 1;
    const first = (r.name || "").trim().split(/\s+/)[0] || "";
    const greet = `Hola ${first},\n\n`;
    TPL = `${greet}\n\nUn abrazo,\nMax Estrella`;
    let host = $("#mm");
    if (!host) {
      host = document.createElement("div"); host.id = "mm"; host.className = "mm";
      host.setAttribute("role", "dialog"); host.setAttribute("aria-modal", "true");
      document.body.appendChild(host); document.body.style.overflow = "hidden";
      host.addEventListener("click", (e) => {
        if (e.target === host || e.target.classList.contains("mm-wrap") || e.target.closest(".mm-x")) return closeInq();
        const nv = e.target.closest("[data-nav]"); if (nv) return stepInq(Number(nv.dataset.nav));
        const cur = byId(curId); if (!cur) return;
        if (e.target.closest("#rsend")) return sendReply(cur);
        if (e.target.closest("#runread")) return markUnread(cur);
        if (e.target.closest("#rdel")) return delInq(cur.id);
      });
    }
    const st = r.replied_at ? ["Respondido", "ok"] : isNew(r) ? ["Nuevo", "new"] : ["Leído", ""];
    const info = [["Recibido", fmtTs(r.created_at)], ["Tipo de evento", r.kind], ["Fecha y lugar", r.date_place]].filter((x) => x[1]);
    host.innerHTML = `<div class="mm-wrap">
      <article class="mcard">
        <header class="mc-top"><span>Max ★ Estrella</span><span class="mc-st ${st[1]}">${st[0]}</span></header>
        <h3 class="mc-name">${esc(r.name)}</h3>
        <a class="mc-mail" href="mailto:${esc(r.email)}">${esc(r.email)}</a>
        <ul class="mc-info">${info.map((x) => `<li><small>${x[0]}</small><span>${esc(x[1])}</span></li>`).join("")}</ul>
        <div class="mc-body">${esc(r.message || "(sin mensaje)")}</div>
        ${replies.length ? `<div class="mc-thread"><p class="mc-h">Respuestas enviadas</p>${replies.map((x) => `<div class="mc-reply"><small>${esc(x.sent_by || "La banda")} · ${esc(fmtTs(x.created_at))}</small><p>${esc(x.body)}</p></div>`).join("")}</div>` : ""}
        <div class="mc-compose">
          <label for="rtext">${replies.length ? "Enviar otra respuesta" : "Tu respuesta"} <em>(le llegará por email a ${esc(r.email)})</em></label>
          <textarea id="rtext" rows="8"></textarea>
          <p class="mc-err" id="rerr" role="alert"></p>
          <div class="mc-actions">
            <button class="mbtn" id="rsend" type="button">Enviar respuesta por email</button>
            <button class="mbtn ghost" id="runread" type="button">Marcar como no leído</button>
            <button class="mbtn danger" id="rdel" type="button">Borrar</button>
          </div>
        </div>
      </article>
      ${n > 1 ? `<div class="mm-nav"><button data-nav="-1" aria-label="Mensaje anterior">‹</button><span>${i + 1} / ${n}</span><button data-nav="1" aria-label="Mensaje siguiente">›</button></div>` : ""}
    </div><button class="mm-x" aria-label="Cerrar">×</button>`;
    const ta = $("#rtext");
    ta.value = DRAFTS[r.id] ?? TPL;
    ta.setSelectionRange(greet.length, greet.length);
    host.scrollTop = 0;
  }

  function closeInq(force) {
    const host = $("#mm"); if (!host) return true;
    if (!force && dirty() && !confirm("Tienes una respuesta sin enviar. ¿Descartarla?")) return false;
    if (force) saveDraft(); else delete DRAFTS[curId];
    host.remove(); document.body.style.overflow = ""; curId = null; return true;
  }
  addEventListener("keydown", (e) => {
    if (!$("#mm")) return;
    if (e.key === "Escape") closeInq();
    else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !e.target.matches("textarea,input")) stepInq(e.key === "ArrowRight" ? 1 : -1);
  });

  async function markUnread(r) {
    if (!closeInq()) return;
    if (await setRead(r, false)) toast("Marcado como no leído");
  }

  async function sendReply(r) {
    const ta = $("#rtext"), err = $("#rerr"), btn = $("#rsend"), text = ta.value.trim();
    err.textContent = "";
    if (text.length < 5 || text === TPL.trim()) { err.textContent = "Escribe primero tu respuesta."; ta.focus(); return; }
    if (!confirm(`Se enviará este email a ${r.email}. ¿Enviar ahora?`)) return;
    btn.disabled = true; btn.textContent = "Enviando…";
    try {
      const { data, error } = await sb.functions.invoke("reply-inquiry", { body: { inquiry_id: r.id, message: text } });
      if (error) {
        let m = error.message || String(error);
        try { const j = await error.context.json(); if (j && j.error) m = j.error; } catch (_) {}
        if (/Failed to send|not found|404/i.test(m)) m += " (¿está desplegada la función «reply-inquiry»? Mira supabase/LEEME-mensajes.md)";
        throw new Error(m);
      }
      if (data && data.error) throw new Error(data.error);
      r.read = true; r.replied_at = new Date().toISOString(); delete DRAFTS[r.id];
      toast("Respuesta enviada ✔"); renderInq(); refreshBadge();
      paintInq(r, await loadReplies(r.id));
    } catch (e) {
      err.textContent = "No se pudo enviar: " + (e.message || e);
      btn.disabled = false; btn.textContent = "Enviar respuesta por email";
    }
  }
})();
