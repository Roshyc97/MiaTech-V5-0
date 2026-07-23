# Subida a SiteGround — Guía práctica

**Pasos claros para subir el código y ejecutar pruebas**

---

## 🔍 PASO 0: Anotar credenciales MySQL

Antes de empezar, obtener de **SiteGround Site Tools → MySQL**:

```
BD_NOMBRE:      [anotar aquí]
BD_USUARIO:     [anotar aquí]
BD_PASSWORD:    [Si hay contraseña, anotar. Si NO tiene, dejar vacío]
DB_HOST:        localhost
DB_PORT:        3306
```

**Nota:** Si no se puede establecer contraseña, usar **vacío en `.env`** (DB_PASSWORD=)

---

## 📋 PASO 1: Preparar `.env.production` con datos reales

1. Abrir: `deploy/siteground/.env.production`

2. Reemplazar SOLO estas líneas con datos de SiteGround:

```bash
DB_HOST=localhost
DB_PORT=3306
DB_NAME=xxxxxxx              # ← Nombre aleatorio de SiteGround
DB_USER=xxxxxxx              # ← Usuario aleatorio de SiteGround
DB_PASSWORD=                 # ← Dejar vacío si no hay contraseña

STORAGE_LOCAL_PATH=/home/customer/www/institutoj20.sg-host.com/storage

GROQ_API_KEY=gsk_xxxxxxx     # ← Ya está puesto (de tu .env local)

SMTP_HOST=smtp.office365.com # ← Ya está puesto
SMTP_PASSWORD=St97Roshyc97   # ← Ya está puesto
```

3. Guardar archivo (no subir todavía)

---

## 📤 PASO 2: Subir por Filezilla (EN ESTE ORDEN)

### A. Conectar Filezilla
- Usar conexión ya activa
- Verificar que conecta correctamente

### B. Subir `public_html/`
```
LOCAL:  MiaTech-v5-PHP/public_html/*
REMOTO: /public_html/
MODO:   Subir recursivamente (todos los archivos)
```
**Esperar a que termine (mostrará "transfer complete")**

### C. Subir `tools/`
```
LOCAL:  MiaTech-v5-PHP/tools/
REMOTO: /home/customer/www/institutoj20.sg-host.com/tools/
MODO:   Subir carpeta completa
```
**Esperar a que termine**

### D. Crear carpeta `storage/` (si no existe)
```
En Filezilla (lado derecho):
- Ir a: /home/customer/www/institutoj20.sg-host.com/
- Crear carpeta: storage
- Dentro de storage, crear:
  - Carpeta: 2025B
  - Dentro de 2025B: videos, pdf, tmp
  - Carpeta: tmp (también en storage raíz)
```

**O ejecutar por SSH (si tienes acceso):**
```bash
mkdir -p /home/customer/www/institutoj20.sg-host.com/storage/2025B/{videos,pdf,tmp}
mkdir -p /home/customer/www/institutoj20.sg-host.com/storage/tmp
chmod 755 /home/customer/www/institutoj20.sg-host.com/storage
```

### E. Crear archivo `.env` en SiteGround

1. **En Filezilla:**
   - Lado izquierdo: ir a carpeta con `.env.production` editado
   - Lado derecho: ir a `/home/customer/www/institutoj20.sg-host.com/`
   - Abrir `.env.production` con editor
   - Copiar TODO el contenido

2. **Crear nuevo archivo `.env` en SiteGround:**
   - Clic derecho en panel derecho → "Create new file"
   - Nombre: `.env`
   - Editar → Pegar contenido de `.env.production`
   - Guardar

**O por línea de comandos (SSH):**
```bash
cat > /home/customer/www/institutoj20.sg-host.com/.env << 'EOF'
[pegar contenido de .env.production editado]
EOF
```

---

## ✅ PASO 3: Verificar que todo se subió

En Filezilla, ir a `/home/customer/www/institutoj20.sg-host.com/` y verificar:

- [ ] `public_html/` (carpeta con archivos)
- [ ] `tools/` (carpeta con migrate.php, seed.php)
- [ ] `storage/` (carpeta con estructura: 2025B/, tmp/)
- [ ] `.env` (archivo)

**Resultado esperado:**
```
/home/customer/www/institutoj20.sg-host.com/
├── .env ✅
├── public_html/ ✅
├── storage/ ✅
│   ├── 2025B/
│   │   ├── videos/
│   │   ├── pdf/
│   │   └── tmp/
│   └── tmp/
└── tools/ ✅
```

---

## 🗄️ PASO 4: Crear base de datos (MySQL)

### Si NO has creado BD aún:

1. **SiteGround Site Tools → MySQL**
2. Crear nueva BD (se asigna nombre aleatorio automáticamente)
3. **Anotar EXACTAMENTE:**
   - Nombre BD
   - Usuario
   - Contraseña (o "no tiene")

### Actualizar `.env` en SiteGround

En Filezilla, editar `.env` (lado derecho) y reemplazar:

```
DB_NAME=xxxx                # Tu BD aleatoria
DB_USER=yyyy                # Tu usuario aleatorio
DB_PASSWORD=zzzz            # Vacío si no tiene contraseña
```

Guardar

---

## 🐘 PASO 5: Crear esquema de BD (Migración)

### Opción A: Por SSH (recomendado - rápido)

```bash
ssh usuario@institutoj20.sg-host.com -p 18765
cd /home/customer/www/institutoj20.sg-host.com
php tools/migrate.php --seed
```

