import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

const ADMIN_EMAIL = 'suporte@registai.com.br';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  theme: 'dark';
  profile: Profile | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; message: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  updateProfile: (updates: Partial<Profile>) => Promise<boolean>;
  toggleTheme: () => void;
  setBlockMessage: (msg: string | null) => void;
  blockMessage: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const theme = 'dark';
  const [profile, setProfile] = useState<Profile | null>(null);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);

  // Verificar sessao ao carregar
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await loadUser(session.user.id, session.user.email || '');
        }
      } catch (e) {
        console.error('Erro ao verificar sessao:', e);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listener para mudancas de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await loadUser(session.user.id, session.user.email || '');
        } else {
          setCurrentUser(null);
          setIsAdmin(false);
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUser = useCallback(async (userId: string, email: string) => {
    try {
      // Buscar profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) {
        setProfile(profileData);

        if (profileData.is_blocked) {
          setBlockMessage('Sua conta foi suspensa. Entre em contato com o suporte em suporte@registai.com.br');
          setCurrentUser(null);
          setIsAdmin(false);
          return;
        }
      }

      const user: AuthUser = {
        id: userId,
        email,
        name: profileData?.full_name || email.split('@')[0],
        avatar: profileData?.avatar_url,
      };

      setCurrentUser(user);
      setIsAdmin(email === ADMIN_EMAIL || profileData?.is_admin === true);
      setBlockMessage(null);
    } catch (e) {
      console.error('Erro ao carregar usuario:', e);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user) {
        return { success: true, message: 'Login realizado com sucesso!' };
      }

      return { success: false, message: 'Erro desconhecido ao fazer login.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erro ao fazer login. Tente novamente.' };
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
        },
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return { success: true, message: 'Redirecionando...' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erro ao fazer login com Google.' };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        return { success: false, message: error.message };
      }

      if (data.user) {
        // Criar profile
        await supabase.from('profiles').insert({
          id: data.user.id,
          email,
          full_name: name,
          theme: 'dark',
        });

        return { success: true, message: 'Conta criada com sucesso!' };
      }

      return { success: false, message: 'Erro ao criar conta.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erro ao criar conta. Tente novamente.' };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setIsAdmin(false);
    setProfile(null);
    setBlockMessage(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return { success: true, message: 'Link de recuperacao enviado!' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erro ao enviar link de recuperacao.' };
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!currentUser?.id) return false;
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', currentUser.id);

      if (!error) {
        setProfile((prev) => prev ? { ...prev, ...updates } : null);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [currentUser]);

  const toggleTheme = useCallback(() => {
  console.log('CyberDash: Tema fixo em Dark Mode.');
}, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAdmin,
        isLoading,
        theme,
        profile,
        login,
        loginWithGoogle,
        register,
        logout,
        resetPassword,
        updateProfile,
        toggleTheme,
        setBlockMessage,
        blockMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
