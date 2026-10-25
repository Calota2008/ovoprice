import React from 'react';

type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('OvoPrice UI error:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8ff] px-6 text-center">
        <div className="max-w-sm space-y-3">
          <h1 className="text-lg font-bold text-slate-900">Ceva nu a mers bine</h1>
          <p className="text-sm text-slate-500">
            Aplicația a întâlnit o eroare neașteptată. Datele tale salvate local nu au fost șterse.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-[#08142e] text-white text-sm font-semibold cursor-pointer"
          >
            Reîncarcă aplicația
          </button>
        </div>
      </div>
    );
  }
}
