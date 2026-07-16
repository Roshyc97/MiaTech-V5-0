# Despliegue en SiteGround — MiaTech v5 (PHP)

Subdominio: `institutoj20.sg-host.com` · Ruta web: `/home/customer/www/institutoj20.sg-host.com/public_html/`

## 1. Estructura en el servidor (modelo con separacion)

IMPORTANTE: no se sube la carpeta MiaTech-v5-PHP entera a un solo lugar. Su contenido
se reparte en DOS ubicaciones que ya existen en tu cuenta de SiteGround:

```
/home/customer/www/institutoj20.sg-host.com/     <- "home" del sitio (capa de arriba)
├── .env                     <- crear aqui (con claves reales)
├── storage/                 <- subir aqui (videos, pdf, tmp)  NO accesible por web
├── tools/                   <- subir aqui (migrate.php, seed.php)
├── docs/                    <- opcional
└── public_html/             <- WEB ROOT (lo unico que se publica)
    ├── index.html, styles.css, admin-*.html, recuperar.html
    ├── js/ css/ img/ audio/
    └── api/                 <- backend PHP
```

Reparto al subir:
- CONTENIDO de `MiaTech-v5-PHP/public_html/`  ->  dentro de `.../institutoj20.sg-host.com/public_html/`
- `MiaTech-v5-PHP/storage/`, `tools/`, `docs/` y el `.env`  ->  en `.../institutoj20.sg-host.com/` (junto a public_html, NO dentro)
- `db/` solo si usas SQLite; con MySQL no hace falta.

El codigo YA espera este layout: busca `.env` y `storage/` un nivel arriba de `public_html`.
No hay que modificar rutas. Si por alguna razon no puedes escribir arriba de public_html,
define `STORAGE_LOCAL_PATH` y `DB_SQLITE_PATH` en el `.env` apuntando a donde si puedas.

Subida: por Git de SiteGround, SFTP, o subiendo un .zip y descomprimiendo.

## 2. Base de datos (MySQL)

1. En Site Tools → MySQL: crea base de datos y usuario, y asígnalo.
2. En `.env`: `DB_DRIVER=mysql`, `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.
3. Ejecuta la migración (SSH o cron):
   ```
   php tools/migrate.php --seed     # --seed solo para datos de prueba
   ```
   (En producción real, corre `php tools/migrate.php` sin `--seed` y crea los usuarios reales.)

## 3. Variables de entorno (.env)

Copia `.env.example` a `.env` (en la raíz del proyecto, fuera de public_html) y completa:
`GROQ_API_KEY`, `SMTP_*` (cuenta `speakingtest@itsjapon.edu.ec`), `APP_BASE_URL=https://institutoj20.sg-host.com`,
`APP_ENV=production`, `APP_DEBUG=false`, `STORAGE_DRIVER=local`.

## 4. SSL / HTTPS

Ya está forzado en el subdominio (confirmado en Fase 0). Imprescindible: sin HTTPS no funcionan
cámara/micrófono/pantalla.

## 5. Imágenes de evaluación

Sube las imágenes a `public_html/img/imagenes/`. `IMAGE_PATH` ya apunta ahí.

## 6. Cron jobs (opcional pero recomendado)

- Limpieza de temporales: `find <ruta>/storage/tmp -type f -mmin +120 -delete`
- (Futuro) rutina de subida a OneDrive cuando se active ese driver.

## 7. Verificación post-despliegue

- `https://institutoj20.sg-host.com/api/health` → JSON con `ok:true`, ffmpeg disponible, `bd.driver:mysql`.
- Login de rol y de alumno.
- Un envío de prueba completo (con GROQ_API_KEY real).
- Un correo de recuperación (SMTP real).

## 8. Checklist final

- [ ] `public_html/` subido; `storage/` y `db/` fuera del web root
- [ ] MySQL creada + `tools/migrate.php` ejecutado
- [ ] `.env` con GROQ, SMTP, APP_ENV=production, APP_DEBUG=false
- [ ] SSL activo
- [ ] Imágenes subidas
- [ ] `/api/health` OK
- [ ] Prueba de envío end-to-end con GROQ real
- [ ] Prueba de correo (confirmación alumno + recuperación rol)
- [ ] Cron de limpieza de `storage/tmp`
- [ ] Usuarios reales creados; usuarios de prueba (seed) eliminados
