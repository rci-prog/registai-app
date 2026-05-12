import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ============================================================
// ERROR BOUNDARY — evita tela branca, mostra erro amigável
// ============================================================
interface EBProps { children: ReactNode }
interface EBState { hasError: boolean; error: Error | null }

class ErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error }
  }

  
    componentDidCatch(error: Error, info: any) {
    console.error('[ErrorBoundary] Erro capturado:', error)
    console.error('[ErrorBoundary] Info:', info)
    // DIAGNOSTICO: tentar identificar qual componente quebrou pelo stack
    const stack = error.stack || '';
    const match = stack.match(/at\s+(\w+)\s+\(/);
    const fnName = match ? match[1] : 'desconhecido';
    console.error('[ErrorBoundary] Funcao que quebrou:', fnName);
    console.error('[ErrorBoundary] Stack completo:', stack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#0f172a', color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif', padding: '2rem',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <h1 style={{ color: '#8b5cf6', marginBottom: '1rem' }}>registAI</h1>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Algo deu errado</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Houve um erro ao iniciar a aplicação. Tente recarregar a página.
            </p>
            <pre style={{
              background: '#1e293b', padding: '1rem', borderRadius: '0.5rem',
              fontSize: '0.75rem', color: '#f87171', textAlign: 'left',
              overflow: 'auto', maxHeight: '200px',
            }}>
              {this.state.error?.message || 'Erro desconhecido'}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '1.5rem', padding: '0.75rem 1.5rem', background: '#8b5cf6',
                color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: 600,
              }}
            >
              Recarregar página
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const BUILD_VERSION = '2025-05-12-v11';
const storedVersion = localStorage.getItem('app_build_version');
if (storedVersion && storedVersion !== BUILD_VERSION) {
  localStorage.setItem('app_build_version', BUILD_VERSION);
  window.location.reload();
} else {
  localStorage.setItem('app_build_version', BUILD_VERSION);
}
console.log(`[App] Build version: ${BUILD_VERSION}`);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
