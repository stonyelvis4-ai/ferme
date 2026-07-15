import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export default class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  declare props: Readonly<AppErrorBoundaryProps>;

  state: AppErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || "Une erreur inattendue a empêché le chargement de FERM+.",
    };
  }

  componentDidCatch(error: Error) {
    console.error('FERM+ render error:', error);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-xl rounded-3xl border border-rose-100 bg-white p-8 shadow-xl shadow-slate-200/60">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-rose-600">
                Incident frontend
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                L&apos;interface FERM+ n&apos;a pas pu se charger correctement.
              </h1>
              <p className="text-sm leading-6 text-slate-600">{this.state.message}</p>
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:-translate-y-0.5"
              >
                <RotateCcw className="h-4 w-4" />
                Recharger l&apos;application
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
