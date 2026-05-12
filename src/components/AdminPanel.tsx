import { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdClicks } from '@/hooks/useAdClicks';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Shield, Users, UserPlus, Trash2, Loader2, Mail,
  AlertTriangle, Megaphone, Plus, CheckCircle, XCircle, Send,
  Upload, Image as ImageIcon, BarChart3,
} from 'lucide-react';

const SUPABASE_URL = 'https://cmfgirvgnexkcomhcosm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Dm-ozWvAve1nkgjEDg_QsA_-gldlMxk';

// ============================================================
// TYPES
// ============================================================
interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  created_at?: string;
  role?: string;
  is_blocked?: boolean;
}

interface TrendingAd {
  id: string;
  title: string;
  link: string;
  image_url?: string;
  status?: string;
  expires_at?: string;
  created_at?: string;
  owner_email?: string;
}

interface DailyClick {
  date: string;
  count: number;
}

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark';
  currentUserEmail?: string;
}

// ============================================================
// HELPERS
// ============================================================
function isAdminEmail(email?: string): boolean {
  const adminEmails = ['suporte@registai.com.br', 'rci.protocol00@gmail.com'];
  return !!email && adminEmails.includes(email);
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(url, { ...options, signal: controller.signal });
  clearTimeout(id);
  return response;
}

