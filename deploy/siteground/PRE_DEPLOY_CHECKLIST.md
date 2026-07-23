# Pre-Despliegue: Checklist de verificación

**Verificaciones ANTES de subir a SiteGround**

Use este checklist para asegurar que está listo. NO continuar si algo está incompleto.

---

## 📋 Verificación de archivos en LOCAL

### Código

- [ ] `public_html/` existe y contiene:
  - [ ] `index.html`
  - [ ] `admin-*.html`, `recuperar.html`
  - [ ] `js/`, `css/`, `img/`, `audio/`
  - [ ] `api/` con `index.php`, `config.php`, `bootstrap.php`, `.htaccess`

- [ ] `tools/` contiene:
  - [ ] `migrate.php`
  - [ ] `seed.php`

- [ ] `docs/` contiene documentación (opcional pero recomendado)

### Configuración

- [ ] `.env` LOCAL existe y funciona:
  - [ ] `DB_DRIVER=sqlite`
  - [ ] El servidor local arranca: `php -S localhost:8000 -t public_html`
  - [ ] `/api/health` responde OK

- [ ] `.env.example` existe en repositorio

- [ ] `.env.local` existe (opcional, para overrides)

### Git (si usas)

- [ ] Verificar que NO están en git:
  ```bash
  git status
  # No debe mostrar:
  #   .env
  #   .env.local
  #   db/
  #   storage/
  ```

- [ ] `.gitignore` contiene:
  ```
  .env
  .env.local
  db/
  storage/
  ```

---

## 📋 Verificación de credenciales/accesos

### SiteGround

- [ ] Tienes acceso a SiteGround (login funciona)

- [ ] Acceso a Site Tools:
  - [ ] MySQL: puedes ver las bases de datos
  - [ ] File Manager: puedes ver `/public_html/` y raíz

- [ ] Acceso SFTP:
  - [ ] Credenciales de SFTP (usuario/contraseña)
  - [ ] Puerto: 18765 (típico en SiteGround)

- [ ] SSL activo:
  - [ ] Ir a `https://institutoj20.sg-host.com/`
  - [ ] Aparece 🔒 (cerrado/seguro)

### GROQ

- [ ] Tienes cuenta en GROQ: https://console.groq.com/

- [ ] API key generada:
  - [ ] Ir a: Billing → Add payment method
  - [ ] Tarjeta agregada
  - [ ] API key copiada (valor `gsk_...`)
  - [ ] Guardar en lugar seguro (contraseña/gestor)

### SMTP/Correo

- [ ] Credenciales de correo institucional:
  - [ ] Correo: `speakingtest@itsjapon.edu.ec`
  - [ ] Contraseña o "contraseña de app"
  - [ ] Servidor SMTP (anotar)
  - [ ] Puerto SMTP (anotar: 587 o 465)

---

## 📋 Verificación de `.env.production`

### Archivo

- [ ] `deploy/siteground/.env.production` existe

- [ ] Abierto en editor de texto (NO en Word)

- [ ] Todos los `XXXX_..._XXXX` han sido reemplazados:

  ```bash
  # OBLIGATORIO reemplazar:
  
  [ ] DB_HOST=XXXX_OBTENER_DE_SITEGROUND_XXXX
      ↓
      DB_HOST=localhost (o valor real)
  
  [ ] DB_NAME=XXXX_NOMBRE_BD_SITEGROUND_XXXX
      ↓
      DB_NAME=miatech_bd
  
  [ ] DB_USER=XXXX_USUARIO_MYSQL_SITEGROUND_XXXX
      ↓
      DB_USER=miatech_user
  
  [ ] DB_PASSWORD=XXXX_CONTRASEÑA_MYSQL_SITEGROUND_XXXX
      ↓
      DB_PASSWORD=abc123xyz (SECRETO, guardado)
  
  [ ] STORAGE_LOCAL_PATH=/home/customer/www/institutoj20.sg-host.com/storage
      ↓
      (Verificar que coincide con tu ruta SiteGround)
  
  [ ] GROQ_API_KEY=XXXX_GROQ_API_KEY_PLAN_PAGO_XXXX
      ↓
      GROQ_API_KEY=gsk_abcdef1234567890xyz
  
  [ ] SMTP_HOST=XXXX_SERVIDOR_SMTP_XXXX
      ↓
      SMTP_HOST=smtp.gmail.com (o servidor real)
  
  [ ] SMTP_PORT=587
      ↓
      (Verificar que es 587 o 465, según servidor)
  
  [ ] SMTP_PASSWORD=XXXX_CONTRASEÑA_SMTP_SITEGROUND_XXXX
      ↓
      SMTP_PASSWORD=abc123xyz (SECRETO, guardado)
  ```

