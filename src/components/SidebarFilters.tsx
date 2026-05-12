import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Search,
  X,
  MessageSquare,
  Image,
  Video,
  Presentation,
  Music,
  Briefcase,
  Code,
  FileText,
  Heart,
  Filter,
  FolderOpen,
  Settings
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarFiltersProps {
  categories: any[];
  selectedCategory: string | null;
  selectedSubcategory: string | null;
  searchQuery: string;
  favoritesOnly: boolean;
  onCategorySelect: (category: string | null) => void;
  onSubcategorySelect: (subcategory: string | null) => void;
  onSearchChange: (query: string) => void;
  onFavoritesOnlyChange: (value: boolean) => void;
  onClearFilters: () => void;
  totalTools: number;
  filteredCount: number;
  categoryCounts: Record<string, number>;
  onManageCategories?: () => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'Chatbots': <MessageSquare className="w-4 h-4" />,
  'Imagens': <Image className="w-4 h-4" />,
  'Vídeos': <Video className="w-4 h-4" />,
  'Apresentações': <Presentation className="w-4 h-4" />,
  'Áudio': <Music className="w-4 h-4" />,
  'Produtividade': <Briefcase className="w-4 h-4" />,
  'Desenvolvimento': <Code className="w-4 h-4" />,
  'PDF': <FileText className="w-4 h-4" />,
};

export function SidebarFilters({
  categories,
  selectedCategory,
  searchQuery,
  favoritesOnly,
  onCategorySelect,
  onSearchChange,
  onFavoritesOnlyChange,
  onClearFilters,
  totalTools,
  filteredCount,
  categoryCounts,
  onManageCategories,
}: SidebarFiltersProps) {
  const { theme } = useAuth();
  const isDark = theme === 'dark';

  // ============================================================
  // HANDLERS COM LOG — para debugar se o clique está funcionando
  // ============================================================
  const handleCategoryClick = (categoryId: string) => {
    console.log('[SidebarFilters] Clicou na categoria:', categoryId, '| Categoria atual:', selectedCategory);
    if (selectedCategory === categoryId) {
      console.log('[SidebarFilters] → Desselecionando categoria');
      onCategorySelect(null);
    } else {
      console.log('[SidebarFilters] → Selecionando categoria:', categoryId);
      onCategorySelect(categoryId);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('[SidebarFilters] Busca digitada:', value);
    onSearchChange(value);
  };

  const handleFavoriteToggle = (checked: boolean) => {
    console.log('[SidebarFilters] Favoritos toggled:', checked);
    onFavoritesOnlyChange(checked);
  };

  const handleClearFilters = () => {
    console.log('[SidebarFilters] Limpando filtros');
    onClearFilters();
  };

  const handleManageCategories = () => {
    console.log('[SidebarFilters] Abrir gerenciamento de categorias');
    onManageCategories?.();
  };

  const hasActiveFilters = selectedCategory || searchQuery || favoritesOnly;

  return (
    <div className={`w-80 border-r flex flex-col h-full ${isDark ? 'bg-[#0b1120] border-slate-800' : 'bg-gray-50 border-gray-200'}`}>
      {/* Header — Ícone funil roxo, título Filtros, contador */}
      <div className={`p-5 border-b ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-600/20">
            <Filter className="w-4 h-4 text-white" />
          </div>
          <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Filtros
          </h2>
        </div>
        <p className={`text-xs ml-12 mb-4 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
          {filteredCount} de {totalTools} ferramentas
        </p>

        {/* Search */}
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
          <Input
            placeholder="Buscar ferramentas..."
            value={searchQuery}
            onChange={handleSearchChange}
            className={`pl-10 h-10 text-sm ${isDark ? 'bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'}`}
          />
          {searchQuery && (
            <button
              onClick={() => { console.log('[SidebarFilters] Limpando busca'); onSearchChange(''); }}
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Favorites Toggle */}
        <div className="flex items-center justify-between mt-4 px-1">
          <div className="flex items-center gap-2.5">
            <Heart className={`w-4 h-4 ${favoritesOnly ? 'text-red-400 fill-red-400' : isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <Label htmlFor="favorites" className={`text-sm cursor-pointer font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              Apenas favoritos
            </Label>
          </div>
          <Switch
            id="favorites"
            checked={favoritesOnly}
             onCheckedChange={handleFavoriteToggle}
            className="data-[state=checked]:bg-violet-600"
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className={`w-full mt-3 text-xs ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            <X className="w-3.5 h-3.5 mr-2" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Categories — scroll nativo CSS */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          {/* All Categories */}
          <button
            onClick={() => {
              console.log('[SidebarFilters] Clicou em: Todas as categorias');
              onCategorySelect(null);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
              !selectedCategory
                ? 'bg-violet-600/15 text-violet-400 border border-violet-500/25'
                : `${isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
            }`}
          >
            <FolderOpen className={`w-4 h-4 flex-shrink-0 ${!selectedCategory ? 'text-violet-400' : isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            <span className="flex-1 text-sm font-medium">Todas as categorias</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              !selectedCategory ? 'bg-violet-600/20 text-violet-400' : isDark ? 'text-slate-600 bg-slate-800' : 'text-gray-500 bg-gray-100'
            }`}>
              {totalTools}
            </span>
          </button>

          <div className={`my-2 h-px ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`} />

          {/* Category List */}
          <div className="space-y-0.5">
            {categories?.map((category) => {
            if (!category || !category.id) return null;
              const isSelected = selectedCategory === category.id;
              const count = categoryCounts[category.id] || 0;

              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                    isSelected
                      ? 'bg-violet-600/15 text-violet-400 border border-violet-500/25'
                      : `${isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
                  }`}
                >
                  <div className={`flex-shrink-0 ${isSelected ? 'text-violet-400' : isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    {categoryIcons[category.id] || <FolderOpen className="w-4 h-4" />}
                  </div>
                  <span className="flex-1 text-sm font-medium">{category.name}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-violet-600/20 text-violet-400' : isDark ? 'text-slate-600 bg-slate-800' : 'text-gray-500 bg-gray-100'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer — Gerenciar categorias */}
      <div className={`p-3 border-t ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
        <button
          onClick={handleManageCategories}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all text-left ${
            isDark ? 'text-slate-400 hover:bg-slate-800/60 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <Settings className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
          <span className="text-sm font-medium">Gerenciar categorias</span>
        </button>
      </div>
    </div>
  );
}
