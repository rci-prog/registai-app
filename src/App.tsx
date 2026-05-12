import { AuthProvider } from '@/contexts/AuthContext';
import { Dashboard } from '@/components/Dashboard';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <AuthProvider>
      <Dashboard />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f172a',
            border: '1px solid #1e293b',
            color: '#fff',
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;
