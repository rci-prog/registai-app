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
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  loginWithGoogle: () => Promise<{ success: boolean; message: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; message: string }>;
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

  const fetchProfile = useCallback(async (userId: string): Promise<boolean> => {
    try {
      // Busca profile via Supabase client (com RLS — OK para leitura normal)
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

      // === VERIFICACAO DE BLOQUEIO via fetch direto (bypass RLS) ===
      try {
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=is_blocked&id=eq.${userId}`, {
          method: 'GET',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        });
        if (resp.ok) {
          const blockData = await resp.json();
          const rawBlocked = blockData?.[0]?.is_blocked;
          const isBlocked = rawBlocked === true || rawBlocked === 'true' || rawBlocked === 1 || rawBlocked === 't';
          console.log('[Auth] [fetchProfile] Bloqueio check (fetch direto):', profileData.email, 'raw:', rawBlocked, 'bloqueado:', isBlocked);
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
        const updatedUser = {
          ...cachedUser,
          name: mappedProfile.name || cachedUser.name,
          avatar: mappedProfile.avatar || cachedUser.avatar,
        };
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

  // REGISTER — com recuperacao para contas deletadas
  const register = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; message: string }> => {
    try {
      console.log('[Auth] [register] ===== INICIO =====', email);

      // 1. Deletar profile antigo se existir
      const { data: oldProfile } = await supabase.from('profiles').select('id,email').eq('email', email).maybeSingle();
      console.log('[Auth] [register] 1. Profile antigo:', oldProfile);
      if (oldProfile) {
        await supabase.from('profiles').delete().eq('email', email);
        console.log('[Auth] [register] 2. Profile antigo deletado');
      }

      // 2. signUp com confirmacao por e-mail habilitada
      console.log('[Auth] [register] 3. Chamando signUp...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: 'https://www.registai.com.br',
        },
      });
      // Desabilitar auto-login: fazer signOut imediatamente apos cadastro
      // para garantir que o usuario so acesse apos confirmar o e-mail
      await supabase.auth.signOut();
      console.log('[Auth] [register] 4. signUp retornou:', {
        hasUser: !!data.user,
        hasSession: !!data.session,
        error: error?.message || null,
        userId: data.user?.id || null,
        userEmail: data.user?.email || null,
      });

      if (error) {
        console.log('[Auth] [register] 5. ERROR:', error.message);
        return { success: false, message: error.message };
      }

      if (!data.user) {
        console.log('[Auth] [register] 5. Sem user no retorno');
        return { success: false, message: 'Erro ao criar conta.' };
      }

      // 3. Sem session = email ja existe no Auth
      if (!data.session) {
        // Verificar se o profile existe (conta ativa vs. deletada)
        const { data: profileCheck } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
        console.log('[Auth] [register] 5. Profile check:', profileCheck ? 'ATIVO' : 'DELETADO');

        if (!profileCheck) {
          // CONTA DELETADA: auth user existe mas profile foi removido
          console.log('[Auth] [register] 5b. Conta deletada detectada. Tentando reativacao...');
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
          if (loginError || !loginData.user) {
            console.log('[Auth] [register] 6. Reativacao falhou (senha incorreta):', loginError?.message);
            return {
              success: false,
              message: 'Esta conta foi removida anteriormente. Para recuperar o acesso com este e-mail, use a opcao "Esqueci a senha" na tela de login. Para criar uma conta nova, utilize um e-mail diferente.',
            };
          }
          // Login OK — recriar profile automaticamente (reativacao da conta)
          console.log('[Auth] [register] 7. Reativacao OK. Recriando profile...');
          const isAdminUser = email === ADMIN_EMAIL;
          const recreatedProfile = {
            id: loginData.user.id,
            email,
            full_name: loginData.user.user_metadata?.full_name || name || email.split('@')[0],
            avatar_url: loginData.user.user_metadata?.avatar_url || '',
            role: isAdminUser ? 'admin' : 'user',
            theme: 'dark',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          await supabase.from('profiles').insert(recreatedProfile);
          const user: User = {
            id: loginData.user.id,
            email: loginData.user.email || email,
            name: recreatedProfile.full_name,
            avatar: recreatedProfile.avatar_url,
            role: isAdminUser ? 'admin' : 'user',
            createdAt: new Date(loginData.user.created_at),
          };
          setCurrentUser(user);
          saveAuth(user);
          fetchProfile(loginData.user.id);
          return { success: true, message: 'Conta reativada com sucesso! Bem-vindo de volta.' };
        }

        // CONTA ATIVA: tentar login com a senha fornecida
        console.log('[Auth] [register] 5c. Conta ativa. Tentando login...');
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError || !loginData.user) {
          console.log('[Auth] [register] 6. Login falhou:', loginError?.message);
          return { success: false, message: 'Este e-mail ja esta cadastrado. Use a opcao "Esqueci a senha" na tela de login ou entre com sua senha correta.' };
        }
        // Login funcionou — entra com a conta existente
        console.log('[Auth] [register] 7. Login OK com credenciais existentes');
        const user: User = {
          id: loginData.user.id,
          email: loginData.user.email || email,
          name: loginData.user.user_metadata?.full_name || name || email.split('@')[0],
          avatar: loginData.user.user_metadata?.avatar_url || '',
          role: email === ADMIN_EMAIL ? 'admin' : 'user',
          createdAt: new Date(loginData.user.created_at),
        };
        setCurrentUser(user);
        saveAuth(user);
        fetchProfile(loginData.user.id);
        return { success: true, message: 'Login realizado com sucesso!' };
      }

      // 4. Novo usuario → criar profile
      console.log('[Auth] [register] 5. Novo usuario. ID:', data.user.id);
      const isAdminUser = email === ADMIN_EMAIL;
      const newProfile = {
        id: data.user.id,
        email,
        full_name: name,
        avatar_url: '',
        role: isAdminUser ? 'admin' : 'user',
        theme: 'dark',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error: profileError } = await supabase.from('profiles').insert(newProfile);
      console.log('[Auth] [register] 6. Profile insert:', { error: profileError?.message || 'OK' });

      if (profileError) {
        return { success: true, message: 'Conta criada, mas erro ao salvar perfil.' };
      }

      const user: User = {
        id: data.user.id, email, name, avatar: '',
        role: isAdminUser ? 'admin' : 'user',
        createdAt: new Date(data.user.created_at || Date.now()),
      };
      setCurrentUser(user);
      saveAuth(user);
      setProfile({ id: data.user.id, email, name, avatar: '', role: isAdminUser ? 'admin' : 'user', theme: 'dark' });
      console.log('[Auth] [register] ===== SUCESSO =====');
      return { success: true, message: 'Conta criada! Verifique seu e-mail para confirmar a conta antes de fazer login.' };
    } catch (error: any) {
      console.error('[Auth] [register] ===== ERRO =====', error);
      return { success: false, message: error?.message || 'Erro ao criar conta.' };
    }
  }, []);

  // DELETE ACCOUNT — via Edge Function
  const deleteAccount = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    const userId = currentUserRef.current?.id;
    if (!userId) return { success: false, message: 'Usuario nao identificado' };
    try {
      console.log('[Auth] [deleteAccount] Deletando dados do usuario:', userId);
      // Deletar dados relacionados (ignora erros individuais)
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
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) return { success: false, message: error.message };
    if (data.url) window.location.href = data.url;
    return { success: true, message: 'Redirecionando...' };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/?reset_password=true` });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Link de redefinicao enviado!' };
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
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Senha atualizada!' };
  }, []);
  // ============================================================
  // THEME: Dark Mode exclusivo — updateTheme desabilitado
  // ============================================================
  const updateTheme = useCallback((_newTheme: 'light' | 'dark') => {
    // Dark Mode e o unico tema disponivel. Troca ignorada.
    console.log('[Auth] [updateTheme] Troca de tema ignorada — Dark Mode exclusivo.');
  }, []);
  const getUserFavorites = useCallback(async (userId: string) => {
    const { data } = await supabase.from('user_tools').select('tool_id').eq('user_id', userId).eq('is_favorite', true);
    return data?.map(item => item.tool_id) || [];
  }, []);

  // verifyNotBlocked removido — verificacao de bloqueio agora eh inline no handleUserSession

  // ============================================================
  // INICIALIZACAO — Restaurar sessao (cache ou OAuth)
  // ============================================================
  useEffect(() => {
    const init = async () => {
      console.log('[Auth] ===== Init =====');

      // 1. Verifica se Supabase ja processou OAuth (detectSessionInUrl)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('[Auth] Sessao OAuth/Supabase encontrada:', session.user.email);
        // Verifica bloqueio antes de setar usuario
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
              console.log('[Auth] 🚫 OAuth usuario BLOQUEADO:', session.user.email);
              await supabase.auth.signOut();
              clearAuth();
              setCurrentUser(null);
              setProfile(null);
              setBlockMessage('Sua conta foi suspensa. Entre em contato com o suporte: suporte@registai.com.br');
              setIsLoading(false);
              // Limpa hash do OAuth
              if (window.location.hash.includes('access_token=')) {
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
              }
              return;
            }
          }
        } catch (e) { /* ignora erro, deixa passar */ }

        // Verificar se profile existe (conta nao foi deletada)
        const { data: profileCheck } = await supabase.from('profiles').select('id').eq('id', session.user.id).maybeSingle();
        if (!profileCheck) {
          console.log('[Auth] Sessao encontrada mas profile nao existe (conta deletada):', session.user.email);
          await supabase.auth.signOut();
          clearAuth();
          setCurrentUser(null);
          setProfile(null);
          setIsLoading(false);
          // Limpa hash do OAuth
          if (window.location.hash.includes('access_token=')) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
          return;
        }

        // Profile existe — seta usuario
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
        // Limpa hash do OAuth apos login bem-sucedido
        if (window.location.hash.includes('access_token=')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        return;
      }

      // 2. Sem sessao OAuth — restaurar cache
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

    // Verificar se URL tem ?reset_password=true (callback de recuperacao de senha)
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset_password') === 'true') {
      console.log('[Auth] Detectado ?reset_password=true — aguardando sessao de recovery...');
      // Aguarda o Supabase processar o token do hash (#access_token=...&type=recovery)
      setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('[Auth] Sessao de recovery detectada, abrindo modal de nova senha');
          window.dispatchEvent(new CustomEvent('open-reset-password-modal'));
        } else {
          console.log('[Auth] Nenhuma sessao de recovery encontrada');
        }
      }, 500);
    }

    init();
  }, [fetchProfile]);

  // ============================================================
  // onAuthStateChange — backup para logins futuros
  // ============================================================
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] [onAuthStateChange]', event, session?.user?.email || 'no user');

      if (event === 'SIGNED_IN' && session?.user) {
        // Verifica profile em background — NAO salva cache se profile nao existe
        (async () => {
          if (getAuth()?.id === session.user!.id) return; // ja tem cache

          // Verifica se profile existe (conta nao foi deletada)
          const { data: profileCheck } = await supabase.from('profiles').select('id').eq('id', session.user!.id).maybeSingle();
          if (!profileCheck) {
            console.log('[Auth] [SIGNED_IN] Profile nao encontrado (conta deletada), NAO salvando cache:', session.user!.email);
            // NAO faz signOut aqui — deixa o login() gerenciar isso
            return;
          }

          console.log('[Auth] [SIGNED_IN] Profile OK, salvando:', session.user!.email);
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
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const isAdmin = currentUser?.email === ADMIN_EMAIL || profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      currentUser, profile, isLoading, isAdmin, theme: 'dark' as const, isAuthReady: !isLoading, // Dark Mode exclusivo
      users: [], blockMessage, login, logout, updateProfile, loginWithGoogle, register, resetPassword,
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
