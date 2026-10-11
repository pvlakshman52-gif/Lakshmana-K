import React, { StrictMode, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPWA } from './serviceWorkerRegistration';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[RootErrorBoundary] Uncaught application error:', error, errorInfo);
  }

  handleReload = () => {
    localStorage.removeItem('mediclinic_erp_v1_go_live_cleared');
    window.location.reload();
  };

  handleResetState = () => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('mediclinic_erp_v1_') || key.startsWith('mediclinic_')) {
          localStorage.removeItem(key);
        }
      });
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#0f172a',
          color: '#f8fafc',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#fff'
              }}>
                +
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                  MediClinic Commerce ERP
                </h1>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                  Application Recovery Console
                </p>
              </div>
            </div>

            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '12px',
              marginBottom: '20px',
              fontSize: '12px',
              color: '#fca5a5',
              fontFamily: 'monospace',
              wordBreak: 'break-word'
            }}>
              {this.state.error?.message || 'An unexpected error occurred during interface initialization.'}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={this.handleReload}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: '#0d9488',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Reload Application
              </button>
              <button
                onClick={this.handleResetState}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  border: '1px solid #475569',
                  borderRadius: '10px',
                  color: '#cbd5e1',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Reset Cache &amp; Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </StrictMode>,
  );

  // Initialize service worker safely in the background after mounting
  setTimeout(() => {
    try {
      initPWA();
    } catch (e) {
      console.warn('[PWA] Post-mount worker init skipped:', e);
    }
  }, 1000);
}
