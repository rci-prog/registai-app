import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ActivityProvider } from './contexts/ActivityContext';
import { Toaster } from './components/ui/sonner';
import { Dashboard } from './components/Dashboard'; // Note as { } em volta

function App() {
  return (
    <AuthProvider>
      <ActivityProvider>
        <BrowserRouter>
          <Dashboard />
          <Toaster />
        </BrowserRouter>
      </ActivityProvider>
    </AuthProvider>
  );
}

export default App;
