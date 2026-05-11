import { useState } from 'react';
import {
  Heart, ExternalLink, Edit, Trash2, Star, FileText, MoreVertical, AlertTriangle
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Tool {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  url: string;
  image_url: string | null;
  isFavorite?: boolean;
  notes?: string | null;
  rating?: number;
}

interface Category {
  id: string;
  name: string;
}

interface ToolCardProps {
  tool: Tool;
  isLoggedIn: boolean;
  isAdmin: boolean;
  theme: 'light' | 'dark';
  categories: Category[];
  onToggleFavorite?: (id: string) => void;
  onEdit?: (tool: Tool) => void;
  onDelete?: (id: string) => void;
  onSaveNotes?: (id: string, notes: string) => void;
  onRate?: (id: string, rating: number) => void;
  onAccess?: (id: string) => void;
}

export function ToolCard({
  tool, isLoggedIn, isAdmin, theme, categories,
  onToggleFavorite, onEdit, onDelete, onSaveNotes, onRate, onAccess,
}: ToolCardProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notes, setNotes] = useState(tool.notes || '');
  const [editData, setEditData] = useState({
    id: tool.id, name: tool.name, description: tool.description || '',
    url: tool.url, category: tool.category, image_url: tool.image_url || '',
  });

  const handleSaveNotes = () => { onSaveNotes?.(tool.id, notes); setShowNotes(false); };
  const handleEdit = () => { onEdit?.({ ...tool, ...editData }); setShowEdit(false); };
  const handleDelete = () => { onDelete?.(tool.id); setShowDeleteConfirm(false); };
  const handleRate = (star: number) => { onRate?.(tool.id, (tool.rating || 0) === star ? 0 : star); };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Chatbots': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Imagens': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'Videos': 'bg-red-500/20 text-red-400 border-red-500/30',
      'Apresentacoes': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'Audio': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Produtividade': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'Desenvolvimento': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'PDF': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    };
    return colors[category] || (theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-600');
  };

  return (
    <>
      <div className={`group relative rounded-xl border transition-all duration-200 hover:shadow-lg ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-violet-500/50' : 'bg-white border-gray-200 hover:border-violet-300'
      }`}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              <img src={tool.image_url || `https://www.google.com/s2/favicons?domain=${tool.url}&sz=128`}
                alt={tool.name} className="w-12 h-12 rounded-lg object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48?text=AI'; }} />
              {tool.isFavorite && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <Heart className="w-3 h-3 text-white fill-current" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className={`font-semibold text-base truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tool.name}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getCategoryColor(tool.category)}`}>
                    {tool.category}
                  </span>
                </div>
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={`p-1.5 rounded-lg transition-colors ${
                        theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                      }`}><MoreVertical className="w-4 h-4" /></button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className={theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}>
                      <DropdownMenuItem onClick={() => setShowEdit(true)} className="cursor-pointer">
                        <Edit className="w-4 h-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="cursor-pointer text-red-500">
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <p className={`text-sm mt-2 line-clamp-2 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                {tool.description || 'Sem descricao'}
              </p>
            </div>
          </div>
          {isLoggedIn && (
            <div className="flex items-center gap-1 mt-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => handleRate(star)} className="p-0.5 transition-colors hover:scale-110">
                  <Star className={`w-4 h-4 ${(tool.rating || 0) >= star ? 'text-yellow-400 fill-current' : theme === 'dark' ? 'text-slate-600' : 'text-gray-300'}`} />
                </button>
              ))}
              {tool.notes && (
                <span className={`ml-2 text-xs flex items-center gap-1 ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`}>
                  <FileText className="w-3 h-3" /> Notas
                </span>
              )}
            </div>
          )}
        </div>
        <div className={`px-4 py-3 border-t flex items-center justify-between ${theme === 'dark' ? 'border-slate-800' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <button onClick={() => onToggleFavorite?.(tool.id)} className={`p-2 rounded-lg transition-colors ${
              tool.isFavorite ? 'text-red-500 bg-red-500/10' : theme === 'dark' ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
            }`} title="Favoritar"><Heart className={`w-4 h-4 ${tool.isFavorite ? 'fill-current' : ''}`} /></button>
            <button onClick={() => setShowNotes(true)} className={`p-2 rounded-lg transition-colors ${
              tool.notes ? 'text-violet-500 bg-violet-500/10' : theme === 'dark' ? 'text-slate-500 hover:text-violet-400 hover:bg-violet-500/10' : 'text-gray-400 hover:text-violet-500 hover:bg-violet-50'
            }`} title="Notas"><FileText className="w-4 h-4" /></button>
          </div>
          <a href={tool.url} target="_blank" rel="noopener noreferrer" onClick={() => onAccess?.(tool.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors">
            Acessar <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Notes Dialog */}
      <Dialog open={showNotes} onOpenChange={setShowNotes}>
        <DialogContent className={theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>Notas - {tool.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Adicione suas notas..."
              className={`min-h-[120px] ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-gray-50 border-gray-200'}`} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNotes(false)}>Cancelar</Button>
              <Button onClick={handleSaveNotes} className="bg-violet-600 hover:bg-violet-700 text-white">Salvar notas</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className={`max-w-lg ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>Editar Ferramenta</DialogTitle>
            <DialogDescription className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>Modifique os dados da ferramenta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Nome</Label>
              <Input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''} /></div>
            <div><Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Descricao</Label>
              <Textarea value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''} /></div>
            <div><Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>URL</Label>
              <Input value={editData.url} onChange={(e) => setEditData({ ...editData, url: e.target.value })} className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''} /></div>
            <div><Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Categoria</Label>
              <Select value={editData.category} onValueChange={(v) => setEditData({ ...editData, category: v })}>
                <SelectTrigger className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''}><SelectValue /></SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-slate-900 border-slate-700' : ''}>
                  {categories.map((cat) => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}
                </SelectContent>
              </Select></div>
            <div><Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>URL da Imagem</Label>
              <Input value={editData.image_url} onChange={(e) => setEditData({ ...editData, image_url: e.target.value })} placeholder="https://..." className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowEdit(false)}>Cancelar</Button>
              <Button onClick={handleEdit} className="bg-violet-600 hover:bg-violet-700 text-white">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className={theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}>
          <AlertDialogHeader>
            <AlertDialogTitle className={`flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              <AlertTriangle className="w-5 h-5 text-red-500" /> Confirmar exclusao
            </AlertDialogTitle>
            <AlertDialogDescription className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
              Tem certeza que deseja excluir <strong>{tool.name}</strong>? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={theme === 'dark' ? 'bg-slate-800 text-white border-slate-700' : ''}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
