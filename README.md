# Max ★ Estrella · Web oficial

Sitio estático (HTML + CSS + JS). Sin base de datos ni compilación, así que funciona igual en GitHub Pages y en cualquier hosting (1&1 / IONOS).

## Estructura

```
index.html
css/style.css
js/data.js      <- aquí editas conciertos, temas, fotos, redes y email
js/main.js
images/         <- tus fotos (ver nombres abajo)
.nojekyll
```

## Fotos

Guarda tus imágenes en `images/` con estos nombres (o cambia los nombres en `js/data.js`):

- `hero.jpg` (fondo de portada, horizontal, mejor >1600 px)
- `cartel-fun-house.jpg`, `directo-01.jpg`, `directo-02.jpg`, `directo-03.jpg`, `publico.jpg`, `estudio-01.jpg`, `estudio-02.jpg`, `bateria-estudio.jpg`

Consejo: exporta a JPG de ~1600 px de ancho y menos de 400 KB cada una para que la web cargue rápido.

## Publicar en GitHub (gratis)

1. Crea una cuenta en github.com y un repositorio nuevo llamado `maxestrella-web` (público).
2. Sube todos los archivos (botón **Add file → Upload files**, o con git):
   ```
   git init
   git add .
   git commit -m "Primera versión"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/maxestrella-web.git
   git push -u origin main
   ```
3. En el repositorio: **Settings → Pages → Source: Deploy from a branch → main / (root)**.
4. En 1-2 minutos estará en `https://TU_USUARIO.github.io/maxestrella-web/`.

Cada vez que cambies algo y lo subas, la web se actualiza sola.

## Llevarla a 1&1 (IONOS) con tu dominio

1. Contrata dominio + hosting en IONOS (el dominio se paga cada año).
2. Descarga el repositorio (**Code → Download ZIP**) y descomprímelo.
3. En IONOS abre **Hosting → SFTP/FTP** (o el Administrador de archivos) y sube **todo el contenido** de la carpeta a la raíz del sitio (`/` o `htdocs`), de modo que `index.html` quede en la raíz.
4. Apunta el dominio a ese hosting (IONOS lo hace automático si lo contratas allí). Activa el certificado SSL gratuito para tener `https`.

Todas las rutas son relativas, por lo que no hay que cambiar nada al mover la web.

### Alternativa: dominio propio en GitHub Pages

Crea un archivo `CNAME` con tu dominio (por ejemplo `maxestrella.es`), y en IONOS apunta los DNS a GitHub Pages. Así puedes mantener GitHub como alojamiento y solo pagar el dominio.
