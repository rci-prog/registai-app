import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { saveAuth, clearAuth, getAuth } from '@/lib/supabase-simple';
import type { User } from '@/types';

interface Profile {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: 'admin' | 'user';
  theme: 'light' | 'dark';
  created_at?: string;
  username?: string;
}

interface AuthContextType {
  currentUser: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  theme: 'light' | 'dark';
  isAuthReady: boolean;
  users: Profile[];
  blockMessage: string | null;
  needsOnboarding: boolean;
  dismissOnboarding: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  loginWithGoogle: () => Promise<{ success: boolean; message: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; message: string; isDeletedAccountWithNewPassword?: boolean }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  addUser: (email: string, role: string) => Promise<{ success: boolean; message: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; message: string }>;
  deleteAccount: () => Promise<{ success: boolean; message: string }>;
  updateUserProfile: (id: string, updates: Partial<Profile>) => Promise<void>;
  updatePassword: (_currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  updateTheme: (theme: 'light' | 'dark') => void;
  getUserFavorites: (userId: string) => Promise<string[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ADMIN_EMAIL = 'suporte@registai.com.br';
const SUPABASE_URL = 'https://cmfgirvgnexkcomhcosm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Dm-ozWvAve1nkgjEDg_QsA_-gldlMxk';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const setCurrentUserRef = useRef(setCurrentUser);
  const setProfileRef = useRef(setProfile);
  const setIsLoadingRef = useRef(setIsLoading);
  const currentUserRef = useRef(currentUser);
  setCurrentUserRef.current = setCurrentUser;
  setProfileRef.current = setProfile;
  setIsLoadingRef.current = setIsLoading;
  currentUserRef.current = currentUser;

  // Busca is_blocked via fetch direto (bypass RLS) — mesma tecnica do AdminPanel
  const checkUserBlocked = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=is_blocked&id=eq.${userId}`, {
        method: 'GET',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      });
      if (!resp.ok) { console.log('[Auth] [checkBlocked] fetch erro:', resp.status); return false; }
      const data = await resp.json();
      const isBlocked = data?.[0]?.is_blocked === true || data?.[0]?.is_blocked === 'true' || data?.[0]?.is_blocked === 1 || data?.[0]?.is_blocked === 't';
      console.log('[Auth] [checkBlocked] userId:', userId, 'is_blocked:', data?.[0]?.is_blocked, 'result:', isBlocked);
      return isBlocked;
    } catch (e: any) { console.error('[Auth] [checkBlocked] ex:', e.message); return false; }
  }, []);

  // ============================================================
  // AUTO-PROVISIONAMENTO DE PROFILE (UPSERT para Google OAuth)
  // ============================================================
  const autoProvisionProfile = useCallback(async (sessionUser: any): Promise<boolean> => {
    try {
      const email = sessionUser.email || '';
      const isAdminUser = email === ADMIN_EMAIL;
      const name = sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || email.split('@')[0];
      const avatar = sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.picture || '';

      const profilePayload = {
        id: sessionUser.id,
        email,
        full_name: name,
        avatar_url: avatar,
        role: isAdminUser ? 'admin' : 'user',
        theme: 'dark',
        updated_at: new Date().toISOString(),
      };

      console.log('[Auth] [autoProvision] Upsert profile para Google OAuth:', email);
      const { error } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id', ignoreDuplicates: false });

      if (error) {
        console.error('[Auth] [autoProvision] Erro no upsert:', error.message);
        return false;
      }

      console.log('[Auth] [autoProvision] ✅ Profile upserted para:', email);

      const user: User = {
        id: sessionUser.id,
        email,
        name,
        avatar,
        role: isAdminUser ? 'admin' : 'user',
        createdAt: new Date(sessionUser.created_at),
      };

      setCurrentUser(user);
      saveAuth(user);
      setProfile({
        id: sessionUser.id, email, name, avatar,
        role: isAdminUser ? 'admin' : 'user',
        theme: 'dark',
      });
      return true;
    } catch (e: any) {
      console.error('[Auth] [autoProvision] Erro:', e.message);
      return false;
    }
  }, []);

  // Verifica se o provedor de autenticacao é Google (OAuth)
  const isGoogleProvider = useCallback((sessionUser: any): boolean => {
    const provider = sessionUser?.app_metadata?.provider;
    const identities = sessionUser?.identities;
    const isGoogle = provider === 'google' || (Array.isArray(identities) && identities.some((i: any) => i.provider === 'google'));
    return isGoogle;
  }, []);

  const fetchProfile = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data: profileData, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      console.log('[Auth] [fetchProfile] userId:', userId, 'found:', !!profileData, 'error:', error?.message);
      if (error || !profileData) {
        console.log('[Auth] [fetchProfile] Profile nao encontrado. Criando automaticamente...');
        const cachedUser = getAuth();
        if (cachedUser?.id === userId) {
          const isAdminUser = cachedUser.email === ADMIN_EMAIL;
          const newProfile = {
            id: userId,
            email: cachedUser.email,
            full_name: cachedUser.name || cachedUser.email.split('@')[0],
            avatar_url: cachedUser.avatar || '',
            role: isAdminUser ? 'admin' : 'user',
            theme: 'dark',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const { error: insertError } = await supabase.from('profiles').insert(newProfile);
          if (insertError) {
            console.error('[Auth] [fetchProfile] Erro ao criar profile:', insertError.message);
          } else {
            console.log('[Auth] [fetchProfile] ✅ Profile auto-criado');
            setProfileRef.current({
              id: userId, email: cachedUser.email,
              name: newProfile.full_name, avatar: newProfile.avatar_url,
              role: newProfile.role as 'admin' | 'user', theme: 'dark',
            });
          }
        }
        return false;
      }

      try {
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=is_blocked&id=eq.${userId}`, {
          method: 'GET',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        });
        if (resp.ok) {
          const blockData = await resp.json();
          const rawBlocked = blockData?.[0]?.is_blocked;
          const isBlocked = rawBlocked === true || rawBlocked === 'true' || rawBlocked === 1 || rawBlocked === 't';
          console.log('[Auth] [fetchProfile] Bloqueio check:', profileData.email, 'raw:', rawBlocked, 'bloqueado:', isBlocked);
          if (isBlocked) {
            console.log('[Auth] [fetchProfile] 🚫 Usuario BLOQUEADO:', profileData.email);
            await supabase.auth.signOut();
            clearAuth();
            setCurrentUserRef.current(null);
            setProfileRef.current(null);
            return true;
          }
        }
      } catch (e: any) {
        console.error('[Auth] [fetchProfile] Erro no fetch de bloqueio:', e.message);
      }

