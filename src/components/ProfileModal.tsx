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
  // Alterado para 'any' para evitar erros de 'undefined' no build
  profile: any | null; 
  theme: string;
  onUpdate: (updates: any) => Promise<{ success: boolean }>;
  onDeleteAccount: () => Promise<{ success: boolean }>;
}

export function ProfileModal({ open, onClose, profile, theme, onUpdate, onDeleteAccount }: ProfileModalProps) {
  // Inicialização segura do estado
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
      <DialogContent className={`max-w-md ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white text-gray-900'}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <User className="w-5 h-5 text-violet-500" /> Perfil
          </DialogTitle>
          <DialogDescription className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
            Gerencie suas informações de perfil.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="flex justify-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold ${theme === 'dark' ? 'bg-violet-600' : 'bg-violet-500'} text-white`}>
              {(name || profile?.email || 'U').charAt(0).toUpperCase()}
            </div>
          </div>

          <div>
            <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Nome</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300'} 
            />
          </div>

          <div>
            <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Email</Label>
            <div className={`flex items-center gap-2 p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'}`}>
              <Mail className="w-4 h-4 text-slate-500" />
              <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>{profile.email}</span>
            </div>
          </div>

          <div className="flex justify-between pt-4 gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirm(true)} 
              className="text-red-500 border-red-500/50 hover:bg-red-500/10 hover:text-red-600"
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
          <div className={`mt-4 p-4 rounded-lg border animate-in fade-in slide-in-from-top-2 ${theme === 'dark' ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-bold">Ação Irreversível</span>
            </div>
            <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
              Todos os seus dados, ferramentas favoritas e configurações serão removidos permanentemente.
            </p>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(false)}
                className={theme === 'dark' ? 'border-slate-700 text-white' : 'border-gray-300'}
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
