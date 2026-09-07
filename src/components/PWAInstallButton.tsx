import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, CheckCircle2, Share, PlusSquare, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // If already installed and running standalone
  if (isInstalled) {
    return (
      <div
        id="pwa-installed-badge"
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
        title="App instalada y ejecutándose en modo standalone"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>PWA Instalada</span>
      </div>
    );
  }

  return (
    <>
      {/* Chromium / Android install trigger */}
      {isInstallable ? (
        <button
          id="btn-pwa-install"
          onClick={install}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-1.5 text-xs font-semibold text-slate-950 shadow-md hover:from-amber-400 hover:to-amber-500 transition-all active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar App</span>
        </button>
      ) : isIOS ? (
        <button
          id="btn-pwa-install-ios"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 px-3.5 py-1.5 text-xs font-medium text-amber-400 border border-amber-500/30 transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar en iPhone</span>
        </button>
      ) : (
        <button
          id="btn-pwa-info"
          onClick={() => setShowInfoModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 px-3 py-1.5 text-xs font-medium text-slate-300 border border-slate-700 hover:border-slate-600 transition-all"
          title="Ver cómo instalar la PWA"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span>Instalar PWA</span>
        </button>
      )}

      {/* Modal iOS Safari */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-amber-400" />
                Instalar en iPhone / iPad
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg shrink-0">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-white">1. Abrir menú Compartir</p>
                  <p className="text-xs text-slate-400 mt-0.5">Tocá el botón de compartir en la barra inferior de Safari.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-white">2. Agregar a pantalla de inicio</p>
                  <p className="text-xs text-slate-400 mt-0.5">Deslizá hacia abajo y seleccioná "Agregar a inicio".</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-amber-500 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal Informative (when inside iframe preview or desktop Chrome without prompt event) */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-amber-400" />
                Instalación PWA (Progressive Web App)
              </h3>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p>
                Esta aplicación está configurada con <strong>Service Worker</strong> y <strong>Web App Manifest</strong> para funcionar como una aplicación nativa instalable en Android, iOS, Windows y Mac:
              </p>

              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Funciona Offline sin internet</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Ícono en pantalla de inicio con acceso rápido</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Carga instantánea mediante Service Worker precaching</span>
                </div>
              </div>

              <div className="text-xs text-slate-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                <strong className="text-amber-300">Tip de prueba:</strong> Para ver el prompt nativo del navegador, abrí la app en una nueva pestaña (fuera del iframe de vista previa) o en tu celular y hacé clic en el ícono de instalar en la barra de URL o el menú del navegador.
              </div>
            </div>

            <button
              onClick={() => setShowInfoModal(false)}
              className="mt-5 w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
