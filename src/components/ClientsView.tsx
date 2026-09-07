import React, { useState } from 'react';
import { ClientRecord, ClientPayment, Appointment } from '../types';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Save,
  X,
  CreditCard,
  Banknote,
  ArrowUpRight,
  TrendingDown,
  Sparkles,
} from 'lucide-react';

interface ClientsViewProps {
  clients: ClientRecord[];
  appointments: Appointment[];
  onClientsChange: (updated: ClientRecord[]) => void;
  onNavigateToAgendaWithClient?: (client: ClientRecord) => void;
  selectedClientIdToOpen?: string | null;
  onClearSelectedClientId?: () => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  appointments,
  onClientsChange,
  onNavigateToAgendaWithClient,
  selectedClientIdToOpen,
  onClearSelectedClientId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'debt' | 'upcoming' | 'upToDate'>('all');

  // Active client file modal state
  const [activeClient, setActiveClient] = useState<ClientRecord | null>(() => {
    if (selectedClientIdToOpen) {
      return clients.find((c) => c.id === selectedClientIdToOpen) || null;
    }
    return null;
  });

  const [activeTabInModal, setActiveTabInModal] = useState<'general' | 'finances' | 'history'>('general');

  // New Client creation modal
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showClearClientsModal, setShowClearClientsModal] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    technicalNotes: '',
    lastVisit: '',
    nextVisit: '',
    balanceDebt: 0,
  });

  // Payment registration form inside client modal
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState<number>(0);
  const [newPaymentConcept, setNewPaymentConcept] = useState<string>('Abono a cuenta');
  const [newPaymentMethod, setNewPaymentMethod] = useState<'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Otro'>('Efectivo');

  // Charge / Debt addition form
  const [showAddDebtForm, setShowAddDebtForm] = useState(false);
  const [newDebtAmount, setNewDebtAmount] = useState<number>(0);
  const [newDebtConcept, setNewDebtConcept] = useState<string>('Servicio realizado');

  // Auto-sync if selectedClientIdToOpen is triggered from another view
  React.useEffect(() => {
    if (selectedClientIdToOpen) {
      const found = clients.find((c) => c.id === selectedClientIdToOpen);
      if (found) {
        setActiveClient({ ...found });
        onClearSelectedClientId?.();
      }
    }
  }, [selectedClientIdToOpen, clients]);

  // Search & Filter logic
  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.technicalNotes && c.technicalNotes.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'debt') return c.balanceDebt > 0;
    if (filterType === 'upcoming') return !!c.nextVisit;
    if (filterType === 'upToDate') return c.balanceDebt === 0;
    return true;
  });

  // Summary Metrics
  const totalDebt = clients.reduce((acc, c) => acc + (c.balanceDebt || 0), 0);
  const totalCollected = clients.reduce((acc, c) => acc + (c.totalPaid || 0), 0);
  const withDebtCount = clients.filter((c) => c.balanceDebt > 0).length;

  // Save active client modifications
  const handleSaveActiveClient = (updatedData: Partial<ClientRecord>) => {
    if (!activeClient) return;
    const updated = { ...activeClient, ...updatedData };
    setActiveClient(updated);
    const updatedList = clients.map((c) => (c.id === updated.id ? updated : c));
    onClientsChange(updatedList);
  };

  // Register a new Payment for active client
  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient || newPaymentAmount <= 0) return;

    const newPayment: ClientPayment = {
      id: `pay-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      amount: newPaymentAmount,
      concept: newPaymentConcept.trim() || 'Abono a cuenta',
      method: newPaymentMethod,
    };

    const newBalanceDebt = Math.max(0, (activeClient.balanceDebt || 0) - newPaymentAmount);
    const newTotalPaid = (activeClient.totalPaid || 0) + newPaymentAmount;
    const updatedPayments = [newPayment, ...(activeClient.payments || [])];

    handleSaveActiveClient({
      payments: updatedPayments,
      balanceDebt: newBalanceDebt,
      totalPaid: newTotalPaid,
    });

    setNewPaymentAmount(0);
    setShowAddPaymentForm(false);
  };

  // Add extra debt/charge to client
  const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient || newDebtAmount <= 0) return;

    const newBalanceDebt = (activeClient.balanceDebt || 0) + newDebtAmount;
    handleSaveActiveClient({
      balanceDebt: newBalanceDebt,
    });

    setNewDebtAmount(0);
    setShowAddDebtForm(false);
  };

  // Create new client
  const handleCreateNewClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientForm.fullName.trim()) return;

    const newClient: ClientRecord = {
      id: `cli-${Date.now()}`,
      fullName: newClientForm.fullName.trim(),
      phone: newClientForm.phone.trim() || 'Sin teléfono',
      email: newClientForm.email.trim() || undefined,
      technicalNotes: newClientForm.technicalNotes.trim() || undefined,
      lastVisit: newClientForm.lastVisit.trim() || undefined,
      nextVisit: newClientForm.nextVisit.trim() || undefined,
      balanceDebt: Number(newClientForm.balanceDebt) || 0,
      totalPaid: 0,
      payments: [],
      createdAt: new Date().toISOString(),
    };

    onClientsChange([newClient, ...clients]);
    setNewClientForm({
      fullName: '',
      phone: '',
      email: '',
      technicalNotes: '',
      lastVisit: '',
      nextVisit: '',
      balanceDebt: 0,
    });
    setIsCreatingNew(false);
    setActiveClient(newClient);
  };

  // Delete client (Immediate non-blocking execution)
  const handleDeleteClient = (clientId: string) => {
    const updated = clients.filter((c) => c.id !== clientId);
    onClientsChange(updated);
    setActiveClient(null);
  };

  // Clear all clients completely
  const handleClearAllClients = () => {
    onClientsChange([]);
    setActiveClient(null);
    setShowClearClientsModal(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-3 sm:px-6 space-y-6 animate-fade-in">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total de Clientas
            </span>
            <h3 className="text-2xl font-black text-white mt-1">{clients.length}</h3>
            <span className="text-[11px] text-slate-400">Fichas en el sistema</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-pink-600/10 text-pink-400 border border-pink-500/20 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Saldo Pendiente ("Debe")
            </span>
            <h3 className="text-2xl font-black text-rose-400 mt-1">
              ${totalDebt.toLocaleString('es-AR')}
            </h3>
            <span className="text-[11px] text-slate-400">
              {withDebtCount} clientas con saldo deudor
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" /> Total Histórico Cobrado
            </span>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">
              ${totalCollected.toLocaleString('es-AR')}
            </h3>
            <span className="text-[11px] text-slate-400">Registro de pagos acumulados</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Banknote className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6">
        {/* Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">Fichero de Clientas</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Accedé a la ficha individual totalmente editable con historial de visitas, fórmulas y cuenta corriente.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {clients.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearClientsModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-xs font-bold transition whitespace-nowrap"
                title="Vaciar todas las clientas cargadas"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Vaciar Fichero
              </button>
            )}

            <button
              onClick={() => setIsCreatingNew(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold text-xs shadow-lg shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500 transition whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Nueva Clienta
            </button>
          </div>
        </div>

        {/* Search Bar & Filter Chips */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o notas técnicas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-pink-500 placeholder-slate-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              Todas ({clients.length})
            </button>
            <button
              onClick={() => setFilterType('debt')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
                filterType === 'debt'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-800 text-rose-400 hover:bg-slate-750 border border-rose-500/20'
              }`}
            >
              Deudoras ({withDebtCount})
            </button>
            <button
              onClick={() => setFilterType('upcoming')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filterType === 'upcoming'
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              Con Próxima Visita
            </button>
          </div>
        </div>

        {/* Client Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.length === 0 ? (
            <div className="col-span-full py-10 px-5 sm:px-8 text-center bg-slate-950/60 rounded-3xl border border-slate-800/90 shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-pink-500/30 flex items-center justify-center mx-auto text-pink-400 mb-4 shadow-lg shadow-pink-500/10">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Fichero listo para tus clientas reales
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto mt-2 leading-relaxed">
                Se eliminaron las clientas de prueba. Comenzá ahora a cargar fichas reales organizadas en módulos de contacto, fórmulas de color, visitas y cuenta corriente.
              </p>

              {/* 4 Feature Module Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto my-6 text-left">
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
                  <div className="flex items-center gap-2 text-pink-400 font-bold text-xs mb-1">
                    <Users className="w-4 h-4" /> Módulo 1: Contacto
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Nombre completo, teléfono celular / WhatsApp y correo electrónico.
                  </p>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-xs mb-1">
                    <FileText className="w-4 h-4" /> Módulo 2: Fórmulas
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Colorimetría, tonos, mezclas de tintura, deco y tratamientos realizados.
                  </p>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs mb-1">
                    <Calendar className="w-4 h-4" /> Módulo 3: Visitas
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Fecha de última atención previa y próxima cita agendada en el salón.
                  </p>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
                    <DollarSign className="w-4 h-4" /> Módulo 4: Cuenta Cte.
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Control de saldos ("Debe" $), registro de pagos, señas y abonos.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-sm shadow-xl shadow-pink-600/30 transition transform hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" />
                Cargar Primera Clienta
              </button>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No se encontraron clientas con ese criterio.</p>
            </div>
          ) : (
            filteredClients.map((client) => {
              const initials = client.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={client.id}
                  onClick={() => setActiveClient({ ...client })}
                  className="bg-slate-850/70 border border-slate-800 hover:border-pink-500/40 rounded-2xl p-4 transition-all duration-200 hover:bg-slate-800/80 cursor-pointer flex flex-col justify-between group shadow-sm hover:shadow-xl"
                >
                  <div>
                    {/* Top Row: Avatar, Name & Debt Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-600/30 to-purple-600/30 border border-pink-500/30 text-pink-300 flex items-center justify-center font-black text-sm">
                          {initials}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-pink-400 transition">
                            {client.fullName}
                          </h4>
                          <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {client.phone}
                          </span>
                        </div>
                      </div>

                      {/* Debt Badge */}
                      {client.balanceDebt > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30 whitespace-nowrap">
                          Debe ${client.balanceDebt.toLocaleString('es-AR')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                          Al día
                        </span>
                      )}
                    </div>

                    {/* Visits summary */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block font-semibold">Última Visita</span>
                        <span className="text-slate-300 font-medium flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {client.lastVisit || 'Sin datos'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-semibold">Próxima Visita</span>
                        <span className="text-pink-400 font-bold flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-pink-500" />
                          {client.nextVisit || 'No agendada'}
                        </span>
                      </div>
                    </div>

                    {/* Formula / Technical note preview */}
                    {client.technicalNotes && (
                      <p className="mt-2.5 text-[11px] text-slate-400 line-clamp-1 italic bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-800">
                        {client.technicalNotes}
                      </p>
                    )}
                  </div>

                  {/* Bottom Action */}
                  <div className="mt-4 pt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">
                      Pagado: <strong>${client.totalPaid.toLocaleString('es-AR')}</strong>
                    </span>
                    <span className="text-pink-400 font-bold text-xs group-hover:underline flex items-center gap-1">
                      Abrir Ficha &rarr;
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL: FICHA COMPLETA TOTALMENTE EDITABLE */}
      {activeClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl animate-scale-in my-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-pink-600/20 text-pink-400 border border-pink-500/30 flex items-center justify-center font-black text-lg">
                  {activeClient.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white">{activeClient.fullName}</h3>
                    {activeClient.balanceDebt > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        Debe ${activeClient.balanceDebt.toLocaleString('es-AR')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Al día
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>{activeClient.phone}</span>
                    {activeClient.email && <span>• {activeClient.email}</span>}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveClient(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Subtabs */}
            <div className="flex items-center gap-2 mt-4 border-b border-slate-800 pb-3">
              <button
                onClick={() => setActiveTabInModal('general')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTabInModal === 'general'
                    ? 'bg-pink-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                }`}
              >
                Datos & Visitas
              </button>
              <button
                onClick={() => setActiveTabInModal('finances')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTabInModal === 'finances'
                    ? 'bg-pink-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                }`}
              >
                Cuenta Corriente (Debe y Pagos)
                {activeClient.balanceDebt > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                )}
              </button>
              <button
                onClick={() => setActiveTabInModal('history')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTabInModal === 'history'
                    ? 'bg-pink-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                }`}
              >
                Historial de Turnos
              </button>
            </div>

            {/* TAB 1: DATOS GENERALES & VISITAS */}
            {activeTabInModal === 'general' && (
              <div className="space-y-4 mt-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Nombre Completo</label>
                    <input
                      type="text"
                      value={activeClient.fullName}
                      onChange={(e) => handleSaveActiveClient({ fullName: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Teléfono</label>
                    <input
                      type="text"
                      value={activeClient.phone}
                      onChange={(e) => handleSaveActiveClient({ phone: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      placeholder="nombre@correo.com"
                      value={activeClient.email || ''}
                      onChange={(e) => handleSaveActiveClient({ email: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Última Visita Previa</label>
                      <input
                        type="date"
                        value={activeClient.lastVisit || ''}
                        onChange={(e) => handleSaveActiveClient({ lastVisit: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Próxima Visita</label>
                      <input
                        type="date"
                        value={activeClient.nextVisit || ''}
                        onChange={(e) => handleSaveActiveClient({ nextVisit: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-pink-300 font-bold focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Technical Notes / Formulas */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1 flex items-center justify-between">
                    <span>Fórmulas de Color & Notas Técnicas</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Preferencias, cuidados, tono deco
                    </span>
                  </label>
                  <textarea
                    rows={4}
                    value={activeClient.technicalNotes || ''}
                    onChange={(e) => handleSaveActiveClient({ technicalNotes: e.target.value })}
                    placeholder="Ej: Tono 8.1 con 20 volúmenes, alisado térmico cada 3 meses, cuero cabelludo sensible..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-pink-500 leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: CUENTA CORRIENTE, DEBE Y PAGOS */}
            {activeTabInModal === 'finances' && (
              <div className="space-y-4 mt-4 text-xs">
                {/* Highlights Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <span className="text-[11px] font-bold text-rose-400 block uppercase tracking-wider">
                      Saldo Actual que "Debe"
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl font-black text-rose-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={activeClient.balanceDebt}
                        onChange={(e) =>
                          handleSaveActiveClient({ balanceDebt: Number(e.target.value) })
                        }
                        className="w-32 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xl font-black text-rose-400 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Podés editar este valor directamente o asentar pagos abajo.
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-emerald-400 block uppercase tracking-wider">
                      Total Pagado Acumulado
                    </span>
                    <h4 className="text-2xl font-black text-emerald-400 mt-1">
                      ${activeClient.totalPaid.toLocaleString('es-AR')}
                    </h4>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {activeClient.payments?.length || 0} pagos registrados en total.
                    </span>
                  </div>
                </div>

                {/* Quick actions: Add Payment or Add Debt */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowAddPaymentForm(!showAddPaymentForm);
                      setShowAddDebtForm(false);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Asentar Nuevo Pago
                  </button>

                  <button
                    onClick={() => {
                      setShowAddDebtForm(!showAddDebtForm);
                      setShowAddPaymentForm(false);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30 font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Deuda / Cargo
                  </button>
                </div>

                {/* Form to add payment */}
                {showAddPaymentForm && (
                  <form
                    onSubmit={handleAddPayment}
                    className="bg-slate-850 p-4 rounded-2xl border border-emerald-500/40 space-y-3"
                  >
                    <h5 className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Banknote className="w-4 h-4" /> Registrar Pago de Clienta
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">Monto ($)</label>
                        <input
                          type="number"
                          required
                          min="1"
                          step="500"
                          value={newPaymentAmount || ''}
                          onChange={(e) => setNewPaymentAmount(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-bold"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">Medio</label>
                        <select
                          value={newPaymentMethod}
                          onChange={(e) =>
                            setNewPaymentMethod(
                              e.target.value as 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Otro'
                            )
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
                        >
                          <option value="Efectivo">Efectivo</option>
                          <option value="Transferencia">Transferencia</option>
                          <option value="Tarjeta">Tarjeta</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">Concepto</label>
                        <input
                          type="text"
                          value={newPaymentConcept}
                          onChange={(e) => setNewPaymentConcept(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
                          placeholder="Ej: Pago de turno"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddPaymentForm(false)}
                        className="px-3 py-1 text-slate-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow"
                      >
                        Confirmar Pago
                      </button>
                    </div>
                  </form>
                )}

                {/* Form to add debt */}
                {showAddDebtForm && (
                  <form
                    onSubmit={handleAddDebt}
                    className="bg-slate-850 p-4 rounded-2xl border border-rose-500/40 space-y-3"
                  >
                    <h5 className="font-bold text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Agregar Cargo a Cuenta ("Debe")
                    </h5>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">
                          Monto a sumar ($)
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          step="500"
                          value={newDebtAmount || ''}
                          onChange={(e) => setNewDebtAmount(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-bold"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1 font-semibold">Concepto</label>
                        <input
                          type="text"
                          value={newDebtConcept}
                          onChange={(e) => setNewDebtConcept(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
                          placeholder="Ej: Saldo de peinado pendiente"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddDebtForm(false)}
                        className="px-3 py-1 text-slate-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow"
                      >
                        Sumar a Debe
                      </button>
                    </div>
                  </form>
                )}

                {/* Payments History List */}
                <div>
                  <h5 className="font-bold text-slate-300 mb-2">Historial de Pagos Realizados</h5>
                  {!activeClient.payments || activeClient.payments.length === 0 ? (
                    <p className="text-slate-500 italic py-3 text-center bg-slate-950 rounded-xl">
                      Aún no hay pagos asentados para esta clienta.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {activeClient.payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px]"
                        >
                          <div>
                            <span className="font-bold text-white block">{p.concept}</span>
                            <span className="text-slate-400">
                              {p.date} • {p.method}
                            </span>
                          </div>
                          <span className="font-black text-emerald-400 text-xs">
                            +${p.amount.toLocaleString('es-AR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: HISTORIAL DE TURNOS EN AGENDAR */}
            {activeTabInModal === 'history' && (
              <div className="space-y-3 mt-4 text-xs">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-slate-300">Turnos Registrados en Agenda</h5>
                  {onNavigateToAgendaWithClient && (
                    <button
                      onClick={() => {
                        onNavigateToAgendaWithClient(activeClient);
                        setActiveClient(null);
                      }}
                      className="inline-flex items-center gap-1 text-pink-400 hover:text-pink-300 font-bold"
                    >
                      <Calendar className="w-3.5 h-3.5" /> Agendar Nuevo Turno &rarr;
                    </button>
                  )}
                </div>

                {appointments.filter((a) => a.clientId === activeClient.id).length === 0 ? (
                  <p className="text-slate-500 italic py-4 text-center bg-slate-950 rounded-xl">
                    No registra turnos previos o futuros en la agenda actual.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {appointments
                      .filter((a) => a.clientId === activeClient.id)
                      .map((apt) => (
                        <div
                          key={apt.id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">
                                {apt.date} • {apt.time} hs (Turno {apt.slotNumber})
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                                {apt.status}
                              </span>
                            </div>
                            <span className="text-slate-400 text-[11px] block mt-0.5">
                              {apt.treatmentNote || 'Sesión general'}
                            </span>
                          </div>
                          <span className="text-pink-400 font-bold">${apt.amount || 0}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer Actions */}
            <div className="pt-4 mt-6 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteClient(activeClient.id)}
                className="px-3 py-1.5 rounded-xl text-rose-400 hover:bg-rose-950/40 text-xs font-bold transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar Ficha
              </button>

              <button
                type="button"
                onClick={() => setActiveClient(null)}
                className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition shadow-lg shadow-pink-600/30 flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" /> Listo / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ALTA DE NUEVA CLIENTA (ESTRUCTURA MODULAR) */}
      {isCreatingNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl animate-scale-in my-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-pink-500/30 text-pink-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-white">Nueva Ficha de Clienta</h3>
                  <p className="text-xs text-slate-400">Cargá los módulos de información técnica y personal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewClient} className="space-y-4 mt-4 text-xs">
              {/* Módulo 1: Contacto */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="flex items-center gap-2 text-pink-400 font-bold text-xs">
                  <Users className="w-4 h-4" />
                  <span>Módulo 1: Datos de Contacto</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Camila Rossi"
                    value={newClientForm.fullName}
                    onChange={(e) => setNewClientForm({ ...newClientForm, fullName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500 font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Teléfono / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="Ej: 11 4444-0101"
                      value={newClientForm.phone}
                      onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      placeholder="ejemplo@correo.com"
                      value={newClientForm.email}
                      onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>
              </div>

              {/* Módulo 2: Fórmulas Técnicas */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                  <FileText className="w-4 h-4" />
                  <span>Módulo 2: Ficha Técnica & Colorimetría</span>
                </div>

                <label className="block text-slate-300 font-semibold">
                  Fórmulas de tinte, decoloración o cuidados especiales
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Tono 7.1 con 20 volúmenes en raíz. Matiz 9.21 con Olaplex. Cuero cabelludo sensible..."
                  value={newClientForm.technicalNotes}
                  onChange={(e) =>
                    setNewClientForm({ ...newClientForm, technicalNotes: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Módulo 3: Visitas */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                  <Calendar className="w-4 h-4" />
                  <span>Módulo 3: Visitas & Citas</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Última Visita Previa</label>
                    <input
                      type="date"
                      value={newClientForm.lastVisit}
                      onChange={(e) => setNewClientForm({ ...newClientForm, lastVisit: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Próxima Visita Agendada</label>
                    <input
                      type="date"
                      value={newClientForm.nextVisit}
                      onChange={(e) => setNewClientForm({ ...newClientForm, nextVisit: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>
              </div>

              {/* Módulo 4: Cuenta Corriente */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <DollarSign className="w-4 h-4" />
                  <span>Módulo 4: Cuenta Corriente Inicial</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-slate-300 font-semibold mb-1">
                      Saldo Deudor Inicial ("Debe" $)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={newClientForm.balanceDebt}
                      onChange={(e) =>
                        setNewClientForm({ ...newClientForm, balanceDebt: Number(e.target.value) })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex-1 text-[11px] text-slate-400 pt-5">
                    Dejar en $0 si la clienta no registra saldo pendiente anterior.
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500 transition"
                >
                  Crear Ficha y Abrir Módulo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR VACIADO COMPLETO DE CLIENTAS */}
      {showClearClientsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-scale-in my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Vaciar Fichero de Clientas</h3>
                  <p className="text-xs text-slate-400">Eliminar todas las fichas registradas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClearClientsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Esta acción eliminará todas las fichas de clientas cargadas en el sistema para que puedas comenzar de cero.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearClientsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClearAllClients}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition"
              >
                Sí, Vaciar Todo el Fichero
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
