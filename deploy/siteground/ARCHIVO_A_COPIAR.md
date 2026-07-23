# Archivo a copiar: Guía exacta de qué subir a SiteGround

**Referencia rápida para despliegue por SFTP**

---

## 📋 Resumen: Qué sí, qué no

| Carpeta/Archivo | ¿Copiar? | Ubicación LOCAL | Ubicación SITEGROUND |
|---|:---:|---|---|
| `public_html/` | ✅ **SÍ** | `MiaTech-v5-PHP/public_html/*` | `/public_html/` |
| `tools/` | ✅ **SÍ** | `MiaTech-v5-PHP/tools/` | `/home/customer/.../tools/` |
| `docs/` | ✅ SÍ (opt) | `MiaTech-v5-PHP/docs/` | `/home/customer/.../docs/` |
| `storage/` | ✅ **SÍ (vacía)** | `MiaTech-v5-PHP/storage/` | `/home/customer/.../storage/` |
| `.env` | ❌ **NO** | `.env` LOCAL | — NO COPIAR — |
| `.env.local` | ❌ **NO** | `.env.local` LOCAL | — NO COPIAR — |
| `.env.example` | ❌ **NO** | `.env.example` | — NO COPIAR — |
| `db/` | ❌ **NO** | `db/miatech.sqlite` | — NO COPIAR — |
| `deploy/` | ❌ **NO** | `deploy/siteground/` | — NO COPIAR (aux) — |
| `.git/` | ❌ **NO** | `.git/` | — NO COPIAR (git maneja) — |
| `.gitignore` | ❌ **NO** | `.gitignore` | — NO COPIAR — |

---

## ✅ COPIAR A SITEGROUND

### 1. Carpeta: `public_html/` — TODO el contenido

**LOCAL:**
```
MiaTech-v5-PHP/public_html/
├── index.html
├── admin-login.html
├── admin-dashboard.html
├── recuperar.html
├── js/
├── css/
├── img/
├── audio/
└── api/
    ├── index.php
    ├── config.php
    ├── bootstrap.php
    ├── .htaccess
    ├── lib/
    └── routes/
```

**SITEGROUND:**
```
/public_html/
├── index.html
├── admin-login.html
├── admin-dashboard.html
├── recuperar.html
├── js/
├── css/
├── img/
├── audio/
└── api/
    ├── index.php
    ├── config.php
    ├── bootstrap.php
    ├── .htaccess
    ├── lib/
    └── routes/
```

**Instrucciones SFTP:**
```
Origen:      C:\...\MiaTech-v5-PHP\public_html\*
Destino:     /public_html/
Modo:        Copiar recursivamente (todos los archivos)
NO copiar:   La carpeta public_html en sí, solo su CONTENIDO
```

### 2. Carpeta: `tools/` — TODO el contenido

**LOCAL:**
```
MiaTech-v5-PHP/tools/
├── migrate.php
└── seed.php
```

**SITEGROUND:**
```
/home/customer/www/institutoj20.sg-host.com/tools/
├── migrate.php
└── seed.php
```

**Instrucciones SFTP:**
```
Origen:      C:\...\MiaTech-v5-PHP\tools\
Destino:     /home/customer/www/institutoj20.sg-host.com/tools/
Modo:        Copiar carpeta completa (con archivos dentro)
```

### 3. Carpeta: `docs/` — TODO (opcional pero recomendado)

**LOCAL:**
```
MiaTech-v5-PHP/docs/
├── CHECKLIST_PRUEBAS.md
├── VARIABLES_FUNCIONAMIENTO.md
├── PROYECTO_CONTEXTO.md
├── DECISIONES_IMPORTANTES.md
├── PENDIENTES_PRODUCCION.md
├── DESPLIEGUE.md
└── DUDAS_PENDIENTES.md
```

**SITEGROUND:**
```
/home/customer/www/institutoj20.sg-host.com/docs/
├── CHECKLIST_PRUEBAS.md
├── VARIABLES_FUNCIONAMIENTO.md
├── (todos los archivos)
```

