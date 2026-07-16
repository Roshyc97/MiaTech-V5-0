# Diagnóstico: Botón "Test Assessment" (HOME) — MiaTech v5

**Fecha:** 2026-07-15  
**Problema:** Botón `btn-begin-assessment` no responde al clic  
**Estado:** En investigación

---

## 1️⃣ ANÁLISIS DEL CÓDIGO

### Elemento HTML (index.html, línea 117-119)
```html
<button id="btn-begin-assessment" class="btn-primary">
    🏠 Test Assessment
</button>
```
✅ **ID correcto:** `btn-begin-assessment`  
✅ **Clase CSS:** `btn-primary`  
✅ **Contenido:** Visible ("🏠 Test Assessment")

---

### Sistema de Navegación (recorder.js)

#### Inicialización (línea 942-947)
```javascript
document.addEventListener('DOMContentLoaded', async () => {
    await cargarConfiguracion();  // ← AQUÍ puede estar el problema
    initHome();
    initLogin();
    initInstructions();
});
```

#### Función `initHome()` (línea 118-123)
```javascript
function initHome() {
    const btn = $('btn-begin-assessment');
    if (btn) {
        btn.onclick = () => mostrarSeccion('student-info-section');
    }
}
```

#### Función `$()` (línea 64)
```javascript
const $ = id => document.getElementById(id);
```
✅ Simple, busca por ID

#### Función `mostrarSeccion()` (línea 66-72)
```javascript
function mostrarSeccion(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const sec = $(id);
    if (sec) sec.classList.add('active');
    actualizarProgreso(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
```

---

## 2️⃣ POSIBLES CAUSAS

### ❌ Causa 1: `cargarConfiguracion()` falla y bloquea resto

**Ubicación:** `recorder.js` línea 26-37
```javascript
async function cargarConfiguracion() {
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            const data = await res.json();
            CONFIG = { ...CONFIG, ...data };
            console.log('✅ Configuración cargada desde .env:', CONFIG);
        }
    } catch (err) {
        console.warn('⚠️ Usando configuración por defecto:', err.message);
    }
}
```

**Problema:** 
- Si `/api/config` retorna **403 Forbidden** (por colisión MultiViews — ⚠️ Ya fue solucionado), la promesa `await` no rechaza (no lanza error)
- Pero si hay un error de red, la ejecución podría pausarse
- ❓ **¿Se ejecuta la línea `initHome()` después?**

**Síntoma en F12 Console:**
```
❌ (si hay error) GET /api/config 403 Forbidden
❌ Network timeout
```

---

### ❌ Causa 2: Elemento no existe cuando `initHome()` se ejecuta

**Escenario:**
- DOMContentLoaded se dispara antes de que el HTML del botón esté renderizado
- `$('btn-begin-assessment')` retorna `null`
- `if (btn)` es false, no se asigna el onclick

**Muy improbable** porque:
- El HTML está en el mismo documento (no es dinámico)
- El evento DOMContentLoaded espera a que todo el DOM cargue

---

### ❌ Causa 3: Conflicto con `navigation.js` (archivo legacy)

**Archivo:** `navigation.js` existe en `public_html/` (línea 245)
```javascript
const btnBegin = document.getElementById('btn-begin-assessment');
if (btnBegin) {
    btnBegin.addEventListener('click', startAssessmentV3);
}
```

**Estado:** 
- ✅ `navigation.js` **NO está cargado** en `index.html` (solo `<script src="js/recorder.js"></script>`)
- Si fuera cargado, habría conflicto: dos listeners en el mismo botón

---

### ❌ Causa 4: CSS oculta el botón

**Búsqueda:** `#btn-begin-assessment` en CSS

**Verificar:**
- ¿El botón tiene `display: none`?
- ¿Tiene `visibility: hidden`?
- ¿Está fuera del viewport (margin/padding negativa)?
- ¿Tiene `pointer-events: none`?

---

### ❌ Causa 5: Error en `mostrarSeccion()`

Si el onclick se asigna correctamente pero NO navega:
- Verificar que `$('student-info-section')` existe (línea 123 en index.html)
- Verificar que `actualizarProgreso()` no lanza error (línea 74-88 en recorder.js)

---

## 3️⃣ CHECKLIST DE DIAGNÓSTICO (Ejecutar en Navegador)

### Paso 1: Verificar elemento existe
```javascript
// En F12 Console, pegar:
const btn = document.getElementById('btn-begin-assessment');
console.log('Botón existe:', !!btn);
console.log('Botón visible:', btn && window.getComputedStyle(btn).display !== 'none');
console.log('Onclick asignado:', !!btn?.onclick);
```

**Resultado esperado:**
```
Botón existe: true
Botón visible: true
Onclick asignado: true
```

---

### Paso 2: Verificar `cargarConfiguracion()` completó
```javascript
// En F12 Console:
console.log('CONFIG:', CONFIG);
```

**Resultado esperado:**
```
CONFIG: {
    minDuration: 60,
    maxDuration: 300,
    timeLabel: "1–5 min",
    taskText: "Describe the picture.",
    defaultImageFolder: "imagenes",
    siteName: "Mi@Tech"
}
```

