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
  profile: any | null; 
  onUpdate: (updates: any) => Promise<{ success: boolean }>;
  onDeleteAccount: () => Promise<{ success: boolean }>;
}

export function ProfileModal({ open, onClose, profile, onUpdate, onDeleteAccount }: ProfileModalProps) {
  const [name, setName] = useState(profile?.name || profile?.username || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!profile) return null;

  const handleSave = async () => {
    try {
      await onUpdate({ name });
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
    }
  };

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
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold bg-violet-600 text-white">
              {(name || profile?.email || 'U').charAt(0).toUpperCase()}
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Nome</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="bg-slate-800 border-slate-700 text-white focus:ring-violet-500" 
            />
          </div>

          <div>
            <Label className="text-slate-300">Email</Label>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800 border border-slate-700/50">
              <Mail className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-400">{profile.email}</span>
            </div>
          </div>

          <div className="flex justify-between pt-4 gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirm(true)} 
              className="text-red-500 border-red-500/50 hover:bg-red-500/10 hover:text-red-600 bg-transparent"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Excluir conta
            </Button>
            <Button 
              onClick={handleSave} 
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" /> Salvar
            </Button>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="mt-4 p-4 rounded-lg border border-red-800 bg-red-900/20 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-bold">Ação Irreversível</span>
            </div>
            <p className="text-xs mb-3 text-slate-400">
              Todos os seus dados, ferramentas favoritas e configurações serão removidos permanentemente.
            </p>
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
                onClick={async () => { await onDeleteAccount(); onClose(); }} 
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Confirmar exclusão
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
