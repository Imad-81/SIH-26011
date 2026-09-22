'use client';

import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class CanvasErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[WebGL Scene Error Boundary caught exception]:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/90 text-white p-6 text-center z-50">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-3xl mb-4 shadow-lg shadow-red-500/10">
            ⚠️
          </div>
          <h2 className="text-xl font-bold mb-2">3D Scene Rendering Interrupted</h2>
          <p className="text-gray-400 text-sm max-w-md mb-6">
            WebGL encountered a rendering error or context was lost. This can happen on memory-constrained GPUs or when hardware acceleration is disabled.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-all shadow-md shadow-cyan-500/20"
            >
              Retry 3D Scene
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
