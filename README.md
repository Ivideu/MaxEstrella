# Max ★ Estrella · Web oficial (v2)

Web estática (HTML + CSS + JS, sin compilar) con **panel de administración** (`admin.html`) conectado a **Supabase**.
Funciona igual en GitHub Pages que en 1&1 / IONOS: lo único que cambia de sitio son los archivos; los datos viven en Supabase.

```
index.html          web pública
admin.html          panel de la banda (login)
css/  js/           estilos y código
js/config.js        ← aquí pegas las 2 claves de Supabase
supabase/schema.sql ← se ejecuta una vez en Supabase
images/             cartel y retratos provisionales
```

## 0 · Modo demo

Con `js/config.js` vacío la web ya funciona con contenido de ejemplo (puedes abrir `index.html` con doble clic).
El panel solo se activa cuando conectas Supabase.

## 1 · Activar el panel (≈10 minutos, una sola vez)

1. Crea una cuenta gratuita en **supabase.com** y un proyecto nuevo (región UE, por ejemplo Frankfurt). Guarda la contraseña de la base de datos.
2. Menú **SQL Editor → New query**, pega el contenido de `supabase/schema.sql` y pulsa **Run**. Crea las tablas, las reglas de seguridad y el almacén de archivos `media`.
3. Menú **Authentication → Users → Add user**: crea un usuario por cada miembro que vaya a administrar (email + contraseña, marca *Auto Confirm User*).
4. **Importante:** en **Authentication → Sign In / Providers** desactiva **«Allow new users to sign up»**, para que solo entren los usuarios que tú creas.
5. En **Project Settings → API** copia la **Project URL** y la clave **anon (public)** y pégalas en `js/config.js`.
6. En **Authentication → URL Configuration** pon como *Site URL* la dirección final de la web (sirve para el email de «he olvidado la contraseña»).
7. Abre `admin.html`, entra y empieza a subir contenido.

> Las claves de `config.js` son públicas por diseño. Lo que protege los datos son las reglas (RLS) de `schema.sql`: cualquiera puede **leer** la web, solo los usuarios con login pueden **escribir**.

> **Si ya ejecutaste una versión anterior de `schema.sql`:** ejecuta también, una sola vez, `alter table public.events add column if not exists note text;` en el SQL Editor (añade el campo de comentario).

## 2 · Qué se puede gestionar desde el panel

- **Conciertos**: fecha, sala, ciudad, enlace de entradas y un **comentario** opcional. Los próximos salen arriba; al pasar la fecha se mueven solos a «Últimos conciertos» (con su comentario).
- **Noticias**: titular, texto, foto y modo borrador.
- **Vídeos**: pega un enlace de **YouTube, Instagram o TikTok**, o sube un **MP4** (máx. 50 MB en el plan gratuito). Se pueden destacar.
- **Fotos**: subida múltiple arrastrando, con categorías (filtros en la web). Se reducen solas a 2000 px.
- **La banda**: integrantes con foto, nombre, instrumento y leyenda. Al pulsar su foto en la web se abre una ficha tipo cromo.
- **Mensajes**: solicitudes del formulario de contacto.
- **Ajustes**: frase de portada, texto de la banda, email y redes sociales.

**Consejo para vídeos:** para actuaciones largas o muchos vídeos, usa YouTube (gratis y sin límite de espacio). Los MP4 propios ocupan almacenamiento del plan.

## 3 · Límites del plan gratuito de Supabase (revísalos en https://supabase.com/pricing)

- 1 GB de archivos, 500 MB de base de datos, 5 GB de tráfico al mes, 50 MB por archivo subido.
- **Los proyectos gratuitos se pausan tras 7 días sin actividad.** Si nadie entra a la web ni al panel en una semana, hay que reactivarlo desde el panel de Supabase (los datos no se pierden). Si la web es importante, plantea pasar al plan de pago o programar una visita periódica.

## 4 · Publicar en GitHub Pages (gratis)

1. Crea un repositorio público `maxestrella-web` en github.com y sube todo el contenido de esta carpeta.
2. **Settings → Pages → Source: Deploy from a branch → main / (root)**.
3. En 1-2 minutos estará en `https://TU_USUARIO.github.io/maxestrella-web/`.

## 5 · Llevarla a 1&1 (IONOS) con tu dominio

1. Contrata el dominio y el hosting en IONOS.
2. Sube **todo el contenido** de la carpeta por SFTP/FTP o con el administrador de archivos a la raíz del sitio (que `index.html` quede en la raíz).
3. Activa el certificado SSL gratuito y comprueba que el dominio apunta al hosting.
4. Añade el nuevo dominio como *Site URL* en Supabase (paso 6).

Las rutas son relativas: no hay que cambiar nada al mover la web, y el panel seguirá funcionando porque los datos están en Supabase.

## 6 · Personalizar

- Cambia el cartel sustituyendo `images/cartel.jpg` (misma ruta).
- Los 5 retratos de `images/members/` son recortes provisionales del cartel; sustitúyelos desde el panel («La banda»).
- Colores y tipografías: variables al inicio de `css/site.css`.
- Para que al compartir el enlace en redes salga el cartel, cambia en `index.html` `og:image` por la URL completa (por ejemplo `https://tudominio.es/images/cartel.jpg`).