**Instrucciones SFTP:**
```
Origen:      C:\...\MiaTech-v5-PHP\docs\
Destino:     /home/customer/www/institutoj20.sg-host.com/docs/
Modo:        Copiar carpeta completa
Nota:        Solo referencia; no necesaria para funcionamiento
```

### 4. Carpeta: `storage/` — Crear VACÍA

**LOCAL (limpiar primero):**
```bash
# En tu PC:
rm -rf storage/*
mkdir -p storage/2025B/videos
mkdir -p storage/2025B/pdf
mkdir -p storage/tmp
```

**SITEGROUND (crear vacía):**
```
/home/customer/www/institutoj20.sg-host.com/storage/
├── 2025B/
│   ├── videos/
│   ├── pdf/
│   └── tmp/
└── (archivos se generarán aquí con uso)
```

**Instrucciones SFTP:**
```
Origen:      C:\...\MiaTech-v5-PHP\storage\ (VACÍA)
Destino:     /home/customer/www/institutoj20.sg-host.com/storage/
Modo:        Copiar carpeta con estructura de subcarpetas

O crear manualmente en SiteGround:
- File Manager → New Folder → storage
- storage → New Folder → 2025B
- 2025B → New Folder → videos
- 2025B → New Folder → pdf
- storage → New Folder → tmp
```

### 5. Archivo: `.env.production` (EDITADO) → `.env` en SiteGround

**LOCAL:**
```
MiaTech-v5-PHP/deploy/siteground/.env.production (EDITADO)
```

**SITEGROUND:**
```
/home/customer/www/institutoj20.sg-host.com/.env (archivo nuevo)
```

**Instrucciones:**
```
1. Abrir .env.production LOCAL
2. Verificar que TODOS los XXXX_..._XXXX fueron reemplazados
3. Crear archivo NUEVO en SiteGround llamado ".env"
4. Copiar contenido de .env.production (EDITADO) al nuevo .env
5. Permisos: chmod 600 .env (solo lectura para propietario)
```

**Por SFTP:**
```
1. Crear nuevo archivo: .env
2. Ubicación: /home/customer/www/institutoj20.sg-host.com/
3. Contenido: Pegar .env.production (editado)
4. Guardar

O por SSH:
cat > /home/customer/www/institutoj20.sg-host.com/.env << 'EOF'
[pegar contenido de .env.production editado]
EOF
chmod 600 /home/customer/www/institutoj20.sg-host.com/.env
```

---

## ❌ NO COPIAR A SITEGROUND

### `.env` — NUNCA COPIAR

```
LOCAL: MiaTech-v5-PHP/.env
```

**¿Por qué?**
- Contiene secretos locales (GROQ_API_KEY, SMTP_PASSWORD, etc.)
- Si se copia, SiteGround usaría configuración de desarrollo
- Riesgo de seguridad

**Qué hacer:** Crear `.env` NUEVO en SiteGround (ver arriba)

### `.env.local` — NUNCA COPIAR

```
LOCAL: MiaTech-v5-PHP/.env.local
```

**¿Por qué?**
- Overrides solo para tu máquina LOCAL
- No tiene sentido en SiteGround
- Sería ignorado de todas formas

### `.env.example` — NO COPIAR

```
LOCAL: MiaTech-v5-PHP/.env.example
```

**¿Por qué?**
- Es plantilla de referencia
- No es configuración real
- Ocuparía espacio innecesariamente

### `db/miatech.sqlite` — NUNCA COPIAR

```
LOCAL: MiaTech-v5-PHP/db/miatech.sqlite
```

**¿Por qué?**
- Base de datos local de prueba
- En SiteGround usamos MySQL, no SQLite
- Archivo será ignorado (.gitignore)

**Acción:** Eliminar antes de subir
```bash
rm -f db/miatech.sqlite
```

### `.git/` — NUNCA COPIAR (Git lo maneja)

```
LOCAL: MiaTech-v5-PHP/.git/
```

**¿Por qué?**
- Si usas Git en SiteGround, no copiar este archivo
- Git clona automáticamente
- Si no usas Git, no es necesario

