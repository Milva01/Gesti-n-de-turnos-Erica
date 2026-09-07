import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  ExternalLink,
  Github,
  Globe,
  Database,
  Copy,
  Check,
  X,
  RefreshCw,
  Layers,
  ArrowRight,
} from 'lucide-react';
import config from '../../firebase-applet-config.json';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  clientsCount: number;
  appointmentsCount: number;
  onForceSync?: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  clientsCount,
  appointmentsCount,
  onForceSync,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl animate-scale-in my-8 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                Conexión Cloud: Firebase, GitHub & Vercel
              </h3>
              <p className="text-xs text-slate-400">
                Base de datos en la nube y despliegue continuo en producción
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="py-5 space-y-5 text-xs">
          {/* 1. FIREBASE STATUS (ACTIVE & PERSISTENT) */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white text-sm">1. Firebase Firestore (Activo)</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isOnline ? 'Sincronizado en tiempo real' : 'Modo Offline (con caché local)'}
              </span>
            </div>

            <p className="text-slate-300 leading-relaxed text-[12px]">
              Tus datos ya están conectados y guardados en <strong>Google Cloud Firebase Firestore</strong>. Cada clienta, turno agendado y perfil profesional se almacena en la nube de forma persistente y no se borra al cerrar o recargar el navegador.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">ID Proyecto Firebase</span>
                <span className="font-mono text-slate-200 font-bold truncate block" title={config.projectId}>
                  {config.projectId}
                </span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Clientas en la Nube</span>
                <span className="font-bold text-pink-400 text-sm">
                  {clientsCount} registradas
                </span>
              </div>
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Turnos en la Nube</span>
                <span className="font-bold text-blue-400 text-sm">
                  {appointmentsCount} agendados
                </span>
              </div>
            </div>

            {onForceSync && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={onForceSync}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-pink-400" />
                  <span>Forzar sincronización ahora</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. GITHUB REPOSITORY CONNECTION */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-white text-sm">2. Conectar con GitHub</span>
            </div>

            <p className="text-slate-300 leading-relaxed text-[12px]">
              Para vincular todo el código fuente con tu cuenta de GitHub y versionar tu salón:
            </p>

            <div className="space-y-2.5 text-[11px]">
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-pink-300 font-bold">
                  <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-[10px]">A</span>
                  <span>Método 1: Exportar directamente desde Google AI Studio</span>
                </div>
                <p className="text-slate-400 pl-7">
                  En el menú superior de Google AI Studio (arriba a la derecha), haz clic en los tres puntos o el botón de ajustes y selecciona <strong>"Export to GitHub"</strong> (o "Download ZIP"). Creará un repositorio automático en tu perfil de GitHub.
                </p>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px]">B</span>
                    <span>Método 2: Comandos Git tradicionales</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        'git init\ngit add .\ngit commit -m "Erika Valentini - Salón de Belleza con Firebase"\ngit branch -M main\ngit remote add origin https://github.com/TU_USUARIO/erika-valentini-salon.git\ngit push -u origin main',
                        'git-commands'
                      )
                    }
                    className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 font-bold"
                  >
                    {copiedKey === 'git-commands' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'git-commands' ? 'Copiado' : 'Copiar comandos'}</span>
                  </button>
                </div>
                <pre className="bg-slate-950 p-2.5 rounded-lg font-mono text-[10px] text-slate-300 overflow-x-auto">
{`git init
git add .
git commit -m "Erika Valentini - Salón de Belleza con Firebase"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/erika-valentini-salon.git
git push -u origin main`}
                </pre>
              </div>
            </div>
          </div>

          {/* 3. VERCEL DEPLOYMENT */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-white text-sm">3. Desplegar en Vercel (1 Clic)</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-bold">
                vercel.json listo
              </span>
            </div>

            <p className="text-slate-300 leading-relaxed text-[12px]">
              Ya hemos creado el archivo de configuración <code>vercel.json</code> en la raíz del proyecto para que Vercel compile el sitio como SPA Vite sin fallos:
            </p>

            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1 text-[11px]">
              <li>Entrá a tu cuenta en <strong className="text-white">vercel.com</strong> e iniciá sesión con GitHub.</li>
              <li>Hacé clic en <strong className="text-white">"Add New..." &gt; "Project"</strong>.</li>
              <li>Seleccioná el repositorio <strong className="text-pink-300">erika-valentini-salon</strong>.</li>
              <li>Vercel detectará automáticamente <strong>Framework: Vite</strong> y <strong>Build: npm run build</strong>.</li>
              <li>Hacé clic en <strong className="text-white">"Deploy"</strong>. ¡Tu app estará online con dominio SSL gratis (ej. <code>erika-valentini.vercel.app</code>) y sincronizada con Firebase!</li>
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Base de datos activa y protegida en Firebase</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-pink-600/25 transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
