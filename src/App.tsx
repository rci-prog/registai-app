import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import { Dashboard } from './components/Dashboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Dashboard />
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
