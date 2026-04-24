# ESCOM TRACK

Sistema web progresivo (PWA) para técnicos de **Sistemas ESCOM** que capturan información operativa de sitios CEDIS y Pólizas de Granjas del cliente **Grupo Pecuario San Antonio S.A. de C.V.**

---

## 🚀 Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Angular 17 (Standalone Components) |
| Estilos | SCSS personalizado · DM Sans |
| Auth / DB | Firebase Auth + Firestore |
| Imágenes | Cloudinary (upload directo sin backend) |
| Reportes | `docx` + `xlsx` (generación en navegador) |
| Deploy | Vercel (auto-deploy desde GitHub) |
| PWA | @angular/pwa + Service Worker |

---

## 📋 Módulos del sistema

### Pólizas de Granjas
- Ciclo **enero – diciembre**
- 28 sitios por mes organizados en 4 grupos
- **Grupo 1:** Enero / Mayo / Septiembre
- **Grupo 2:** Febrero / Junio / Octubre
- **Grupo 3:** Marzo / Julio / Noviembre
- **Grupo 4:** Abril / Agosto / Diciembre

### CEDIS
- Ciclo **octubre – septiembre**
- ~46 sitios con frecuencia de visita 1–4 veces por año
- Meses variables por sitio según contrato

---

## 🔄 Flujo de estados por visita
Pendiente → En camino → En sitio → En proceso → Obs. guardadas → Completo

| Estado | Descripción |
|---|---|
| Pendiente | Visita sin iniciar |
| En camino | Técnico en ruta — registra hora de salida |
| En sitio | Técnico llegó — registra hora de llegada |
| En proceso | Servicio iniciado — registra hora de inicio |
| Obs. guardadas | Observaciones completadas |
| Completo | Documentación finalizada — descarga disponible |

---

## 👥 Roles del sistema

### ⭐ Super Administrador
- Control total del sistema sin restricciones
- Puede marcar sitios como **Completo** sin seguir el flujo (asignando técnico obligatorio)
- Al reabrir observaciones o documentación: **conserva toda la información**
- Puede editar observaciones y documentación finalizada sin reabrir
- Gestión completa de usuarios: crear, editar, eliminar, cambiar rol
- Puede cambiar su propia contraseña desde "Mi perfil"
- Puede cambiar la contraseña de cualquier usuario (se aplica en el próximo login)
- No aparece en la lista de usuarios visible para el Admin
- No puede ser editado por otros usuarios

### 🔵 Administrador
- Sigue la jerarquía de estados obligatoriamente
- Al reabrir observaciones: **borra observaciones y documentación (hard delete)**
- Al reabrir documentación: **borra documentación completa (hard delete)**
- Puede activar/desactivar técnicos
- Solo puede crear usuarios de tipo Técnico
- No puede eliminar usuarios
- No puede ver al Super Administrador en la lista

### 🔘 Técnico
- Solo opera su sitio activo asignado
- Sigue el flujo completo de estados
- Llena observaciones y documentación

---

## 🔐 Sistema de contraseñas

### Super Admin cambia su propia contraseña
1. Ir a Panel Admin → "Mi perfil"
2. Escribir nueva contraseña y confirmar
3. Guardar — se aplica inmediatamente

### Super Admin cambia contraseña de otro usuario
1. Ir a Panel Admin → Usuarios → Editar usuario (✏️)
2. Escribir la nueva contraseña en el campo correspondiente
3. Guardar — la contraseña se guarda temporalmente en Firestore
4. La próxima vez que ese usuario inicie sesión con su contraseña antigua, el sistema aplica la nueva automáticamente
5. Comunicar la nueva contraseña al usuario personalmente

---

## 📱 PWA — Uso offline

La aplicación funciona como PWA instalable en Android e iOS.

| Acción | Requiere internet |
|---|---|
| Primer login | ✅ Sí |
| Login con sesión guardada | ❌ No (si ya inició sesión antes) |
| Ver calendarios | ❌ No (caché de Firestore) |
| Llenar observaciones | ❌ No (se sincroniza al reconectar) |
| Subir fotos | ✅ Sí |
| Descargar .docx | ✅ Sí |

- La sesión expira automáticamente después de **8 horas**
- Los cambios hechos offline se sincronizan automáticamente al reconectar

### Instalar la app
- **Android:** Abrir en Chrome → menú → "Añadir a pantalla de inicio"
- **iOS:** Abrir en Safari → compartir → "Añadir a pantalla de inicio"
- O usar el botón de instalación en la barra de navegación

---

## 🎨 Temas visuales

