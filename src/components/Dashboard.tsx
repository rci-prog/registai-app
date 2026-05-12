import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Grid3X3, List, Plus, Sparkles, Settings, Trash2, Edit, X, AlertCircle, RefreshCw, Loader2, Share2 } from 'lucide-react';
import { Header } from './Header';
import { NewsCarousel } from './NewsCarousel';
import { SidebarFilters } from './SidebarFilters';
import { AnalyticsSidebar } from './AnalyticsSidebar';
import { BudgetGauges } from './BudgetGauges';
import { SubscriptionManager } from './SubscriptionManager';
import { ProjectArchiver } from './ProjectArchiver';
import { RegisChat } from './RegisChat';
import { Footer } from './Footer';
import { ProfileModal } from './ProfileModal';
import { AdminPanel } from './AdminPanel';
import { ToolCard } from './ToolCard';
import { LoginModal } from './LoginModal';
import { ShareToolsModal } from './ShareToolsModal';
import { TransferNotification } from './TransferNotification';
import { useTools } from '@/hooks/useTools.fetch';
import { useAuth } from '@/contexts/AuthContext';
// supabase import removido — usando fetch direto para bypass RLS
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

export function Dashboard() {
  const { 
    tools, 
    allTools,
    categories, 
    clickData,
    budget,
    subscriptions,
    projects,
    filters, 
    isLoading,
    error,
    toggleFavorite,
    saveNotes,
    saveRating,
    addTool,
    editTool,
    deleteTool,
    addCategory,
    editCategory,
    deleteCategory,
    recordAccess,
    resetClicks,
    setUserBudget,
    addSubscription,
    deleteSubscription,
    confirmSubscriptionPayment,
    addProject,
    deleteProject,
    setCategory,
    setSearch,
    setFavoritesOnly,
    clearFilters,
    clearError,
    refreshTools,
  } = useTools();
  
  const { currentUser, theme, isAdmin, profile, blockMessage } = useAuth();
  
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const setLoginError = (msg: string | null) => msg && console.error("Login Error:", msg);
  const [showProfile, setShowProfile] = useState(false);

  // Verificar se usuario do cache ainda e valido (profile existe e nao esta bloqueado)
  // Usa fetch direto com API key para BYPASS RLS — le valor real do is_blocked
  const SUPABASE_URL = 'https://cmfgirvgnexkcomhcosm.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Dm-ozWvAve1nkgjEDg_QsA_-gldlMxk';
  const { logout } = useAuth();
  useEffect(() => {
    const verifyUser = async () => {
      if (!currentUser?.id) return;
      console.log('[Dashboard] [verifyUser] Verificando usuario:', currentUser.email);
      try {
        // Fetch direto = bypass RLS, le o valor REAL do is_blocked
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,is_blocked&id=eq.${currentUser.id}`, {
          method: 'GET',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        });
        if (!resp.ok) {
          console.log('[Dashboard] [verifyUser] Fetch erro:', resp.status);
          return;
        }
        const data = await resp.json();
        const profileData = data?.[0];
        console.log('[Dashboard] [verifyUser] Resultado:', currentUser.email, 'is_blocked:', profileData?.is_blocked, 'existe:', !!profileData);
        if (!profileData) {
          console.log('[Dashboard] [verifyUser] Usuario deletado detectado, fazendo signOut');
          await logout();
          setLoginError('Esta conta foi removida. Cadastre-se novamente para acessar.');
          setIsLoginOpen(true);
          return;
        }
        const rawBlocked = profileData?.is_blocked;
        const isBlocked = rawBlocked === true || rawBlocked === 'true' || rawBlocked === 1 || rawBlocked === 't';
        if (isBlocked) {
          console.log('[Dashboard] [verifyUser] Usuario BLOQUEADO detectado, fazendo signOut:', currentUser.email);
          await logout();
          setLoginError('Sua conta foi suspensa. Entre em contato com o suporte.');
          setIsLoginOpen(true);
          return;
        }
        console.log('[Dashboard] [verifyUser] Usuario OK:', currentUser.email);
      } catch (e: any) {
        console.error('[Dashboard] [verifyUser] Erro:', e.message);
      }
    };
    verifyUser();
  }, [currentUser?.id]); // executa quando currentUser ficar disponivel

  // Escuta evento para abrir modal de login (apos redefinicao de senha)
  useEffect(() => {
    const handler = () => {
      setLoginError(null);
      setIsLoginOpen(true);
    };
    window.addEventListener('open-login-modal', handler);
    return () => window.removeEventListener('open-login-modal', handler);
  }, []);

  const [showAdmin, setShowAdmin] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddTool, setShowAddTool] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [showSetBudget, setShowSetBudget] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ monthly: '', yearly: '' });
  const [newToolData, setNewToolData] = useState({
    name: '',
    description: '',
    url: '',
    category: '',
    image_url: '',
  });
  const [autoGenUrl, setAutoGenUrl] = useState('');
  const [showScrapeWarning, setShowScrapeWarning] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Escutar evento de transferencia aceita -> refetch ferramentas
  useEffect(() => {
    const handleToolsChanged = () => {
      console.log('[Dashboard] Evento tools-changed recebido, refetching...');
      refreshTools();
    };
    window.addEventListener('tools-changed', handleToolsChanged);
    return () => window.removeEventListener('tools-changed', handleToolsChanged);
  }, [refreshTools]);

  // Detectar erro de auth (bloqueio/deleted) apos redirect do Google — VERIFICA NA MONTAGEM
  useEffect(() => {
    const raw = localStorage.getItem('auth_error');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // So usa se for recente (< 30 segundos)
        if (Date.now() - parsed.ts < 30000) {
          setLoginError(parsed.msg);
          setIsLoginOpen(true);
        }
      } catch {
        setLoginError(raw);
        setIsLoginOpen(true);
      }
      localStorage.removeItem('auth_error');
    }
  }, []); // [] = executa apenas na montagem

  // Debug
  console.log('[Dashboard] Render:', {
    toolsCount: tools.length,
    allToolsCount: allTools.length,
    isLoading,
    isAdmin,
    user: currentUser?.email,
    error,
  });

  // Calcular contagem por categoria (case-insensitive, mapeia por id e por nome)
  // Usa 'tools' (apenas do usuario) em vez de 'allTools' (todas do sistema)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    // Inicializar com 0 para todas as categorias
    categories.forEach((cat: any) => {
      counts[cat.id] = 0;
      counts[cat.name] = 0;
    });
    // Contar apenas ferramentas do usuario logado
    tools.forEach((tool: any) => {
      const toolCatLower = tool.category.toLowerCase();
      // Encontrar a categoria correspondente (case-insensitive)
      const matchingCat = categories.find((cat: any) => 
        cat.id.toLowerCase() === toolCatLower || 
        cat.name.toLowerCase() === toolCatLower
      );
      if (matchingCat) {
        counts[matchingCat.id] = (counts[matchingCat.id] || 0) + 1;
      }
    });
    return counts;
  }, [tools, categories]);

  const handleAddTool = async () => {
    console.log('[Dashboard] handleAddTool chamado:', newToolData);
    const result = await addTool(newToolData);
    console.log('[Dashboard] addTool resultado:', result);
    if (result.success) {
      setShowAddTool(false);
      setNewToolData({ name: '', description: '', url: '', category: '', image_url: '' });
    }
  };

  const handleAutoGenerate = async () => {
    if (!autoGenUrl) return;
    
    try {
      const url = new URL(autoGenUrl);
      const domain = url.hostname.replace('www.', '').split('.')[0];
      const name = domain.charAt(0).toUpperCase() + domain.slice(1);
      
      setNewToolData({
        name: name,
        description: `Ferramenta de IA acessivel em ${url.hostname}`,
        url: autoGenUrl,
        category: categories[0]?.id || 'Chatbots',
        image_url: `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`,
      });
      // Mostrar aviso sobre campos que precisam ser personalizados
      setShowScrapeWarning(true);
    } catch {
      // URL invalida
    }
  };

  // Gerenciar categorias - conectado ao Supabase
  const handleAddCategory = async () => {
    console.log('[Dashboard] handleAddCategory chamado:', newCategoryName);
    if (!newCategoryName.trim()) {
      console.log('[Dashboard] Nome vazio, ignorando');
      return;
    }
    const result = await addCategory(newCategoryName.trim());
    console.log('[Dashboard] addCategory resultado:', result);
    if (result.success) {
      setNewCategoryName('');
    }
  };

  const handleEditCategorySave = async () => {
    console.log('[Dashboard] handleEditCategorySave chamado:', editingCategory, editCategoryName);
    if (!editingCategory || !editCategoryName.trim()) return;
    const result = await editCategory(editingCategory, editCategoryName.trim());
    console.log('[Dashboard] editCategory resultado:', result);
    if (result.success) {
      setEditingCategory(null);
      setEditCategoryName('');
    }
  };

  const handleSetBudget = async () => {
    const result = await setUserBudget(
      parseFloat(budgetForm.monthly) || 0,
      parseFloat(budgetForm.yearly) || 0
    );
    if (result.success) {
      setShowSetBudget(false);
    }
  };

  const handleDeleteCategoryConfirm = async () => {
    console.log('[Dashboard] handleDeleteCategoryConfirm chamado:', categoryToDelete);
    if (!categoryToDelete) return;
    const result = await deleteCategory(categoryToDelete);
    console.log('[Dashboard] deleteCategory resultado:', result);
    if (result.success) {
      setCategoryToDelete(null);
    }
  };

  // ======= PROTECAO DE ROTA =======
  // Se nao estiver autenticado, mostra APENAS a tela de login
  if (!currentUser) {
    // ============================================================
    // DETECTAR REDIRECT DO OAUTH: se URL tem token, estamos em
    // processo de login — mostrar spinner ao inves da tela de login
    // ============================================================
    const isOAuthRedirect = typeof window !== 'undefined' && window.location.hash.includes('access_token=');
    if (isOAuthRedirect) {
      return (
        <div className={`min-h-screen flex flex-col items-center justify-center ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
          <div className="flex flex-col items-center gap-4">
            <Loader2 className={`w-10 h-10 animate-spin ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`} />
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Conectando...</p>
          </div>
        </div>
      );
    }
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center gap-6">
          <svg width="100" height="100" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2L36 11V29L20 38L4 29V11L20 2Z" stroke="#8b5cf6" strokeWidth="2" fill="none"/>
            <path d="M12 16H28" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="12" y="20" width="5" height="5" rx="1" fill="#8b5cf6" opacity="0.9"/>
            <rect x="17.5" y="20" width="5" height="5" rx="1" fill="#a78bfa" opacity="0.9"/>
            <rect x="23" y="20" width="5" height="5" rx="1" fill="#c4b5fd" opacity="0.9"/>
            <circle cx="20" cy="13" r="2.5" fill="#06b6d4"/>
          </svg>
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent pb-1">
              registAI
            </h1>
            <p className={`mt-2 text-base ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
              Catalogo Inteligente de IA
            </p>
            <p className={`mt-4 text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
              Faca login para acessar suas ferramentas e o assistente Regis
            </p>
          </div>
          {blockMessage && (
            <div className={`p-4 rounded-xl border max-w-sm text-center ${theme === 'dark' ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
              <p className="text-sm font-medium">{blockMessage}</p>
            </div>
          )}
          <Button
            onClick={() => setIsLoginOpen(true)}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white px-10 py-6 text-lg rounded-xl shadow-lg shadow-violet-500/25"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Entrar
          </Button>
        </div>
        <LoginModal
          open={isLoginOpen}
          onClose={() => { setIsLoginOpen(false); setLoginError(null); }}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
      <Header onLogin={() => setIsLoginOpen(true)} onProfile={() => setShowProfile(true)} onAdmin={() => setShowAdmin(true)} />
      
      {/* News Carousel */}
      <NewsCarousel theme={theme} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="flex flex-col h-full overflow-y-auto">
          <SidebarFilters
            categories={categories}
            selectedCategory={filters.category}
            selectedSubcategory={filters.subcategory}
            searchQuery={filters.search}
            favoritesOnly={filters.favoritesOnly}
            onCategorySelect={setCategory}
            onSubcategorySelect={() => {}}
            onSearchChange={setSearch}
            onFavoritesOnlyChange={setFavoritesOnly}
            onClearFilters={clearFilters}
            totalTools={tools.length}
            filteredCount={tools.length}
            categoryCounts={categoryCounts}
            onManageCategories={() => setShowManageCategories(true)}
          />

          {/* Analytics - abaixo dos filtros */}
          <AnalyticsSidebar
            tools={allTools}
            clickData={clickData}
            theme={theme}
            onReset={resetClicks}
          />

          {/* Orcamento - velocimetros */}
          <BudgetGauges
            subscriptions={subscriptions}
            budget={budget}
            theme={theme}
            onSetBudget={() => setShowSetBudget(true)}
          />

          {/* Assinaturas */}
          <SubscriptionManager
            subscriptions={subscriptions}
            theme={theme}
            onAdd={addSubscription}
            onDelete={deleteSubscription}
            onConfirmPayment={confirmSubscriptionPayment}
          />

          {/* Arquivo de Projetos */}
          <ProjectArchiver
            projects={projects}
            tools={allTools.map((t: any) => ({ id: t.id, name: t.name }))}
            theme={theme}
            onAdd={addProject}
            onDelete={deleteProject}
          />
        </div>

        {/* Main Content */}
        <main className={`flex-1 flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
          {/* Error Banner */}
          {error && (
            <div className={`px-6 py-3 border-b flex items-center justify-between ${theme === 'dark' ? 'bg-red-900/20 border-red-900/50' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2">
                <AlertCircle className={`w-5 h-5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                <span className={`text-sm ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>
                  {error}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={refreshTools}
                  className={`text-xs ${theme === 'dark' ? 'text-red-400 hover:text-red-300 hover:bg-red-900/30' : 'text-red-600 hover:text-red-700 hover:bg-red-100'}`}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Tentar novamente
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearError}
                  className={`text-xs ${theme === 'dark' ? 'text-slate-400 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Transfer Notification Banner */}
          {currentUser && (
            <TransferNotification theme={theme} />
          )}

          {/* Toolbar */}
          <div className={`flex items-center justify-between px-6 py-4 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-gray-200'}`}>
            <div className="flex items-center gap-4">
              <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {filters.category || 'Todas as Ferramentas'}
              </h2>
              <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                {tools.length} {tools.length === 1 ? 'ferramenta' : 'ferramentas'}
              </span>
            </div>

            {/* Botao Compartilhar Ferramentas - CENTRO DA TOOLBAR */}
            <div className="flex-1 flex justify-center">
              {currentUser && tools.length > 0 && (
                <Button
                  onClick={() => setIsShareModalOpen(true)}
                  variant="outline"
                  className={`${theme === 'dark' ? 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartilhar Ferramentas
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className={`flex items-center rounded-lg p-1 ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-100'}`}>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-gray-900 shadow-sm'
                      : theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-gray-900 shadow-sm'
                      : theme === 'dark' ? 'text-slate-500 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Add Tool Button */}
              {currentUser && (
                <Button
                  onClick={() => setShowAddTool(true)}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova ferramenta
                </Button>
              )}
            </div>
          </div>

          {/* Tools Grid/List */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <p className={`mt-4 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                  Carregando ferramentas...
                </p>
              </div>
            ) : tools.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-200'}`}>
                  <Sparkles className={`w-10 h-10 ${theme === 'dark' ? 'text-slate-600' : 'text-gray-400'}`} />
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Nenhuma ferramenta encontrada
                </h3>
                <p className={`max-w-md ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                  Tente ajustar seus filtros ou buscar por outro termo
                </p>
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className={`mt-4 ${theme === 'dark' ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                >
                  Limpar filtros
                </Button>
              </div>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
                  : 'space-y-4'
              }>
                {tools.map((tool: any) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    isLoggedIn={!!currentUser}
                    isAdmin={!!currentUser}
                    theme={theme}
                    categories={categories}
                    onToggleFavorite={toggleFavorite}
                    onSaveNotes={saveNotes}
                    onRate={saveRating}
                    onEdit={editTool}
                    onDelete={deleteTool}
                    onAccess={recordAccess}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add Tool Dialog */}
      <Dialog open={showAddTool} onOpenChange={(open) => { setShowAddTool(open); if (!open) setShowScrapeWarning(false); }}>
        <DialogContent className={`max-w-lg ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              Nova Ferramenta
            </DialogTitle>
            <DialogDescription className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
              Adicione uma nova ferramenta ao catalogo.
            </DialogDescription>
          </DialogHeader>
          
          {/* Auto Generate */}
          <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
            <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Puxar dados via URL</Label>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Cole o link da ferramenta..."
                value={autoGenUrl}
                onChange={(e) => setAutoGenUrl(e.target.value)}
                className={theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : ''}
              />
              <Button onClick={handleAutoGenerate} variant="outline">
                <Sparkles className="w-4 h-4 mr-2" />
                Puxar
              </Button>
            </div>
          </div>

          {/* Aviso sobre campos que devem ser personalizados */}
          {showScrapeWarning && (
            <div className={`p-3 rounded-lg border flex items-start gap-2.5 ${
              theme === 'dark'
                ? 'bg-amber-900/20 border-amber-700/50 text-amber-300'
                : 'bg-amber-50 border-amber-300 text-amber-700'
            }`}>
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold">Atencao</p>
                <p className="text-[11px] mt-0.5">
                  Ao selecionar a opcao de Puxar dados via URL os campos sao preenchidos automaticamente, porem, nos campos de <strong>Descricao</strong> e <strong>Categoria</strong> e recomendado alterar a descricao e selecionar a categoria desejada.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4 pt-2">
            <div>
              <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Nome *</Label>
              <Input
                value={newToolData.name}
                onChange={(e) => setNewToolData({ ...newToolData, name: e.target.value })}
                placeholder="Nome da ferramenta"
                className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''}
              />
            </div>
            <div>
              <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Descricao</Label>
              <Textarea
                value={newToolData.description}
                onChange={(e) => setNewToolData({ ...newToolData, description: e.target.value })}
                placeholder="Descricao da ferramenta"
                className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''}
              />
            </div>
            <div>
              <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>URL *</Label>
              <Input
                value={newToolData.url}
                onChange={(e) => setNewToolData({ ...newToolData, url: e.target.value })}
                placeholder="https://..."
                className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''}
              />
            </div>
            <div>
              <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Categoria *</Label>
              <Select
                value={newToolData.category}
                onValueChange={(value) => setNewToolData({ ...newToolData, category: value })}
              >
                <SelectTrigger className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''}>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className={theme === 'dark' ? 'bg-slate-900 border-slate-700' : ''}>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>URL da Imagem (opcional)</Label>
              <Input
                value={newToolData.image_url}
                onChange={(e) => setNewToolData({ ...newToolData, image_url: e.target.value })}
                placeholder="https://..."
                className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddTool(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAddTool} 
                className="bg-violet-600 hover:bg-violet-700 text-white"
                disabled={!newToolData.name || !newToolData.url || !newToolData.category}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar ferramenta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Categories Dialog */}
      <Dialog open={showManageCategories} onOpenChange={setShowManageCategories}>
        <DialogContent className={`max-w-lg ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              <Settings className="w-5 h-5" />
              Gerenciar Categorias
            </DialogTitle>
            <DialogDescription className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
              Adicione, edite ou remova categorias de ferramentas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Add New Category */}
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
              <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Nova Categoria</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Nome da nova categoria..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className={theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : ''}
                />
                <Button onClick={handleAddCategory} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Categories List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Categorias Existentes</Label>
              {categories.map((cat: any) => (
                <div 
                  key={cat.id} 
                  className={`flex items-center justify-between p-3 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-50'}`}
                >
                  {editingCategory === cat.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        className={`flex-1 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : ''}`}
                        autoFocus
                      />
                      <Button 
                        size="sm" 
                        onClick={handleEditCategorySave}
                        className="bg-violet-600 hover:bg-violet-700"
                      >
                        Salvar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => {
                          setEditingCategory(null);
                          setEditCategoryName('');
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {cat.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-500'}`}>
                          {categoryCounts[cat.id] || 0} ferramentas
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingCategory(cat.id);
                            setEditCategoryName(cat.name);
                          }}
                          className={theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCategoryToDelete(cat.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
        <AlertDialogContent className={theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}>
          <AlertDialogHeader>
            <AlertDialogTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              Confirmar exclusao
            </AlertDialogTitle>
            <AlertDialogDescription className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
              Tem certeza que deseja excluir esta categoria? As ferramentas associadas nao serao excluidas, mas ficarao sem categoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={theme === 'dark' ? 'bg-slate-800 text-white border-slate-700' : ''}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCategoryConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Set Budget Dialog */}
      <Dialog open={showSetBudget} onOpenChange={setShowSetBudget}>
        <DialogContent className={`max-w-sm ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              Definir Orcamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Limite Mensal (R$)</Label>
              <Input
                type="number"
                value={budgetForm.monthly}
                onChange={(e) => setBudgetForm({ ...budgetForm, monthly: e.target.value })}
                placeholder="Ex: 500"
                className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''}
              />
            </div>
            <div>
              <Label className={theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}>Limite Anual (R$)</Label>
              <Input
                type="number"
                value={budgetForm.yearly}
                onChange={(e) => setBudgetForm({ ...budgetForm, yearly: e.target.value })}
                placeholder="Ex: 5000"
                className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowSetBudget(false)}>Cancelar</Button>
              <Button 
                onClick={handleSetBudget}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Modal */}
      <ProfileModal
  open={showProfile}
  onClose={() => setShowProfile(false)}
  profile={profile as any}
  theme={theme}
  onUpdate={async () => ({ success: true })}
  onDeleteAccount={async () => ({ success: true })}
/>  

      {/* Admin Panel */}
      {isAdmin && (
        <AdminPanel
          open={showAdmin}
          onClose={() => setShowAdmin(false)}
        />
      )}

      <LoginModal
        open={isLoginOpen}
        onClose={() => { setIsLoginOpen(false); setLoginError(null); }}
      />

      {/* Share Tools Modal */}
      {currentUser && (
        <ShareToolsModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          theme={theme}
          tools={tools}
        />
      )}

      {/* Regis - Assistente de IA */}
      <RegisChat
        tools={allTools.map((t: any) => ({ id: t.id, name: t.name, description: t.description, category: t.category }))}
        theme={theme}
        userEmail={currentUser?.email}
      />

      {/* Rodape */}
      <Footer />
    </div>
  );
}
