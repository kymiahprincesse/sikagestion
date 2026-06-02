import { Component } from 'react';

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
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-navyClair flex items-center justify-center p-6">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-rouge mb-2">
                Une erreur s'est produite
              </h1>
              <p className="text-bleu">
                L'application a rencontré un problème inattendu.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-red-50 border border-rouge rounded-lg p-4 mb-4">
                <p className="font-mono text-sm text-rouge">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-orange text-white rounded-lg hover:bg-orange/90 transition-colors font-medium"
              >
                🔄 Recharger la page
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-6 py-3 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors font-medium"
              >
                🏠 Retour au tableau de bord
              </button>
            </div>

            {import.meta.env.DEV && this.state.errorInfo && (
              <details className="mt-6">
                <summary className="cursor-pointer text-bleu font-medium mb-2">
                  Détails techniques (développement)
                </summary>
                <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-64">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
