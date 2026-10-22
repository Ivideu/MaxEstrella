/* ============================================================
   MAX ESTRELLA · Contenido editable de la web
   Edita aquí conciertos, temas, fotos y redes. No hace falta tocar más.
   ============================================================ */
window.SITE = {
  email: "contratacion@maxestrella.es",   // <- cambia por tu email real

  // Fechas en formato AAAA-MM-DD. Las ya pasadas se ocultan solas.
  events: [
    { date: "2026-11-14", title: "Max Estrella en directo", venue: "Sala Fun House · C. Palafox nº 8, Madrid", link: "#", linkText: "Entradas" },
    { date: "2026-12-12", title: "Concierto de Navidad", venue: "Sala por confirmar · Madrid", link: "", linkText: "" }
  ],

  // "bg" puede ser un degradado o una imagen: url('images/portada.jpg')
  tracks: [
    { title: "La depresión no avisa", tag: "Videoclip", link: "#", bg: "linear-gradient(135deg,#0a0a0a,#7a1020)" },
    { title: "Soledad", tag: "Letra", link: "#", bg: "linear-gradient(135deg,#1c6fb5,#0a2a4a)" },
    { title: "Algo viejo para olvidar", tag: "Estudio", link: "#", bg: "linear-gradient(135deg,#2b2b2b,#a3182c)" }
  ],

  platforms: [
    { name: "Spotify", url: "#" },
    { name: "YouTube", url: "#" },
    { name: "Apple Music", url: "#" }
  ],

  // Pon tus fotos en la carpeta images/ y lista aquí los nombres.
  gallery: [
    { src: "images/cartel-fun-house.jpg", alt: "Cartel concierto Fun House", cap: "Fun House · Madrid" },
    { src: "images/directo-01.jpg", alt: "Guitarrista en directo", cap: "En directo" },
    { src: "images/directo-02.jpg", alt: "Cantante con guitarra acústica", cap: "En directo" },
    { src: "images/directo-03.jpg", alt: "Batería en concierto", cap: "Batería" },
    { src: "images/publico.jpg", alt: "Público en el concierto", cap: "El público" },
    { src: "images/estudio-01.jpg", alt: "Guitarrista en el estudio", cap: "Estudio" },
    { src: "images/estudio-02.jpg", alt: "Micrófono de estudio", cap: "Grabando" },
    { src: "images/bateria-estudio.jpg", alt: "Batería en sesión", cap: "Sesión" }
  ],

  social: [
    { name: "Instagram", url: "#" },
    { name: "YouTube", url: "#" },
    { name: "Facebook", url: "#" },
    { name: "TikTok", url: "#" }
  ]
};
