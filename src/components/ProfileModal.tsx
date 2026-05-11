import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Save, Trash2, AlertTriangle } from 'lucide-react';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  profile: { id: string; email: string; name: string; avatar: string; created_at: string; username: string } | null;
  theme: string;
  onUpdate: (updates: any) => Promise<{ success: boolean }>;
  onDeleteAccount: () => Promise<{ success: boolean }>;
}

export function ProfileModal({ open, onClose, profile, theme, onUpdate, onDeleteAccount }: ProfileModalProps) {
  const [name, setName] = useState(profile?.name || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!profile) return null;

  const handleSave = async () => {
    await onUpdate({ name });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`max-w-md ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <User className="w-5 h-5 text-violet-500" /> Perfil
          </DialogTitle>
          <DialogDescription className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
            Gerencie suas informacoes de perfil.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="flex justify-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ${theme === 'dark' ? 'bg-violet-600' : 'bg-violet-500'} text-white`}>
              {profile.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>

          <div>
            <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''} />
          </div>

          <div>
            <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Email</Label>
            <div className={`flex items-center gap-2 p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-50'}`}>
              <Mail className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-400">{profile.email}</span>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(true)} className="text-red-500 border-red-500 hover:bg-red-500/10">
              <Trash2 className="w-4 h-4 mr-2" /> Excluir conta
            </Button>
            <Button onClick={handleSave} className="bg-violet-600 hover:bg-violet-700 text-white">
              <Save className="w-4 h-4 mr-2" /> Salvar
            </Button>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className={`mt-4 p-4 rounded-lg border ${theme === 'dark' ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Tem certeza?</span>
            </div>
            <p className="text-sm text-slate-400 mb-3">Esta acao nao pode ser desfeita. Todos seus dados serao removidos.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(false)} className="border-slate-700">Cancelar</Button>
              <Button size="sm" onClick={() => { onDeleteAccount(); onClose(); }} className="bg-red-600 hover:bg-red-700 text-white">Confirmar exclusao</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