---

### Paso 3: Verificar logs de inicialización
```javascript
// En F12 Console, buscar estos logs al recargar página:
// ✅ Configuración cargada desde .env
// ✅ Nombre inyectado en DOM
// ✅ Navigation system v5.0 initialized (si navigation.js se carga)
```

---

### Paso 4: Prueba manual del onclick
```javascript
// En F12 Console, ejecutar manualmente:
const btn = document.getElementById('btn-begin-assessment');
btn.click();  // Simular clic

// Verificar que la sección cambia:
const homeActive = document.getElementById('home-section').classList.contains('active');
const studentInfoActive = document.getElementById('student-info-section').classList.contains('active');
console.log('Home activo:', homeActive);
console.log('Student-info activo:', studentInfoActive);
```

**Resultado esperado:**
```
Home activo: false
Student-info activo: true
```

---

### Paso 5: Verificar en Network Tab
1. Abrir F12 → Network
2. Recargar página
3. Buscar request a `/api/config`
   - ✅ Status **200 OK** (solucionado con `Options -MultiViews`)
   - ❌ Status **403 Forbidden** (problema de colisión)
   - ❌ Status **404** (endpoint no existe)
   - ❌ Network error (servidor no responde)

---

## 4️⃣ HIPÓTESIS MÁS PROBABLE

**Escenario:** El botón SÍ funciona, pero no "se nota" porque:

### 🔍 Causa Potencial: `cargarConfiguracion()` tarda mucho
- Si `/api/config` es lento (servidor remoto), el `await` retarda toda la inicialización
- El usuario hace clic antes de que `initHome()` se ejecute
- El onclick aún no está asignado

**Síntoma:**
```
✅ Clic inmediato (< 100ms) → no funciona
✅ Clic después de 2 segundos → sí funciona
```

**Solución:** Cambiar el evento DOMContentLoaded para no usar `await`

---

### 🔍 Causa Potencial: Error silencioso en `cargarConfiguracion()`
Si la fetch falla pero el catch no logguea correctamente:
```javascript
catch (err) {
    console.warn('⚠️ Usando configuración por defecto:', err.message);  // ← Aquí
}
```

El error es "warn", no "error", así que puede pasar desapercibido en console.

---

## 5️⃣ RECOMENDACIÓN PARA PRUEBA

### Quick Test en F12 Console (1 minuto)
```javascript
// 1. Verificar elemento y onclick
const btn = document.getElementById('btn-begin-assessment');
console.log('✅ Botón:', !!btn, btn?.onclick);

// 2. Clicar manualmente
btn?.click();

// 3. Verificar que cambió de sección
console.log('✅ Ahora en:', document.querySelector('.section.active')?.id);
```

**Si retorna `student-info-section`:** El botón FUNCIONA ✅  
**Si retorna `home-section`:** El botón NO FUNCIONA ❌

---

### Si NO funciona: Debug más profundo
```javascript
// Verificar que initHome() fue llamada
console.log('✅ initHome existe:', typeof initHome);

// Simular lo que debería hacer initHome()
function testInitHome() {
    const btn = document.getElementById('btn-begin-assessment');
    console.log('Botón existe:', !!btn);
    if (btn) {
        btn.onclick = () => {
            console.log('Onclick disparado');
            mostrarSeccion('student-info-section');
        };
        console.log('Onclick asignado');
        btn.click();
    }
}
testInitHome();
```

---

## 6️⃣ POSIBLE SOLUCIÓN

Si el problema es el `await cargarConfiguracion()`, cambiar:

**Actual (recorder.js línea 942-947):**
```javascript
document.addEventListener('DOMContentLoaded', async () => {
    await cargarConfiguracion();  // ← Bloquea
    initHome();
    initLogin();
    initInstructions();
});
```

**Propuesta (no bloquear):**
```javascript
document.addEventListener('DOMContentLoaded', () => {
    cargarConfiguracion();  // ← Sin await (se ejecuta en background)
    initHome();  // ← Se ejecuta inmediatamente
    initLogin();
    initInstructions();
});
```

**Ventaja:** `initHome()` se asigna al DOM inmediatamente, sin esperar a que la fetch termine.

---

## ✅ CONCLUSIÓN

| Posibilidad | Probabilidad | Síntoma | Solución |
|---|---|---|---|
| `cargarConfiguracion()` bloquea | 🔴 **Alta** | Clic no funciona inmediatamente | No usar `await` en DOMContentLoaded |
| Elemento no existe | 🟢 Muy baja | Nunca funciona | Verificar HTML |
| CSS oculta botón | 🟡 Media | Botón invisible o grisado | Revisar `styles.css` + `recorder.css` |
| Error en `mostrarSeccion()` | 🟡 Media | Clic sin navegar | Debug en console |
| Conflicto `navigation.js` | 🟢 Muy baja | Ya verificado no carga | — |

---

**Próximo paso:** Ejecutar el Quick Test en F12 Console y reportar qué sucede. Basado en eso, ajustaremos `recorder.js` o `styles.css`.
