import { useState, useRef, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Save, Trash2, AlertTriangle, Camera, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
  onUpdate: (updates: { name?: string; avatar?: string; username?: string }) => Promise<void>;
  onDeleteAccount: () => Promise<{ success: boolean; message: string }>;
}

export function ProfileModal({ open, onClose, profile, theme: _theme, onUpdate, onDeleteAccount }: ProfileModalProps) {
  const [name, setName] = useState(profile?.name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confirmação de exclusão
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Sincronizar estado quando o modal abre
  useEffect(() => {
    if (open && profile) {
      setName(profile.name || '');
      setUsername(profile.username || '');
      setAvatarUrl(profile.avatar || '');
      setSaveError(null);
      setSaveSuccess(null);
    }
  }, [open, profile?.id, profile?.name, profile?.username, profile?.avatar]);

  // Upload de foto para o Supabase Storage
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;

    // Validações
    if (!file.type.startsWith('image/')) {
      setSaveError('O arquivo deve ser uma imagem (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveError('A imagem deve ter no máximo 5MB.');
      return;
    }

    setIsUploading(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      // 1. Upload para o bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        throw new Error(`Falha no upload: ${uploadError.message}`);
      }

      // 2. Obter URL pública
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) {
        throw new Error('Não foi possível obter a URL da imagem.');
      }

      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

      // 3. Atualizar avatar local imediatamente
      setAvatarUrl(urlWithTimestamp);

      // 4. Persistir no profile do Supabase
      await onUpdate({ avatar: urlWithTimestamp });

      setSaveSuccess('Foto de perfil atualizada!');
    } catch (err: any) {
      console.error('[Profile] Erro no upload:', err.message);
      setSaveError(err.message || 'Erro ao fazer upload da imagem.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Salvar nome e username
  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setSaveError('O nome não pode estar vazio.');
        setIsSaving(false);
        return;
      }

      await onUpdate({
        name: trimmedName,
        username: username.trim(),
        avatar: avatarUrl,
      });

      setSaveSuccess('Perfil salvo com sucesso!');
    } catch (err: any) {
      console.error('[Profile] Erro ao salvar:', err.message);
      setSaveError(err.message || 'Erro ao salvar perfil. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // Excluir conta com confirmação
  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toLowerCase() !== 'excluir') {
      setDeleteError('Digite "excluir" para confirmar.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const result = await onDeleteAccount();
      if (result.success) {
        setShowDeleteConfirm(false);
        onClose();
      } else {
        setDeleteError(result.message);
      }
    } catch (e: any) {
      setDeleteError(e.message || 'Erro ao excluir conta.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Não disponível';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <User className="w-5 h-5 text-violet-500" /> Perfil
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Gerencie suas informações de perfil.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Avatar com upload clicável */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold bg-violet-600 text-white overflow-hidden">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  (name || profile?.email || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center shadow-lg transition-all hover:scale-110 disabled:opacity-50"
                title="Trocar foto"
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            <p className="text-[11px] text-slate-500">Clique na câmera para trocar a foto</p>
          </div>

          {/* Mensagens de erro / sucesso */}
          {saveError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {saveSuccess}
            </div>
          )}

          {/* Nome */}
          <div>
            <Label className="text-slate-300">Nome Completo</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="bg-slate-800 border-slate-700 text-white focus:ring-violet-500"
            />
          </div>

          {/* Username */}
          <div>
            <Label className="text-slate-300">Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Seu username"
              className="bg-slate-800 border-slate-700 text-white focus:ring-violet-500"
            />
          </div>

          {/* E-mail */}
          <div>
            <Label className="text-slate-300">E-mail</Label>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800 border border-slate-700/50">
              <Mail className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-400">{profile.email}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">O e-mail não pode ser alterado.</p>
          </div>

          {/* Membro desde */}
          <div>
            <Label className="text-slate-300">Membro desde</Label>
            <div className="text-sm px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/50 text-slate-400">
              {formatDate(profile?.created_at)}
            </div>
          </div>

          {/* Ações: Excluir conta + Salvar */}
          <div className="flex justify-between pt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText(''); setDeleteError(null); }}
              className="text-red-500 border-red-500/50 hover:bg-red-500/10 hover:text-red-600 bg-transparent"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Excluir conta
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || isUploading}
              className="bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>

        {/* Confirmação de exclusão */}
        {showDeleteConfirm && (
          <div className="mt-4 p-4 rounded-lg border border-red-800 bg-red-900/20 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-bold">Ação Irreversível</span>
            </div>
            <p className="text-xs mb-3 text-slate-400">
              Todos os seus dados, ferramentas favoritas e configurações serão removidos permanentemente.
            </p>
            <p className="text-xs mb-2 font-medium text-slate-300">
              Digite <strong>excluir</strong> para confirmar:
            </p>
            <Input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="excluir"
              className="bg-slate-800 border-slate-700 text-white text-sm mb-3"
              onKeyDown={(e) => e.key === 'Enter' && handleDeleteAccount()}
            />
            {deleteError && (
              <p className="text-xs text-red-400 mb-3">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="border-slate-700 text-white hover:bg-slate-800"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                )}
                {isDeleting ? 'Excluindo...' : 'Confirmar exclusão'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
