# 🎯 Torneo de Ajedrez - Guía de Implementación

## 📋 Descripción del Proyecto

Sistema profesional de gestión de torneos de ajedrez con diseño premium en modo oscuro. Incluye:

- ✅ Sistema de tarjetas (cards) moderno y elegante
- ✅ Clasificación en tiempo real
- ✅ Gestión de pareos
- ✅ Información detallada: ranking, ELO, puntos, rondas
- ✅ Integración con WhatsApp para contactar jugadores
- ✅ Panel de administración completo
- ✅ Sincronización en tiempo real con Firebase

---

## 🚀 Pasos de Implementación

### 1. Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto o usa uno existente
3. Habilita **Realtime Database**:
   - Ve a "Build" > "Realtime Database"
   - Haz clic en "Create Database"
   - Selecciona la ubicación más cercana a tus usuarios
   - Inicia en **modo de prueba** (puedes cambiar las reglas después)

4. Obtén tu configuración:
   - Ve a "Project Settings" (⚙️ en la esquina superior izquierda)
   - Desplázate hasta "Your apps" y haz clic en el ícono web (`</>`)
   - Copia el objeto `firebaseConfig`

### 2. Actualizar los Archivos

#### En `index.html` y `admin.html`:

Reemplaza este bloque en ambos archivos:

```javascript
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_AUTH_DOMAIN",
    databaseURL: "TU_DATABASE_URL",
    projectId: "TU_PROJECT_ID",
    storageBucket: "TU_STORAGE_BUCKET",
    messagingSenderId: "TU_MESSAGING_SENDER_ID",
    appId: "TU_APP_ID"
};
```

Con tus credenciales reales de Firebase.

### 3. Estructura de Archivos

Tu repositorio debe tener esta estructura:

```
torneo-ajedrez-web/
│
├── index.html         # Página principal (clasificación y pareos)
├── admin.html         # Panel de administración
├── style.css          # Estilos premium
├── app.js            # Lógica principal
├── admin.js          # Lógica del panel admin
└── README.md         # Esta guía
```

### 4. Estructura de la Base de Datos Firebase

Tu Realtime Database tendrá esta estructura:

```json
{
  "tournament": {
    "currentRound": 1
  },
  "players": {
    "player_id_1": {
      "name": "Magnus Carlsen",
      "rating": 2850,
      "whatsapp": "+34612345678",
      "points": 5.5,
      "games": 7,
      "wins": 5,
      "draws": 1,
      "losses": 1,
      "createdAt": 1698765432000
    }
  },
  "pairings": {
    "pairing_id_1": {
      "whitePlayerId": "player_id_1",
      "blackPlayerId": "player_id_2",
      "round": 1,
      "date": "15/10/2025",
      "result": "white",
      "createdAt": 1698765432000
    }
  }
}
```

### 5. Subir a GitHub Pages

1. Asegúrate de que todos los archivos estén en la rama `main` o `master`
2. Ve a tu repositorio en GitHub
3. Haz clic en "Settings"
4. En el menú lateral, busca "Pages"
5. En "Source", selecciona la rama `main` y la carpeta `/ (root)`
6. Haz clic en "Save"
7. Espera unos minutos y tu sitio estará en: `https://tu-usuario.github.io/torneo-ajedrez-web/`

---

## 🎨 Características del Diseño

### Paleta de Colores

- **Fondo Principal**: `#0a0e1a` (Azul oscuro profundo)
- **Fondo Secundario**: `#151922` (Carbón oscuro)
- **Tarjetas**: `#1a1f2e` (Gris azulado)
- **Acento Principal**: `#00d9ff` (Azul eléctrico)
- **Acento Secundario**: `#0099cc` (Azul medio)

### Fuentes

- **Títulos**: Montserrat (Google Fonts)
- **Texto**: Open Sans (Google Fonts)

### Efectos Visuales

- Sombras suaves con resplandor
- Animaciones de hover en tarjetas
- Transiciones suaves (cubic-bezier)
- Gradientes en botones y badges
- Efectos de glassmorphism sutil

---

## 📱 Funcionalidades

### Para Usuarios (index.html)

