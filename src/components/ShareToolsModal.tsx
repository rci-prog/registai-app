import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Share2, Send } from 'lucide-react';

interface ShareToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  tools: any[]; 
  currentUser: any; 
}

export function ShareToolsModal({ isOpen, onClose, theme, tools = [] }: ShareToolsModalProps) {
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleToggleTool = (toolId: string) => {
    setSelectedTools((prev) => 
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    );
  };

  const handleShare = async () => {
    if (!recipientEmail.trim() || selectedTools.length === 0) return;
    setIsSending(true);
    
    // Simulação de lógica de envio
    await new Promise((r) => setTimeout(r, 1000));
    setStatus(`✅ Ferramentas compartilhadas com ${recipientEmail}`);
    setIsSending(false);
    
    setTimeout(() => { 
      setStatus(null); 
      onClose(); 
      setSelectedTools([]); // Limpa a seleção ao fechar
      setRecipientEmail(''); // Limpa o email ao fechar
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-lg ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <Share2 className="w-5 h-5 text-violet-500" /> Compartilhar Ferramentas
          </DialogTitle>
          <DialogDescription className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
            Selecione as ferramentas e informe o e-mail do destinatário.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div>
            <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>
              E-mail do destinatário
            </Label>
            <Input 
              value={recipientEmail} 
              onChange={(e) => setRecipientEmail(e.target.value)} 
              placeholder="usuario@email.com" 
              className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''} 
            />
          </div>

          <div className={`max-h-48 overflow-y-auto space-y-2 rounded-lg p-2 border ${theme === 'dark' ? 'border-slate-800 bg-slate-950/50' : 'border-gray-100 bg-gray-50/50'}`}>
            {tools && tools.length > 0 ? (
              tools.map((tool: any) => {
                // CORREÇÃO: Blindagem extra para evitar crash se 'tool' for nulo
                if (!tool) return null;

                // Normalização da categoria (Igual ao ToolCard)
                const catName = typeof tool.category === 'string' 
                  ? tool.category 
                  : (tool.category?.name || 'Geral');

                return (
                  <label key={tool.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-white hover:shadow-sm'}`}>
                    <input 
                      type="checkbox" 
                      checked={selectedTools.includes(tool.id)} 
                      onChange={() => handleToggleTool(tool.id)} 
                      className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-600 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-gray-700'}`}>
                        {tool.name}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                        {catName}
                      </span>
                    </div>
                  </label>
                );
              })
            ) : (
              <p className="text-center py-4 text-sm text-slate-500">Nenhuma ferramenta encontrada.</p>
            )}
          </div>

          {status && (
            <p className={`text-xs font-medium ${status.includes('✅') ? 'text-emerald-400' : 'text-red-400'}`}>
              {status}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} className={theme === 'dark' ? 'border-slate-700 text-slate-300' : ''}>
              Cancelar
            </Button>
            <Button 
              onClick={handleShare} 
              disabled={isSending || !recipientEmail.trim() || selectedTools.length === 0} 
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isSending ? 'Enviando...' : <><Send className="w-4 h-4 mr-2" /> Compartilhar</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
