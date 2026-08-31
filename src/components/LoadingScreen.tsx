export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-night-900">
      <span className="spin-slow h-12 w-12 rounded-full border-3 border-night-500 border-t-gold-400" style={{ animationDuration: '1.2s' }} />
      <p className="text-sm font-bold text-gold-400">در حال بارگذاری کتابخانه…</p>
    </div>
  );
}

export function LoadingSpinner({ size = 20 }: { size?: number }) {
  return (
    <span
      className="spin-slow inline-block rounded-full border-2 border-night-500 border-t-gold-400"
      style={{ width: size, height: size, animationDuration: '1s' }}
    />
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

import { Component } from 'react';

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-rose-500/15">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c9564e" strokeWidth="1.5">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h2 className="font-display text-xl text-mist-100">خطای غیرمنتظره</h2>
          <p className="max-w-md text-sm text-mist-400">
            متأسفانه مشکلی پیش آمده است. لطفاً صفحه را دوباره بارگذاری کنید.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-gold-500 px-6 py-2 text-sm font-bold text-night-900 transition-all hover:bg-gold-400"
          >
            بارگذاری مجدد
          </button>
          {this.state.error && (
            <pre className="mt-4 max-w-lg overflow-auto rounded-md bg-night-900 p-3 text-xs text-rose-400" dir="ltr">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
