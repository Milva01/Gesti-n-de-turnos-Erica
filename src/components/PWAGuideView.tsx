import React, { useState } from 'react';
import {
  FolderTree,
  FileCode,
  Server,
  Layers,
  Smartphone,
  CheckCircle2,
  Copy,
  Check,
  Globe,
  WifiOff,
} from 'lucide-react';

export const PWAGuideView: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const nodeServerCode = `// server.js (Node.js + Express)
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Base de datos simulada o conexión a SQLite / Postgres
let appointments = [];

// Rutas de API REST para la peluquería
app.get('/api/appointments', (req, res) => {
  res.json(appointments);
});

app.post('/api/appointments', (req, res) => {
  const newAppointment = { id: 'apt-' + Date.now(), ...req.body, createdAt: new Date() };
  appointments.unshift(newAppointment);
  res.status(201).json(newAppointment);
});

// Servir archivos estáticos de la PWA (compilados con Vite o estáticos)
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback para SPA (Single Page Application)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`💈 Servidor de Turnos Peluquería corriendo en http://localhost:\${PORT}\`);
});`;

  const manifestCode = `{
  "id": "/",
  "name": "Gestión de Turnos Peluquería",
  "short_name": "TurnosBarber",
  "description": "App Web Progresiva para reserva y gestión de turnos en peluquerías.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "icons": [
    {
      "src": "/pwa-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/pwa-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/pwa-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}`;

  const databaseSqlCode = `-- ==========================================
-- 1. BASE DE DATOS RELACIONAL (PostgreSQL / SQLite / MySQL)
-- ==========================================

-- Tabla 1: Estilistas / Barberos
CREATE TABLE stylists (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 2: Servicios de la Peluquería
CREATE TABLE services (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    duration_minutes INT NOT NULL, -- Duración del servicio en minutos
    is_active BOOLEAN DEFAULT TRUE
);

-- Tabla 3: Usuarios / Clientes
CREATE TABLE clients (
    id VARCHAR(36) PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(120),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 4: Citas / Turnos Agendados
CREATE TABLE appointments (
    id VARCHAR(36) PRIMARY KEY,
    client_id VARCHAR(36) REFERENCES clients(id),
    stylist_id VARCHAR(36) REFERENCES stylists(id) ON DELETE CASCADE,
    service_id VARCHAR(36) REFERENCES services(id),
    date DATE NOT NULL,
    time_start TIME NOT NULL,      -- Ej: '15:00:00'
    duration_minutes INT NOT NULL, -- Ej: 45
    total_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'confirmado', -- 'confirmado', 'en_proceso', 'completado', 'cancelado'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsqueda veloz de solapamientos por fecha y estilista
CREATE INDEX idx_appointments_date_stylist ON appointments(date, stylist_id);`;

  const algorithmJsCode = `/**
 * ============================================================================
 * LÓGICA DE NEGOCIO EN JAVASCRIPT: CÁLCULO DE HORARIOS SIN SOLAPAMIENTO
 * ============================================================================
 * Calcula los horarios disponibles para un estilista en una fecha determinada,
 * respetando la jornada laboral, la duración del servicio solicitado y evitando
 * que se superponga con citas ya confirmadas.
 *
 * @param {string} dateStr - Fecha en formato 'YYYY-MM-DD'
 * @param {string} stylistId - ID del estilista seleccionado
 * @param {number} serviceDurationMinutes - Duración en minutos del servicio elegido
 * @param {Array} existingAppointments - Lista de citas existentes
 * @param {Object} salonHours - Horarios de apertura y cierre
 * @returns {Array<{ time: string, available: boolean, reason?: string }>}
 */
function getAvailableTimeSlots(
  dateStr,
  stylistId,
  serviceDurationMinutes,
  existingAppointments,
  salonHours = { open: '09:00', close: '20:00', slotInterval: 30 }
) {
  const [openHour, openMin] = salonHours.open.split(':').map(Number);
  const [closeHour, closeMin] = salonHours.close.split(':').map(Number);
  const openTimeInMinutes = openHour * 60 + openMin;
  const closeTimeInMinutes = closeHour * 60 + closeMin;

  // 1. Filtrar las citas activas del estilista en esta fecha
  const stylistAppointmentsToday = existingAppointments.filter((apt) => {
    return (
      apt.date === dateStr &&
      apt.stylistId === stylistId &&
      apt.status !== 'cancelado'
    );
  });

  // Mapear cada cita a un intervalo de minutos [start, end]
  const busyIntervals = stylistAppointmentsToday.map((apt) => {
    const [h, m] = apt.time.split(':').map(Number);
    const start = h * 60 + m;
    const end = start + apt.durationMinutes;
    return { start, end };
  });

  // 2. Determinar si la fecha consultada es hoy para no ofrecer horas pasadas
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const isToday = dateStr === todayStr;
  const currentMinutesNow = now.getHours() * 60 + now.getMinutes();

  const slots = [];

  // 3. Iterar cada intervalo (ej: cada 30 minutos) dentro del horario comercial
  for (
    let slotStart = openTimeInMinutes;
    slotStart + serviceDurationMinutes <= closeTimeInMinutes;
    slotStart += salonHours.slotInterval
  ) {
    const slotEnd = slotStart + serviceDurationMinutes;

    // Formatear HH:mm
    const hh = String(Math.floor(slotStart / 60)).padStart(2, '0');
    const mm = String(slotStart % 60).padStart(2, '0');
    const timeFormatted = \`\${hh}:\${mm}\`;

    // A. Regla: Si es hoy y la hora ya pasó, no está disponible
    if (isToday && slotStart <= currentMinutesNow) {
      slots.push({ time: timeFormatted, available: false, reason: 'Horario pasado' });
      continue;
    }

    // B. Regla: Algoritmo de No-Solapamiento (Overlapping detection)
    // Dos intervalos [A_start, A_end] y [B_start, B_end] se solapan si:
    // slotStart < existingEnd && slotEnd > existingStart
    const hasOverlap = busyIntervals.some(
      (busy) => slotStart < busy.end && slotEnd > busy.start
    );

    if (hasOverlap) {
      slots.push({ time: timeFormatted, available: false, reason: 'Horario ocupado' });
    } else {
      slots.push({ time: timeFormatted, available: true });
    }
  }

  return slots;
}

/**
 * ============================================================================
 * GENERADOR DE ENLACE DIRECTO A WHATSAPP CON TEXTO PREFORMATEADO
 * ============================================================================
 * @param {string} phone - Teléfono con código de país (ej: '5491155554444')
 * @param {Object} appointmentData - Datos de la cita
 * @returns {string} URL lista para abrir WhatsApp en móvil o web
 */
function buildWhatsAppBookingLink(phone, appointmentData) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const message = 
    \`¡Hola \${appointmentData.clientName}! 💈\\n\\n\` +
    \`Te confirmamos tu turno en *\${appointmentData.salonName}*:\\n\` +
    \`🗓 *Fecha:* \${appointmentData.date}\\n\` +
    \`⏰ *Hora:* \${appointmentData.time} hs\\n\` +
    \`✂ *Servicio:* \${appointmentData.serviceName} ($\${appointmentData.price})\\n\` +
    \`👤 *Estilista:* \${appointmentData.stylistName}\\n\` +
    \`📍 *Dirección:* \${appointmentData.address}\\n\\n\` +
    \`¡Te esperamos puntualmente!\`;

  return \`https://wa.me/\${cleanPhone}?text=\${encodeURIComponent(message)}\`;
}`;

  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-4 space-y-8 animate-fade-in text-slate-200">
      {/* Intro Header */}
      <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-600/10 text-pink-400 flex items-center justify-center border border-pink-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">
              Arquitectura Técnica, Base de Datos & Algoritmo
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Estructura relacional SQL, modelo JSON / Firestore y algoritmo de cálculo de horarios sin solapamientos.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: ESTRUCTURA DE BASE DE DATOS (SQL & FIRESTORE) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-pink-400" />
            1. Base de Datos: Estructura Relacional (SQL) y Firestore
          </h3>
          <button
            onClick={() => copyToClipboard(databaseSqlCode, 'sql')}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg border border-slate-700 transition"
          >
            {copiedSection === 'sql' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar SQL</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Estructura para <strong>Usuarios/Clientes</strong>, <strong>Estilistas</strong>, <strong>Servicios</strong> (con precio y duración) y <strong>Citas/Turnos</strong> con claves foráneas e índices de rendimiento:
        </p>

        <pre className="bg-slate-900 border border-slate-850 p-4 rounded-2xl text-xs font-mono text-pink-300 overflow-x-auto max-h-96">
          {databaseSqlCode}
        </pre>
      </div>

      {/* SECTION 2: ALGORITMO JAVASCRIPT SIN SOLAPAMIENTOS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCode className="w-5 h-5 text-pink-400" />
            2. Algoritmo de Horarios Libres y WhatsApp en JavaScript
          </h3>
          <button
            onClick={() => copyToClipboard(algorithmJsCode, 'algorithm')}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg border border-slate-700 transition"
          >
            {copiedSection === 'algorithm' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Algoritmo JS</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Algoritmo matemático de intervalos <code className="text-pink-400">slotStart &lt; busy.end && slotEnd &gt; busy.start</code> que garantiza cero superposición y respeta la duración exacta del servicio:
        </p>

        <pre className="bg-slate-900 border border-slate-850 p-4 rounded-2xl text-xs font-mono text-emerald-300 overflow-x-auto max-h-96">
          {algorithmJsCode}
        </pre>
      </div>

      {/* SECTION 1: ESTRUCTURA DE ARCHIVOS */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <FolderTree className="w-5 h-5 text-pink-400" />
          1. Dónde colocar cada archivo en el proyecto
        </h3>

        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 font-mono text-xs text-slate-300 space-y-3">
          <div className="text-pink-400 font-bold">raíz-del-proyecto/</div>
          <div className="pl-4 space-y-2 text-slate-300">
            <div>
              <span className="text-emerald-400 font-semibold">├── public/</span>{' '}
              <span className="text-slate-500">// Archivos estáticos accesibles directamente por la URL</span>
              <div className="pl-6 space-y-1 text-slate-400">
                <div>├── icon.svg <span className="text-slate-500">(Ícono vectorial base)</span></div>
                <div>├── pwa-192x192.png <span className="text-slate-500">(Ícono obligatorio Android/Chrome)</span></div>
                <div>├── pwa-512x512.png <span className="text-slate-500">(Ícono obligatorio alta resolución)</span></div>
                <div>├── pwa-maskable-512x512.png <span className="text-slate-500">(Ícono con margen de seguridad)</span></div>
                <div>└── apple-touch-icon.png <span className="text-slate-500">(Ícono para iOS Safari home screen)</span></div>
              </div>
            </div>

            <div>
              <span className="text-emerald-400 font-semibold">├── index.html</span>{' '}
              <span className="text-slate-500">// HTML principal con etiquetas PWA (theme-color, apple-mobile-web-app)</span>
            </div>

            <div>
              <span className="text-emerald-400 font-semibold">├── vite.config.ts</span>{' '}
              <span className="text-slate-500">// Configura vite-plugin-pwa, Service Worker y Workbox cache</span>
            </div>

            <div>
              <span className="text-emerald-400 font-semibold">├── src/</span>
              <div className="pl-6 space-y-1 text-slate-400">
                <div>├── <span className="text-pink-300">types.ts</span> <span className="text-slate-500">(Modelos: Appointment, Barber, Service)</span></div>
                <div>├── <span className="text-pink-300">hooks/usePWAInstall.ts</span> <span className="text-slate-500">(Captura evento beforeinstallprompt)</span></div>
                <div>├── <span className="text-pink-300">hooks/useOnlineStatus.ts</span> <span className="text-slate-500">(Monitoreo online/offline reactivo)</span></div>
                <div>├── <span className="text-pink-300">utils/storage.ts</span> <span className="text-slate-500">(Persistencia local, cálculo de turnos y WhatsApp)</span></div>
                <div>├── <span className="text-pink-300">components/ClientBookingFlow.tsx</span> <span className="text-slate-500">(Flujo paso a paso para el cliente)</span></div>
                <div>├── <span className="text-pink-300">components/AdminDashboard.tsx</span> <span className="text-slate-500">(Panel de agenda del peluquero)</span></div>
                <div>└── <span className="text-pink-300">App.tsx</span> <span className="text-slate-500">(Componente raíz con sincronización)</span></div>
              </div>
            </div>

            <div>
              <span className="text-emerald-400 font-semibold">└── server.js</span>{' '}
              <span className="text-slate-500">// Servidor Node.js Express para servir en producción o conectar API</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: WEB APP MANIFEST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCode className="w-5 h-5 text-pink-400" />
            2. Web App Manifest (manifest.json)
          </h3>
          <button
            onClick={() => copyToClipboard(manifestCode, 'manifest')}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg border border-slate-700 transition"
          >
            {copiedSection === 'manifest' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar manifest</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          El manifiesto indica al navegador que la web es instalable como una app nativa, define el color de la barra de estado (<code className="text-pink-400">theme_color</code>) y cómo se abre (<code className="text-pink-400">display: "standalone"</code>, sin barra de direcciones del navegador).
        </p>

        <pre className="bg-slate-900 border border-slate-850 p-4 rounded-2xl text-xs font-mono text-pink-300 overflow-x-auto">
          {manifestCode}
        </pre>
      </div>

      {/* SECTION 3: SERVICE WORKER & OFFLINE CACHE */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <WifiOff className="w-5 h-5 text-pink-400" />
          3. Cómo funciona el soporte Offline (Sin Internet)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-800/70 border border-slate-700 p-4 rounded-2xl space-y-2">
            <div className="w-7 h-7 rounded-lg bg-pink-600/10 text-pink-400 flex items-center justify-center font-bold">
              1
            </div>
            <h4 className="font-bold text-white">Precaching de Archivos</h4>
            <p className="text-slate-400 leading-relaxed">
              El Service Worker descarga y almacena en caché HTML, CSS, JavaScript e íconos durante la primera visita. Cuando se corta la conexión, la app carga en 0.2 segundos desde la memoria local.
            </p>
          </div>

          <div className="bg-slate-800/70 border border-slate-700 p-4 rounded-2xl space-y-2">
            <div className="w-7 h-7 rounded-lg bg-pink-600/10 text-pink-400 flex items-center justify-center font-bold">
              2
            </div>
            <h4 className="font-bold text-white">Base de Datos Local</h4>
            <p className="text-slate-400 leading-relaxed">
              Todos los turnos, servicios, precios y horarios se guardan en <code className="text-pink-400">localStorage</code>. El peluquero puede consultar su agenda y marcar turnos completados aún en el subsuelo sin señal.
            </p>
          </div>

          <div className="bg-slate-800/70 border border-slate-700 p-4 rounded-2xl space-y-2">
            <div className="w-7 h-7 rounded-lg bg-pink-600/10 text-pink-400 flex items-center justify-center font-bold">
              3
            </div>
            <h4 className="font-bold text-white">WhatsApp & Calendarios</h4>
            <p className="text-slate-400 leading-relaxed">
              Al confirmar un turno se generan enlaces universales a WhatsApp y Google Calendar. El cliente recibe el mensaje directo sin necesidad de pagar por servicios costosos de SMS.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 4: NODE.JS BACKEND (EXPRESS) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-pink-400" />
            4. Servidor Node.js / Express (Opcional Full-Stack)
          </h3>
          <button
            onClick={() => copyToClipboard(nodeServerCode, 'server')}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg border border-slate-700 transition"
          >
            {copiedSection === 'server' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar server.js</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Si deseás desplegar la aplicación en un servidor propio con Node.js (como VPS, Heroku, Railway o Cloud Run), podés usar este archivo <code className="text-pink-400">server.js</code> para exponer las rutas REST y servir la PWA:
        </p>

        <pre className="bg-slate-900 border border-slate-850 p-4 rounded-2xl text-xs font-mono text-emerald-300 overflow-x-auto">
          {nodeServerCode}
        </pre>
      </div>

      {/* SECTION 5: INSTALLATION INSTRUCTIONS */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-pink-400" />
          5. Cómo probar e instalar en Celulares
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-800/80 border border-slate-700 p-5 rounded-2xl space-y-2.5">
            <span className="font-bold text-pink-400 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-pink-400" />
              Android (Google Chrome / Brave)
            </span>
            <ol className="list-decimal list-inside space-y-1 text-slate-300">
              <li>Abrí la URL de la app en Chrome.</li>
              <li>Hacé clic en el botón <strong>"Instalar App"</strong> en la cabecera, o tocá los 3 puntos del navegador.</li>
              <li>Seleccioná <strong>"Instalar aplicación"</strong> o "Agregar a la pantalla principal".</li>
              <li>La app aparecerá en tu cajón de aplicaciones con el ícono de la tijera.</li>
            </ol>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 p-5 rounded-2xl space-y-2.5">
            <span className="font-bold text-pink-400 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-pink-400" />
              iOS (iPhone / iPad en Safari)
            </span>
            <ol className="list-decimal list-inside space-y-1 text-slate-300">
              <li>Abrí la URL de la app en <strong>Safari</strong> (no en Chrome iOS).</li>
              <li>Tocá el botón <strong>Compartir</strong> (ícono con flecha hacia arriba).</li>
              <li>Deslizá hacia abajo y tocá <strong>"Agregar al inicio"</strong>.</li>
              <li>Confirmá tocando "Agregar". ¡Se abrirá en pantalla completa como app nativa!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
