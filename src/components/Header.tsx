import React from 'react';
import { Calendar, Users, Award, BookOpen, Cloud } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { ErikaLogo } from './ErikaLogo';

export type ActiveTab = 'professionals' | 'agenda' | 'clients' | 'guide';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  debtClientsCount?: number;
  onOpenCloudModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  debtClientsCount = 0,
  onOpenCloudModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-pink-900/20 shadow-2xl">
      {/* Main Navigation Bar - No address or whatsapp as requested */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand identity with official, large, distinguished Erika Valentini Logo */}
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.preventDefault();
            window.location.reload();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              window.location.reload();
            }
          }}
          title="Erika Valentini - Hacer clic para recargar la página"
          className="group flex items-center gap-3 cursor-pointer py-1 px-2 -ml-2 rounded-2xl transition-all duration-300 hover:bg-white/[0.04] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-pink-500/50"
        >
          <ErikaLogo size="lg" showSlogan={true} />
          <span className="hidden xl:inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider px-2.5 py-1 rounded-full bg-pink-600/10 text-pink-300 border border-pink-500/20 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0 duration-200">
            <span className="text-pink-400">↻</span> Recargar
          </span>
        </div>

        {/* View Switcher Tabs & PWA install action */}
        <div className="flex items-center gap-2 sm:gap-3">
          <nav className="flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800">
            {/* 1. Profesionales (Reseña editable) */}
            <button
              id="tab-btn-professionals"
              onClick={() => onTabChange('professionals')}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'professionals'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-600/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Profesionales</span>
            </button>

            {/* 2. Agenda (6:30 a 14:00, 2 turnos por franja) */}
            <button
              id="tab-btn-agenda"
              onClick={() => onTabChange('agenda')}
              className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'agenda'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-600/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Agenda</span>
            </button>

            {/* 3. Fichas de Clientas */}
            <button
              id="tab-btn-clients"
              onClick={() => onTabChange('clients')}
              className={`relative flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'clients'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-600/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Clientas</span>
              {debtClientsCount > 0 && (
                <span
                  title={`${debtClientsCount} clientas deben saldo`}
                  className="w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center shadow"
                >
                  {debtClientsCount}
                </span>
              )}
            </button>

            {/* Guía PWA discreta */}
            <button
              id="tab-btn-guide"
              onClick={() => onTabChange('guide')}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'guide'
                  ? 'bg-slate-800 text-pink-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Guía de instalación PWA"
            >
              <BookOpen className="w-3 h-3" />
              <span className="text-[11px]">PWA</span>
            </button>
          </nav>

          {onOpenCloudModal && (
            <button
              type="button"
              onClick={onOpenCloudModal}
              title="Base de datos multiusuario en la nube: cualquier cambio se refleja en tiempo real en todos los dispositivos"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition group"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline text-[11px] font-bold">Nube Multiusuario</span>
            </button>
          )}

          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