### Valores críticos verificados

- [ ] `APP_ENV=production` (NO development)

- [ ] `APP_DEBUG=false` (NO true)

- [ ] `DB_DRIVER=mysql` (NO sqlite)

- [ ] `GROQ_API_KEY` NO está vacío (NO =)

- [ ] `SMTP_HOST` NO está vacío (NO =)

- [ ] `SMTP_PASSWORD` NO está vacío (NO =)

---

## 📋 Verificación de archivos a NO subir

Confirmar que ESTOS ARCHIVOS están limpios y NO se van a subir:

- [ ] `db/miatech.sqlite` — ELIMINAR
  ```bash
  rm -f db/miatech.sqlite
  ```

- [ ] `storage/` — Debe estar VACÍA o sin contenido viejo:
  ```bash
  rm -rf storage/*
  mkdir -p storage/2025B/videos storage/2025B/pdf storage/tmp
  ```

- [ ] `node_modules/` — NO debe existir (es PHP puro)

- [ ] `.git/` — NO se sube (Git lo maneja)

- [ ] `.env` LOCAL — NO se sube (en `.gitignore`)

- [ ] `.env.local` — NO se sube (en `.gitignore`)

---

## 📋 Preparación de datos de prueba

- [ ] Decidir: ¿Usar `--seed` (datos de prueba) o no?

  **Opción A: CON --seed (recomendado para pruebas)**
  - [ ] Tendrás usuarios de prueba
  - [ ] Puedes hacer login y probar el flujo completo
  - [ ] ANTES de producción real, eliminar estos datos

  **Opción B: SIN --seed (producción real)**
  - [ ] Solo crear esquema (tablas vacías)
  - [ ] Los usuarios se crean manualmente después
  - [ ] Más lento de probar, pero limpio desde el inicio

  **Decisión:** [ ] CON --seed  |  [ ] SIN --seed

---

## 📋 Documentación a tener a mano

- [ ] Credenciales SiteGround guardadas de forma segura
- [ ] Clave GROQ guardada de forma segura
- [ ] Credenciales SMTP guardadas de forma segura
- [ ] Este checklist completado (para referencia)
- [ ] README.md leído y comprendido
- [ ] POST_DEPLOY_CHECKLIST.md impreso o visible

---

## 📋 Último check

### ¿Todo está listo?

- [ ] Archivos locales preparados y limpios
- [ ] Credenciales y accesos verificados
- [ ] `.env.production` completamente editado
- [ ] Valores críticos verificados
- [ ] Archivos "no subir" identificados
- [ ] Decisión sobre --seed tomada

### Si algo NO está marcado:

**STOP** — No continuar con el despliegue.

- [ ] Revisar el punto que falta
- [ ] Completar la acción
- [ ] Volver a este checklist

### Si TODO está marcado:

✅ **LISTO PARA DESPLEGAR**

→ Proceder a: **README.md Fase 2 (Subir archivos a SiteGround)**

---

## 📝 Notas personales

Usar este espacio para anotar datos importantes:

```
SiteGround HOST:        _________________
Base de datos:          _________________
Usuario MySQL:          _________________
Contraseña MySQL:       _________________

GROQ API Key:           _________________
SMTP Host:              _________________
SMTP Puerto:            _________________
SMTP Contraseña:        _________________

Otras notas:
____________________________________________
____________________________________________
```

---

**Fecha de este checklist:** _____________

**Persona que verifica:** _________________

**Firma:** _________________________________
