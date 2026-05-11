import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Share2, Send } from 'lucide-react';

interface ShareToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: string;
  tools: any[];
}

export function ShareToolsModal({ isOpen, onClose, theme, tools }: ShareToolsModalProps) {
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleToggleTool = (toolId: string) => {
    setSelectedTools((prev) => prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]);
  };

  const handleShare = async () => {
    if (!recipientEmail.trim() || selectedTools.length === 0) return;
    setIsSending(true);
    // Simular envio
    await new Promise((r) => setTimeout(r, 1000));
    setStatus(`✅ Ferramentas compartilhadas com ${recipientEmail}`);
    setIsSending(false);
    setTimeout(() => { setStatus(null); onClose(); }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-lg ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <Share2 className="w-5 h-5 text-violet-500" /> Compartilhar Ferramentas
          </DialogTitle>
          <DialogDescription className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
            Selecione as ferramentas e informe o email do destinatario.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div>
            <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Email do destinatario</Label>
            <Input value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="usuario@email.com" className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''} />
          </div>

      <div className="max-h-48 overflow-y-auto space-y-2">
            {tools.map((tool: any) => (
              <label key={tool.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}`}>
                <input 
                  type="checkbox" 
                  checked={selectedTools.includes(tool.id)} 
                  onChange={() => handleToggleTool(tool.id)} 
                  className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-600 cursor-pointer"
                />
                <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>{tool.name}</span>
              </label>
            ))}
          </div>

          {status && <p className="text-xs text-emerald-400">{status}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="border-slate-700">Cancelar</Button>
            <Button onClick={handleShare} disabled={isSending || !recipientEmail.trim() || selectedTools.length === 0} className="bg-violet-600 hover:bg-violet-700 text-white">
              {isSending ? 'Enviando...' : <><Send className="w-4 h-4 mr-2" /> Compartilhar</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Label import needed
import { Label } from '@/components/ui/label';