| Tema | Activar | Descripción |
|---|---|---|
| ☁ Gris | Botón en menú | Tema por defecto (claro) |
| 🌙 Oscuro | Botón en menú | Gris oscuro azulado (#13131f) |
| ☀ Blanco | Botón en menú | Fondo completamente blanco |

El tema se guarda en `localStorage` y persiste entre sesiones.

---

## 📄 Generación de reportes

Los reportes se generan **directamente en el navegador** sin backend:

### .docx — Reporte completo
- Encabezado con nombre del sitio, técnico, fecha y tipo
- Checklist de documentación con fotos
- Tabla de observaciones con prioridades
- Generado con la librería `docx`

### .xlsx — Tabla de prioridades
- Lista de observaciones ordenadas por prioridad
- Alta / Media / Baja
- Generado con la librería `xlsx`

---

## 🔍 Observaciones

- Cada observación tiene: descripción, prioridad (Alta/Media/Baja) y nota opcional
- La nota es opcional pero si se escribe debe tener **mínimo 10 palabras**
- El técnico puede marcar "Sin observaciones" si el sitio no presenta problemas

---

## 📸 Documentación fotográfica

- Cada ítem del checklist requiere foto o marca "Sin fotos"
- Foto y "Sin fotos" se excluyen mutuamente automáticamente
- Items especiales permiten hasta **3 fotos**:
  - Verificación de red LAN y WAN
  - Supervisión de tierra física
  - Revisión del estado físico de tierra física
  - Revisión de sistema de pararrayos
  - Revisión del estado físico del pararrayos
- Las fotos se comprimen antes de subir (máx 500KB, máx 1280px)
- Se suben a **Cloudinary** (sin costo de Firebase Storage)

---

## 💻 Instalación local

```bash
# Clonar el repositorio
git clone https://github.com/EscomGui/EscomTrack.git
cd escom-track

# Instalar dependencias
npm install --legacy-peer-deps

# Levantar en desarrollo
ng serve
```

Abre `http://localhost:4200`

---

## 🚢 Deploy en Vercel

El proyecto se despliega automáticamente en **Vercel** al hacer push a `main`.

```bash
git add .
git commit -m "descripción del cambio"
git push
```

Vercel detecta el push y despliega en ~2 minutos.

### Variables de entorno en Vercel
No se requieren variables de entorno adicionales — la configuración de Firebase está en `src/environments/environment.ts`.

---

## 🌱 Primer uso — Configuración inicial

### 1. Crear el primer Super Admin
1. Crear un usuario normal desde Firebase Console → Authentication
2. Ir a Firestore → colección `usuarios`
3. Cambiar el campo `rol` de `"admin"` a `"superadmin"`

### 2. Iconos PWA
Generar iconos reales en [pwabuilder.com](https://pwabuilder.com) y colocarlos en `src/assets/icons/`:
- `icon-72.png`
- `icon-96.png`
- `icon-128.png`
- `icon-192.png`
- `icon-512.png`

### 3. Imagen de fondo del login
Subir imagen a `src/assets/login-bg.jpg` y agregar en el componente login:
```html
<div class="login-right" style="--login-bg: url('/assets/login-bg.jpg')">
```

---

## 📊 Colecciones de Firestore

| Colección | Descripción |
|---|---|
| `usuarios` | Perfiles de usuario con rol y estado |
| `visitas` | Una por sitio por mes — estado del servicio |
| `observaciones` | Observaciones por visita |
| `documentacion` | Checklist fotográfico por visita |

---

## 🔧 Comandos útiles

```bash
# Desarrollo
ng serve

# Build producción
ng build

# Verificar bundle size
ng build --stats-json

# Agregar dependencia
npm install <paquete> --legacy-peer-deps

# Push a producción
git add .
git commit -m "feat: descripción"
git push
```

---

## 📝 Historial de versiones

| Versión | Descripción |
|---|---|
| v1.0 | Sistema base — calendarios pólizas y CEDIS |
| v1.1 | Modal observaciones con prioridades |
| v1.2 | Modal documentación con fotos (Cloudinary) |
| v1.3 | Generación de reportes .docx y .xlsx |
| v1.4 | PWA — instalable y funciona offline |
| v1.5 | Modo oscuro / gris / blanco |
| v1.6 | Roles Super Admin / Admin / Técnico |
| v1.7 | Nota opcional en observaciones (mín. 10 palabras) |
| v1.8 | Documentación mejorada — layout foto + checkbox |
| v1.9 | Cambio de contraseña por Super Admin |
| v2.0 | Servicios en curso múltiples para Admin/SuperAdmin |

---

## 👨‍💻 Desarrollado por

**RAGUI**

Sistema desarrollado para **Sistemas ESCOM**
Cliente: **ESCOM**

© 2026 RAGUI · ESCOM TRACK · Todos los derechos reservados
