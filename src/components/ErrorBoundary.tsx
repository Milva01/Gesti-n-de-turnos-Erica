import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-xl mx-auto my-12 p-6 rounded-3xl bg-slate-900/95 border border-rose-500/40 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-black text-white">
            {this.props.fallbackTitle || 'Ocurrió un inconveniente al cargar esta sección'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            Detectamos un formato imprevisto en los datos almacenados. Podés reintentar la carga o refrescar la aplicación para restablecer la vista.
          </p>
          {this.state.error && (
            <p className="text-[11px] font-mono text-rose-300 bg-rose-950/40 px-3 py-1.5 rounded-xl border border-rose-500/20 max-w-md mx-auto break-words">
              {this.state.error.message}
            </p>
          )}
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-lg shadow-pink-600/30 transition"
            >
              <RotateCcw className="w-4 h-4" />
              Reintentar Carga
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition"
            >
              Recargar App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
