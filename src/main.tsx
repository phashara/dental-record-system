import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '32px 20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '40px auto', textAlign: 'center', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🦷</div>
          <h2 style={{ fontSize: '20px', color: '#1e293b', marginBottom: '8px' }}>ระบบกำลังเริ่มการเชื่อมต่อ</h2>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: 1.6 }}>
            หากพบปัญหานี้หลังจากเปิดใช้งานครั้งแรก โปรดกดปุ่มด้านล่างเพื่อโหลดข้อมูลใหม่อีกครั้ง
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#0284c7',
              color: '#fff',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🔄 รีเฟรชหน้าเว็บ (Reload)
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

