import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  Send,
  ExternalLink,
  ChevronRight,
  Settings,
  Sparkles,
  Phone,
  UserCheck,
  RefreshCw,
  Play,
  Pause,
  Square,
  Volume2,
  Bell,
  Sliders,
  Globe,
  CheckCheck,
} from 'lucide-react';
import { Appointment, Professional } from '../types';
import {
  buildReminderMessage,
  cleanPhoneForWhatsApp,
  getTomorrowDateStr,
  getWhatsAppUrl,
  isAroundReminderTime,
  DEFAULT_REMINDER_TEMPLATE,
  getReminderSettings,
  saveReminderSettings,
  WhatsAppReminderSettings,
  playReminderChime,
  requestNotificationPermission,
  showBrowserNotification,
  sendWhatsAppViaWebhook,
} from '../utils/whatsappReminder';

interface WhatsAppReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: Appointment[];
  professionals: Professional[];
  onAppointmentsChange?: (updated: Appointment[]) => void;
  onUpdateAppointments?: (updated: Appointment[]) => void;
  targetDate?: string;
  initialDate?: string;
  autoStartRunner?: boolean;
}

export const WhatsAppReminderModal: React.FC<WhatsAppReminderModalProps> = ({
  isOpen,
  onClose,
  appointments,
  professionals,
  onAppointmentsChange,
  onUpdateAppointments,
  targetDate: propTargetDate,
  initialDate,
  autoStartRunner = false,
}) => {
  const handleAppointmentsUpdate = (updated: Appointment[]) => {
    if (onAppointmentsChange) onAppointmentsChange(updated);
    if (onUpdateAppointments) onUpdateAppointments(updated);
  };

  const tomorrowDateStr = getTomorrowDateStr();
  const [targetDate, setTargetDate] = useState<string>(propTargetDate || initialDate || tomorrowDateStr);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Settings
  const [settings, setSettings] = useState<WhatsAppReminderSettings>(getReminderSettings());
  const [customTemplate, setCustomTemplate] = useState<string>(
    settings.customTemplate || DEFAULT_REMINDER_TEMPLATE
  );
  const [activeTab, setActiveTab] = useState<'list' | 'settings'>('list');
  const [hasNotifPermission, setHasNotifPermission] = useState<boolean>(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  // Time & Status
  const [currentTime, setCurrentTime] = useState(
    isAroundReminderTime(settings.autoDispatchTime || '14:00')
  );

  // Auto-Runner State
  const [isRunningQueue, setIsRunningQueue] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentRunningId, setCurrentRunningId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(settings.secondsDelay || 3);
  const [runnerLog, setRunnerLog] = useState<string | null>(null);

  const runnerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync clock every 15s
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(isAroundReminderTime(settings.autoDispatchTime || '14:00'));
    };
    updateTime();
    const interval = setInterval(updateTime, 15000);
    return () => clearInterval(interval);
  }, [settings.autoDispatchTime]);

  // Update targetDate when modal opens
  useEffect(() => {
    if (isOpen) {
      setTargetDate(initialDate || tomorrowDateStr);
      setSettings(getReminderSettings());
    } else {
      stopAutoRunner();
    }
  }, [isOpen, initialDate, tomorrowDateStr]);

  // Appointments for the selected target date (excluding cancelled)
  const targetAppointments = appointments
    .filter((a) => a.date === targetDate && a.status !== 'cancelado')
    .sort((a, b) => a.time.localeCompare(b.time));

  const totalTomorrow = targetAppointments.length;
  const sentCount = targetAppointments.filter((a) => a.reminderSent).length;
  const pendingAppointments = targetAppointments.filter((a) => !a.reminderSent);
  const pendingCount = pendingAppointments.length;

  // Auto-start queue if requested via props
  useEffect(() => {
    if (isOpen && autoStartRunner && pendingAppointments.length > 0 && !isRunningQueue) {
      startAutoRunner();
    }
  }, [isOpen, autoStartRunner]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      stopAutoRunner();
    };
  }, []);

  if (!isOpen) return null;

  // Format date label
  let targetDateLabel = targetDate;
  try {
    const d = new Date(targetDate + 'T00:00:00');
    targetDateLabel = d.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    targetDateLabel = targetDateLabel.charAt(0).toUpperCase() + targetDateLabel.slice(1);
  } catch (e) {
    targetDateLabel = targetDate;
  }

  const isTargetTomorrow = targetDate === tomorrowDateStr;

  // Dispatch single WhatsApp message
  const handleSendWhatsApp = async (apt: Appointment): Promise<boolean> => {
    const prof = professionals.find((p) => p.id === apt.professionalId);
    const text = buildReminderMessage({
      clientName: apt.clientName,
      dateStr: apt.date,
      time: apt.time,
      treatmentNote: apt.treatmentNote,
      professionalName: prof?.name || 'Erika Valentini',
      customTemplate,
    });

    const cleanPhone = cleanPhoneForWhatsApp(apt.clientPhone);
    if (!cleanPhone) {
      alert(`El teléfono de ${apt.clientName} (${apt.clientPhone || 'vacío'}) no es válido para WhatsApp.`);
      return false;
    }

    // Mark as sent in appointment and update state + Firebase
    const nowStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const updated = appointments.map((a) =>
      a.id === apt.id ? { ...a, reminderSent: true, reminderSentAt: nowStr } : a
    );
    handleAppointmentsUpdate(updated);

    // If webhook is provided, do silent POST
    if (settings.webhookUrl && settings.webhookUrl.trim().startsWith('http')) {
      await sendWhatsAppViaWebhook(settings.webhookUrl.trim(), {
        phone: cleanPhone,
        clientName: apt.clientName,
        time: apt.time,
        date: apt.date,
        message: text,
        professionalName: prof?.name || 'Erika Valentini',
      });
      return true;
    }

    // Standard WhatsApp URL opening
    const url = getWhatsAppUrl(apt.clientPhone, text);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    }
    return false;
  };

  const handleCopyMessage = (apt: Appointment) => {
    const prof = professionals.find((p) => p.id === apt.professionalId);
    const text = buildReminderMessage({
      clientName: apt.clientName,
      dateStr: apt.date,
      time: apt.time,
      treatmentNote: apt.treatmentNote,
      professionalName: prof?.name || 'Erika Valentini',
      customTemplate,
    });

    navigator.clipboard.writeText(text);
    setCopiedId(apt.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleToggleSentStatus = (apt: Appointment) => {
    const updated = appointments.map((a) =>
      a.id === apt.id
        ? {
            ...a,
            reminderSent: !a.reminderSent,
            reminderSentAt: !a.reminderSent
              ? new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
              : undefined,
          }
        : a
    );
    handleAppointmentsUpdate(updated);
  };

  const handleMarkAllAsSent = () => {
    const nowStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const updated = appointments.map((a) =>
      a.date === targetDate && a.status !== 'cancelado'
        ? { ...a, reminderSent: true, reminderSentAt: nowStr }
        : a
    );
    handleAppointmentsUpdate(updated);
  };

  const handleResetAllSent = () => {
    const updated = appointments.map((a) =>
      a.date === targetDate ? { ...a, reminderSent: false, reminderSentAt: undefined } : a
    );
    handleAppointmentsUpdate(updated);
  };

  // AUTO RUNNER ENGINE (Piloto Automático a las 14 hs)
  const stopAutoRunner = () => {
    setIsRunningQueue(false);
    setIsPaused(false);
    setCurrentRunningId(null);
    setRunnerLog(null);
    if (runnerTimerRef.current) clearTimeout(runnerTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  const startAutoRunner = () => {
    if (pendingAppointments.length === 0) return;
    setIsRunningQueue(true);
    setIsPaused(false);
    processNextInQueue(0);
  };

  const processNextInQueue = (index: number) => {
    // Re-fetch pending in case appointments were updated
    const currentPending = appointments.filter(
      (a) => a.date === targetDate && a.status !== 'cancelado' && !a.reminderSent
    );

    if (currentPending.length === 0 || index >= currentPending.length) {
      // Completed!
      setIsRunningQueue(false);
      setCurrentRunningId(null);
      setRunnerLog('¡Todos los recordatorios fueron disparados con éxito! ✨');
      if (settings.notificationAudio) playReminderChime();

      // Save today as dispatched
      const todayStr = new Date().toISOString().split('T')[0];
      const updatedSettings = { ...settings, lastDispatchedDate: todayStr };
      setSettings(updatedSettings);
      saveReminderSettings(updatedSettings);
      return;
    }

    const currentApt = currentPending[0];
    setCurrentRunningId(currentApt.id);
    const delay = Math.max(2, settings.secondsDelay || 3);
    setCountdown(delay);
    setRunnerLog(`Disparando aviso para ${currentApt.clientName} (${currentApt.time} hs)...`);

    // Countdown loop
    let remaining = delay;
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      }
    }, 1000);

    runnerTimerRef.current = setTimeout(async () => {
      await handleSendWhatsApp(currentApt);
      // Wait a moment then process next
      runnerTimerRef.current = setTimeout(() => {
        processNextInQueue(0);
      }, 1200);
    }, delay * 1000);
  };

  const handleUpdateSettings = (partial: Partial<WhatsAppReminderSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    saveReminderSettings(updated);
  };

  const handleRequestNotifications = async () => {
    const ok = await requestNotificationPermission();
    setHasNotifPermission(ok);
    if (ok) {
      showBrowserNotification(
        'Erika Valentini • Recordatorios',
        '¡Notificaciones activadas! Te avisaremos automáticamente todos los días a las 14:00 hs.'
      );
    }
  };

  // Next single appointment for manual sequential send
  const nextPending = pendingAppointments[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-3xl shadow-2xl animate-scale-in my-8 max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">Recordatorios WhatsApp</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                  Erika Valentini
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Disparo automático diario a las <strong className="text-emerald-300 font-bold">{settings.autoDispatchTime || '14:00'} hs</strong> para los turnos de mañana
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  activeTab === 'list' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Turnos ({totalTomorrow})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  activeTab === 'settings' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>Configuración</span>
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="py-4 space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
          {/* Target Date & 14:00 hs Status Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Target Date Box */}
            <div className="sm:col-span-2 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-pink-400" />
                  Día a recordar:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTargetDate(tomorrowDateStr)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                      isTargetTomorrow
                        ? 'bg-pink-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Mañana
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-sm truncate">{targetDateLabel}</span>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs font-mono"
                />
              </div>
            </div>

            {/* 14:00 hs Clock Status */}
            <div
              className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
                currentTime.isReady
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-950/80 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  Disparo {settings.autoDispatchTime || '14:00'} hs
                </span>
                <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded bg-black/40 text-emerald-300">
                  {String(currentTime.currentHour).padStart(2, '0')}:
                  {String(currentTime.currentMinute).padStart(2, '0')} hs
                </span>
              </div>
              <p className="text-[11px] mt-1 leading-snug">
                {currentTime.isReady ? (
                  <span className="text-emerald-300 font-semibold">
                    ✓ Horario activo (≥ {settings.autoDispatchTime || '14:00'} hs). Listo para disparar a clientas de mañana.
                  </span>
                ) : (
                  <span className="text-slate-400">
                    Programado para las {settings.autoDispatchTime || '14:00'} hs. Podés iniciar el piloto manual en cualquier momento.
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* ACTIVE AUTO-RUNNER OVERLAY / STATUS */}
          {isRunningQueue && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-2 border-emerald-500/60 shadow-xl space-y-3 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="font-black text-white text-sm">
                    🚀 Piloto Automático en Ejecución...
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-black/50 text-emerald-300 font-mono font-bold text-xs">
                    Siguiente en: {countdown}s
                  </span>
                  <button
                    type="button"
                    onClick={stopAutoRunner}
                    className="px-3 py-1 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1 transition"
                  >
                    <Square className="w-3 h-3" />
                    Detener
                  </button>
                </div>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 transition-all duration-500"
                  style={{
                    width: `${totalTomorrow > 0 ? (sentCount / totalTomorrow) * 100 : 0}%`,
                  }}
                ></div>
              </div>

              <p className="text-xs text-emerald-200/90 font-medium">
                {runnerLog || 'Procesando cola de mensajes automáticos de WhatsApp...'}
              </p>
            </div>
          )}

          {/* TAB 1: LIST VIEW */}
          {activeTab === 'list' && (
            <>
              {/* Turnos Stats & Batch Action Bar */}
              <div className="p-3.5 bg-gradient-to-r from-slate-950 to-slate-900 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Total:</span>
                    <span className="font-bold text-white text-sm">{totalTomorrow}</span>
                  </div>
                  <span className="text-slate-700">|</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Enviados:
                    </span>
                    <span className="font-bold text-emerald-300 text-sm">{sentCount}</span>
                  </div>
                  <span className="text-slate-700">|</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Pendientes:
                    </span>
                    <span className="font-bold text-amber-300 text-sm">{pendingCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {pendingCount > 0 && !isRunningQueue && (
                    <button
                      type="button"
                      onClick={startAutoRunner}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Disparo Automático ({pendingCount} pendientes)</span>
                    </button>
                  )}

                  {nextPending && !isRunningQueue && (
                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(nextPending)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition"
                    >
                      <Send className="w-3 h-3 text-emerald-400" />
                      <span>1 a 1: {nextPending.clientName.split(' ')[0]}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* List of Appointments for Target Date */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="font-bold text-slate-300 text-xs">
                    Clientas del día ({targetAppointments.length})
                  </span>
                  {targetAppointments.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleMarkAllAsSent}
                        className="text-[11px] text-slate-400 hover:text-emerald-400 transition font-semibold"
                      >
                        Marcar todos como enviados
                      </button>
                      <span className="text-slate-700">•</span>
                      <button
                        type="button"
                        onClick={handleResetAllSent}
                        className="text-[11px] text-slate-500 hover:text-slate-300 transition"
                      >
                        Reiniciar estado
                      </button>
                    </div>
                  )}
                </div>

                {targetAppointments.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 space-y-2">
                    <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="font-bold text-slate-300 text-sm">
                      No hay turnos agendados para este día ({targetDate})
                    </p>
                    <p className="text-slate-500 text-xs">
                      Carga turnos en la Agenda para ver y disparar los recordatorios correspondientes.
                    </p>
                  </div>
                ) : (
                  targetAppointments.map((apt) => {
                    const prof = professionals.find((p) => p.id === apt.professionalId);
                    const hasValidPhone = Boolean(cleanPhoneForWhatsApp(apt.clientPhone));
                    const isCurrentlyRunning = currentRunningId === apt.id;

                    return (
                      <div
                        key={apt.id}
                        className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isCurrentlyRunning
                            ? 'bg-emerald-950/70 border-emerald-400 shadow-md ring-1 ring-emerald-400'
                            : apt.reminderSent
                            ? 'bg-slate-950/60 border-slate-800/80 opacity-75'
                            : 'bg-slate-950 border-slate-800 hover:border-emerald-500/40 shadow-sm'
                        }`}
                      >
                        {/* Left: Time & Client info */}
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <div className="w-14 h-12 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center shrink-0">
                            <span className="font-mono font-bold text-white text-xs">{apt.time}</span>
                            <span className="text-[10px] text-slate-500">hs</span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-white text-sm truncate">{apt.clientName}</h4>
                              {apt.reminderSent ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/25">
                                  <CheckCircle2 className="w-3 h-3" /> Enviado {apt.reminderSentAt ? `(${apt.reminderSentAt})` : ''}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold border border-amber-500/25">
                                  <Clock className="w-3 h-3" /> Pendiente
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5 flex-wrap">
                              <span className="text-pink-300 font-medium">
                                {apt.treatmentNote || 'Atención en salón'}
                              </span>
                              <span>•</span>
                              <span className="text-slate-400 font-mono flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-500" />
                                {apt.clientPhone || <span className="text-rose-400 italic">Sin teléfono</span>}
                              </span>
                              <span>•</span>
                              <span className="text-slate-500">{prof?.name || 'Erika Valentini'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {/* Copy message button */}
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(apt)}
                            title="Copiar texto del recordatorio"
                            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
                          >
                            {copiedId === apt.id ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          {/* Direct WhatsApp trigger */}
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(apt)}
                            disabled={!hasValidPhone || isRunningQueue}
                            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm ${
                              hasValidPhone
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>{apt.reminderSent ? 'Reenviar' : 'Enviar'}</span>
                          </button>

                          {/* Toggle status check */}
                          <button
                            type="button"
                            onClick={() => handleToggleSentStatus(apt)}
                            title={apt.reminderSent ? 'Marcar como pendiente' : 'Marcar como enviado'}
                            className={`p-2 rounded-xl border transition ${
                              apt.reminderSent
                                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/50'
                                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* TAB 2: AUTOMATION & TEMPLATE SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-4 animate-fade-in">
              {/* Main Scheduler Settings Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-pink-400" />
                  Automatización del Disparo Diario (14:00 hs)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 text-xs font-semibold block mb-1">
                      Horario programado de disparo:
                    </label>
                    <input
                      type="time"
                      value={settings.autoDispatchTime || '14:00'}
                      onChange={(e) => handleUpdateSettings({ autoDispatchTime: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:border-pink-500 outline-none"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Todos los días a esta hora se disparan los avisos para el día siguiente.
                    </span>
                  </div>

                  <div>
                    <label className="text-slate-400 text-xs font-semibold block mb-1">
                      Demora entre envíos en piloto (segundos):
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="10"
                      value={settings.secondsDelay || 3}
                      onChange={(e) => handleUpdateSettings({ secondsDelay: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:border-pink-500 outline-none"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Permite que WhatsApp cargue correctamente entre clientas (recomendado 3 seg).
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-900">
                  {/* Toggle Audio */}
                  <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-900/60 cursor-pointer">
                    <span className="text-slate-300 font-medium flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                      Sonido de campana suave a las 14:00 hs
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.notificationAudio}
                      onChange={(e) => handleUpdateSettings({ notificationAudio: e.target.checked })}
                      className="rounded text-pink-500 focus:ring-pink-400 h-4 w-4 bg-slate-800 border-slate-700 cursor-pointer"
                    />
                  </label>

                  {/* Toggle Browser Notifications */}
                  <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-900/60">
                    <span className="text-slate-300 font-medium flex items-center gap-2">
                      <Bell className="w-4 h-4 text-pink-400" />
                      Notificación de escritorio / celular
                    </span>
                    {hasNotifPermission ? (
                      <span className="text-[11px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30">
                        Permitidas ✓
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestNotifications}
                        className="px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold text-[11px] transition"
                      >
                        Activar permisos
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Template Editor Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-pink-300 flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5" /> Plantilla del Mensaje de WhatsApp
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomTemplate(DEFAULT_REMINDER_TEMPLATE);
                      handleUpdateSettings({ customTemplate: DEFAULT_REMINDER_TEMPLATE });
                    }}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Restaurar plantilla por defecto
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={customTemplate}
                  onChange={(e) => {
                    setCustomTemplate(e.target.value);
                    handleUpdateSettings({ customTemplate: e.target.value });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-200 font-sans text-xs focus:ring-1 focus:ring-pink-500 outline-none leading-relaxed"
                  placeholder="Escribe la plantilla del mensaje..."
                />

                <div className="text-[10px] text-slate-400 flex flex-wrap gap-2">
                  <span>Variables disponibles:</span>
                  <code className="bg-slate-800 px-1 py-0.5 rounded text-pink-300">{"{clientName}"}</code>
                  <code className="bg-slate-800 px-1 py-0.5 rounded text-pink-300">{"{dateFormatted}"}</code>
                  <code className="bg-slate-800 px-1 py-0.5 rounded text-pink-300">{"{time}"}</code>
                  <code className="bg-slate-800 px-1 py-0.5 rounded text-pink-300">{"{treatment}"}</code>
                  <code className="bg-slate-800 px-1 py-0.5 rounded text-pink-300">{"{professionalName}"}</code>
                </div>
              </div>

              {/* Webhook API Card (Optional for 100% silent delivery) */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                    <Globe className="w-3.5 h-3.5 text-teal-400" />
                    Envío Silencioso vía Webhook / API (Opcional)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Si usas un bot o servicio de WhatsApp (ej: Evolution API, Baileys, Make, Zapier), pega aquí la URL. El piloto disparará peticiones HTTP POST directamente en segundo plano sin abrir pestañas.
                </p>
                <input
                  type="url"
                  placeholder="https://api.tuservidor.com/whatsapp/send (opcional)"
                  value={settings.webhookUrl || ''}
                  onChange={(e) => handleUpdateSettings({ webhookUrl: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:border-teal-500 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Avisos vinculados a Erika Valentini • Horario clave: {settings.autoDispatchTime || '14:00'} hs</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
