'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 rounded-3xl bg-white border border-red-200 shadow-sm my-6 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-[#113824]">
              {this.props.fallbackTitle || 'Component Error Encountered'}
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {this.props.fallbackMessage ||
                'This section encountered a data display problem. The rest of the platform remains unaffected.'}
            </p>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <pre className="mt-3 p-2 rounded-lg bg-gray-50 text-red-600 text-[10px] font-mono text-left overflow-auto max-h-24">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 rounded-xl bg-[#113824] text-white text-xs font-bold uppercase tracking-wider inline-flex items-center space-x-2 shadow hover:bg-[#195235] transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Section</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