**Esperar a que termine sin errores**

### Opción B: Por Cron (si no tienes SSH)

1. **SiteGround → Site Tools → Cron Jobs**
2. Agregar nuevo cron:
   ```
   Comando: /opt/php82/bin/php /home/customer/www/institutoj20.sg-host.com/tools/migrate.php --seed
   Ejecutar: Una sola vez, ahora
   ```
3. Esperar 2 minutos y verificar en paso siguiente

---

## 🧪 PASO 6: Primeras pruebas (en navegador)

### Test 1: ¿Servidor responde?

Ir a: `https://institutoj20.sg-host.com/api/health`

**Esperado:**
```json
{
  "ok": true,
  "php": "8.x.x",
  "ffmpeg": { "disponible": true },
  "bd": { "ok": true, "driver": "mysql" }
}
```

**Si `bd.ok: false`:**
- Revisar `.env`: ¿DB_NAME, DB_USER, DB_PASSWORD correctos?
- Verificar que BD se creó en MySQL
- Verificar que `migrate.php` se ejecutó sin errores

**Si `ffmpeg.disponible: false`:**
- FFmpeg no disponible en SiteGround (raro, contactar soporte)

---

### Test 2: ¿Frontend carga?

Ir a: `https://institutoj20.sg-host.com/`

**Esperado:** Página principal carga sin errores 404 o 500

**Si error 500:**
- Ver logs: `/home/customer/logs/institutoj20.sg-host.com/error.log`
- Activar debug en `.env`: `APP_DEBUG=true` (temporal)

---

### Test 3: ¿Login funciona?

Abrir: `https://institutoj20.sg-host.com/admin-login.html`

Login con usuario de prueba (si ejecutaste `--seed`):
- Correo: `admin.ti@itsjapon.edu.ec`
- Clave: `admin1234`

**Esperado:**
- Pide cambiar contraseña (primer ingreso)
- Después de cambiar, acceso a dashboard

---

### Test 4: ¿Grabación funciona?

Ir a: `https://institutoj20.sg-host.com/`

1. Iniciar prueba
2. Login alumno:
   - Correo: `cavasconezp@itsjapon.edu.ec`
   - Clave: `1712345678`
3. Aceptar consentimiento
4. Ver imagen, grabar video (60+ segundos)
5. Enviar (submit)

**Esperado:**
- Video se procesa
- GROQ responde con nivel CEFR (A1, A2.1, A2.2, B1)
- Se muestra confirmación

**Si falla GROQ:**
- Verificar `GROQ_API_KEY` en `.env`
- Verificar que es plan de PAGO (free tier tiene límites)

---

### Test 5: ¿Correos funcionan?

En dashboard o login:
1. Ir a "Recuperar contraseña"
2. Ingresar: `coordinador.idiomas@itsjapon.edu.ec`
3. Submit

**Esperado:**
- Llega correo de recuperación
- Contiene enlace con token

**Si no llega:**
- Revisar carpeta spam
- Ver logs de PHP: `/home/customer/logs/.../error.log`
- Verificar `SMTP_HOST` y `SMTP_PASSWORD` en `.env`

---

## 🛠️ Solución rápida de errores

| Error | Causa | Solución |
|-------|-------|----------|
| `/api/health` → 500 | Archivo `.env` no existe o malformado | Verificar que `.env` está en `/home/customer/www/institutoj20.sg-host.com/` |
| `/api/health` → `bd.ok: false` | Credenciales MySQL incorrectas | Revisar `DB_NAME`, `DB_USER`, `DB_PASSWORD` en `.env` |
| Login → 401 | Usuario no existe | Ejecutar `php tools/migrate.php --seed` |
| Upload video → timeout | GROQ tardando mucho | Normal (30+ segundos), esperar |
| Upload video → `ok: false` | GROQ error | Verificar `GROQ_API_KEY` es válido y plan pago |
| Correo no llega | SMTP incorrecto | Revisar `SMTP_HOST`, `SMTP_PORT`, `SMTP_PASSWORD` |

---

## 📊 Checklist de completitud

- [ ] `.env.production` editado con datos SiteGround
- [ ] `public_html/` subido por Filezilla
- [ ] `tools/` subido por Filezilla
- [ ] `storage/` creado (2025B, videos, pdf, tmp)
- [ ] `.env` creado en SiteGround
- [ ] BD MySQL creada en Site Tools
- [ ] `php tools/migrate.php --seed` ejecutado
- [ ] `/api/health` devuelve `ok: true` y `bd.driver: mysql`
- [ ] Frontend carga (`https://institutoj20.sg-host.com/`)
- [ ] Login de admin funciona
- [ ] Login de alumno funciona
- [ ] Grabación procesa (GROQ responde)

---

## 📞 Resumen (ultra-rápido)

```
1. Editar .env.production (3 variables: DB_*, GROQ_KEY, SMTP_*)
2. Subir por Filezilla: public_html/, tools/, storage/
3. Crear .env en SiteGround (copiar .env.production)
4. Crear BD MySQL en Site Tools
5. Ejecutar: php tools/migrate.php --seed (SSH o Cron)
6. Probar: /api/health (debe devolver ok: true)
7. Probar: login, grabación, correo
```

**Tiempo total:** 20-30 minutos

---

**Próximo paso:** Cuando termines todos los tests, ejecutar POST_DEPLOY_CHECKLIST.md completo
