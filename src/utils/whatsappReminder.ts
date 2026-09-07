import { Appointment, Professional } from '../types';

/**
 * Normaliza un número telefónico para la API de WhatsApp.
 * Si es de Argentina (10 u 11 dígitos sin prefijo internacional),
 * le agrega el código 54 9 (ej: 54911xxxxxxxx o 54934xxxxxxxx).
 */
export const cleanPhoneForWhatsApp = (phoneStr: string): string => {
  if (!phoneStr) return '';
  // Quitar todo lo que no sea dígito
  let digits = phoneStr.replace(/\D/g, '');

  if (!digits) return '';

  // Si empieza con 0 (ej: 011... o 0341...), quitar el 0
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Si tiene formato argentino de 10 dígitos (ej: 1112345678 o 3471420000)
  if (digits.length === 10) {
    digits = `549${digits}`;
  } else if (digits.length === 12 && digits.startsWith('54') && !digits.startsWith('549')) {
    // Si tiene 54 pero le falta el 9 móvil (ej: 541112345678 -> 5491112345678)
    digits = `549${digits.slice(2)}`;
  } else if (digits.length === 11 && digits.startsWith('15')) {
    // Si empieza con 15 local
    digits = `54911${digits.slice(2)}`;
  }

  return digits;
};

/**
 * Plantilla por defecto de recordatorio WhatsApp para el día siguiente
 */
export const DEFAULT_REMINDER_TEMPLATE = 
`Hola *{clientName}*! Te escribo de *Erika Valentini Salón de Belleza* para recordarte tu turno de mañana *{dateFormatted}* a las *{time} hs* para *{treatment}* con *{professionalName}*.

Por favor confirmanos tu asistencia respondiendo a este mensaje. ¡Te esperamos! ✨💇‍♀️`;

export interface ReminderMessageParams {
  clientName: string;
  dateStr: string;
  time: string;
  treatmentNote?: string;
  professionalName?: string;
  customTemplate?: string;
}

/**
 * Genera el texto personalizado del recordatorio
 */
export const buildReminderMessage = ({
  clientName,
  dateStr,
  time,
  treatmentNote,
  professionalName = 'Erika Valentini',
  customTemplate,
}: ReminderMessageParams): string => {
  const template = customTemplate || DEFAULT_REMINDER_TEMPLATE;

  // Formato de fecha legible (ej: "Lunes 7 de Septiembre")
  let dateFormatted = dateStr;
  try {
    const d = new Date(dateStr + 'T00:00:00');
    dateFormatted = d.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    // Capitalizar primer letra del día
    dateFormatted = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);
  } catch (e) {
    dateFormatted = dateStr;
  }

  const treatment = treatmentNote && treatmentNote.trim() ? treatmentNote.trim() : 'atención en el salón';

  return template
    .replace(/{clientName}/g, clientName || 'Clienta')
    .replace(/{dateFormatted}/g, dateFormatted)
    .replace(/{time}/g, time)
    .replace(/{treatment}/g, treatment)
    .replace(/{professionalName}/g, professionalName);
};

/**
 * Genera el enlace directo a WhatsApp Web / App
 */
export const getWhatsAppUrl = (phone: string, text: string): string => {
  const cleanPhone = cleanPhoneForWhatsApp(phone);
  if (!cleanPhone) return '';
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
};

/**
 * Configuración de Automatización de Recordatorios WhatsApp
 */
export interface WhatsAppReminderSettings {
  enabled: boolean; // Si el disparador automático está activo
  autoDispatchTime: string; // '14:00' por defecto
  autoOpenQueue: boolean; // Si inicia la cola de apertura automática
  secondsDelay: number; // Segundos entre cada mensaje en la cola (ej: 3)
  notificationAudio: boolean; // Sonido de campana a las 14:00 hs
  browserNotifications: boolean; // Notificación del sistema en el navegador
  customTemplate?: string;
  webhookUrl?: string; // URL opcional para envío silencioso vía API/Webhook
  lastDispatchedDate?: string; // YYYY-MM-DD para no repetir el mismo día
}

export const DEFAULT_REMINDER_SETTINGS: WhatsAppReminderSettings = {
  enabled: true,
  autoDispatchTime: '14:00',
  autoOpenQueue: true,
  secondsDelay: 3,
  notificationAudio: true,
  browserNotifications: true,
  webhookUrl: '',
};

const SETTINGS_STORAGE_KEY = 'erika_valentini_whatsapp_settings_v1';

export const getReminderSettings = (): WhatsAppReminderSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_REMINDER_SETTINGS;
    return { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_REMINDER_SETTINGS;
  }
};

export const saveReminderSettings = (settings: WhatsAppReminderSettings) => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Error saving whatsapp settings', e);
  }
};

/**
 * Emite un sonido de campana agradable del salón cuando llega la hora de los recordatorios
 */
export const playReminderChime = () => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Acorde suave de salón: G5 -> C6 -> E6
    const notes = [783.99, 1046.5, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.45);
    });
  } catch (e) {
    // Si la interacción previa no fue dada, se ignora silenciosamente
  }
};

/**
 * Pide permiso al navegador para notificaciones de escritorio / móvil
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const res = await Notification.requestPermission();
    return res === 'granted';
  }
  return false;
};

/**
 * Muestra notificación nativa en la pantalla
 */
export const showBrowserNotification = (title: string, body: string, onClick?: () => void) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const notif = new Notification(title, {
      body,
      icon: '/icon.png',
      badge: '/icon.png',
    });
    if (onClick) {
      notif.onclick = () => {
        window.focus();
        onClick();
      };
    }
  } catch (e) {
    console.warn('Could not trigger notification', e);
  }
};

/**
 * Envío silencioso a través de Webhook/API (opcional si el salón usa un servicio como Evolution API, Make, Zapier, etc.)
 */
export const sendWhatsAppViaWebhook = async (
  webhookUrl: string,
  payload: {
    phone: string;
    clientName: string;
    time: string;
    date: string;
    message: string;
    professionalName?: string;
  }
): Promise<boolean> => {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (e) {
    console.error('Error enviando WhatsApp por webhook', e);
    return false;
  }
};

/**
 * Calcula la fecha de mañana en formato YYYY-MM-DD según la hora local
 */
export const getTomorrowDateStr = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

/**
 * Verifica si actualmente son las 14:00 hs o posterior (horario solicitado de aviso del día anterior)
 */
export const isAroundReminderTime = (
  scheduledTimeStr: string = '14:00'
): {
  isReady: boolean;
  currentHour: number;
  currentMinute: number;
  scheduledHour: number;
  scheduledMinute: number;
} => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const [sHour, sMin] = (scheduledTimeStr || '14:00').split(':').map(Number);
  const scheduledHour = isNaN(sHour) ? 14 : sHour;
  const scheduledMinute = isNaN(sMin) ? 0 : sMin;

  const currentTotal = currentHour * 60 + currentMinute;
  const scheduledTotal = scheduledHour * 60 + scheduledMinute;

  // Se considera listo si es a partir de la hora fijada (14:00 hs)
  const isReady = currentTotal >= scheduledTotal;

  return {
    isReady,
    currentHour,
    currentMinute,
    scheduledHour,
    scheduledMinute,
  };
};
