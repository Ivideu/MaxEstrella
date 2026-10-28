/* Capa de datos compartida por la web y el panel admin.
   Con Supabase configurado lee/escribe en la nube; sin él, usa datos DEMO. */
(function () {
  const C = window.MAX_CONFIG || {};
  const live = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase);
  const sb = live ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;

  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => {
    u = String(u || "").trim();
    return /^(https?:\/\/|\/|images\/|\.\/)/i.test(u) ? u : "";
  };

  function parseVideo(url) {
    url = (url || "").trim();
    let m;
    if ((m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/))) return { kind: "youtube", id: m[1] };
    if ((m = url.match(/instagram\.com\/(?:[\w.]+\/)?(?:reel|reels|p|tv)\/([\w-]+)/))) return { kind: "instagram", id: m[1] };
    if ((m = url.match(/tiktok\.com\/.*\/video\/(\d+)/))) return { kind: "tiktok", id: m[1] };
    if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) || url.includes("/storage/v1/object/public/")) return { kind: "mp4" };
    return { kind: url ? "link" : "demo" };
  }

  /* Spotify: reconoce enlaces de canción, álbum, lista, podcast o artista */
  function parseSpotify(url) {
    url = (url || "").trim();
    const m = url.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/i) || url.match(/^spotify:(track|album|playlist|episode|show|artist):([A-Za-z0-9]+)/i);
    if (!m) return null;
    const type = m[1].toLowerCase(), id = m[2];
    return { type, id, uri: `spotify:${type}:${id}`, url: `https://open.spotify.com/${type}/${id}`, embed: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`, height: type === "track" || type === "episode" ? 152 : 352 };
  }
  /* Carátula y nombre oficiales de Spotify (oEmbed). Se guardan en sessionStorage para no repetir la consulta. */
  async function spotifyMeta(url) {
    const sp = parseSpotify(url); if (!sp) return null;
    const key = "sp:" + sp.uri;
    try { const c = sessionStorage.getItem(key); if (c) return JSON.parse(c); } catch (e) {}
    try {
      const r = await fetch("https://open.spotify.com/oembed?url=" + encodeURIComponent(sp.url));
      if (!r.ok) return null;
      const j = await r.json();
      const m = { title: j.title || "", thumb: j.thumbnail_url || "" };
      try { sessionStorage.setItem(key, JSON.stringify(m)); } catch (e) {}
      return m;
    } catch (e) { return null; }
  }

  /* ---------- DATOS DEMO (se ven mientras no haya Supabase) ---------- */
  const year = new Date().getFullYear();
  const iso = (days) => new Date(Date.now() + days * 864e5 - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const DEMO = {
    events: [
      { id: "d1", date: iso(22), title: "Max Estrella en directo", venue: "Sala Fun House", city: "Madrid · C. Palafox, 8", ticket_url: "", note: "Os esperamos con el repertorio completo y alguna sorpresa." },
      { id: "d2", date: iso(92), title: "Gira de invierno", venue: "Sala por confirmar", city: "Madrid", ticket_url: "", note: "" },
      { id: "d3", date: iso(-35), title: "Noche de rock en directo", venue: "Sala Fun House", city: "Madrid", ticket_url: "", note: "Sala llena y un público increíble. ¡Gracias a todos por cantar con nosotros!" },
      { id: "d4", date: iso(-120), title: "Concierto de verano", venue: "Sala por confirmar", city: "Madrid", ticket_url: "", note: "Comentario de ejemplo: lo escribís desde el panel al editar el concierto." }
    ],
    news: [
      { id: "n1", title: "Bienvenidos a la nueva web de Max Estrella", body: "Aquí iremos publicando conciertos, vídeos, fotos y todas las novedades del grupo.\n\nEsta noticia es de ejemplo: desde el panel de administración podréis escribir las vuestras, con foto y todo.", image_url: "images/cartel.jpg", published_at: new Date().toISOString() },
      { id: "n2", title: "Nuevo directo en la Sala Fun House", body: "Una noche de rock con las CANCIONES QUE ENAMORAN y las que emocionan. Noticia de ejemplo.", image_url: "", published_at: new Date(Date.now() - 864e5 * 6).toISOString() }
    ],
    tracks: [1, 2, 3, 4].map((n) => ({ id: "t" + n, title: `Canción ${n} · pendiente de añadir`, spotify_url: "" })),
    videos: [1, 2, 3, 4, 5].map((n) => ({ id: "v" + n, title: `Vídeo ${n} · pendiente de añadir`, url: "", featured: n === 1 })),
    photos: [
      { id: "p0", url: "images/cartel.jpg", caption: "Cartel · Sala Fun House", category: "Cartel" },
      { id: "p1", url: "images/members/m2.jpg", caption: "Voz y guitarra", category: "Banda" },
      { id: "p2", url: "images/members/m4.jpg", caption: "Guitarra", category: "Banda" },
      { id: "p3", url: "images/members/m1.jpg", caption: "Batería", category: "Banda" },
      { id: "p4", url: "images/members/m5.jpg", caption: "Teclados", category: "Banda" },
      { id: "p5", url: "images/members/m3.jpg", caption: "Bajo", category: "Banda" }
    ],
    members: [
      { id: "m2", name: "Voz y guitarra", role: "Integrante", bio: "Aquí irá la frase de cada integrante: quién es, qué toca y qué le mueve. Se edita desde el panel.", photo_url: "images/members/m2.jpg" },
      { id: "m1", name: "Batería", role: "Integrante", bio: "Aquí irá la frase de cada integrante: quién es, qué toca y qué le mueve. Se edita desde el panel.", photo_url: "images/members/m1.jpg" },
      { id: "m3", name: "Bajo", role: "Integrante", bio: "Aquí irá la frase de cada integrante: quién es, qué toca y qué le mueve. Se edita desde el panel.", photo_url: "images/members/m3.jpg" },
      { id: "m4", name: "Guitarra", role: "Integrante", bio: "Aquí irá la frase de cada integrante: quién es, qué toca y qué le mueve. Se edita desde el panel.", photo_url: "images/members/m4.jpg" },
      { id: "m5", name: "Teclados", role: "Integrante", bio: "Aquí irá la frase de cada integrante: quién es, qué toca y qué le mueve. Se edita desde el panel.", photo_url: "images/members/m5.jpg" }
    ],
    settings: {
      hero_tagline: "CANCIONES QUE ENAMORAN. Canciones que emocionan.",
      bio: "Max Estrella nace de la necesidad de contar lo que a veces no se dice: la soledad, la depresión que no avisa, el dolor que se convierte en canción.",
      contact_email: C.CONTACT_EMAIL || "",
      instagram: "https://www.instagram.com/max.estrella/"
    }
  };

  async function get(table) {
    if (!live) return DEMO[table] || [];
    let q = sb.from(table).select("*");
    if (table === "events") q = q.order("date", { ascending: true });
    else if (table === "news") q = q.eq("published", true).order("published_at", { ascending: false });
    else if (table === "videos") q = q.order("featured", { ascending: false }).order("created_at", { ascending: false });
    else if (table === "tracks") q = q.order("sort", { ascending: true }).order("created_at", { ascending: false });
    else if (table === "photos") q = q.order("sort", { ascending: true }).order("created_at", { ascending: false });
    else if (table === "members") q = q.order("sort", { ascending: true });
    const { data, error } = await q;
    if (error) { console.error("Supabase", table, error); return []; }
    return data || [];
  }

  async function settings() {
    if (!live) return DEMO.settings;
    const { data, error } = await sb.from("settings").select("*");
    if (error) { console.error(error); return {}; }
    return Object.fromEntries((data || []).map((r) => [r.key, r.value]));
  }

  window.MAX = { live, sb, config: C, esc, safeUrl, parseVideo, parseSpotify, spotifyMeta, get, settings, DEMO };
})();
