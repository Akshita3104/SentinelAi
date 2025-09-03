import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h1>
              <p className="text-gray-600 mb-6">
                We're sorry, but an unexpected error occurred. Our team has been notified.
              </p>
              
              <div className="bg-red-50 p-4 rounded-lg text-left mb-6 overflow-auto max-h-60">
                <h3 className="font-semibold text-red-800 mb-2">Error Details:</h3>
                <pre className="text-xs text-red-700 whitespace-pre-wrap">
                  {this.state.error && this.state.error.toString()}
                </pre>
                <details className="mt-2">
                  <summary className="text-sm text-red-600 cursor-pointer">Show component stack</summary>
                  <pre className="text-xs text-red-700 mt-1 whitespace-pre-wrap">
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleReload}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Reload Page
                </button>
                <button
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
