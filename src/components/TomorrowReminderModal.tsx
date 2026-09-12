import React from 'react';
import { MessageCircle, ExternalLink, Check, AlertCircle, X, Phone, Calendar, Clock, Sparkles } from 'lucide-react';
import { Appointment, Professional } from '../types';
import {
  cleanPhoneForWhatsApp,
  buildReminderMessage,
  getWhatsAppUrl,
} from '../utils/whatsappReminder';
import { saveAppointmentToFirebase } from '../firebase';

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
  if (!isOpen) return null;

  // Format readable date
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

  // Map appointments with professional names and WhatsApp URLs
  const items: TomorrowItem[] = tomorrowAppointments
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((apt) => {
      const prof = professionals.find((p) => p.id === apt.professionalId);
      const profName = prof?.name || 'Erika Valentini';
      const cleanPhone = cleanPhoneForWhatsApp(apt.clientPhone);
      const hasValidPhone = Boolean(cleanPhone && cleanPhone.length >= 8);

      const msg = buildReminderMessage({
        clientName: apt.clientName,
        dateStr: apt.date,
        time: apt.time,
        treatmentNote: apt.treatmentNote,
        professionalName: profName,
      });

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

  const validItems = items.filter((it) => it.hasValidPhone);
  const invalidItems = items.filter((it) => !it.hasValidPhone);

  const handleOpenChat = (item: TomorrowItem) => {
    if (!item.whatsappUrl) return;

    // Open WhatsApp in new window/tab
    window.open(item.whatsappUrl, '_blank', 'noopener,noreferrer');

    // Mark as reminder sent in appointment & sync to Firebase
    const nowTime = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const updatedApt: Appointment = {
      ...item.appointment,
      reminderSent: true,
      reminderSentAt: nowTime,
    };
    saveAppointmentToFirebase(updatedApt);

    // Local change update
    const updatedList = tomorrowAppointments.map((a) =>
      a.id === item.appointment.id ? updatedApt : a
    );
    onAppointmentsChange(updatedList);
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
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  WhatsApp API Directo
                </span>
              </div>
              <h3 id="tomorrow-reminders-title" className="text-xl font-black text-white mt-0.5">
                Enviar Recordatorios de Mañana
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>{readableTomorrow}</span>
              </p>
            </div>
          </div>
          <button
            id="tomorrow-reminders-close-btn"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {items.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-800">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-300">No hay turnos agendados para mañana</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No se encontraron citas programadas para el día de mañana ({tomorrowDate}).
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>
                  Mostrando <strong className="text-white">{items.length}</strong> turno(s) para mañana
                  {validItems.length !== items.length && (
                    <span className="text-amber-400 font-semibold ml-1">
                      ({validItems.length} con teléfono válido)
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <Sparkles className="w-3 h-3" />
                  wa.me/NUMERO?text=MENSAJE
                </span>
              </div>

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
                                Enviado {appointment.reminderSentAt ? `(${appointment.reminderSentAt} hs)` : ''}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                            {hasValidPhone ? (
                              <span className="flex items-center gap-1 text-slate-300 font-mono">
                                <Phone className="w-3 h-3 text-emerald-400" />
                                {appointment.clientPhone} (wa.me/{cleanPhone})
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

                        {/* Action button */}
                        <div className="shrink-0 flex items-center gap-2">
                          {hasValidPhone ? (
                            <button
                              id={`send-wa-btn-${appointment.id}`}
                              type="button"
                              onClick={() => handleOpenChat(item)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
                                isSent
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                              }`}
                              title="Abrir chat en WhatsApp con el recordatorio formateado"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-white" />
                              <span>{isSent ? 'Reenviar WhatsApp' : 'Abrir WhatsApp'}</span>
                              <ExternalLink className="w-3 h-3 opacity-70" />
                            </button>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-500 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700">
                              Teléfono no disponible
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Preview of the formatted message */}
                      {hasValidPhone && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 line-clamp-2 bg-slate-950/40 p-2 rounded-xl border border-slate-800/40 font-mono">
                          <span className="text-emerald-400 select-none mr-1.5 font-bold">Mensaje:</span>
                          {reminderMessage}
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
          <div className="text-slate-400">
            {validItems.length > 0 && (
              <span>
                Haz clic en <strong>Abrir WhatsApp</strong> en cada clienta para iniciar el chat con el mensaje pre-cargado.
              </span>
            )}
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
