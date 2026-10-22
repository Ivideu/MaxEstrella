(function () {
  const S = window.SITE;
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Menú móvil
  const burger = $(".burger"), menu = $("#menu");
  burger.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    burger.setAttribute("aria-expanded", open);
  });
  menu.addEventListener("click", (e) => { if (e.target.tagName === "A") { menu.classList.remove("open"); burger.setAttribute("aria-expanded", false); } });

  // Conciertos
  const months = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = S.events.filter((e) => new Date(e.date + "T00:00:00") >= today).sort((a, b) => a.date.localeCompare(b.date));
  $("#events").innerHTML = upcoming.map((e) => {
    const d = new Date(e.date + "T00:00:00");
    return `<li class="event reveal">
      <div class="date"><b>${d.getDate()}</b><span>${months[d.getMonth()]} ${d.getFullYear()}</span></div>
      <div><h3>${esc(e.title)}</h3><p>${esc(e.venue)}</p></div>
      ${e.link ? `<a class="btn" href="${esc(e.link)}" target="_blank" rel="noopener">${esc(e.linkText || "Info")}</a>` : ""}
    </li>`;
  }).join("");
  if (!upcoming.length) $("#events-empty").hidden = false;

  // Música
  $("#tracks").innerHTML = S.tracks.map((t) =>
    `<a class="card reveal" href="${esc(t.link)}" target="_blank" rel="noopener" style="--bg:${t.bg}"><h3>${esc(t.title)}</h3><span>${esc(t.tag)}</span></a>`).join("");
  $("#platforms").innerHTML = S.platforms.map((p) => `<a class="btn ghost" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)}</a>`).join("");

  // Galería (si una foto aún no existe, se oculta sin romper la web)
  $("#gallery").innerHTML = S.gallery.map((g) =>
    `<figure class="reveal"><img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy"><figcaption>${esc(g.cap || "")}</figcaption></figure>`).join("");
  document.querySelectorAll(".gallery img").forEach((img) => img.addEventListener("error", () => img.closest("figure").remove()));

  // Lightbox
  const lb = $("#lightbox"), lbImg = lb.querySelector("img");
  $("#gallery").addEventListener("click", (e) => {
    const img = e.target.closest("figure")?.querySelector("img");
    if (img) { lbImg.src = img.src; lbImg.alt = img.alt; lb.hidden = false; }
  });
  lb.addEventListener("click", () => (lb.hidden = true));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") lb.hidden = true; });

  // Social + año
  $("#social").innerHTML = S.social.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join("");
  $("#year").textContent = new Date().getFullYear();

  // Formulario -> mailto (funciona en cualquier hosting estático)
  $("#booking").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    if (!f.get("nombre") || !f.get("email")) { alert("Rellena nombre y email, por favor."); return; }
    const body = `Nombre: ${f.get("nombre")}\nEmail: ${f.get("email")}\nTipo: ${f.get("tipo")}\nFecha y lugar: ${f.get("fecha")}\n\n${f.get("mensaje")}`;
    location.href = `mailto:${S.email}?subject=${encodeURIComponent("Contratación Max Estrella")}&body=${encodeURIComponent(body)}`;
  });

  // Animación de entrada
  const io = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();
