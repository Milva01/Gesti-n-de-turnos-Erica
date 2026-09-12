import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  ExternalLink,
  Check,
  AlertCircle,
  X,
  Phone,
  Calendar,
  Clock,
  Sparkles,
  RefreshCw,
  Database,
  Send,
  Copy,
} from 'lucide-react';
import { Appointment, Professional } from '../types';
import {
  cleanPhoneForWhatsApp,
  getWhatsAppUrl,
} from '../utils/whatsappReminder';
import { saveAppointmentToFirebase, fetchAppointmentsByDateFromFirestore } from '../firebase';

interface TomorrowItem {
  appointment: Appointment;
  professionalName: string;
  hasValidPhone: boolean;
  cleanPhone: string;
  whatsappUrl: string;
  reminderMessage: string;
}

interface TomorrowReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  tomorrowDate: string;
  tomorrowAppointments: Appointment[];
  professionals: Professional[];
  onAppointmentsChange: (updated: Appointment[]) => void;
}

export const TomorrowReminderModal: React.FC<TomorrowReminderModalProps> = ({
  isOpen,
  onClose,
  tomorrowDate,
  tomorrowAppointments,
  professionals,
  onAppointmentsChange,
}) => {
  const [loadingFirestore, setLoadingFirestore] = useState(false);
  const [firestoreAppointments, setFirestoreAppointments] = useState<Appointment[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openingAll, setOpeningAll] = useState(false);

  // Load from Firestore whenever the modal opens or tomorrowDate changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadFromFirestore = async () => {
      setLoadingFirestore(true);
      try {
        const cloudAppointments = await fetchAppointmentsByDateFromFirestore(tomorrowDate);
        if (isMounted) {
          if (cloudAppointments && cloudAppointments.length > 0) {
            setFirestoreAppointments(cloudAppointments);
          } else {
            // If empty in Firestore, fallback to local state passed in props
            setFirestoreAppointments(tomorrowAppointments);
          }
        }
      } catch (err) {
        console.error('Error fetching tomorrow appointments from Firestore:', err);
        if (isMounted) {
          setFirestoreAppointments(tomorrowAppointments);
        }
      } finally {
        if (isMounted) {
          setLoadingFirestore(false);
        }
      }
    };

    loadFromFirestore();

    return () => {
      isMounted = false;
    };
  }, [isOpen, tomorrowDate, tomorrowAppointments]);

  if (!isOpen) return null;

  // Format readable date (e.g., "Miércoles 16 de Septiembre")
  let readableTomorrow = tomorrowDate;
  try {
    const d = new Date(tomorrowDate + 'T00:00:00');
    readableTomorrow = d.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    readableTomorrow = readableTomorrow.charAt(0).toUpperCase() + readableTomorrow.slice(1);
  } catch (e) {
    readableTomorrow = tomorrowDate;
  }

  // Friendly text generator for tomorrow's appointment
  const createFriendlyMessage = (apt: Appointment, profName: string): string => {
    const treatment = apt.treatmentNote && apt.treatmentNote.trim() ? apt.treatmentNote.trim() : 'atención en el salón';
    return `¡Hola ${apt.clientName}! Te recordamos tu turno para mañana ${readableTomorrow} a las ${apt.time} hs para ${treatment} con ${profName} en Erika Valentini Salón de Belleza. ¡Te esperamos con muchas ganas! Si necesitás consultarnos o modificar algo, por favor avisanos por acá. ✨💇‍♀️`;
  };

  const activeAppointments = firestoreAppointments.length > 0 ? firestoreAppointments : tomorrowAppointments;

  // Map and sort appointments by time
  const items: TomorrowItem[] = activeAppointments
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((apt) => {
      const prof = professionals.find((p) => p.id === apt.professionalId);
      const profName = prof?.name || 'Erika Valentini';
      const cleanPhone = cleanPhoneForWhatsApp(apt.clientPhone);
      const hasValidPhone = Boolean(cleanPhone && cleanPhone.length >= 8);

      const msg = createFriendlyMessage(apt, profName);
      const url = hasValidPhone ? getWhatsAppUrl(apt.clientPhone, msg) : '';

      return {
        appointment: apt,
        professionalName: profName,
        hasValidPhone,
        cleanPhone,
        whatsappUrl: url,
        reminderMessage: msg,
      };
    });

  // Only appointments with valid phone registered
  const validItems = items.filter((it) => it.hasValidPhone);
  const invalidItems = items.filter((it) => !it.hasValidPhone);

  const handleMarkSent = (item: TomorrowItem) => {
    const nowTime = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const updatedApt: Appointment = {
      ...item.appointment,
      reminderSent: true,
      reminderSentAt: nowTime,
    };

    // Save in Firestore
    saveAppointmentToFirebase(updatedApt);

    // Update local state in modal and parent
    setFirestoreAppointments((prev) =>
      prev.map((a) => (a.id === item.appointment.id ? updatedApt : a))
    );
    const parentUpdated = tomorrowAppointments.map((a) =>
      a.id === item.appointment.id ? updatedApt : a
    );
    onAppointmentsChange(parentUpdated);
  };

  const handleOpenSingleChat = (item: TomorrowItem) => {
    if (!item.whatsappUrl) return;
    window.open(item.whatsappUrl, '_blank', 'noopener,noreferrer');
    handleMarkSent(item);
  };

  const handleOpenAllChats = () => {
    if (validItems.length === 0) return;
    setOpeningAll(true);

    validItems.forEach((item, index) => {
      setTimeout(() => {
        if (item.whatsappUrl) {
          window.open(item.whatsappUrl, '_blank', 'noopener,noreferrer');
          handleMarkSent(item);
        }
        if (index === validItems.length - 1) {
          setOpeningAll(false);
        }
      }, index * 700);
    });
  };

  const handleCopyLink = (item: TomorrowItem) => {
    if (!item.whatsappUrl) return;
    navigator.clipboard.writeText(item.whatsappUrl);
    setCopiedId(item.appointment.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRefresh = async () => {
    setLoadingFirestore(true);
    try {
      const cloudAppointments = await fetchAppointmentsByDateFromFirestore(tomorrowDate);
      setFirestoreAppointments(cloudAppointments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFirestore(false);
    }
  };

  return (
    <div
      id="tomorrow-reminders-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tomorrow-reminders-title"
    >
      <div
        id="tomorrow-reminders-modal-card"
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 shrink-0">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Firestore en Vivo
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                  wa.me/NUMERO?text=MENSAJE
                </span>
              </div>
              <h3 id="tomorrow-reminders-title" className="text-xl font-black text-white mt-1">
                Enviar Recordatorios de Mañana
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>{readableTomorrow}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">({tomorrowDate})</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              id="refresh-firestore-reminders-btn"
              onClick={handleRefresh}
              disabled={loadingFirestore}
              className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition disabled:opacity-50"
              title="Volver a consultar Firestore"
            >
              <RefreshCw className={`w-4 h-4 ${loadingFirestore ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              id="tomorrow-reminders-close-btn"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {loadingFirestore ? (
            <div className="text-center py-14 px-4 space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-200">Buscando turnos de mañana en Firestore...</p>
              <p className="text-xs text-slate-500">Consultando la colección de citas para la fecha {tomorrowDate}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-800">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-300">No hay turnos agendados para mañana</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No se encontraron citas programadas en Firestore para el día de mañana ({tomorrowDate}).
              </p>
            </div>
          ) : (
            <>
              {/* Summary Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                <div className="text-slate-300">
                  <span>
                    Encontrados en Firestore: <strong className="text-white">{items.length}</strong> turno(s) para mañana
                  </span>
                  {validItems.length > 0 ? (
                    <span className="text-emerald-400 font-bold ml-1.5">
                      ({validItems.length} con teléfono registrado)
                    </span>
                  ) : (
                    <span className="text-rose-400 font-semibold ml-1.5">
                      (Ninguno tiene teléfono cargado)
                    </span>
                  )}
                </div>

                {validItems.length > 0 && (
                  <button
                    id="open-all-whatsapp-btn"
                    type="button"
                    onClick={handleOpenAllChats}
                    disabled={openingAll}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition disabled:opacity-50"
                    title="Abre secuencialmente una ventana de WhatsApp para cada turno"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{openingAll ? 'Abriendo chats...' : `Abrir los ${validItems.length} WhatsApp`}</span>
                  </button>
                )}
              </div>

              {/* List of items */}
              <div className="space-y-3">
                {items.map((item) => {
                  const { appointment, professionalName, hasValidPhone, cleanPhone, whatsappUrl, reminderMessage } = item;
                  const isSent = Boolean(appointment.reminderSent);

                  return (
                    <div
                      key={appointment.id}
                      id={`reminder-item-${appointment.id}`}
                      className={`p-4 rounded-2xl border transition ${
                        isSent
                          ? 'bg-slate-900/60 border-emerald-500/30'
                          : hasValidPhone
                          ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700 hover:border-slate-600'
                          : 'bg-slate-900/30 border-rose-900/30 opacity-75'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-lg bg-pink-500/15 text-pink-300 text-xs font-black border border-pink-500/30 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {appointment.time} hs
                            </span>
                            <h4 className="text-sm font-bold text-white">{appointment.clientName}</h4>
                            <span className="text-xs text-slate-400">• con {professionalName}</span>
                            {isSent && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                <Check className="w-3 h-3" />
                                Recordatorio enviado {appointment.reminderSentAt ? `(${appointment.reminderSentAt} hs)` : ''}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                            {hasValidPhone ? (
                              <span className="flex items-center gap-1 text-slate-300 font-mono">
                                <Phone className="w-3 h-3 text-emerald-400" />
                                {appointment.clientPhone}
                                <span className="text-slate-500 text-[10px]">
                                  (wa.me/{cleanPhone})
                                </span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-rose-400 font-medium">
                                <AlertCircle className="w-3 h-3" />
                                Sin teléfono válido registrado
                              </span>
                            )}
                            {appointment.treatmentNote && (
                              <span className="italic text-slate-400">
                                «{appointment.treatmentNote}»
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="shrink-0 flex items-center gap-2">
                          {hasValidPhone ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCopyLink(item)}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
                                title="Copiar enlace wa.me al portapapeles"
                              >
                                {copiedId === appointment.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Primary Open WhatsApp Button as direct <a> for browser popup compatibility */}
                              <a
                                id={`send-wa-link-${appointment.id}`}
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => handleMarkSent(item)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
                                  isSent
                                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                                }`}
                                title="Abrir ventana de WhatsApp con el mensaje listo para enviar"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-white" />
                                <span>{isSent ? 'Reenviar WhatsApp' : 'Abrir WhatsApp'}</span>
                                <ExternalLink className="w-3 h-3 opacity-70" />
                              </a>
                            </>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-500 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700">
                              Teléfono no disponible
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Preview of the formatted friendly message and URL */}
                      {hasValidPhone && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5">
                          <div className="text-[11px] text-slate-400 bg-slate-950/50 p-2 rounded-xl border border-slate-800/50">
                            <span className="text-emerald-400 font-bold select-none mr-1.5">Texto del Recordatorio:</span>
                            <span>{reminderMessage}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate px-1 flex items-center gap-1">
                            <span className="text-slate-400">Enlace directo:</span>
                            <span className="text-emerald-400/80 truncate">{whatsappUrl}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Cada enlace abre WhatsApp Web o la App oficial con el texto amigable pre-cargado listo para enviar.
            </span>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              id="tomorrow-reminders-modal-done-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition text-xs border border-slate-700"
            >
              Listo / Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
