import { useState, useRef, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Save, Trash2, AlertTriangle, Camera, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  profile: {
    id: string;
    email: string;
    name: string;
    avatar: string;
    created_at?: string;
    username?: string;
  } | null;
  theme?: 'light' | 'dark';
  onUpdate: (updates: { full_name?: string; name?: string; avatar?: string; username?: string }) => Promise<void>;
  onDeleteAccount: () => Promise<{ success: boolean; message: string }>;
}

const MAX_BASE64_SIZE = 500 * 1024;

export function ProfileModal({ open, onClose, profile, theme: _theme, onUpdate, onDeleteAccount }: ProfileModalProps) {
  const [fullName, setFullName] = useState(profile?.name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [avatarDataUrl, setAvatarDataUrl] = useState(profile?.avatar || '');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (open && profile) {
      setFullName(profile.name || '');
      setUsername(profile.username || '');
      setAvatarDataUrl(profile.avatar || '');
      setBlobUrl(null);
      setSaveError(null);
      setSaveSuccess(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Não disponível';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const resizeAndCompressImage = (file: File, maxWidth: number = 400, quality: number = 0.85): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target?.result as string; };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Erro ao processar imagem.')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Erro ao carregar imagem.'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setSaveError('Escolha uma imagem (JPG, PNG).'); return; }

    setIsUploading(true); setSaveError(null); setSaveSuccess(null);

    try {
      console.log('[Avatar] Processando:', file.name, (file.size / 1024).toFixed(1), 'KB');
      const dataUrl = await resizeAndCompressImage(file, 400, 0.85);
      const base64Size = dataUrl.length * 0.75;
      console.log('[Avatar] Comprimida:', (base64Size / 1024).toFixed(1), 'KB');

      if (base64Size > MAX_BASE64_SIZE) { setSaveError('Imagem muito grande.'); setIsUploading(false); return; }

      const blob = await (await fetch(dataUrl)).blob();
      const newBlobUrl = URL.createObjectURL(blob);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlobUrl(newBlobUrl);
      setAvatarDataUrl(dataUrl);

      await onUpdate({ avatar: dataUrl });
      setSaveSuccess('Foto atualizada!');
      console.log('[Avatar] OK');
    } catch (err: any) {
      console.error('[Avatar] Erro:', err);
      setSaveError(err.message || 'Erro.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setIsSaving(true); setSaveError(null); setSaveSuccess(null);
    try {
      const trimmedName = fullName.trim();
      if (!trimmedName) { setSaveError('O nome não pode estar vazio.'); setIsSaving(false); return; }
      await onUpdate({ full_name: trimmedName, username: username.trim(), avatar: avatarDataUrl });
      setSaveSuccess('Perfil salvo!');
    } catch (err: any) { setSaveError(err.message || 'Erro ao salvar.'); }
    finally { setIsSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toLowerCase() !== 'excluir') { setDeleteError('Digite "excluir".'); return; }
    setIsDeleting(true); setDeleteError(null);
    try {
      const result = await onDeleteAccount();
      if (result.success) { setShowDeleteConfirm(false); onClose(); } else { setDeleteError(result.message); }
    } catch (e: any) { setDeleteError(e.message || 'Erro.'); }
    finally { setIsDeleting(false); }
  };

  if (!profile) return null;

  const displayUrl = blobUrl || (avatarDataUrl && !avatarDataUrl.includes('supabase.co/storage') ? avatarDataUrl : '');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white"><User className="w-5 h-5 text-violet-500" /> Perfil</DialogTitle>
          <DialogDescription className="text-slate-400">Gerencie suas informações de perfil.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold bg-violet-600 text-white overflow-hidden">
                {displayUrl ? (
                  <img key={displayUrl} src={displayUrl} alt={fullName} className="w-full h-full object-cover" />
                ) : (fullName || profile?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center shadow-lg transition-all hover:scale-110 disabled:opacity-50">
                {isUploading ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Camera className="w-3.5 h-3.5 text-white" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
            </div>
            <p className="text-[11px] text-slate-500">{isUploading ? 'Processando...' : 'Clique na câmera para trocar a foto'}</p>
          </div>

          {saveError && <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"><XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{saveError}</div>}
          {saveSuccess && <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm"><CheckCircle className="w-4 h-4 flex-shrink-0" />{saveSuccess}</div>}

          <div><Label className="text-slate-300">Nome Completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" className="bg-slate-800 border-slate-700 text-white" /></div>
          <div><Label className="text-slate-300">Username</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Seu username" className="bg-slate-800 border-slate-700 text-white" /></div>

          <div><Label className="text-slate-300">E-mail</Label><div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800 border border-slate-700/50"><Mail className="w-4 h-4 text-slate-500" /><span className="text-sm text-slate-400">{profile.email}</span></div><p className="text-[10px] text-slate-500 mt-1">O e-mail não pode ser alterado.</p></div>

          <div><Label className="text-slate-300">Membro desde</Label><div className="text-sm px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/50 text-slate-400">{formatDate(profile?.created_at)}</div></div>

          <div className="flex justify-between pt-4 gap-2">
            <Button variant="outline" onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText(''); setDeleteError(null); }} className="text-red-500 border-red-500/50 hover:bg-red-500/10 hover:text-red-600 bg-transparent"><Trash2 className="w-4 h-4 mr-2" /> Excluir conta</Button>
            <Button onClick={handleSave} disabled={isSaving || isUploading} className="bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50">{isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}{isSaving ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="mt-4 p-4 rounded-lg border border-red-800 bg-red-900/20 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-red-500 mb-2"><AlertTriangle className="w-5 h-5" /><span className="font-bold">Ação Irreversível</span></div>
            <p className="text-xs mb-3 text-slate-400">Todos os seus dados serão removidos permanentemente.</p>
            <p className="text-xs mb-2 font-medium text-slate-300">Digite <strong>excluir</strong> para confirmar:</p>
            <Input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="excluir" className="bg-slate-800 border-slate-700 text-white text-sm mb-3" onKeyDown={(e) => e.key === 'Enter' && handleDeleteAccount()} />
            {deleteError && <p className="text-xs text-red-400 mb-3">{deleteError}</p>}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(false)} className="border-slate-700 text-white hover:bg-slate-800">Cancelar</Button>
              <Button size="sm" onClick={handleDeleteAccount} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50">{isDeleting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}{isDeleting ? 'Excluindo...' : 'Confirmar'}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