- **Clasificación en tiempo real**: Ver el ranking actualizado instantáneamente
- **Información detallada**: Ranking, ELO, puntos, partidas jugadas
- **Contacto directo**: Botón de WhatsApp para cada jugador
- **Pareos activos**: Ver todos los enfrentamientos programados
- **Resultados**: Estado de cada partida (pendiente, completada)

### Para Administradores (admin.html)

- **Gestión de jugadores**:
  - Agregar nuevos jugadores (nombre, ELO, WhatsApp)
  - Ver lista completa
  - Eliminar jugadores

- **Gestión de pareos**:
  - Crear pareos manuales
  - Generar pareos automáticos (sistema suizo)
  - Programar fechas

- **Control del torneo**:
  - Avanzar de ronda
  - Ver estadísticas generales
  - Reiniciar torneo (con confirmación)

---

## 🔧 Personalización

### Cambiar Colores

En `style.css`, modifica las variables CSS en `:root`:

```css
:root {
  --accent-primary: #00d9ff;  /* Tu color principal */
  --accent-secondary: #0099cc; /* Tu color secundario */
  /* ... más variables ... */
}
```

### Cambiar Título del Torneo

En `index.html`, línea 35:

```html
<h1 class="header-title">
    <i class="fas fa-chess"></i>
    TU TÍTULO AQUÍ
</h1>
```

### Añadir Más Estadísticas

Modifica el bloque `.header-stats` en `index.html` para agregar más métricas.

---

## 🐛 Solución de Problemas

### No se cargan los jugadores

1. Verifica que Firebase esté configurado correctamente
2. Comprueba la consola del navegador (F12) para ver errores
3. Asegúrate de que las reglas de Firebase permitan lectura/escritura

### Los estilos no se aplican

1. Verifica que `style.css` esté en el mismo directorio que `index.html`
2. Limpia la caché del navegador (Ctrl+Shift+R)
3. Verifica que no haya errores de sintaxis CSS

### Las funciones de admin no funcionan

1. Asegúrate de que `admin.js` esté correctamente vinculado
2. Verifica que Firebase esté inicializado
3. Revisa la consola para errores de JavaScript

---

## 📞 Configuración de WhatsApp

### Formato Correcto

El número de WhatsApp debe incluir:
- Código de país (con +)
- Número sin espacios ni guiones

**Ejemplos**:
- ✅ `+34612345678` (España)
- ✅ `+521234567890` (México)
- ✅ `+5491123456789` (Argentina)
- ❌ `612 345 678` (sin código de país)
- ❌ `+34 612-345-678` (con espacios/guiones)

---

## 🔐 Reglas de Seguridad de Firebase (Opcional)

Para producción, actualiza las reglas de Realtime Database:

```json
{
  "rules": {
    "players": {
      ".read": true,
      ".write": "auth != null"
    },
    "pairings": {
      ".read": true,
      ".write": "auth != null"
    },
    "tournament": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}
```

Esto permite a todos ver los datos, pero solo usuarios autenticados pueden modificarlos.

---

## 📈 Mejoras Futuras (Ideas)

- [ ] Sistema de autenticación para administradores
- [ ] Exportar clasificación a PDF
- [ ] Historial de partidas por jugador
- [ ] Sistema de notificaciones
- [ ] Modo claro/oscuro intercambiable
- [ ] Gráficos de rendimiento
- [ ] Chat entre jugadores
- [ ] Integración con API de Lichess/Chess.com

---

## 📄 Licencia

Este proyecto es de código abierto. Puedes usarlo y modificarlo libremente.

---

## 🙏 Créditos

- **Diseño**: Sistema moderno inspirado en Lichess y Chess.com
- **Iconos**: Font Awesome 6
- **Fuentes**: Google Fonts (Montserrat, Open Sans)
- **Backend**: Firebase Realtime Database

---

## 💡 Soporte

Si tienes problemas o preguntas:

1. Revisa esta guía completa
2. Verifica la consola del navegador (F12)
3. Comprueba que Firebase esté configurado correctamente
4. Asegúrate de que todos los archivos estén en su lugar

---

**¡Disfruta de tu torneo de ajedrez profesional! ♟️**