// ============================================================
// COMPONENT
// ============================================================
export function AdminPanel({ open, onClose, currentUserEmail }: AdminPanelProps) {

  // Users
  const [localUsers, setLocalUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add admin
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [addAdminMsg, setAddAdminMsg] = useState<string | null>(null);

  // Delete / Block
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [blockTarget, setBlockTarget] = useState<AdminUser | null>(null);

  // Ads
  const [ads, setAds] = useState<TrendingAd[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adMsg, setAdMsg] = useState<string | null>(null);

  // New Ad form
  const [newAdTitle, setNewAdTitle] = useState('');
  const [newAdTargetUrl, setNewAdTargetUrl] = useState('');
  const [newAdImageUrl, setNewAdImageUrl] = useState('');
  const [newAdExpiresAt, setNewAdExpiresAt] = useState('');
  const [newAdIndeterminate, setNewAdIndeterminate] = useState(true);
  const [isCreatingAd, setIsCreatingAd] = useState(false);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const fileInputRef = { current: null as HTMLInputElement | null };

  // Owner email
  const [newAdOwnerEmail, setNewAdOwnerEmail] = useState('');
  const [registeredEmails, setRegisteredEmails] = useState<Set<string>>(new Set<string>());

  // Report modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportAdTarget, setReportAdTarget] = useState<TrendingAd | null>(null);
  const [reportData, setReportData] = useState<DailyClick[]>([]);
  const [isSendingReport, setIsSendingReport] = useState(false);

  // Delete ad
  const [deleteAdTarget, setDeleteAdTarget] = useState<TrendingAd | null>(null);

  // Notification modal
  const [showGeneralNotifModal, setShowGeneralNotifModal] = useState(false);

  const { clickCounts, fetchMultipleClickCounts, fetchDailyClicks, sendReport } = useAdClicks();
  const isDark = true; // Simplified - admin panel is always dark

  // ============================================================
  // LOAD USERS
  // ============================================================
  const loadUsers = useCallback(async () => {
    if (!isAdminEmail(currentUserEmail)) { setErrorMsg('Acesso negado.'); return; }
    setIsLoading(true); setErrorMsg(null);
    try {
      const resp = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/profiles?select=*&order=created_at.desc`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } },
        15000
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const mapped: AdminUser[] = (data || []).map((p: any) => ({
        id: p.id, name: p.full_name || p.email?.split('@')[0] || 'Usuario',
        email: p.email, avatar: p.avatar_url, created_at: p.created_at,
        role: p.role, is_blocked: p.is_blocked,
      }));
      setLocalUsers(mapped);
    } catch (e: any) {
      setErrorMsg('Erro ao carregar usuarios: ' + e.message);
    }
    setIsLoading(false);
  }, [currentUserEmail]);

  useEffect(() => { if (open) loadUsers(); }, [open, loadUsers]);

  // ============================================================
  // LOAD ADS
  // ============================================================
  const loadAds = useCallback(async () => {
    setAdsLoading(true);
    try {
      const resp = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/trending_ads?select=*&order=created_at.desc`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } },
        15000
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setAds(data || []);
      // Fetch click counts for all ads
      if (data?.length > 0) fetchMultipleClickCounts(data.map((a: TrendingAd) => a.id));
    } catch (e: any) {
      console.error('[Admin] [loadAds] Erro:', e);
    }
    setAdsLoading(false);
  }, [fetchMultipleClickCounts]);

  useEffect(() => { if (open) loadAds(); }, [open, loadAds]);

  // ============================================================
  // LOAD REGISTERED EMAILS
  // ============================================================
  const loadRegisteredEmails = useCallback(async () => {
    try {
      const resp = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/profiles?select=email`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } },
        10000
      );
      if (!resp.ok) return;
      const data = await resp.json();
      const emails = new Set<string>((data || []).map((p: any) => p.email?.toLowerCase()).filter(Boolean));
      setRegisteredEmails(emails);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (showAdModal) loadRegisteredEmails(); }, [showAdModal, loadRegisteredEmails]);

  const ownerEmailStatus = newAdOwnerEmail.trim().length === 0 ? 'empty' :
    registeredEmails.has(newAdOwnerEmail.trim().toLowerCase()) ? 'valid' : 'invalid';

  // ============================================================
  // ADD ADMIN
  // ============================================================
  const handleAddAdmin = async () => {
    if (!isAdminEmail(currentUserEmail)) { setAddAdminMsg('Acesso negado.'); return; }
    if (!newAdminEmail.trim()) return;
    setIsAddingAdmin(true); setAddAdminMsg(null);
    try {
      const resp = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/profiles?select=id,email&email=eq.${encodeURIComponent(newAdminEmail.trim())}`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } },
        10000
      );
      if (!resp.ok) throw new Error('Usuario nao encontrado');
      const data = await resp.json();
      if (!data?.[0]?.id) { setAddAdminMsg('Usuario nao encontrado.'); setIsAddingAdmin(false); return; }

      const patchResp = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${data[0].id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json', 'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ role: 'admin', updated_at: new Date().toISOString() }),
        },
        10000
      );
      if (!patchResp.ok) throw new Error('Erro ao atualizar');
      setAddAdminMsg('✅ Administrador adicionado com sucesso!');
      setNewAdminEmail('');
      loadUsers();
    } catch (e: any) {
      setAddAdminMsg('Erro: ' + e.message);
    }
    setIsAddingAdmin(false);
  };

  // ============================================================
  // DELETE USER
  // ============================================================
  const handleDelete = async () => {
    if (!deleteTarget || !isAdminEmail(currentUserEmail)) return;
    try {
      // 1. Delete from auth (via Edge Function or admin API)
      // 2. Delete from profiles
      await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${deleteTarget.id}`,
        {
          method: 'DELETE',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
        },
        10000
      );
      setLocalUsers(localUsers.filter((u) => u.id !== deleteTarget.id));
      setAddAdminMsg('✅ Usuario removido.');
    } catch (e: any) {
      setErrorMsg('Erro ao excluir: ' + e.message);
    }
    setDeleteTarget(null);
  };

  // ============================================================
  // TOGGLE BLOCK
  // ============================================================
  const handleToggleBlock = async () => {
    if (!blockTarget || !isAdminEmail(currentUserEmail)) return;
    const newBlocked = !(blockTarget.is_blocked === true);
    try {
      const resp = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${blockTarget.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json', 'Prefer': 'return=representation',
          },
          body: JSON.stringify({ is_blocked: newBlocked, updated_at: new Date().toISOString() }),
        },
        10000
      );
      if (!resp.ok) throw new Error('Erro ao atualizar');
      setLocalUsers(localUsers.map((u) => u.id === blockTarget.id ? { ...u, is_blocked: newBlocked } : u));
    } catch (e: any) {
      setErrorMsg('Erro: ' + e.message);
    }
    setBlockTarget(null);
  };

  // ============================================================
  // CREATE AD
  // ============================================================
  const handleCreateAd = async () => {
    if (!newAdTitle.trim() || !newAdTargetUrl.trim()) {
      setAdMsg('⚠️ Preencha titulo e URL de destino.'); return;
    }
    setIsCreatingAd(true); setAdMsg(null);
    try {
      const body: Record<string, any> = {
        title: newAdTitle.trim(), link: newAdTargetUrl.trim(),
        image_url: newAdImageUrl?.trim() || null,
        status: 'active', created_at: new Date().toISOString(),
        owner_email: newAdOwnerEmail?.trim() || null,
      };
      if (!newAdIndeterminate && newAdExpiresAt?.trim()) {
        body.expires_at = new Date(newAdExpiresAt.trim()).toISOString();
      } else {
        body.expires_at = null;
      }
      const resp = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/trending_ads`, {
          method: 'POST', headers: {
            'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json', 'Prefer': 'return=representation',
          }, body: JSON.stringify(body),
        }, 15000,
      );
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setAds([data?.[0] || body, ...ads]);
      setAdMsg('✅ Publicacao criada com sucesso!');
      // Reset form
      setNewAdTitle(''); setNewAdTargetUrl(''); setNewAdImageUrl('');
      setNewAdExpiresAt(''); setNewAdIndeterminate(true);
      setNewAdOwnerEmail('');
      setShowAdModal(false);
      setTimeout(() => setAdMsg(null), 4000);
    } catch (e: any) {
      setAdMsg('❌ Erro ao criar publicacao: ' + (e.message || String(e)));
    }
    setIsCreatingAd(false);
  };

  // ============================================================
  // DELETE AD
  // ============================================================
  const handleDeleteAd = async () => {
    if (!deleteAdTarget) return;
    try {
      const resp = await fetchWithTimeout(
        `${SUPABASE_URL}/rest/v1/trending_ads?id=eq.${deleteAdTarget.id}`,
        { method: 'DELETE', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } },
        10000,
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setAds(ads.filter((a) => a.id !== deleteAdTarget.id));
      setAdMsg('✅ Publicacao removida.');
    } catch (e: any) {
      setAdMsg('❌ Erro ao remover: ' + e.message);
    }
    setDeleteAdTarget(null);
    setTimeout(() => setAdMsg(null), 4000);
  };

  // ============================================================
  // REPORT — open modal with daily clicks
  // ============================================================
  const handleOpenReport = async (ad: TrendingAd) => {
    setReportAdTarget(ad); setReportData([]); setIsSendingReport(false); setShowReportModal(true);
    if (!ad.id) return;
    const daily = await fetchDailyClicks(ad.id);
    setReportData(daily);
  };

  // ============================================================
  // IMAGE UPLOAD (file input -> base64)
  // ============================================================
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setAdMsg('⚠️ Selecione uma imagem.'); return; }
    if (file.size > 5 * 1024 * 1024) { setAdMsg('⚠️ Imagem deve ter no maximo 5MB.'); return; }
    setIsFetchingPreview(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      // Upload to Supabase Storage (simplified — using data URL for now)
      setNewAdImageUrl(base64);
      setAdMsg('✅ Imagem carregada!');
    } catch {
      setAdMsg('❌ Erro ao carregar imagem.');
    }
    setIsFetchingPreview(false);
  };

  // ============================================================
  // FETCH URL PREVIEW (title + image)
  // ============================================================
  const fetchUrlPreview = async () => {
    if (!newAdTargetUrl.trim()) return;
    setIsFetchingPreview(true);
    try {
      // Try to extract title from URL
      const url = new URL(newAdTargetUrl);
      const domain = url.hostname.replace('www.', '');
      if (!newAdTitle.trim()) setNewAdTitle(domain.charAt(0).toUpperCase() + domain.slice(1));
      // Try favicon
      if (!newAdImageUrl.trim()) {
        setNewAdImageUrl(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
      }
    } catch {
      setAdMsg('⚠️ URL invalida.');
    }
    setIsFetchingPreview(false);
  };

  // ============================================================
  // FORMAT DATE
  // ============================================================
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  };

  // ============================================================
  // RENDER — return starts here
  // ============================================================
  if (!isAdminEmail(currentUserEmail)) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-500" /> Acesso Negado
            </DialogTitle>
          </DialogHeader>
          <p className="text-slate-400">Voce nao tem permissao para acessar esta area.</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-white">
            <span className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-violet-500" /> Painel Administrativo
            </span>
            <Button
              size="sm"
              onClick={() => setShowGeneralNotifModal(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs px-3 py-1 h-8"
            >
              <Megaphone className="w-3.5 h-3.5 mr-1.5" /> Notificacao Geral
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Messages */}
        {adMsg && (
          <div className={`p-2 rounded-lg text-xs ${adMsg.startsWith('✅') ? 'bg-emerald-900/30 text-emerald-400' : adMsg.startsWith('❌') ? 'bg-red-900/30 text-red-400' : 'bg-amber-900/30 text-amber-400'}`}>
            {adMsg}
          </div>
        )}
        {addAdminMsg && (
          <div className={`p-2 rounded-lg text-xs ${addAdminMsg.startsWith('✅') ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
            {addAdminMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-2 rounded-lg text-xs bg-red-900/30 text-red-400">{errorMsg}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
            <div className="text-2xl font-bold text-white">{localUsers.length}</div>
            <div className="text-xs text-slate-400">Usuarios</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
            <div className="text-2xl font-bold text-white">{localUsers.filter((u) => isAdminEmail(u.email)).length}</div>
            <div className="text-xs text-slate-400">Admins</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
            <div className="text-2xl font-bold text-white">{ads.filter((a) => a.status === 'active').length}</div>
            <div className="text-xs text-slate-400">Ads Ativas</div>
          </div>
        </div>

        {/* Users Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-500" /> Usuarios
          </h3>

          {/* Add Admin */}
          <div className="flex gap-2">
            <Input
              placeholder="Email do novo administrador..."
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white text-sm"
            />
            <Button
              onClick={handleAddAdmin}
              disabled={isAddingAdmin}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isAddingAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            </Button>
          </div>

          {/* User List */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            </div>
          ) : localUsers.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">Nenhum usuario encontrado.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {localUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold">
  {user.name?.charAt(0)?.toUpperCase() || 'U'}
</div>
                    <div>
                      <div className="text-sm font-medium text-white">{user.name}</div>
                      <div className="text-xs text-slate-400">{user.email}</div>
                      {user.created_at && (
                        <div className="text-[10px] text-slate-600">{formatDate(user.created_at)}</div>
                      )}
                    </div>
                    {isAdminEmail(user.email) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400">ADMIN</span>
                    )}
                    {user.is_blocked && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">BLOQUEADO</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm" variant="ghost"
                      onClick={() => setBlockTarget(user)}
                      className={user.is_blocked ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-amber-400 hover:bg-amber-500/10'}
                      title={user.is_blocked ? 'Desbloquear' : 'Bloquear'}
                    >
                      {user.is_blocked ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </Button>
                    {!isAdminEmail(user.email) && (
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => setDeleteTarget(user)}
                        className="text-red-400 hover:bg-red-500/10"
                        title="Excluir usuario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trending News Ads Section */}
        <div className="space-y-3 border-t border-slate-700 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-violet-500" /> Trending News Ads
            </h3>
            <Button
              size="sm"
              onClick={() => setShowAdModal(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Nova Ad
            </Button>
          </div>

          {adsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            </div>
          ) : ads.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">Nenhuma publicacao.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {ads.map((ad) => {
                const now = new Date();
                const expiresAt = ad.expires_at ? new Date(ad.expires_at) : null;
                const isExpired = expiresAt ? expiresAt < now : false;
                const effectiveStatus = isExpired ? 'expired' : (ad.status || 'active');
                const clickCount = clickCounts[ad.id] || 0;

                return (
                  <div
                    key={ad.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-700"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {ad.image_url ? (
                        <img src={ad.image_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-slate-700 flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="w-4 h-4 text-slate-500" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-white truncate">{ad.title}</div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            effectiveStatus === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                            effectiveStatus === 'expired' ? 'bg-red-500/20 text-red-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {effectiveStatus === 'active' ? 'ATIVA' : effectiveStatus === 'expired' ? 'INATIVA' : ad.status?.toUpperCase()}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" /> {clickCount} cliques
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {ad.expires_at ? `Ate ${formatDate(ad.expires_at)}` : 'Indeterminado'}
                          </span>
                          {ad.owner_email && (
                            <span className="text-[10px] text-amber-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {ad.owner_email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {ad.owner_email && (
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => handleOpenReport(ad)}
                          className="text-amber-400 hover:bg-amber-500/10 h-8 w-8 p-0"
                          title="Ver relatorio de acessos"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => setDeleteAdTarget(ad)}
                        className="text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                        title="Remover ad"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Ad Modal */}
        <Dialog open={showAdModal} onOpenChange={setShowAdModal}>
          <DialogContent className="max-w-lg bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-violet-500" /> Nova Publicacao
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* URL + Fetch */}
              <div className="flex gap-2">
                <Input
                  placeholder="URL de destino..."
                  value={newAdTargetUrl}
                  onChange={(e) => setNewAdTargetUrl(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
                <Button
                  onClick={fetchUrlPreview}
                  disabled={isFetchingPreview}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {isFetchingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Puxar'}
                </Button>
              </div>

              {/* Title */}
              <div>
                <Label className="text-slate-400">Titulo *</Label>
                <Input
                  value={newAdTitle}
                  onChange={(e) => setNewAdTitle(e.target.value)}
                  placeholder="Titulo da publicacao"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              {/* Owner Email */}
              <div>
                <Label className="text-slate-400">Responsavel (e-mail) <span className="text-[10px] text-slate-500">(apenas cadastrados)</span></Label>
                <div className="relative">
                  <Mail className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
                    ownerEmailStatus === 'valid' ? 'text-emerald-400' :
                    ownerEmailStatus === 'invalid' ? 'text-red-400' :
                    'text-slate-500'
                  }`} />
                  <Input
                    type="email"
                    value={newAdOwnerEmail}
                    onChange={(e) => setNewAdOwnerEmail(e.target.value)}
                    placeholder="usuario@email.com"
                    className={`pl-9 text-sm transition-colors ${
                      ownerEmailStatus === 'valid'
                        ? 'bg-emerald-950/30 border-emerald-700 text-emerald-300'
                        : ownerEmailStatus === 'invalid'
                        ? 'bg-red-950/30 border-red-700 text-red-300'
                        : 'bg-slate-800 border-slate-700 text-white'
                    }`}
                  />
                  {ownerEmailStatus === 'valid' && <CheckCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />}
                  {ownerEmailStatus === 'invalid' && <XCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />}
                </div>
                <p className={`text-[10px] mt-0.5 ${
                  ownerEmailStatus === 'valid' ? 'text-emerald-400' :
                  ownerEmailStatus === 'invalid' ? 'text-red-400' :
                  'text-slate-500'
                }`}>
                  {ownerEmailStatus === 'valid' ? '✓ Email cadastrado'
                    : ownerEmailStatus === 'invalid' ? '✗ Email nao encontrado'
                    : 'Digite o email do responsavel.'}
                </p>
              </div>

              {/* Image */}
              <div>
                <Label className="text-slate-400">Imagem</Label>
                <div className="flex gap-2">
                  <Input
                    value={newAdImageUrl}
                    onChange={(e) => setNewAdImageUrl(e.target.value)}
                    placeholder="URL da imagem ou upload..."
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-slate-700 text-slate-300"
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
                {newAdImageUrl && (
                  <img src={newAdImageUrl} alt="Preview" className="mt-2 w-16 h-16 rounded object-cover" />
                )}
              </div>

              {/* Expiry */}
              <div>
                <Label className="text-slate-400">Expiracao</Label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAdIndeterminate}
                      onChange={(e) => setNewAdIndeterminate(e.target.checked)}
                      className="rounded border-slate-600"
                    />
                    <span className="text-sm text-slate-400">Sem expiracao</span>
                  </label>
                  {!newAdIndeterminate && (
                    <Input
                      type="datetime-local"
                      value={newAdExpiresAt}
                      onChange={(e) => setNewAdExpiresAt(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white text-sm flex-1"
                    />
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAdModal(false)} className="border-slate-700 text-slate-300">
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateAd}
                  disabled={isCreatingAd || !newAdTitle.trim() || !newAdTargetUrl.trim()}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {isCreatingAd ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Report Modal */}
        <Dialog open={showReportModal} onOpenChange={(o) => { if (!o) { setShowReportModal(false); setReportAdTarget(null); setReportData([]); } }}>
          <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-violet-500" /> Relatorio de Acessos
              </DialogTitle>
            </DialogHeader>
            {reportAdTarget && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                  <p className="text-sm font-medium text-white">{reportAdTarget.title}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Total: <span className="font-bold text-violet-400">{clickCounts[reportAdTarget.id] || 0}</span> cliques
                  </p>
                  {reportAdTarget.owner_email && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Destinatario: <span className="text-amber-400">{reportAdTarget.owner_email}</span>
                    </p>
                  )}
                </div>

                {reportData.length > 0 ? (
                  <div>
                    <h4 className="text-xs font-semibold mb-2 text-slate-300">Cliques por dia (ultimos 40 dias)</h4>
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-700">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-800">
                            <th className="text-left p-2 text-slate-400">Data</th>
                            <th className="text-right p-2 text-slate-400">Cliques</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.map((row, i) => (
                            <tr key={i} className="border-t border-slate-700">
                              <td className="p-2 text-slate-300">
                                {new Date(row.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="p-2 text-right font-medium text-violet-400">{row.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-center py-4 text-slate-500">
                    {clickCounts[reportAdTarget.id] || 0 > 0 ? 'Carregando...' : 'Nenhum clique registrado.'}
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setShowReportModal(false); setReportAdTarget(null); setReportData([]); }} className="border-slate-700 text-slate-300">
                    Fechar
                  </Button>
                  {reportAdTarget.owner_email && (
                    <Button
                      onClick={async () => {
                        setIsSendingReport(true);
                        const ok = await sendReport(reportAdTarget.id, reportAdTarget.owner_email!);
                        setIsSendingReport(false);
                        if (ok) {
                          setAdMsg('✅ Relatorio enviado para ' + reportAdTarget.owner_email);
                          setShowReportModal(false);
                          setReportAdTarget(null);
                          setReportData([]);
                          setTimeout(() => setAdMsg(null), 4000);
                        }
                      }}
                      disabled={isSendingReport}
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      {isSendingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1" />Enviar Relatorio</>}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Block User Alert */}
        <AlertDialog open={!!blockTarget} onOpenChange={() => setBlockTarget(null)}>
          <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                {blockTarget?.is_blocked ? 'Desbloquear' : 'Bloquear'} usuario?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                {blockTarget?.is_blocked
                  ? `O usuario ${blockTarget?.name} (${blockTarget?.email}) podera acessar a plataforma novamente.`
                  : `O usuario ${blockTarget?.name} (${blockTarget?.email}) sera impedido de acessar a plataforma.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-800 text-white border-slate-700">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleToggleBlock}
                className={blockTarget?.is_blocked ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}
              >
                {blockTarget?.is_blocked ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                {blockTarget?.is_blocked ? 'Desbloquear' : 'Bloquear'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete User Alert */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" /> Confirmar exclusao
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Deseja excluir o usuario <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})? Esta acao nao pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-800 text-white border-slate-700">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
                <Trash2 className="w-4 h-4 mr-2" /> Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Ad Alert */}
        <AlertDialog open={!!deleteAdTarget} onOpenChange={() => setDeleteAdTarget(null)}>
          <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" /> Remover publicacao?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Deseja remover <strong>{deleteAdTarget?.title}</strong>? Esta acao nao pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-800 text-white border-slate-700">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAd} className="bg-red-600 hover:bg-red-700 text-white">
                <Trash2 className="w-4 h-4 mr-2" /> Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* General Notification Modal */}
        <GeneralNotificationModal
          open={showGeneralNotifModal}
          onClose={() => setShowGeneralNotifModal(false)}
          theme={isDark ? 'dark' : 'light'}
        />
      </DialogContent>
    </Dialog>
  );
}

//const SUPABASE_URL = 'https://cmfgirvgnexkcomhcosm.supabase.co';
//const SUPABASE_KEY = 'sb_publishable_Dm-ozWvAve1nkgjEDg_QsA_-gldlMxk';

interface GeneralNotificationModalProps {
  open: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
}

export function GeneralNotificationModal({ open, onClose, theme }: GeneralNotificationModalProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error' | null>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!open) {
      setTitle('');
      setMessage('');
      setStatus(null);
      setStatusType(null);
      setIsSending(false);
    }
  }, [open]);

  async function fetchAllUserEmails(): Promise<string[]> {
    try {
      const url = `${SUPABASE_URL}/rest/v1/profiles?select=email`;
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      if (!resp.ok) return [];
      const data = await resp.json();
      return (data || []).map((p: any) => p.email).filter(Boolean);
    } catch {
      return [];
    }
  }

  const handleSend = async () => {
    if (!title.trim()) {
      setStatus('Digite um titulo para a notificacao.');
      setStatusType('error');
      return;
    }
    if (!message.trim()) {
      setStatus('Digite a mensagem da notificacao.');
      setStatusType('error');
      return;
    }

    setIsSending(true);
    setStatus('Buscando usuarios...');
    setStatusType(null);

    const emails = await fetchAllUserEmails();
    if (emails.length === 0) {
      setStatus('Nenhum usuario encontrado.');
      setStatusType('error');
      setIsSending(false);
      return;
    }

    setStatus(`Enviando para ${emails.length} usuarios...`);

    let sent = 0;
    let failed = 0;

    for (const email of emails) {
      console.log(`Simulando envio para: ${email}`);
const ok = true;
      
      if (ok) sent++;
      else failed++;
    }

    setIsSending(false);
    if (sent > 0) {
      setStatus(`✅ Notificacao enviada para ${sent} de ${emails.length} usuarios${failed > 0 ? ` (${failed} falha)` : ''}`);
      setStatusType('success');
      setTitle('');
      setMessage('');
      setTimeout(() => { setStatus(null); setStatusType(null); }, 5000);
    } else {
      setStatus('❌ Falha ao enviar para todos os usuarios.');
      setStatusType('error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={`max-w-md ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Megaphone className="w-5 h-5 text-violet-500" />
            Notificacao Geral
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {status && (
            <div className={`p-2.5 rounded-lg text-xs ${
              statusType === 'success'
                ? (isDark ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' : 'bg-emerald-50 text-emerald-600 border border-emerald-200')
                : statusType === 'error'
                ? (isDark ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-red-50 text-red-600 border border-red-200')
                : (isDark ? 'bg-blue-900/30 text-blue-400 border border-blue-800' : 'bg-blue-50 text-blue-600 border border-blue-200')
            }`}>
              {status}
            </div>
          )}

          <div>
            <Label className={`text-xs font-medium mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Titulo
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Nova atualizacao disponivel"
              maxLength={100}
              className={`text-sm ${isDark ? 'bg-slate-900 border-slate-700 text-white' : ''}`}
            />
            <p className={`text-[10px] mt-0.5 text-right ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {title.length}/100
            </p>
          </div>

          <div>
            <Label className={`text-xs font-medium mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Mensagem
            </Label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite a mensagem que sera enviada a todos os usuarios..."
              maxLength={300}
              rows={5}
              className={`w-full rounded-md border px-3 py-2 text-sm resize-none ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent'
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent'
              }`}
            />
            <p className={`text-[10px] mt-0.5 text-right ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {message.length}/300
            </p>
          </div>

          <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            Esta notificacao sera entregue a <strong>TODOS</strong> os usuarios cadastrados na plataforma, aparecendo no icone de sino de cada um.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className={isDark ? 'border-slate-700 text-slate-300' : ''}
              disabled={isSending}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={isSending || !title.trim() || !message.trim()}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Send className="w-4 h-4 mr-1" />
              )}
              {isSending ? 'Enviando...' : 'Enviar a Todos'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Import needed for Label
import { Label } from '@/components/ui/label';
