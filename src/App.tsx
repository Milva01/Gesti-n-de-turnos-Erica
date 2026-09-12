import { useState, useEffect, useRef } from 'react';
import { Header, ActiveTab } from './components/Header';
import { ProfessionalsView } from './components/ProfessionalsView';
import { AgendaView } from './components/AgendaView';
import { ClientsView } from './components/ClientsView';
import { PWAGuideView } from './components/PWAGuideView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CloudSyncModal } from './components/CloudSyncModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErikaLogo } from './components/ErikaLogo';
import {
  getStoredAppointments,
  getStoredClients,
  getStoredProfessionals,
  getStoredSalonInfo,
  saveStoredAppointments,
  saveStoredClients,
  saveStoredProfessionals,
  saveStoredSalonInfo,
  getDeletedClientIds,
  getDeletedAppointmentIds,
} from './utils/storage';
import {
  db,
  subscribeToClients,
  subscribeToAppointments,
  subscribeToProfessionals,
  subscribeToSalonInfo,
  saveClientToFirebase,
  saveAppointmentToFirebase,
  syncAllClientsToFirebase,
  syncAllAppointmentsToFirebase,
  saveProfessionalsToFirebase,
} from './firebase';
import { doc, getDocFromServer } from 'firebase/firestore';
import { Appointment, ClientRecord, Professional, SalonInfo } from './types';
import { CheckCircle2, ShieldCheck, Heart, Cloud, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('professionals');

  // Core reactive data
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [salonInfo, setSalonInfo] = useState<SalonInfo>(getStoredSalonInfo());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');
  const [cloudErrorMessage, setCloudErrorMessage] = useState<string | null>(null);

  // Cross-navigation helpers
  const [selectedClientIdToOpen, setSelectedClientIdToOpen] = useState<string | null>(null);
  const [agendaProfFilter, setAgendaProfFilter] = useState<string | undefined>(undefined);

  const clientsRef = useRef<ClientRecord[]>([]);
  const appointmentsRef = useRef<Appointment[]>([]);

  const loadLocalData = () => {
    const profs = getStoredProfessionals();
    const cls = getStoredClients();
    const apts = getStoredAppointments();
    const info = getStoredSalonInfo();
    setProfessionals(profs);
    setClients(cls);
    setAppointments(apts);
    setSalonInfo(info);
    clientsRef.current = cls;
    appointmentsRef.current = apts;
  };

  useEffect(() => {
    // 1. Initial fast boot from local cache
    loadLocalData();

    // 2. Online / Offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 3. Test Firestore connection at boot
    const verifyConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'system', 'ping'));
      } catch (err) {
        // Normal if ping document does not exist; network roundtrip was attempted
      }
    };
    verifyConnection();

    // 4. Real-time Firebase listeners for live multi-tab & multi-device sync
    const unsubClients = subscribeToClients(
      (cloudClients) => {
        setCloudSyncStatus('connected');
        setCloudErrorMessage(null);
        clientsRef.current = cloudClients;
        setClients(cloudClients);
        saveStoredClients(cloudClients);
      },
      (err) => {
        setCloudSyncStatus('error');
        setCloudErrorMessage(`Aviso de nube: ${err?.message || 'Reconectando con base de datos de Google...'}`);
      }
    );

    const unsubAppointments = subscribeToAppointments(
      (cloudApts) => {
        setCloudSyncStatus('connected');
        setCloudErrorMessage(null);
        appointmentsRef.current = cloudApts;
        setAppointments(cloudApts);
        saveStoredAppointments(cloudApts);
      },
      (err) => {
        setCloudSyncStatus('error');
        setCloudErrorMessage(`Aviso de nube: ${err?.message || 'Reconectando con base de datos de Google...'}`);
      }
    );

    const unsubProfessionals = subscribeToProfessionals((cloudProfs, isEmpty) => {
      if (isEmpty) {
        const local = getStoredProfessionals();
        if (local && local.length > 0) {
          saveProfessionalsToFirebase(local);
          return;
        }
      }
      if (cloudProfs.length > 0) {
        setProfessionals(cloudProfs);
        saveStoredProfessionals(cloudProfs);
      }
    });

    const unsubSalon = subscribeToSalonInfo((cloudInfo) => {
      if (cloudInfo && cloudInfo.name) {
        setSalonInfo(cloudInfo);
        saveStoredSalonInfo(cloudInfo);
      }
    });

    return () => {
      unsubClients();
      unsubAppointments();
      unsubProfessionals();
      unsubSalon();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update handlers with reactive local persistence
  const handleProfessionalsChange = (updated: Professional[]) => {
    setProfessionals(updated);
    saveStoredProfessionals(updated);
    saveProfessionalsToFirebase(updated);
    showToast('Perfil guardado en la nube');
  };

  const handleClientsChange = (updated: ClientRecord[]) => {
    setClients(updated);
    saveStoredClients(updated);
  };

  const handleAppointmentsChange = (updated: Appointment[]) => {
    setAppointments(updated);
    saveStoredAppointments(updated);
    showToast('Agenda sincronizada');
  };

  const handleForceSync = () => {
    syncAllClientsToFirebase(clients);
    syncAllAppointmentsToFirebase(appointments);
    saveProfessionalsToFirebase(professionals);
    showToast('Sincronización forzada con Firebase completada');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Navigators
  const handleNavigateToAgenda = (professionalId?: string) => {
    setAgendaProfFilter(professionalId || 'all');
    setActiveTab('agenda');
  };

  const handleOpenClientProfile = (clientId: string) => {
    setSelectedClientIdToOpen(clientId);
    setActiveTab('clients');
  };

  const handleNavigateToAgendaWithClient = (client: ClientRecord) => {
    setActiveTab('agenda');
    showToast(`Selecciona un turno disponible para ${client.fullName}`);
  };

  const debtClientsCount = Array.isArray(clients)
    ? clients.filter((c) => Boolean(c && (Number(c.balanceDebt) || 0) > 0)).length
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-slate-100 selection:bg-pink-500 selection:text-white font-sans relative overflow-x-hidden">
      {/* Ambient background lighting */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none z-0 opacity-35"
        style={{
          background:
            'radial-gradient(ellipse 65% 55% at 50% 0%, rgba(236, 72, 153, 0.18), transparent 70%)',
        }}
      />

      {/* PWA Offline indicator */}
      <OfflineIndicator />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-4 z-50 flex items-center gap-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow-2xl shadow-pink-600/30 animate-fade-in border border-pink-400/30">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header - No address and No whatsapp */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        debtClientsCount={debtClientsCount}
        clientsCount={clients.length}
        appointmentsCount={appointments.length}
        onOpenCloudModal={() => setIsCloudModalOpen(true)}
      />

      {cloudErrorMessage && (
        <div className="max-w-7xl mx-auto px-4 pt-3 z-30 relative">
          <div className="p-3 bg-amber-950/80 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-3 text-amber-200 text-xs shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{cloudErrorMessage}</span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shrink-0"
            >
              Reconectar
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto pb-16 px-2 sm:px-4 z-10">
        <ErrorBoundary fallbackTitle="Inconveniente al cargar la sección">
          {/* 1. Profesionales (Reseña editable) */}
          {activeTab === 'professionals' && (
            <ProfessionalsView
              professionals={professionals}
              appointments={appointments}
              onProfessionalsChange={handleProfessionalsChange}
              onNavigateToAgenda={handleNavigateToAgenda}
            />
          )}

          {/* 2. Agenda (6:30 a 14:00 con 2 turnos por franja) */}
          {activeTab === 'agenda' && (
            <AgendaView
              appointments={appointments}
              professionals={professionals}
              clients={clients}
              onAppointmentsChange={handleAppointmentsChange}
              onClientsChange={handleClientsChange}
              onOpenClientProfile={handleOpenClientProfile}
              initialProfessionalFilter={agendaProfFilter}
            />
          )}

          {/* 3. Ficha de Clientas */}
          {activeTab === 'clients' && (
            <ClientsView
              clients={clients}
              appointments={appointments}
              onClientsChange={handleClientsChange}
              onNavigateToAgendaWithClient={handleNavigateToAgendaWithClient}
              selectedClientIdToOpen={selectedClientIdToOpen}
              onClearSelectedClientId={() => setSelectedClientIdToOpen(null)}
            />
          )}

          {/* 4. Guía PWA */}
          {activeTab === 'guide' && <PWAGuideView />}
        </ErrorBoundary>
      </main>

      {/* Footer - No address, No WhatsApp as requested */}
      <footer className="bg-slate-950 border-t border-slate-850 text-slate-400 text-xs py-10 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <div
              role="button"
              tabIndex={0}
              onClick={() => window.location.reload()}
              title="Erika Valentini - Clic para recargar página"
              className="cursor-pointer hover:opacity-85 transition-opacity"
            >
              <ErikaLogo size="md" showSlogan={true} />
            </div>
            <span className="hidden sm:inline text-slate-700">|</span>
            <span className="text-slate-500">Sistema de Gestión de Agenda & Clientas</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500 text-xs">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-pink-500" />
              Acceso Exclusivo Salón
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Heart className="w-3 h-3 text-pink-500 fill-pink-500" />
              Estilo en tus cabellos
            </span>
          </div>
        </div>
      </footer>

      {/* Cloud & GitHub / Vercel Synchronization Modal */}
      <CloudSyncModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        isOnline={isOnline}
        clientsCount={clients.length}
        appointmentsCount={appointments.length}
        onForceSync={handleForceSync}
      />
    </div>
  );
}
