import { useState, useRef, useCallback } from 'react';
import {
  Archive,
  Plus,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download,
  Trash2,
  Image,
  Video,
  FileAudio,
  FileText,
  Link,
  Loader2,
  Mail,
} from 'lucide-react';
import { PublishRequestModal } from '@/components/PublishRequestModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Project {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'url';
  file_url: string | null;
  external_url: string | null;
  tool_id: string | null;
  created_at: string;
}

interface ToolOption {
  id: string;
  name: string;
}

interface ProjectArchiverProps {
  projects: Project[];
  tools: ToolOption[];
  theme: 'light' | 'dark';
  onAdd: (project: Omit<Project, 'id' | 'created_at'>) => Promise<{ success: boolean }>;
  onDelete: (id: string) => void;
}

const typeIcons: Record<string, any> = {
  image: Image,
  video: Video,
  audio: FileAudio,
  document: FileText,
  url: Link,
};

const typeLabels: Record<string, string> = {
  image: 'Imagem',
  video: 'Video',
  audio: 'Audio',
  document: 'Documento',
  url: 'URL',
};

const typeColors: Record<string, string> = {
  image: 'bg-pink-500/20 text-pink-400',
  video: 'bg-red-500/20 text-red-400',
  audio: 'bg-amber-500/20 text-amber-400',
  document: 'bg-cyan-500/20 text-cyan-400',
  url: 'bg-blue-500/20 text-blue-400',
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ProjectArchiver({ projects, tools, theme, onAdd, onDelete }: ProjectArchiverProps) {
  console.log('[ProjectArchiver] RENDER');
  const [showAdd, setShowAdd] = useState(false);
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const [shareProject, setShareProject] = useState<Project | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareExpandedUrl, setShareExpandedUrl] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'image' as Project['type'],
    external_url: '',
    tool_id: 'none',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    try {
      const dataUrl = await fileToDataUrl(file);
      setFileDataUrl(dataUrl);
      console.log('[Project] File converted to data URL:', file.name, dataUrl.slice(0, 60));
    } catch (err) {
      console.error('[Project] Error converting file:', err);
    }
  };

  const resetForm = useCallback(() => {
    setFormData({ name: '', type: 'image', external_url: '', tool_id: 'none' });
    setSelectedFile(null);
    setFileDataUrl(null);
  }, []);

  const handleCancel = useCallback(() => {
    resetForm();
    setShowAdd(false);
  }, [resetForm]);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      resetForm();
    }
    setShowAdd(open);
  }, [resetForm]);

  const handleAdd = async () => {
    if (!formData.name) return;
    if (formData.type !== 'url' && !fileDataUrl) return;
    if (formData.type === 'url' && !formData.external_url) return;

    setIsUploading(true);
    console.log('[Project] Salvando projeto:', formData.name, formData.type);

    try {
      const result = await onAdd({
        name: formData.name,
        type: formData.type,
        file_url: formData.type !== 'url' ? fileDataUrl : null,
        external_url: formData.type === 'url' ? formData.external_url || null : null,
        tool_id: formData.tool_id === 'none' ? null : formData.tool_id || null,
      });

      if (result.success) {
        setFormData({ name: '', type: 'image', external_url: '', tool_id: 'none' });
        setSelectedFile(null);
        setFileDataUrl(null);
        setShowAdd(false);
      }
    } catch (e: any) {
      console.error('[Project] Erro ao salvar:', e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const groupedProjects = projects.reduce((acc, project) => {
    if (!acc[project.type]) acc[project.type] = [];
    acc[project.type].push(project);
    return acc;
  }, {} as Record<string, Project[]>);

  const getProjectUrl = useCallback((project: Project): string => {
    if (project.file_url) return project.file_url;
    if (project.external_url) return project.external_url;
    return '';
  }, []);

  const openProject = useCallback((project: Project) => {
    const url = getProjectUrl(project);
    if (!url) return;

    if (project.type === 'image') {
      setPreviewProject(project);
    } else if (project.type === 'url') {
      window.open(url, '_blank');
    } else {
      // video, audio, document: abrir em nova aba (navegador lida com o tipo)
      window.open(url, '_blank');
    }
  }, [getProjectUrl]);

  const handleDownload = useCallback((project: Project) => {
    const url = getProjectUrl(project);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = project.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [getProjectUrl]);

  const typeOrder: Project['type'][] = ['image', 'video', 'audio', 'document', 'url'];

  return (
    <>
      {/* Card principal */}
      <div className={`mt-4 mx-3 rounded-xl border p-4 ${
        theme === 'dark'
          ? 'bg-slate-900/60 border-slate-800/60 backdrop-blur-sm'
          : 'bg-white/60 border-gray-200/60 backdrop-blur-sm'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Archive className={`w-4 h-4 ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`} />
            <h3 className={`text-xs font-semibold uppercase tracking-wider ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
            }`}>
              Meus Projetos
            </h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-500'
            }`}>
              {projects.length}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAdd(true)}
            className={`h-7 w-7 p-0 rounded-md ${
              theme === 'dark' ? 'text-violet-400 hover:bg-violet-500/10' : 'text-violet-600 hover:bg-violet-50'
            }`}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Lista por categoria */}
        {projects.length === 0 ? (
          <p className={`text-[11px] text-center py-3 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
            Nenhum projeto arquivado
          </p>
        ) : (
          <div className="space-y-1">
            {typeOrder.map((type) => {
              const items = groupedProjects[type];
              if (!items || items.length === 0) return null;
              const TypeIcon = typeIcons[type];
              const isExpanded = expandedType === type;

              return (
                <div key={type}>
                  {/* Header da categoria */}
                  <button
                    onClick={() => setExpandedType(isExpanded ? null : type)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors ${
                      theme === 'dark' ? 'hover:bg-slate-800/60' : 'hover:bg-gray-50/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <TypeIcon className={`w-3.5 h-3.5 ${typeColors[type].split(' ')[1]}`} />
                      <span className={`text-[11px] font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                        {typeLabels[type]}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${typeColors[type]}`}>
                        {items.length}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className={`w-3 h-3 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`} />
                    ) : (
                      <ChevronDown className={`w-3 h-3 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`} />
                    )}
                  </button>

                  {/* Itens da categoria */}
                  {isExpanded && (
                    <div className="ml-4 space-y-1 mt-1">
                      {items.map((project) => (
                        <div
                          key={project.id}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-lg ${
                            theme === 'dark' ? 'bg-slate-800/40' : 'bg-gray-50/40'
                          }`}
                        >
                          <button
                            onClick={() => openProject(project)}
                            className="flex items-center gap-2 min-w-0 flex-1 text-left"
                          >
                            <TypeIcon className={`w-3 h-3 flex-shrink-0 ${typeColors[type].split(' ')[1]}`} />
                            <span className={`text-[11px] truncate ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                              {project.name}
                            </span>
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openProject(project)}
                              className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
                              title="Abrir"
                            >
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </button>
                            <button
                              onClick={() => {
                                setShareProject(project);
                                setShareEmail('');
                                setShareExpandedUrl(false);
                              }}
                              className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-cyan-500/10' : 'hover:bg-cyan-50'}`}
                              title="Compartilhar projeto"
                            >
                              <Mail className="w-3 h-3 text-cyan-400" />
                            </button>
                            <button
                              onClick={() => handleDownload(project)}
                              className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}
                              title="Download"
                            >
                              <Download className="w-3 h-3 text-slate-400" />
                            </button>
                            <button
                              onClick={() => setDeleteId(project.id)}
                              className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}
                              title="Remover"
                            >
                              <Trash2 className="w-3 h-3 text-red-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Botão Publique seu Projeto */}
        <button
          onClick={() => setPublishOpen(true)}
          className={`w-full mt-3 py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98] ${
            theme === 'dark'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/20'
              : 'bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-400/20'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <Mail className="w-3.5 h-3.5" />
            Publique seu Projeto
          </span>
        </button>
      </div>

      {/* Modal Novo Projeto */}
      <Dialog open={showAdd} onOpenChange={handleDialogOpenChange}>
        <DialogContent className={`max-w-md ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              Novo Projeto
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2 overflow-y-auto max-h-[60vh] pr-1">
            <div>
              <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Nome do Projeto *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Banner Marketing Q3"
                className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''}
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Tipo *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => {
                    setFormData({ ...formData, type: v as Project['type'] });
                    setSelectedFile(null);
                    setFileDataUrl(null);
                  }}
                >
                  <SelectTrigger className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-slate-900 border-slate-700' : ''}>
                    <SelectItem value="image">Imagem</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="document">Documento</SelectItem>
                    <SelectItem value="url">URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Ferramenta</Label>
                <Select
                  value={formData.tool_id}
                  onValueChange={(v) => setFormData({ ...formData, tool_id: v })}
                >
                  <SelectTrigger className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''}>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-slate-900 border-slate-700' : ''}>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {tools.map((tool) => (
                      <SelectItem key={tool.id} value={tool.id}>
                        {tool.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.type === 'url' ? (
              <div>
                <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>URL *</Label>
                <Input
                  value={formData.external_url}
                  onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                  placeholder="https://..."
                  className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''}
                />
              </div>
            ) : (
              <div>
                <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Arquivo *</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={
                    formData.type === 'image' ? 'image/*' :
                    formData.type === 'video' ? 'video/*' :
                    formData.type === 'audio' ? 'audio/*' :
                    '*'
                  }
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className={`shrink-0 ${theme === 'dark' ? 'border-slate-700 text-slate-300' : ''}`}
                  >
                    {selectedFile ? 'Trocar arquivo' : 'Escolher arquivo'}
                  </Button>
                  {selectedFile && (
                    <span className={`text-[11px] break-all min-w-0 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                      {selectedFile.name}
                    </span>
                  )}
                </div>
                {fileDataUrl && (
                  <p className={`text-[10px] mt-1 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                    Arquivo pronto para upload
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-center gap-2 pt-2 flex-wrap">
              <Button variant="outline" onClick={handleCancel} disabled={isUploading} className="shrink-0">
                Cancelar
              </Button>
              <Button
                onClick={handleAdd}
                className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
                disabled={
                  !formData.name ||
                  isUploading ||
                  (formData.type === 'url' && !formData.external_url) ||
                  (formData.type !== 'url' && !fileDataUrl)
                }
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Arquivar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview / Abrir Projeto */}
      <Dialog open={!!previewProject} onOpenChange={() => setPreviewProject(null)}>
        <DialogContent className={`max-w-lg ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              {previewProject?.name}
            </DialogTitle>
          </DialogHeader>
          {previewProject && (
            <div className="space-y-3">
              {previewProject.type === 'image' && getProjectUrl(previewProject) && (
                <img
                  src={getProjectUrl(previewProject)}
                  alt={previewProject.name}
                  className="w-full rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
              {previewProject.type === 'video' && getProjectUrl(previewProject) && (
                <video
                  src={getProjectUrl(previewProject)}
                  controls
                  className="w-full rounded-lg"
                  preload="metadata"
                />
              )}
              {previewProject.type === 'audio' && getProjectUrl(previewProject) && (
                <audio
                  src={getProjectUrl(previewProject)}
                  controls
                  className="w-full"
                />
              )}
              {previewProject.type === 'document' && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <FileText className={`w-12 h-12 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'}`} />
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                    Documento salvo
                  </p>
                  <a
                    href={getProjectUrl(previewProject) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir documento em nova aba
                  </a>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                <span className={`text-[10px] uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                  {typeLabels[previewProject.type]}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(previewProject)}
                    className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded ${theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                  <button
                    onClick={() => {
                      const url = getProjectUrl(previewProject);
                      if (url) window.open(url, '_blank');
                    }}
                    className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded ${theme === 'dark' ? 'bg-violet-600/20 text-violet-300 hover:bg-violet-600/30' : 'bg-violet-50 text-violet-600 hover:bg-violet-100'}`}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Abrir
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className={theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}>
          <AlertDialogHeader>
            <AlertDialogTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              Remover projeto?
            </AlertDialogTitle>
            <AlertDialogDescription className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
              Este projeto sera removido do arquivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={theme === 'dark' ? 'bg-slate-800 text-white border-slate-700' : ''}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { deleteId && onDelete(deleteId); setDeleteId(null); }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Project Dialog */}
      <Dialog open={!!shareProject} onOpenChange={() => setShareProject(null)}>
        <DialogContent className={`w-[90vw] max-w-lg max-h-[85vh] overflow-y-auto ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              <Mail className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              Compartilhar Projeto
            </DialogTitle>
            <DialogDescription className={`truncate ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
              {shareProject?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className={`text-xs mb-1 block ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                E-mail do destinatario
              </label>
              <input
                type="email"
                placeholder="exemplo@email.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-sm border outline-none ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-600 focus:border-cyan-500'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-cyan-500'
                }`}
              />
            </div>
            {shareProject && (
              <div className={`p-3 rounded-lg text-xs overflow-hidden ${theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-gray-50 text-gray-600'}`}>
                <p className="font-medium mb-1">{shareProject.name}</p>
                {shareProject.external_url && (
                  <div>
                    <p className={`break-all text-cyan-400 ${shareExpandedUrl ? '' : 'line-clamp-1'}`}>
                      {shareProject.external_url}
                    </p>
                    {shareProject.external_url.length > 60 && (
                      <button
                        onClick={() => setShareExpandedUrl(!shareExpandedUrl)}
                        className="text-[10px] mt-0.5 text-slate-500 hover:text-cyan-400 transition-colors"
                      >
                        {shareExpandedUrl ? 'Ver menos' : 'Ver mais'}
                      </button>
                    )}
                  </div>
                )}
                {shareProject.file_url && (
                  <div className="mt-1">
                    <p className={`break-all opacity-70 ${shareExpandedUrl ? '' : 'line-clamp-1'}`}>
                      {shareProject.file_url}
                    </p>
                    {shareProject.file_url.length > 60 && (
                      <button
                        onClick={() => setShareExpandedUrl(!shareExpandedUrl)}
                        className="text-[10px] mt-0.5 text-slate-500 hover:text-cyan-400 transition-colors"
                      >
                        {shareExpandedUrl ? 'Ver menos' : 'Ver mais'}
                      </button>
                    )}
                  </div>
                )}
                <p className="mt-1 text-[10px] opacity-50">Tipo: {shareProject.type.toUpperCase()}</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShareProject(null)}
              className={`flex-1 text-xs ${theme === 'dark' ? 'border-slate-700 text-slate-300' : ''}`}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (shareProject && shareEmail) {
                  const subject = encodeURIComponent(`Projeto compartilhado: ${shareProject.name}`);
                  const body = encodeURIComponent(
                    `Ola!\n\nEstou compartilhando este projeto com voce:\n\nNome: ${shareProject.name}\nTipo: ${shareProject.type.toUpperCase()}\n${shareProject.external_url ? `URL: ${shareProject.external_url}\n` : ''}${shareProject.file_url ? `Arquivo: ${shareProject.file_url}\n` : ''}\n\n---\nEnviado via registAI`
                  );
                  window.open(`mailto:${shareEmail}?subject=${subject}&body=${body}`, '_blank');
                  setShareProject(null);
                }
              }}
              disabled={!shareEmail}
              className="flex-1 text-xs bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
            >
              <Mail className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
              Enviar e-mail
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Publique seu Projeto */}
      <PublishRequestModal open={publishOpen} onClose={() => setPublishOpen(false)} />
    </>
  );
}
