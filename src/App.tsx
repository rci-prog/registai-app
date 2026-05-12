import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import { Dashboard } from './components/Dashboard';

function App() {
  return (
    <AuthProvider>
      <Dashboard />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
