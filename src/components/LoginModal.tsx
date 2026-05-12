import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { SupportModal } from '@/components/SupportModal';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  initialError?: string | null; // Adicione esta linha
}

export function LoginModal({ open, onClose, onRegisterSuccess }: LoginModalProps) {
  const { login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setMessage(null);
    setMessageType(null);
  };

  const handleClose = () => {
    resetForm();
    setMode('login');
    onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setMessage('Preencha todos os campos.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage(null);
    const result = await login(email.trim(), password.trim());
    setLoading(false);

    if (result.success) {
      handleClose();
    } else {
      setMessage(result.message || 'Erro ao fazer login. Entre em contato com suporte@registai.com.br');
      setMessageType('error');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !name.trim()) {
      setMessage('Preencha todos os campos.');
      setMessageType('error');
      return;
    }

    if (password.length < 6) {
      setMessage('A senha deve ter no minimo 6 caracteres.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage(null);
    const result = await register(email.trim(), password.trim(), name.trim());
    setLoading(false);

    if (result.success) {
      setMessage('Conta criada com sucesso! Faça login para continuar.');
      setMessageType('success');
      setMode('login');
      resetForm();
      onRegisterSuccess?.();
    } else {
      setMessage(result.message || 'Erro ao criar conta. Entre em contato com suporte@registai.com.br');
      setMessageType('error');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const result = await loginWithGoogle();
    setLoading(false);
    if (!result.success) {
      setMessage(result.message);
      setMessageType('error');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-center">
              {mode === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}
            </DialogTitle>
          </DialogHeader>

          {/* Google Login */}
          <Button
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-gray-900 hover:bg-gray-100 border-gray-300"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Entrar com Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 px-2 text-slate-500">ou</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">Nome completo</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Minimo 6 caracteres' : 'Sua senha'}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-xs ${
                messageType === 'success'
                  ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800'
                  : 'bg-red-900/30 text-red-400 border border-red-800'
              }`}>
                {message}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : mode === 'login' ? (
                <><LogIn className="w-4 h-4 mr-2" />Entrar</>
              ) : (
                <><UserPlus className="w-4 h-4 mr-2" />Criar conta</>
              )}
            </Button>
          </form>

          {/* Toggle mode */}
          <div className="text-center text-xs text-slate-500">
            {mode === 'login' ? (
              <>
                Nao tem conta?{' '}
                <button
                  onClick={() => { setMode('register'); resetForm(); }}
                  className="text-violet-400 hover:text-violet-300 font-medium"
                >
                  Cadastre-se
                </button>
              </>
            ) : (
              <>
                Ja tem conta?{' '}
                <button
                  onClick={() => { setMode('login'); resetForm(); }}
                  className="text-violet-400 hover:text-violet-300 font-medium"
                >
                  Faca login
                </button>
              </>
            )}
          </div>

          {/* Suporte */}
          <div className="text-center">
            <button
              onClick={() => setSupportOpen(true)}
              className="text-[11px] text-slate-600 hover:text-violet-400 transition-colors"
            >
              Precisa de ajuda? Contatar suporte
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  );
}
