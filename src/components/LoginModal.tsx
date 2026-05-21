import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, Mail, CheckCircle, Eye, EyeOff, ArrowLeft, KeyRound, HelpCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { SupportModal } from '@/components/SupportModal';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  initialError?: string | null;
}

export function LoginModal({ open, onClose, initialError }: LoginModalProps) {
  const { login, loginWithGoogle, register, resetPassword, updatePassword } = useAuth();
  
  const [activeTab, setActiveTab] = useState('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(initialError || '');
  const [isLoading, setIsLoading] = useState(false);

  // Estado para prompt de reativacao de conta deletada com senha nova
  const [showReactivationPrompt, setShowReactivationPrompt] = useState(false);
  const [reactivationLoading, setReactivationLoading] = useState(false);
  const [reactivationSent, setReactivationSent] = useState(false);

  // Atualizar erro quando initialError muda (ex: apos redirect do Google com conta bloqueada)
  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  // Escutar evento para abrir modal de nova senha (quando usuario clica no link do e-mail)
  useEffect(() => {
    const handler = () => {
      console.log('[LoginModal] Evento open-reset-password-modal recebido');
      setShowNewPassword(true);
      setPasswordUpdated(false);
      setNewPassword('');
      setConfirmNewPassword('');
      setError('');
    };
    window.addEventListener('open-reset-password-modal', handler);
    return () => window.removeEventListener('open-reset-password-modal', handler);
  }, []);

  // Verificar na montagem se a URL tem ?reset_password=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset_password') === 'true') {
      console.log('[LoginModal] Detectado ?reset_password=true na URL');
      setShowNewPassword(true);
      setPasswordUpdated(false);
      setNewPassword('');
      setConfirmNewPassword('');
      setError('');
      // Limpar o parametro da URL sem recarregar a pagina
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState(null, '', newUrl);
    }
  }, []);

  // Estados para recuperacao de senha
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  // Estados para redefinicao de senha (apos clicar no link do e-mail)
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmNewPw, setShowConfirmNewPw] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  // Estados para confirmacao de cadastro
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [registerMessage, setRegisterMessage] = useState('');

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newPassword.trim()) { setError('Digite a nova senha.'); return; }
    if (newPassword.length < 6) { setError('A senha deve ter no minimo 6 caracteres.'); return; }
    if (newPassword !== confirmNewPassword) { setError('As senhas nao coincidem.'); return; }
    setIsLoading(true);
    try {
      const result = await updatePassword('', newPassword);
      if (!result.success) {
        setError(result.message || 'Erro ao atualizar senha.');
      } else {
        setPasswordUpdated(true);
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar senha.');
    }
    setIsLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(loginEmail, loginPassword);
    
    if (result.success) {
      setLoginEmail('');
      setLoginPassword('');
      onClose();
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    const result = await loginWithGoogle();
    if (!result.success) {
      setError(result.message);
      setIsLoading(false);
    }
    // Se sucesso, o navegador sera redirecionado pelo Supabase
  };

    const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (registerPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (registerPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    const result = await register(registerEmail, registerPassword, registerName);
    
    if (result.success) {
      setRegisterSuccess(true);
      setRegisterMessage(result.message || 'Cadastro realizado! Verifique seu e-mail para confirmar a conta.');
      
      // Limpa os campos do formulário
      setRegisterName('');
      setRegisterEmail('');
      setRegisterPassword('');
      setConfirmPassword('');

      // ✅ Destrava a tela: Fecha o modal automaticamente após 5 segundos 
      // para dar tempo do usuário ler a mensagem de sucesso com calma.
      setTimeout(() => {
        setIsLoginOpen(false); // Fecha o modal
        setRegisterSuccess(false); // Reseta o estado de sucesso para a próxima vez
      }, 5000);

    } else {
      setError(result.message);
    }
    setIsLoading(false);
  };

  const handleReactivateWithOTP = async () => {
    setError('');
    setReactivationLoading(true);
    try {
      console.log('[LoginModal] Enviando OTP magico para:', registerEmail);
      const { error } = await supabase.auth.signInWithOtp({
        email: registerEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/?magic_link=true`,
        },
      });
      if (error) {
        console.error('[LoginModal] Erro no OTP:', error.message);
        setError(error.message);
      } else {
        console.log('[LoginModal] OTP magico enviado com sucesso');
        setReactivationSent(true);
      }
    } catch (err: any) {
      console.error('[LoginModal] Erro ao enviar OTP:', err.message);
      setError(err.message || 'Erro ao enviar link de reativacao.');
    }
    setReactivationLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!resetEmail.trim()) {
      setError('Digite seu e-mail.');
      return;
    }

    setResetLoading(true);
    const result = await resetPassword(resetEmail);
    
    if (result.success) {
      setResetSent(true);
      setError('');
    } else {
      setError(result.message);
    }
    setResetLoading(false);
  };

  const resetForm = () => {
    setActiveTab('login');
    setError('');
    setLoginEmail('');
    setLoginPassword('');
    setRegisterName('');
    setRegisterEmail('');
    setRegisterPassword('');
    setConfirmPassword('');
    setShowForgotPassword(false);
    setResetEmail('');
    setResetSent(false);
    setShowReactivationPrompt(false);
    setReactivationSent(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) resetForm();
      onClose();
    }}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <DialogTitle className="text-2xl font-bold text-white">
            {showForgotPassword ? 'Recuperar Senha' : 'Acesso ao seu Catalogo'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {showForgotPassword 
              ? 'Digite seu e-mail para receber o link de recuperacao'
              : 'Entre ou crie sua conta para acessar'
            }
          </DialogDescription>
        </DialogHeader>

        {/* CONFIRMACAO DE CADASTRO (apos cadastro bem-sucedido) */}
        {registerSuccess ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-emerald-500/20">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Cadastro Realizado!
            </h3>
            <p className="text-sm text-slate-400">
              {registerMessage}
            </p>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400 text-left">
                Caso nao encontre o e-mail na sua Caixa de Entrada em instantes, por favor verifique sua pasta de Spam ou Lixo Eletronico.
              </p>
            </div>
            <Button
              onClick={() => { setRegisterSuccess(false); setActiveTab('login'); }}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-semibold text-base"
            >
              Ir para Login
            </Button>
          </div>
        ) : showReactivationPrompt ? (
          <div className="text-center space-y-5 py-2">
            {reactivationSent ? (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-emerald-500/20">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Link de Reativacao Enviado!
                </h3>
                <p className="text-sm text-slate-400">
                  Verifique seu e-mail ({registerEmail}) e clique no link para entrar direto na sua conta reativada.
                </p>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mx-auto max-w-sm">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-400 text-left">
                    Caso nao encontre o e-mail na sua Caixa de Entrada em instantes, por favor verifique sua pasta de Spam ou Lixo Eletronico.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => { setShowReactivationPrompt(false); setReactivationSent(false); setActiveTab('login'); }}
                  className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao login
                </Button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-violet-500/20">
                  <KeyRound className="w-8 h-8 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Reativar Conta
                </h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                  Notamos que voce ja teve uma conta conosco que foi encerrada. Para reativa-la agora mesmo com a senha que voce escolheu, clique no botao abaixo. Enviaremos um link magico para <strong className="text-white">{registerEmail}</strong>.
                </p>
                {error && (
                  <div className="rounded-lg p-3 text-sm text-center border bg-red-500/10 border-red-500/30 text-red-400 max-w-sm mx-auto">
                    {error}
                  </div>
                )}
                <Button
                  onClick={handleReactivateWithOTP}
                  disabled={reactivationLoading}
                  className="w-full max-w-sm mx-auto bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white py-3 rounded-xl font-semibold text-base"
                >
                  {reactivationLoading ? 'Enviando...' : 'Enviar Link Magico de Reativacao'}
                </Button>
                <button
                  type="button"
                  onClick={() => { setShowReactivationPrompt(false); setError(''); setReactivationSent(false); }}
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3 h-3 inline mr-1" />
                  Voltar ao cadastro
                </button>
              </>
            )}
          </div>
        ) : showNewPassword ? (
          !passwordUpdated ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <DialogTitle className="text-lg font-semibold text-white">
                <KeyRound className="w-5 h-5 inline mr-2 text-violet-500" />
                Criar Nova Senha
              </DialogTitle>
              <p className="text-sm text-slate-400">
                Digite sua nova senha abaixo.
              </p>
              {error && (
                <div className="p-3 rounded-lg text-sm flex items-center gap-2 bg-red-900/30 text-red-400 border border-red-800">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-lg text-base bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 border focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Nova senha (min. 6 caracteres)"
                  autoFocus
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400">
                  {showNewPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showConfirmNewPw ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-lg text-base bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 border focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Confirmar nova senha"
                />
                <button type="button" onClick={() => setShowConfirmNewPw(!showConfirmNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400">
                  {showConfirmNewPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-semibold text-base transition-all">
                {isLoading ? 'Salvando...' : 'Salvar Nova Senha'}
              </Button>
              <button
                type="button"
                onClick={() => { setShowNewPassword(false); setError(''); setNewPassword(''); setConfirmNewPassword(''); }}
                className="w-full text-center text-sm py-2 transition-colors text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-emerald-500/20">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Senha atualizada com sucesso!
              </h3>
              <p className="text-sm text-slate-400">
                Sua senha foi redefinida. Agora voce pode fazer login com a nova senha.
              </p>
              <Button
                onClick={() => { setShowNewPassword(false); setPasswordUpdated(false); }}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-semibold text-base"
              >
                Fazer Login
              </Button>
            </div>
          )
        ) : showForgotPassword ? (
          <div className="space-y-4 mt-4">
            {resetSent ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                  <KeyRound className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="text-emerald-400 text-sm">
                  Link de recuperacao enviado!<br/>
                  Verifique sua caixa de entrada.
                </p>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mx-auto max-w-xs">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-400 text-left">
                    Caso nao encontre o e-mail na sua Caixa de Entrada em instantes, por favor verifique sua pasta de Spam ou Lixo Eletronico.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetEmail(''); }}
                  className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resetEmail" className="text-slate-300">E-mail cadastrado</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="seu@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-400 text-center">{error}</p>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
                  disabled={resetLoading}
                >
                  {resetLoading ? 'Enviando...' : 'Enviar link de recuperacao'}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(false); setError(''); setResetEmail(''); }}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-3 h-3 inline mr-1" />
                    Voltar ao login
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* LOGIN / CADASTRO */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-800">
              <TabsTrigger value="login" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">Entrar</TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-4">
              {/* Google Login */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700 h-11"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {isLoading ? 'Redirecionando...' : 'Entrar com Google'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-900 px-2 text-slate-500">ou entre com email</span>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loginEmail" className="text-slate-300">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      id="loginEmail"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="loginPassword" className="text-slate-300">Senha</Label>
                    <button
                      type="button"
                      onClick={() => { setShowForgotPassword(true); setError(''); }}
                      className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      id="loginPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 pr-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg p-3 text-sm text-center border bg-red-500/10 border-red-500/30 text-red-400">
                    <p>{error}</p>
                    {(error.includes('suspensa') || error.includes('bloqueada') || error.includes('bloqueado')) && (
                      <button
                        className="inline-flex items-center gap-1 mt-2 text-violet-400 hover:text-violet-300 transition-colors text-xs font-medium"
                        onClick={() => setSupportOpen(true)}
                      >
                        <HelpCircle className="w-3 h-3" />
                        Contatar administrador
                      </button>
                    )}
                    {error.includes('removida') && (
                      <button
                        className="inline-flex items-center gap-1 mt-2 text-violet-400 hover:text-violet-300 transition-colors text-xs font-medium"
                        onClick={() => setSupportOpen(true)}
                      >
                        <HelpCircle className="w-3 h-3" />
                        Contatar administrador
                      </button>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
                  disabled={isLoading}
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 mt-4">
              {/* Google Login - Cadastro */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700 h-11"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {isLoading ? 'Redirecionando...' : 'Cadastrar com Google'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-900 px-2 text-slate-500">ou cadastre-se com email</span>
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="registerName" className="text-slate-300">Nome Completo</Label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <Input
                      id="registerName"
                      type="text"
                      placeholder="Seu nome completo"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registerEmail" className="text-slate-300">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      id="registerEmail"
                      type="email"
                      placeholder="seu@email.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registerPassword" className="text-slate-300">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      id="registerPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="pl-10 pr-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-300">Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 pr-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg p-3 text-sm text-center border bg-red-500/10 border-red-500/30 text-red-400">
                    <p>{error}</p>
                    {(error.includes('suspensa') || error.includes('bloqueada') || error.includes('bloqueado')) && (
                      <button
                        className="inline-flex items-center gap-1 mt-2 text-violet-400 hover:text-violet-300 transition-colors text-xs font-medium"
                        onClick={() => setSupportOpen(true)}
                      >
                        <HelpCircle className="w-3 h-3" />
                        Contatar administrador
                      </button>
                    )}
                    {error.includes('removida') && (
                      <button
                        className="inline-flex items-center gap-1 mt-2 text-violet-400 hover:text-violet-300 transition-colors text-xs font-medium"
                        onClick={() => setSupportOpen(true)}
                      >
                        <HelpCircle className="w-3 h-3" />
                        Contatar administrador
                      </button>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
                  disabled={isLoading}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Criar Conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}

        {/* Footer: link para contatar administrador */}
        <div className="mt-4 pt-3 border-t border-slate-700/50 text-center">
          <button
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-400 transition-colors"
            onClick={() => setSupportOpen(true)}
          >
            <HelpCircle className="w-3 h-3" />
            Precisa de ajuda? Contatar administrador
          </button>
        </div>

        {/* Modal de Suporte */}
        <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
