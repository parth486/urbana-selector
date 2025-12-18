import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: Error | null };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    try {
      console.error('ErrorBoundary caught error', error, info);
      (window as any).__urbana_diag = (window as any).__urbana_diag || { errors: [] };
      (window as any).__urbana_diag.errors.push({ type: 'error_boundary', message: error.message, stack: error.stack || null, info });
    } catch (e) {
      // ignore errors while logging
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-danger/5 border border-danger/10 rounded-medium text-center">
          <h2 className="text-lg font-semibold text-danger mb-2">Something went wrong</h2>
          <p className="text-sm text-default-600 mb-4">An unexpected error occurred while rendering this application.</p>
          <pre className="text-xs text-default-400 whitespace-pre-wrap">{this.state.error?.message}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
