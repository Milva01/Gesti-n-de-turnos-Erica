import React, { useState, useEffect } from 'react';
import { Appointment, ClientRecord, Professional, AppointmentStatus } from '../types';
import { AGENDA_TIME_SLOTS } from '../data/initialData';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  User,
  Phone,
  Scissors,
  Check,
  X,
  Sparkles,
  MessageCircle,
  Send,
} from 'lucide-react';
import { WhatsAppReminderModal } from './WhatsAppReminderModal';
import { TomorrowReminderModal } from './TomorrowReminderModal';
import {
  saveAppointmentToFirebase,
  deleteAppointmentFromFirebase,
  clearAllAppointmentsFromFirebase,
  saveClientToFirebase,
} from '../firebase';
import { markAppointmentAsDeleted } from '../utils/storage';
import {
  buildReminderMessage,
  cleanPhoneForWhatsApp,
  getTomorrowDateStr,
  getWhatsAppUrl,
  isAroundReminderTime,
  getReminderSettings,
  playReminderChime,
  showBrowserNotification,
} from '../utils/whatsappReminder';

interface AgendaViewProps {
  appointments: Appointment[];
  professionals: Professional[];
  clients: ClientRecord[];
  onAppointmentsChange: (updated: Appointment[]) => void;
  onClientsChange?: (updated: ClientRecord[]) => void;
  onOpenClientProfile?: (clientId: string) => void;
  initialProfessionalFilter?: string;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  appointments,
  professionals,
  clients,
  onAppointmentsChange,
  onClientsChange,
  onOpenClientProfile,
  initialProfessionalFilter,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedProfessionalFilter, setSelectedProfessionalFilter] = useState<string>(
    initialProfessionalFilter || 'all'
  );

  // Modal state for adding/editing an appointment
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);

  // Modal form state
  const [modalTime, setModalTime] = useState<string>('06:30');
  const [modalSlot, setModalSlot] = useState<1 | 2>(1);
  const [modalProfessionalId, setModalProfessionalId] = useState<string>(
    professionals[0]?.id || 'prof-1'
  );
  const [modalSelectedClientId, setModalSelectedClientId] = useState<string>('');
  const [modalClientName, setModalClientName] = useState<string>('');
  const [modalClientPhone, setModalClientPhone] = useState<string>('');
  const [modalTreatmentNote, setModalTreatmentNote] = useState<string>('');
  const [modalStatus, setModalStatus] = useState<AppointmentStatus>('confirmado');
  const [modalAmount, setModalAmount] = useState<number | ''>('');
  const [modalPaidAmount, setModalPaidAmount] = useState<number | ''>('');

  // WhatsApp 14:00 hs Reminder Modal State
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isTomorrowReminderModalOpen, setIsTomorrowReminderModalOpen] = useState(false);
  const [autoStartRunnerInModal, setAutoStartRunnerInModal] = useState(false);
  const [reminderTargetDate, setReminderTargetDate] = useState<string>(getTomorrowDateStr());

  // Date Navigation Helpers
  const shiftDay = (days: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const formattedDateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Filter appointments for the active date
  const dayAppointments = appointments.filter((a) => a.date === selectedDate);

  // Calculate day stats
  const totalOccupied = dayAppointments.filter((a) => a.status !== 'cancelado').length;
  const totalPossibleSlots = AGENDA_TIME_SLOTS.length * 2; // 16 intervals * 2 = 32 turnos
  const occupancyPercentage = Math.round((totalOccupied / totalPossibleSlots) * 100);

  // WhatsApp 14:00 hs reminders helpers
  const tomorrowDate = getTomorrowDateStr();
  const tomorrowTurnos = appointments.filter(
    (a) => a.date === tomorrowDate && a.status !== 'cancelado'
  );
  const tomorrowPending = tomorrowTurnos.filter((a) => !a.reminderSent).length;
  const reminderSettings = getReminderSettings();
  const reminderTimeStatus = isAroundReminderTime(reminderSettings.autoDispatchTime || '14:00');

  // AUTO DISPATCH CHECKER (14:00 hs todos los días recordando para el día siguiente)
  useEffect(() => {
    const checkAutoDispatch = () => {
      const currentSettings = getReminderSettings();
      if (!currentSettings.enabled) return;

      const todayStr = new Date().toISOString().split('T')[0];
      if (currentSettings.lastDispatchedDate === todayStr) return;

      const timeStatus = isAroundReminderTime(currentSettings.autoDispatchTime || '14:00');
      if (!timeStatus.isReady) return;

      const tomorrowStr = getTomorrowDateStr();
      const pendingForTomorrow = appointments.filter(
        (a) => a.date === tomorrowStr && a.status !== 'cancelado' && !a.reminderSent
      );

      if (pendingForTomorrow.length > 0) {
        if (currentSettings.notificationAudio) {
          playReminderChime();
        }
        showBrowserNotification(
          '⏰ Erika Valentini • Recordatorios (14:00 hs)',
          `¡Son las 14:00 hs! Tenés ${pendingForTomorrow.length} clienta(s) para mañana pendientes de aviso por WhatsApp.`,
          () => {
            setReminderTargetDate(tomorrowStr);
            setAutoStartRunnerInModal(currentSettings.autoOpenQueue);
            setIsReminderModalOpen(true);
          }
        );
        // Automatically open the reminder center
        setReminderTargetDate(tomorrowStr);
        setAutoStartRunnerInModal(currentSettings.autoOpenQueue);
        setIsReminderModalOpen(true);
      }
    };

    checkAutoDispatch();
    const interval = setInterval(checkAutoDispatch, 20000);
    return () => clearInterval(interval);
  }, [appointments]);

  // Open modal to assign an empty slot
  const handleOpenNewAppointment = (time: string, slotNumber: 1 | 2) => {
    setEditingAppointment(null);
    setModalTime(time);
    setModalSlot(slotNumber);
    // Pre-select professional if filtered, or default to slot: slot 1 -> prof 1, slot 2 -> prof 2
    const defaultProf =
      selectedProfessionalFilter !== 'all'
        ? selectedProfessionalFilter
        : slotNumber === 1
        ? professionals[0]?.id || 'prof-1'
        : professionals[1]?.id || professionals[0]?.id || 'prof-2';

    setModalProfessionalId(defaultProf);
    setModalSelectedClientId('');
    setModalClientName('');
    setModalClientPhone('');
    setModalTreatmentNote('');
    setModalStatus('confirmado');
    setModalAmount('');
    setModalPaidAmount('');
    setIsModalOpen(true);
  };

  // Open modal to edit existing appointment
  const handleOpenEditAppointment = (apt: Appointment) => {
    setEditingAppointment(apt);
    setModalTime(apt.time);
    setModalSlot(apt.slotNumber);
    setModalProfessionalId(apt.professionalId);
    setModalSelectedClientId(apt.clientId || '');
    setModalClientName(apt.clientName);
    setModalClientPhone(apt.clientPhone);
    setModalTreatmentNote(apt.treatmentNote || '');
    setModalStatus(apt.status);
    setModalAmount(apt.amount !== undefined && apt.amount !== 0 ? apt.amount : '');
    setModalPaidAmount(apt.paidAmount !== undefined && apt.paidAmount !== 0 ? apt.paidAmount : '');
    setIsModalOpen(true);
  };

  // Quick direct WhatsApp reminder trigger
  const handleQuickSendWhatsApp = (e: React.MouseEvent, apt: Appointment) => {
    e.stopPropagation();
    const prof = professionals.find((p) => p.id === apt.professionalId);
    const text = buildReminderMessage({
      clientName: apt.clientName,
      dateStr: apt.date,
      time: apt.time,
      treatmentNote: apt.treatmentNote,
      professionalName: prof?.name || 'Erika Valentini',
    });
    const url = getWhatsAppUrl(apt.clientPhone, text);
    if (!url) {
      alert(`El teléfono de ${apt.clientName} (${apt.clientPhone || 'vacío'}) no es válido para WhatsApp.`);
      return;
    }
    const nowStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const updatedApt = { ...apt, reminderSent: true, reminderSentAt: nowStr };
    saveAppointmentToFirebase(updatedApt);
    const updated = appointments.map((a) => (a.id === apt.id ? updatedApt : a));
    onAppointmentsChange(updated);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Client dropdown selection
  const handleSelectExistingClient = (clientId: string) => {
    setModalSelectedClientId(clientId);
    if (!clientId) {
      setModalClientName('');
      setModalClientPhone('');
      return;
    }
    const found = clients.find((c) => c.id === clientId);
    if (found) {
      setModalClientName(found.fullName);
      setModalClientPhone(found.phone);
    }
  };

  // Save Appointment
  const handleSaveAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalClientName.trim()) return;

    // Intelligent auto-linking & auto-creation of Client Record:
    // If no client was chosen from dropdown, check if there's an existing client by name or phone,
    // or automatically create the client in the salon database so the user never has to do it manually!
    const cleanName = modalClientName.trim();
    const cleanPhone = modalClientPhone.trim();
    let effectiveClientId = modalSelectedClientId;
    let localClientsList = [...clients];

    if (!effectiveClientId) {
      const existingMatch = clients.find(
        (c) =>
          c.fullName.toLowerCase() === cleanName.toLowerCase() ||
          (cleanPhone && cleanPhone.length > 6 && c.phone === cleanPhone)
      );

      if (existingMatch) {
        effectiveClientId = existingMatch.id;
      } else {
        // Automatically create new client in directory
        const autoClient: ClientRecord = {
          id: `cli-${Date.now()}`,
          fullName: cleanName,
          phone: cleanPhone || 'Sin teléfono',
          createdAt: new Date().toISOString(),
          nextVisit: selectedDate,
          balanceDebt: 0,
          totalPaid: 0,
          payments: [],
          technicalNotes: modalTreatmentNote.trim() ? `Tratamiento inicial: ${modalTreatmentNote.trim()}` : undefined,
        };
        effectiveClientId = autoClient.id;
        localClientsList = [autoClient, ...clients];
        saveClientToFirebase(autoClient);
        if (onClientsChange) {
          onClientsChange(localClientsList);
        }
      }
    }

    if (editingAppointment) {
      // Update
      const updatedApt: Appointment = {
        ...editingAppointment,
        time: modalTime,
        slotNumber: modalSlot,
        professionalId: modalProfessionalId,
        clientId: effectiveClientId || undefined,
        clientName: cleanName,
        clientPhone: cleanPhone,
        treatmentNote: modalTreatmentNote.trim(),
        status: modalStatus,
        amount: modalAmount === '' ? 0 : Number(modalAmount),
        paidAmount: modalPaidAmount === '' ? 0 : Number(modalPaidAmount),
      };
      saveAppointmentToFirebase(updatedApt);
      const updatedList = appointments.map((a) =>
        a.id === editingAppointment.id ? updatedApt : a
      );
      onAppointmentsChange(updatedList);
    } else {
      // Create
      const newApt: Appointment = {
        id: `apt-${Date.now()}`,
        date: selectedDate,
        time: modalTime,
        slotNumber: modalSlot,
        professionalId: modalProfessionalId,
        clientId: effectiveClientId || undefined,
        clientName: cleanName,
        clientPhone: cleanPhone,
        treatmentNote: modalTreatmentNote.trim(),
        status: modalStatus,
        amount: modalAmount === '' ? 0 : Number(modalAmount),
        paidAmount: modalPaidAmount === '' ? 0 : Number(modalPaidAmount),
        createdAt: new Date().toISOString(),
      };
      saveAppointmentToFirebase(newApt);
      onAppointmentsChange([...appointments, newApt]);
    }

    // Also update client's nextVisit if client is linked
    if (effectiveClientId && onClientsChange) {
      const updatedClients = localClientsList.map((c) => {
        if (c.id === effectiveClientId) {
          const updatedClient = {
            ...c,
            nextVisit: selectedDate,
            phone: cleanPhone || c.phone,
          };
          saveClientToFirebase(updatedClient);
          return updatedClient;
        }
        return c;
      });
      onClientsChange(updatedClients);
    }

    setIsModalOpen(false);
  };

  // Delete / Free Slot (Immediate non-blocking execution)
  const handleDeleteAppointment = (id: string) => {
    markAppointmentAsDeleted(id);
    deleteAppointmentFromFirebase(id);
    const updated = appointments.filter((a) => a.id !== id);
    onAppointmentsChange(updated);
    setIsModalOpen(false);
    setEditingAppointment(null);
  };

  // Clear appointments for current day
  const handleClearDay = () => {
    const toDelete = appointments.filter((a) => a.date === selectedDate);
    toDelete.forEach((a) => {
      markAppointmentAsDeleted(a.id);
      deleteAppointmentFromFirebase(a.id);
    });
    const updated = appointments.filter((a) => a.date !== selectedDate);
    onAppointmentsChange(updated);
    setShowClearModal(false);
  };

  // Clear all demo appointments completely
  const handleClearAll = () => {
    clearAllAppointmentsFromFirebase();
    onAppointmentsChange([]);
    setShowClearModal(false);
  };

  // Quick toggle status
  const handleQuickStatusChange = (apt: Appointment, newStatus: AppointmentStatus) => {
    const updatedApt = { ...apt, status: newStatus };
    saveAppointmentToFirebase(updatedApt);
    const updated = appointments.map((a) => (a.id === apt.id ? updatedApt : a));
    onAppointmentsChange(updated);
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25">
            Confirmado
          </span>
        );
      case 'en_proceso':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 animate-pulse">
            En atención
          </span>
        );
      case 'completado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
            Finalizado
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/25">
            Cancelado
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-3 sm:px-6 space-y-6 animate-fade-in">
      {/* BANNER: Disparador de Recordatorios WhatsApp para Mañana (14:00 hs) */}
      {tomorrowTurnos.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/60 border border-emerald-500/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/10">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-white text-base">
                  Recordatorios WhatsApp de Mañana ({reminderSettings.autoDispatchTime || '14:00'} hs)
                </h3>
                {reminderTimeStatus.isReady ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 text-[11px] font-black border border-emerald-400/40 uppercase tracking-wider animate-pulse">
                    ⏰ Horario activo (≥ {reminderSettings.autoDispatchTime || '14:00'} hs)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-bold border border-slate-700">
                    Disparo diario: {reminderSettings.autoDispatchTime || '14:00'} hs
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Tenés <strong className="text-white font-bold">{tomorrowTurnos.length}</strong> turno(s) agendados para mañana{' '}
                {tomorrowPending > 0 ? (
                  <span className="text-amber-300 font-bold">({tomorrowPending} pendientes de aviso)</span>
                ) : (
                  <span className="text-emerald-400 font-bold">(¡todos los avisos fueron enviados! ✓)</span>
                )}
                . El sistema dispara automáticamente a las {reminderSettings.autoDispatchTime || '14:00'} hs recordando los turnos de mañana.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setIsTomorrowReminderModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Enviar Recordatorios de Mañana</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setReminderTargetDate(tomorrowDate);
                setAutoStartRunnerInModal(true);
                setIsReminderModalOpen(true);
              }}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Send className="w-4 h-4 text-emerald-400" />
              <span>Piloto Automático ({tomorrowPending} pend.)</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Calendar Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-pink-600/15 text-pink-400 border border-pink-500/30 uppercase tracking-wider">
                06:30 a 14:00 hs • 2 Turnos en Simultáneo
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white capitalize mt-1">
              {formattedDateLabel}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Agenda diaria editable cada 30 minutos con 2 cupos paralelos por franja horaria.
            </p>
          </div>

          {/* Date Selector and Shift Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => shiftDay(-1)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Día anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition border ${
                isToday
                  ? 'bg-pink-600 text-white border-pink-500 shadow-md shadow-pink-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              Hoy
            </button>

            <button
              onClick={() => shiftDay(1)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Día siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-pink-500 cursor-pointer"
              />
            </div>

            {/* Botón solicitado: 'Enviar Recordatorios de Mañana' */}
            <button
              id="send-tomorrow-reminders-btn"
              type="button"
              onClick={() => setIsTomorrowReminderModalOpen(true)}
              title="Identifica los turnos de mañana con teléfono y abre chat de WhatsApp con wa.me/NUMERO?text=MENSAJE"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold shadow-md shadow-emerald-600/25 transition active:scale-95"
            >
              <MessageCircle className="w-4 h-4 text-emerald-100" />
              <span>Enviar Recordatorios de Mañana</span>
              {tomorrowTurnos.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-bold">
                  {tomorrowTurnos.length}
                </span>
              )}
            </button>

            {/* Quick WhatsApp Reminders for current selected date */}
            <button
              type="button"
              onClick={() => {
                setReminderTargetDate(selectedDate);
                setIsReminderModalOpen(true);
              }}
              title="Abrir panel de avisos por WhatsApp para la fecha seleccionada"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition shadow-sm"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Avisos del Día</span>
            </button>
          </div>
        </div>

        {/* Filter by professional & Day Occupancy Bar */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Professional filter buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-400 mr-1">Filtrar:</span>
            <button
              onClick={() => setSelectedProfessionalFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedProfessionalFilter === 'all'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Ambas Profesionales
            </button>
            {professionals.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProfessionalFilter(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedProfessionalFilter === p.id
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {p.name.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Occupancy Indicator & Clear button */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {appointments.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-rose-950/50 text-rose-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-xs font-bold transition whitespace-nowrap"
                title="Vaciar turnos de prueba para comenzar a cargar turnos reales"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vaciar Turnos de Prueba</span>
              </button>
            )}

            <div className="flex items-center gap-3 text-xs bg-slate-950/60 px-3.5 py-2 rounded-2xl border border-slate-800">
              <span className="text-slate-400">
                Ocupación hoy:{' '}
                <strong className="text-white">
                  {totalOccupied} / {totalPossibleSlots} turnos
                </strong>
              </span>
              <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-pink-500 to-rose-500 h-full rounded-full"
                  style={{ width: `${occupancyPercentage}%` }}
                />
              </div>
              <span className="text-pink-400 font-bold">{occupancyPercentage}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* AGENDA TIMELINE: 06:30 a 14:00 en cada franja con DOS TURNOS */}
      <div className="space-y-3">
        {AGENDA_TIME_SLOTS.map((time) => {
          // Find appointments for slot 1 and slot 2 at this time
          const slot1Apt = dayAppointments.find(
            (a) => a.time === time && a.slotNumber === 1
          );
          const slot2Apt = dayAppointments.find(
            (a) => a.time === time && a.slotNumber === 2
          );

          // Check if matches professional filter
          const showSlot1 =
            selectedProfessionalFilter === 'all' ||
            !slot1Apt ||
            slot1Apt.professionalId === selectedProfessionalFilter;

          const showSlot2 =
            selectedProfessionalFilter === 'all' ||
            !slot2Apt ||
            slot2Apt.professionalId === selectedProfessionalFilter;

          return (
            <div
              key={time}
              className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-3 sm:p-4 hover:border-slate-750 transition flex flex-col md:flex-row md:items-center gap-3 sm:gap-4"
            >
              {/* Hour Badge */}
              <div className="md:w-28 shrink-0 flex items-center gap-2 border-b md:border-b-0 md:border-r border-slate-800 pb-2 md:pb-0 md:pr-3">
                <div className="w-8 h-8 rounded-xl bg-pink-600/10 text-pink-400 border border-pink-500/20 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-base font-black text-white tracking-tight">{time}</span>
                  <span className="block text-[10px] text-slate-400 font-semibold">hs</span>
                </div>
              </div>

              {/* Slot 1 & Slot 2 Grid */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* TURNO 1 */}
                <div className="relative">
                  {slot1Apt ? (
                    /* Occupied Slot 1 */
                    <div
                      className={`p-3.5 rounded-xl border transition-all ${
                        slot1Apt.status === 'cancelado'
                          ? 'bg-slate-950/60 border-slate-800 opacity-60'
                          : 'bg-slate-850/90 border-slate-750 hover:border-pink-500/40 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-pink-600/20 text-pink-300 text-[10px] font-extrabold uppercase">
                              Turno 1
                            </span>
                            {getStatusBadge(slot1Apt.status)}
                          </div>
                          <h4
                            onClick={() =>
                              slot1Apt.clientId && onOpenClientProfile
                                ? onOpenClientProfile(slot1Apt.clientId)
                                : handleOpenEditAppointment(slot1Apt)
                            }
                            className="text-sm font-bold text-white mt-1.5 hover:text-pink-400 cursor-pointer flex items-center gap-1.5"
                          >
                            <User className="w-3.5 h-3.5 text-pink-400" />
                            {slot1Apt.clientName}
                          </h4>
                          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {slot1Apt.clientPhone}
                          </p>
                        </div>

                        {/* Quick edit button */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleQuickSendWhatsApp(e, slot1Apt)}
                            className={`p-1.5 rounded-lg transition ${
                              slot1Apt.reminderSent
                                ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/40'
                                : 'bg-slate-800 hover:bg-emerald-950 text-slate-400 hover:text-emerald-400'
                            }`}
                            title={
                              slot1Apt.reminderSent
                                ? `Aviso WhatsApp ya enviado (${slot1Apt.reminderSentAt || '✓'}). Clic para reenviar`
                                : 'Enviar aviso de turno por WhatsApp de Erika'
                            }
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditAppointment(slot1Apt)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="Editar este turno"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAppointment(slot1Apt.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 transition"
                            title="Liberar turno"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Detail row */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-slate-400 italic text-[11px] truncate max-w-[140px]">
                            {slot1Apt.treatmentNote || 'Sesión general'}
                          </span>
                          {slot1Apt.reminderSent && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold shrink-0 border border-emerald-500/25">
                              WhatsApp ✓
                            </span>
                          )}
                        </div>
                        <span className="text-pink-300 font-bold text-[11px] shrink-0">
                          {professionals.find((p) => p.id === slot1Apt.professionalId)?.name ||
                            'Profesional'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Free Slot 1 */
                    <button
                      onClick={() => handleOpenNewAppointment(time, 1)}
                      className="w-full h-full min-h-[90px] border border-dashed border-slate-800 hover:border-pink-500/50 hover:bg-pink-600/[0.03] rounded-xl p-3 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-pink-300 transition-all group"
                    >
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800/80 text-slate-400 group-hover:bg-pink-600/20 group-hover:text-pink-300 transition">
                        <Plus className="w-3 h-3" /> Turno 1 Disponible
                      </span>
                      <span className="text-xs font-semibold text-slate-400 group-hover:text-white transition">
                        Asignar clienta
                      </span>
                    </button>
                  )}
                </div>

                {/* TURNO 2 */}
                <div className="relative">
                  {slot2Apt ? (
                    /* Occupied Slot 2 */
                    <div
                      className={`p-3.5 rounded-xl border transition-all ${
                        slot2Apt.status === 'cancelado'
                          ? 'bg-slate-950/60 border-slate-800 opacity-60'
                          : 'bg-slate-850/90 border-slate-750 hover:border-purple-500/40 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-purple-600/20 text-purple-300 text-[10px] font-extrabold uppercase">
                              Turno 2
                            </span>
                            {getStatusBadge(slot2Apt.status)}
                          </div>
                          <h4
                            onClick={() =>
                              slot2Apt.clientId && onOpenClientProfile
                                ? onOpenClientProfile(slot2Apt.clientId)
                                : handleOpenEditAppointment(slot2Apt)
                            }
                            className="text-sm font-bold text-white mt-1.5 hover:text-purple-300 cursor-pointer flex items-center gap-1.5"
                          >
                            <User className="w-3.5 h-3.5 text-purple-400" />
                            {slot2Apt.clientName}
                          </h4>
                          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {slot2Apt.clientPhone}
                          </p>
                        </div>

                        {/* Quick edit button */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleQuickSendWhatsApp(e, slot2Apt)}
                            className={`p-1.5 rounded-lg transition ${
                              slot2Apt.reminderSent
                                ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/40'
                                : 'bg-slate-800 hover:bg-emerald-950 text-slate-400 hover:text-emerald-400'
                            }`}
                            title={
                              slot2Apt.reminderSent
                                ? `Aviso WhatsApp ya enviado (${slot2Apt.reminderSentAt || '✓'}). Clic para reenviar`
                                : 'Enviar aviso de turno por WhatsApp de Erika'
                            }
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditAppointment(slot2Apt)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="Editar este turno"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAppointment(slot2Apt.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 transition"
                            title="Liberar turno"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Detail row */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-slate-400 italic text-[11px] truncate max-w-[140px]">
                            {slot2Apt.treatmentNote || 'Sesión general'}
                          </span>
                          {slot2Apt.reminderSent && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold shrink-0 border border-emerald-500/25">
                              WhatsApp ✓
                            </span>
                          )}
                        </div>
                        <span className="text-purple-300 font-bold text-[11px] shrink-0">
                          {professionals.find((p) => p.id === slot2Apt.professionalId)?.name ||
                            'Profesional'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Free Slot 2 */
                    <button
                      onClick={() => handleOpenNewAppointment(time, 2)}
                      className="w-full h-full min-h-[90px] border border-dashed border-slate-800 hover:border-purple-500/50 hover:bg-purple-600/[0.03] rounded-xl p-3 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-purple-300 transition-all group"
                    >
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800/80 text-slate-400 group-hover:bg-purple-600/20 group-hover:text-purple-300 transition">
                        <Plus className="w-3 h-3" /> Turno 2 Disponible
                      </span>
                      <span className="text-xs font-semibold text-slate-400 group-hover:text-white transition">
                        Asignar clienta
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Asignar o Editar Turno */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-scale-in my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center font-bold">
                  <Scissors className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingAppointment ? 'Modificar Turno Agendado' : 'Asignar Nuevo Turno'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedDate} • {modalTime} hs (Turno {modalSlot})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAppointment} className="space-y-4 mt-4 text-xs">
              {/* Slot and Time overview */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Horario Franja</label>
                  <select
                    value={modalTime}
                    onChange={(e) => setModalTime(e.target.value)}
                    className="w-full bg-slate-850 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 font-bold"
                  >
                    {AGENDA_TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t} hs
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Cupo Simultáneo</label>
                  <select
                    value={modalSlot}
                    onChange={(e) => setModalSlot(Number(e.target.value) as 1 | 2)}
                    className="w-full bg-slate-850 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 font-bold"
                  >
                    <option value={1}>Turno 1</option>
                    <option value={2}>Turno 2</option>
                  </select>
                </div>
              </div>

              {/* Professional Assigned */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">Profesional Asignada</label>
                <div className="grid grid-cols-2 gap-2">
                  {professionals.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setModalProfessionalId(p.id)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        modalProfessionalId === p.id
                          ? 'bg-pink-600/20 border-pink-500 text-white shadow-sm'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      <span className="font-bold block">{p.name}</span>
                      <span className="text-[10px] text-pink-400 block truncate">{p.role}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Select from existing Client or Type */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Clienta Registrada (Opcional)
                </label>
                <select
                  value={modalSelectedClientId}
                  onChange={(e) => handleSelectExistingClient(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-pink-500"
                >
                  <option value="">-- Cargar clienta de la lista o escribir abajo --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.phone}) {c.balanceDebt > 0 ? `• Debe $${c.balanceDebt}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Sofía Martínez"
                    value={modalClientName}
                    onChange={(e) => setModalClientName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="Ej: 11 4444-0101"
                    value={modalClientPhone}
                    onChange={(e) => setModalClientPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              {/* Treatment Note */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Tratamiento / Detalle del turno
                </label>
                <input
                  type="text"
                  placeholder="Ej: Balayage + Brushing / Corte / Retoque raíz"
                  value={modalTreatmentNote}
                  onChange={(e) => setModalTreatmentNote(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Status & Financials */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Estado</label>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value as AppointmentStatus)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-semibold"
                  >
                    <option value="confirmado">Confirmado</option>
                    <option value="en_proceso">En atención</option>
                    <option value="completado">Finalizado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Total ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    placeholder="0"
                    value={modalAmount}
                    onChange={(e) => setModalAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Abonado ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    placeholder="0"
                    value={modalPaidAmount}
                    onChange={(e) => setModalPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-emerald-300 font-bold placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                {editingAppointment ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteAppointment(editingAppointment.id)}
                    className="px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-950/40 font-bold flex items-center gap-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Liberar Turno
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 font-semibold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500 transition flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Guardar Turno
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: Confirmación para vaciar turnos de prueba */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-scale-in my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Vaciar Turnos de Prueba</h3>
                  <p className="text-xs text-slate-400">Limpiar la agenda para cargar turnos reales</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Seleccioná qué turnos deseás liberar para comenzar a cargar tus clientas reales:
              </p>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleClearDay}
                  className="w-full text-left p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-pink-500/40 transition group"
                >
                  <span className="font-bold text-white block group-hover:text-pink-300">
                    Vaciar turnos del día seleccionado ({selectedDate})
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Libera únicamente los turnos agendados para este día.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="w-full text-left p-3.5 rounded-2xl bg-rose-950/30 hover:bg-rose-950/60 border border-rose-500/30 hover:border-rose-500/60 transition group"
                >
                  <span className="font-bold text-rose-300 block group-hover:text-rose-200">
                    Vaciar toda la agenda completa (Todos los días)
                  </span>
                  <span className="text-[11px] text-rose-400/80 mt-0.5 block">
                    Elimina todos los turnos de prueba de la agenda para dejarla 100% limpia.
                  </span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Enviar Recordatorios de Mañana con wa.me/NUMERO?text=MENSAJE */}
      {isTomorrowReminderModalOpen && (
        <TomorrowReminderModal
          isOpen={isTomorrowReminderModalOpen}
          onClose={() => setIsTomorrowReminderModalOpen(false)}
          tomorrowDate={tomorrowDate}
          tomorrowAppointments={tomorrowTurnos}
          professionals={professionals}
          onAppointmentsChange={onAppointmentsChange}
        />
      )}

      {/* MODAL: Enviar Recordatorios por WhatsApp (Erika Valentini a las 14:00 hs) */}
      {isReminderModalOpen && (
        <WhatsAppReminderModal
          isOpen={isReminderModalOpen}
          onClose={() => {
            setIsReminderModalOpen(false);
            setAutoStartRunnerInModal(false);
          }}
          targetDate={reminderTargetDate}
          appointments={appointments}
          professionals={professionals}
          onUpdateAppointments={onAppointmentsChange}
          autoStartRunner={autoStartRunnerInModal}
        />
      )}
    </div>
  );
};
