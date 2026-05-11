import { FolderOpen, Plus, Trash2, FileText } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ProjectArchiverProps {
  projects: any[];
  tools: { id: string; name: string }[];
  theme: string;
  onAdd: (project: any) => Promise<{ success: boolean }>;
  onDelete: (id: string) => Promise<{ success: boolean }>;
}

export function ProjectArchiver({ projects, tools, theme, onAdd, onDelete }: ProjectArchiverProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    await onAdd({ name: name.trim(), description: description.trim(), status: 'active' });
    setName(''); setDescription(''); setShowAdd(false);
  };

  return (
    <div className={`p-4 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-gray-200'}`}>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <FolderOpen className="w-4 h-4" /> Projetos
      </h3>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {projects.length === 0 ? (
          <p className="text-xs text-slate-600 text-center py-2">Nenhum projeto</p>
        ) : (
          projects.map((proj: any) => (
            <div key={proj.id} className={`flex items-center justify-between p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
              <div className="min-w-0">
                <p className="text-sm text-slate-300 truncate">{proj.name}</p>
                {proj.description && <p className="text-xs text-slate-500 truncate">{proj.description}</p>}
              </div>
              <button onClick={() => onDelete(proj.id)} className="p-1 text-red-500 hover:text-red-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {showAdd ? (
        <div className="mt-2 space-y-2">
          <Label className="text-slate-400 text-xs">Nome do projeto</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-slate-900 border-slate-700 text-white text-sm" />
          <Label className="text-slate-400 text-xs">Descricao</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-slate-900 border-slate-700 text-white text-sm" rows={2} />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)} className="text-xs border-slate-700">Cancelar</Button>
            <Button size="sm" onClick={handleAdd} className="text-xs bg-violet-600">Criar</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowAdd(true)} className="w-full mt-2 text-xs border-slate-700 text-slate-400">
          <Plus className="w-3 h-3 mr-1" /> Novo projeto
        </Button>
      )}
    </div>
  );
}
