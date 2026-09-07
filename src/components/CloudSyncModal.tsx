import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
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
  Download,
  Upload,
  Activity,
  Users,
  Share2,
} from 'lucide-react';
import config from '../../firebase-applet-config.json';
import { testFirestoreConnection } from '../firebase';
import { getStoredClients, getStoredAppointments, getStoredProfessionals } from '../utils/storage';

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
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    clientsCount: number;
    appointmentsCount: number;
    latencyMs: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testFirestoreConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err?.message || 'Error al conectar',
        clientsCount: 0,
        appointmentsCount: 0,
        latencyMs: 0,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDownloadBackup = () => {
    const clients = getStoredClients();
    const apts = getStoredAppointments();
    const profs = getStoredProfessionals();
    const payload = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      clients,
      appointments: apts,
      professionals: profs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erika-valentini-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
          {/* SECCIÓN MULTIUSUARIO Y ACCESO DEL EQUIPO */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-950/70 to-pink-950/30 border border-purple-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-pink-400" />
                <span className="font-bold text-white text-sm">Acceso Multiusuario Libre (Cualquier Ingresante)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/30 text-[10px] font-bold">
                Sin Login • Acceso Directo
              </span>
            </div>

            <p className="text-slate-200 leading-relaxed text-[12px]">
              Cualquier persona que abra el enlace de la aplicación (Erika, peluqueras, recepcionistas, ayudantes) tiene <strong>permiso total e inmediato</strong> para:
            </p>

            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1 text-[11px]">
              <li><strong className="text-white">Cargar y editar clientas</strong> (teléfonos, notas técnicas, deudas y pagos).</li>
              <li><strong className="text-white">Agendar, mover y liberar turnos</strong> en cualquier fecha y horario.</li>
              <li><strong className="text-white">Ver cambios en vivo</strong>: si una persona crea un turno, aparece en la pantalla de los demás en menos de 1 segundo sin necesidad de recargar.</li>
            </ul>

            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-400 text-[11px]">
                Enlace actual de la app para compartir con tu equipo:
              </span>
              <button
                type="button"
                onClick={() => handleCopy(window.location.origin, 'app-link')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition shadow-md shadow-pink-600/20"
              >
                {copiedKey === 'app-link' ? <Check className="w-3.5 h-3.5 text-white" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'app-link' ? '¡Link Copiado!' : 'Copiar Link para el Equipo'}</span>
              </button>
            </div>
          </div>

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

            {/* Live Test and Diagnostics */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunTest}
                  disabled={isTesting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition disabled:opacity-50"
                >
                  <Activity className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Comprobando conexión...' : 'Verificar conexión en vivo con Firebase'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Descargar Copia JSON</span>
                </button>
              </div>

              {onForceSync && (
                <button
                  type="button"
                  onClick={onForceSync}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-pink-400" />
                  <span>Forzar sincronización</span>
                </button>
              )}
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-[11px] space-y-1 ${
                  testResult.ok
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {testResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>{testResult.ok ? 'Diagnóstico Exitoso' : 'Fallo de Diagnóstico'}</span>
                </div>
                <p>{testResult.message}</p>
                {testResult.ok && (
                  <p className="text-emerald-300 font-mono text-[10px]">
                    Confirmado en la nube: {testResult.clientsCount} clientas y {testResult.appointmentsCount} turnos.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* DESPLIEGUE Y CÓDIGO FUENTE (COLAPSABLE PARA EL DESARROLLADOR) */}
          <details className="rounded-2xl bg-slate-950/40 border border-slate-800/80 p-4 transition-all group">
            <summary className="flex items-center justify-between text-xs font-bold text-slate-400 hover:text-white cursor-pointer select-none">
              <span className="flex items-center gap-2">
                <Github className="w-4 h-4 text-purple-400" />
                <span>⚙️ Despliegue y Código Fuente (Para el Desarrollador)</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono group-open:rotate-180 transition-transform">
                GitHub & Vercel ▼
              </span>
            </summary>

            <div className="pt-4 space-y-4 border-t border-slate-800/60 mt-3">
              {/* 2. GITHUB REPOSITORY CONNECTION */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
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
                      En el menú superior de Google AI Studio (arriba a la derecha), haz clic en los tres puntos o el botón de ajustes y selecciona <strong>"Export to GitHub"</strong>. Creará un repositorio automático en tu perfil de GitHub.
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
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
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
                  Archivo <code>vercel.json</code> listo en la raíz del proyecto para compilar como SPA Vite:
                </p>

                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1 text-[11px]">
                  <li>Entrá a tu cuenta en <strong className="text-white">vercel.com</strong> e iniciá sesión con GitHub.</li>
                  <li>Hacé clic en <strong className="text-white">"Add New..." &gt; "Project"</strong>.</li>
                  <li>Seleccioná el repositorio <strong className="text-pink-300">erika-valentini-salon</strong>.</li>
                  <li>Hacé clic en <strong className="text-white">"Deploy"</strong>.</li>
                </ol>
              </div>
            </div>
          </details>
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
