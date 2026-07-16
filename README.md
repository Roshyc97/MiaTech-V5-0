# MiaTech v5 (PHP) — esqueleto

Reescritura del backend de MiaTech de Node/Express a **PHP + PDO** para ejecutarse
completamente en **SiteGround** (subdominio `institutoj20.sg-host.com`), eliminando Render.
El frontend (HTML/CSS/JS vanilla) se reutiliza desde la versión v5-0.

> Estado: **Fase 1 — estructura / esqueleto funcional mínimo.**
> Solo `/api/health` está implementado. El resto de rutas responden 501 hasta su fase.

## Estructura

```
MiaTech-v5-PHP/
├── public_html/            # <- esto se sube a public_html de SiteGround
│   ├── index.html          # frontend reutilizado (v5-0)
│   ├── admin-*.html, *.css, *.js, css/, js/, img/, audio/
│   └── api/                # backend PHP
│       ├── index.php       # front controller (router)
│       ├── config.php      # carga .env -> configuración
│       ├── bootstrap.php   # sesión, autoload, helpers
│       ├── .htaccess       # enruta /api/* a index.php
│       ├── lib/            # clases (namespace MiaTech\)
│       │   ├── Database.php     # conexión PDO (MySQL/SQLite)
│       │   ├── Response.php     # helpers JSON
│       │   └── Storage/        # capa de almacenamiento abstracta
│       │       ├── StorageInterface.php
│       │       ├── LocalStorage.php     # driver activo
│       │       ├── OneDriveStorage.php  # stub (futuro)
│       │       └── StorageFactory.php
│       └── routes/         # handlers por endpoint (health.php)
├── storage/                # FUERA del web root: videos, pdf, tmp
├── db/                     # sqlite local (dev)
├── docs/                   # 4 MD maestros de referencia (v5-0)
├── .env.example
└── .gitignore
```

## Principios de diseño

- **Config en `.env`**: nada sensible (GROQ, SMTP, BD) toca el frontend.
- **PDO agnóstico**: `DB_DRIVER=sqlite` para probar, `mysql` en SiteGround. La app no cambia.
- **Almacenamiento abstracto**: la BD guarda una *referencia lógica* (driver + clave), no rutas
  físicas; las descargas pasan por endpoint PHP. Migrar `local -> onedrive` = un driver + un flag.
- **Mismo origen** frontend/backend: sesiones PHP normales, sin CORS ni cookies cross-domain.
- **FFmpeg vía `exec()`**: confirmado disponible en SiteGround (Fase 0), extracción de audio server-side.

## Probar en local

```bash
cp .env.example .env          # ajustar si hace falta (DB_DRIVER=sqlite funciona sin config)
php -S localhost:8000 -t public_html
# luego: http://localhost:8000/api/index.php?  (o /api/health con rewrite)
```

## Despliegue en SiteGround

Subir el contenido de `public_html/` a `/home/customer/www/institutoj20.sg-host.com/public_html/`
y `storage/` + `db/` fuera del web root (o ajustar rutas en `.env`). Crear `.env` con las claves reales.