      const mappedProfile: Profile = {
        id: profileData.id,
        email: profileData.email,
        name: profileData.full_name || profileData.name || '',
        avatar: profileData.avatar_url || '',
        role: profileData.role || 'user',
        theme: profileData.theme || 'dark',
        created_at: profileData.created_at,
        username: profileData.username || '',
      };
      setProfileRef.current(mappedProfile);
      const cachedUser = getAuth();
      if (cachedUser?.id === userId) {
        const updatedUser = { ...cachedUser, name: mappedProfile.name || cachedUser.name, avatar: mappedProfile.avatar || cachedUser.avatar };
        if (updatedUser.avatar !== cachedUser.avatar || updatedUser.name !== cachedUser.name) {
          setCurrentUserRef.current(updatedUser);
          saveAuth(updatedUser);
          console.log('[Auth] [fetchProfile] ✅ Cache atualizado');
        }
      }
      return false;
    } catch (err: any) {
      console.error('[Auth] [fetchProfile] Erro:', err.message);
      return false;
    }
  }, []);

  // LOGIN — verifica bloqueio e profile
  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('[Auth] [login] Tentando login:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, message: error.message };
      if (!data.user) return { success: false, message: 'Erro ao fazer login.' };

      const isBlocked = await checkUserBlocked(data.user.id);
      if (isBlocked) {
        await supabase.auth.signOut();
        clearAuth();
        return { success: false, message: 'Sua conta foi suspensa. Entre em contato com o suporte em suporte@registai.com.br' };
      }

      const { data: profileData } = await supabase.from('profiles').select('id').eq('id', data.user.id).maybeSingle();
      if (!profileData) {
        await supabase.auth.signOut();
        clearAuth();
        return { success: false, message: 'Esta conta foi removida. Cadastre-se novamente ou entre em contato com suporte@registai.com.br' };
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || '',
        avatar: data.user.user_metadata?.avatar_url || '',
        role: 'user',
        createdAt: new Date(data.user.created_at),
      };
      setCurrentUser(user);
      saveAuth(user);
      await fetchProfile(data.user.id);
      return { success: true, message: 'Login realizado com sucesso!' };
    } catch (error: any) {
      return { success: false, message: error?.message || 'Erro ao fazer login.' };
    }
  }, [fetchProfile, checkUserBlocked]);

    // REGISTER — Versão definitiva e ultra-limpa (O Trigger SQL cuida de criar o profile no banco)
  const register = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('[Auth] [register] Iniciando cadastro:', email);

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name }, // Passa o nome nos metadados para o Trigger do banco ler
          emailRedirectTo: 'https://www.registai.com.br',
        },
      });

      if (signUpError) {
        const errorMsg = signUpError.message.toLowerCase();
        const isDuplicateError =
          errorMsg.includes('already registered') ||
          errorMsg.includes('already exists') ||
          errorMsg.includes('user already') ||
          errorMsg.includes('duplicate');

        if (isDuplicateError) {
          return { success: false, message: 'Este e-mail já está cadastrado. Faça login com sua senha.' };
        }
        return { success: false, message: signUpError.message };
      }

      if (signUpData?.user) {
        // Checa se o usuário já veio com o e-mail confirmado (isso acontece no OAuth/Google)
        const isEmailConfirmed = !!signUpData.user.email_confirmed_at;
        const isAdminUser = email === ADMIN_EMAIL;

        if (isEmailConfirmed) {
          // 🟢 FLUXO GOOGLE / CONTA JÁ ATIVA:
          // Salva os estados locais imediatamente para liberar o login e a tela de termos
          const user: User = {
            id: signUpData.user.id,
            email,
            name,
            avatar: '',
            role: isAdminUser ? 'admin' : 'user',
            createdAt: new Date(signUpData.user.created_at || Date.now()),
          };

          setCurrentUser(user);
          saveAuth(user);
          setProfile({
            id: signUpData.user.id, email, name, avatar: '',
            role: isAdminUser ? 'admin' : 'user', theme: 'dark',
          });

          console.log('[Auth] [register] ✅ Login via Provedor Ativo (Google) concluído localmente.');
          return { success: true, isOAuth: true };
        } else {
          // ✉️ FLUXO E-MAIL/SENHA TRADICIONAL:
          // NÃO seta os estados locais. Força o usuário a ir ao e-mail confirmar.
          console.log('[Auth] [register] ⏳ Cadastro com e-mail pendente. Aguardando confirmação.');
          return { 
            success: true, 
            isOAuth: false,
            message: 'Conta criada! Enviamos um link de confirmação para o seu e-mail. Por favor, verifique sua caixa de entrada ou spam antes de fazer o primeiro login.' 
          };
        }
      }

      return { success: false, message: 'Erro ao processar cadastro. Tente novamente.' };
    } catch (error: any) {
      console.error('[Auth] [register] Erro:', error);
      return { success: false, message: error?.message || 'Erro ao criar conta.' };
    }
  }, []);
  
  // DELETE ACCOUNT
  const deleteAccount = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    const userId = currentUserRef.current?.id;
    if (!userId) return { success: false, message: 'Usuario nao identificado' };
    try {
      console.log('[Auth] [deleteAccount] Deletando dados do usuario:', userId);
      const tables = ['user_tools', 'user_budgets', 'user_subscriptions', 'projects', 'tool_clicks'];
      for (const table of tables) {
        const { error } = await supabase.from(table).delete().eq('user_id', userId);
        if (error) console.warn(`[deleteAccount] Falha ${table}:`, error.message);
      }
      await supabase.from('tool_transfers').delete().eq('sender_id', userId);
      await supabase.from('tool_transfers').delete().eq('recipient_id', userId);
      await supabase.from('profiles').delete().eq('id', userId);
      await supabase.auth.signOut();
      clearAuth();
      setCurrentUser(null);
      setProfile(null);
      console.log('[Auth] [deleteAccount] ✅ Conta excluida');
      return { success: true, message: 'Conta excluida. Voce pode se cadastrar novamente.' };
    } catch (error: any) {
      console.error('[Auth] [deleteAccount] Erro:', error.message);
      return { success: false, message: error.message };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    clearAuth();
    setCurrentUser(null);
    setProfile(null);
    setBlockMessage(null);
    setNeedsOnboarding(false);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!currentUserRef.current?.id) return;
    const dbUpdates: any = { ...updates };
    if (updates.avatar !== undefined) { dbUpdates.avatar_url = updates.avatar; delete dbUpdates.avatar; }
    const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', currentUserRef.current.id);
    if (error) throw error;
    setProfile(prev => prev ? { ...prev, ...updates } : null);
    if (updates.name || updates.avatar) {
      setCurrentUser(prev => prev ? { ...prev, name: updates.name || prev.name, avatar: updates.avatar || prev.avatar } : null);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
  // Limpa qualquer bloqueio anterior antes de tentar logar
  sessionStorage.removeItem('bloqueio_reativacao_ativo');
  
  const { data, error } = await supabase.auth.signInWithOAuth({ 
    provider: 'google', 
    options: { redirectTo: `${window.location.origin}?reactive=true` } 
  });
  
  if (error) return { success: false, message: error.message };
  if (data.url) window.location.href = data.url;
}, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/?reset_password=true` });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Link de redefinicao enviado!' };
  }, []);

  const dismissOnboarding = useCallback(() => {
    setNeedsOnboarding(false);
  }, []);

  const addUser = useCallback(async (_email: string, _role: string) => ({ success: false, message: 'Desabilitado' }), []);
  const deleteUser = useCallback(async (_id: string) => ({ success: false, message: 'Use o painel admin' }), []);
  const updateUserProfile = useCallback(async (id: string, updates: Partial<Profile>) => {
    const dbUpdates: any = { ...updates };
    if (updates.avatar !== undefined) { dbUpdates.avatar_url = updates.avatar; delete dbUpdates.avatar; }
    if (updates.name !== undefined) { dbUpdates.full_name = updates.name; delete dbUpdates.name; }
    const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', id);
    if (error) throw error;
  }, []);
  const updatePassword = useCallback(async (_currentPassword: string, newPassword: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const recoveryEmail = sessionData?.session?.user?.email || '';

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, message: error.message };

    // Se profile nao existe (conta deletada em recovery), reativar via upsert
    if (recoveryEmail) {
      const { data: profileCheck } = await supabase.from('profiles').select('id').eq('email', recoveryEmail).maybeSingle();
      if (!profileCheck) {
        console.log('[Auth] [updatePassword] Profile ausente apos recovery — reativando...');
        const userId = sessionData!.session!.user!.id;
        const isAdminUser = recoveryEmail === ADMIN_EMAIL;
        const name = sessionData!.session!.user!.user_metadata?.full_name || recoveryEmail.split('@')[0];
        const avatar = sessionData!.session!.user!.user_metadata?.avatar_url || '';
        await supabase.from('profiles').upsert({
          id: userId,
          email: recoveryEmail,
          full_name: name,
          avatar_url: avatar,
          role: isAdminUser ? 'admin' : 'user',
          theme: 'dark',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id', ignoreDuplicates: false });
        setNeedsOnboarding(true);
        console.log('[Auth] [updatePassword] ✅ Profile reativado apos recovery');
      }
    }

    return { success: true, message: 'Senha atualizada!' };
  }, []);
  const updateTheme = useCallback((_newTheme: 'light' | 'dark') => {
    console.log('[Auth] [updateTheme] Troca de tema ignorada — Dark Mode exclusivo.');
  }, []);
  const getUserFavorites = useCallback(async (userId: string) => {
    const { data } = await supabase.from('user_tools').select('tool_id').eq('user_id', userId).eq('is_favorite', true);
    return data?.map(item => item.tool_id) || [];
  }, []);

  // ============================================================
  // INICIALIZACAO
  // ============================================================
  useEffect(() => {
    const init = async () => {
      console.log('[Auth] ===== Init =====');

      const { data: { session } } = await supabase.auth.getSession();

      const isRecoveryFlow = new URLSearchParams(window.location.search).get('reset_password') === 'true';
      if (isRecoveryFlow && session?.user) {
        console.log('[Auth] [init] 🔒 RECOVERY detectado — sessao preservada');
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        console.log('[Auth] Sessao encontrada:', session.user.email);

        try {
          const resp = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=is_blocked&id=eq.${session.user.id}`, {
            method: 'GET',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
          });
          if (resp.ok) {
            const data = await resp.json();
            const raw = data?.[0]?.is_blocked;
            const isBlocked = raw === true || raw === 'true' || raw === 1 || raw === 't';
            if (isBlocked) {
              console.log('[Auth] 🚫 BLOQUEADO:', session.user.email);
              await supabase.auth.signOut();
              clearAuth();
              setCurrentUser(null);
              setProfile(null);
              setBlockMessage('Sua conta foi suspensa. Entre em contato com o suporte: suporte@registai.com.br');
              setIsLoading(false);
              if (window.location.hash.includes('access_token=')) {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
              }
              return;
            }
          }
        } catch (e) { /* ignora */ }

        const { data: profileCheck } = await supabase.from('profiles').select('id').eq('id', session.user.id).maybeSingle();

        if (!profileCheck) {
          if (isGoogleProvider(session.user)) {
            console.log('[Auth] Profile ausente + Google — auto-provisionando (upsert)...');
            const provisioned = await autoProvisionProfile(session.user);
            if (provisioned) {
              console.log('[Auth] ✅ Google auto-provisionado');
              setNeedsOnboarding(true);
              setBlockMessage(null);
              setIsLoading(false);
              if (window.location.hash.includes('access_token=')) {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
              }
              return;
            }
            console.warn('[Auth] Falha no auto-provisionamento');
          }

          console.log('[Auth] Profile nao existe (conta deletada):', session.user.email);
          await supabase.auth.signOut();
          clearAuth();
          setCurrentUser(null);
          setProfile(null);
          setIsLoading(false);
          if (window.location.hash.includes('access_token=')) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
          return;
        }

        const email = session.user.email || '';
        const user: User = {
          id: session.user.id,
          email,
          name: session.user.user_metadata?.full_name || email.split('@')[0] || '',
          avatar: session.user.user_metadata?.avatar_url || '',
          role: email === ADMIN_EMAIL ? 'admin' : 'user',
          createdAt: new Date(session.user.created_at),
        };
        setCurrentUser(user);
        saveAuth(user);
        fetchProfile(session.user.id);
        setBlockMessage(null);
        setIsLoading(false);
        if (window.location.hash.includes('access_token=')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        return;
      }

      const cachedUser = getAuth();
      if (cachedUser?.id) {
        console.log('[Auth] Cache restaurado:', cachedUser.email);
        setCurrentUser(cachedUser);
        fetchProfile(cachedUser.id);
      } else {
        console.log('[Auth] Sem cache');
      }
      setIsLoading(false);
    };

    const params = new URLSearchParams(window.location.search);
    if (params.get('reset_password') === 'true') {
      console.log('[Auth] Detectado ?reset_password=true — aguardando recovery token...');
      setTimeout(async () => {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) console.warn('[Auth] Erro ao obter sessao de recovery:', sessionError.message);
        if (session?.user) {
          console.log('[Auth] ✅ Sessao de recovery confirmada para:', session.user.email);
          window.dispatchEvent(new CustomEvent('open-reset-password-modal'));
        } else {
          console.warn('[Auth] ❌ Nenhuma sessao de recovery encontrada');
        }
        if (window.location.hash.includes('access_token=') || window.location.hash.includes('type=recovery')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          console.log('[Auth] Hash de recovery limpo da URL');
        }
      }, 2000);
    }

    init();
  }, [fetchProfile, autoProvisionProfile, isGoogleProvider]);

  // ============================================================
  // onAuthStateChange
  // ============================================================
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] [onAuthStateChange]', event, session?.user?.email || 'no user');

      if (event === 'PASSWORD_RECOVERY') {
        console.log('[Auth] [onAuthStateChange] 🔒 PASSWORD_RECOVERY — flag ativada');
        return;
n      }

      if (event === 'SIGNED_IN' && session?.user) {
        // Se estamos em sessao de recovery (apos clicar no link do e-mail),
        // NUNCA verificar profile nem dar signOut — deixar o usuario trocar a senha
        const isRecoveryFlow = new URLSearchParams(window.location.search).get('reset_password') === 'true';
        const isRecoveryHash = window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token=');
        if (isRecoveryFlow || isRecoveryHash) {
          console.log('[Auth] [SIGNED_IN] 🔒 RECOVERY — ignorando verificacao de profile');
          return;
        }

        (async () => {
          if (getAuth()?.id === session.user!.id) return;

          const { data: profileCheck } = await supabase.from('profiles').select('id').eq('id', session.user!.id).maybeSingle();

          if (!profileCheck) {
            if (isGoogleProvider(session.user)) {
              console.log('[Auth] [SIGNED_IN] Profile ausente + Google — auto-provisionando...');
              const provisioned = await autoProvisionProfile(session.user);
              if (provisioned) {
                setNeedsOnboarding(true);
              }
              setIsLoading(false);
              return;
            }
            console.log('[Auth] [SIGNED_IN] Profile nao encontrado:', session.user!.email);
            return;
          }

          console.log('[Auth] [SIGNED_IN] Profile OK:', session.user!.email);
          const email = session.user!.email || '';
          const user: User = {
            id: session.user!.id,
            email,
            name: session.user!.user_metadata?.full_name || email.split('@')[0] || '',
            avatar: session.user!.user_metadata?.avatar_url || '',
            role: email === ADMIN_EMAIL ? 'admin' : 'user',
            createdAt: new Date(session.user!.created_at),
          };
          setCurrentUser(user);
          saveAuth(user);
          fetchProfile(session.user!.id);
          setIsLoading(false);
        })();
      }

      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setProfile(null);
        clearAuth();
        setIsLoading(false);
        setNeedsOnboarding(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, autoProvisionProfile, isGoogleProvider]);

  const isAdmin = currentUser?.email === ADMIN_EMAIL || profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      currentUser, profile, isLoading, isAdmin, theme: 'dark' as const, isAuthReady: !isLoading,
      users: [], blockMessage, needsOnboarding, dismissOnboarding,
      login, logout, updateProfile, loginWithGoogle, register, resetPassword,
      addUser, deleteUser, deleteAccount, updateUserProfile, updatePassword, updateTheme, getUserFavorites,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