### `.gitignore`, `.gitattributes` — NO COPIAR

```
LOCAL: MiaTech-v5-PHP/.gitignore
       MiaTech-v5-PHP/.gitattributes
```

**¿Por qué?**
- Configuración de Git local
- No es necesaria en SiteGround
- El servidor no usará Git

### `deploy/siteground/` — NO COPIAR (después del deploy)

```
LOCAL: MiaTech-v5-PHP/deploy/siteground/
```

**¿Por qué?**
- Carpeta auxiliar (instrucciones, templates, checklists)
- NO es código de producción
- NO es necesaria en SiteGround tras desplegar

**Nota:** Esta carpeta ESTÁ en git (para organización), pero NO se sube a servidor.

---

## 🔄 Resumen: Pasos por orden

### Paso 1: Limpiar LOCAL
```bash
# En tu PC:
rm -rf db/miatech.sqlite
rm -rf storage/*
mkdir -p storage/2025B/{videos,pdf} storage/tmp
```

### Paso 2: Editar `.env.production`
```bash
# En LOCAL:
nano deploy/siteground/.env.production
# Reemplazar todos XXXX_..._XXXX
```

### Paso 3: Conectar SFTP a SiteGround
```
Cliente SFTP (Filezilla, WinSCP, etc.)
Host: institutoj20.sg-host.com
Usuario: [tu usuario SiteGround]
Contraseña: [tu contraseña]
Puerto: 18765
```

### Paso 4: Subir en este orden

**A.** Subir `public_html/` completo
```
LOCAL:   MiaTech-v5-PHP/public_html/*
REMOTO:  /public_html/
Modo:    Recursivo
```

**B.** Subir `tools/`
```
LOCAL:   MiaTech-v5-PHP/tools/
REMOTO:  /home/customer/www/institutoj20.sg-host.com/tools/
```

**C.** Subir `docs/` (opcional)
```
LOCAL:   MiaTech-v5-PHP/docs/
REMOTO:  /home/customer/www/institutoj20.sg-host.com/docs/
```

**D.** Subir `storage/` (vacío)
```
LOCAL:   MiaTech-v5-PHP/storage/
REMOTO:  /home/customer/www/institutoj20.sg-host.com/storage/
```

**E.** Crear `.env` en REMOTO
```
Contenido: .env.production (EDITADO)
Ubicación: /home/customer/www/institutoj20.sg-host.com/.env
Permisos: chmod 600
```

### Paso 5: Verificar en SiteGround
```bash
ls -la /home/customer/www/institutoj20.sg-host.com/
# Debe mostrar:
# public_html/, storage/, tools/, docs/, .env

curl https://institutoj20.sg-host.com/api/health
# Debe devolver: { "ok": true, ... }
```

---

## 📊 Tabla: Qué archivo/carpeta → Dónde

| QUÉ | ORIGEN (LOCAL) | DESTINO (SITEGROUND) | ACCIÓN |
|-----|---|---|---|
| Código frontend | `public_html/js/` | `/public_html/js/` | Copiar |
| Código backend | `public_html/api/` | `/public_html/api/` | Copiar |
| Scripts BD | `tools/migrate.php` | `/tools/` | Copiar |
| Documentación | `docs/` | `/docs/` | Copiar (opt) |
| Almacenamiento | `storage/` | `/storage/` | Crear vacío |
| Configuración | `.env.production` | `.env` (nuevo) | Crear con secretos |
| Ignore | `.env` (local) | — | NO copiar |
| Ignore | `.env.local` | — | NO copiar |
| Ignore | `db/` (sqlite) | — | NO copiar |
| Ignore | `deploy/` | — | NO copiar |

---

**Resultado esperado después de subir:**

```
✅ public_html/ con TODO el código
✅ tools/ con migrate.php y seed.php
✅ docs/ con documentación (opt)
✅ storage/ creada y vacía
✅ .env creado con secretos reales
❌ .env (local) NO está
❌ db/ NO está
❌ deploy/ NO está
```

Si TODO está ✅, proceder a: **README.md Fase 4 (Migración de BD)**
