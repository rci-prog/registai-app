import { Search, X, Heart, FolderOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SidebarFiltersProps {
  categories: any[];
  selectedCategory: string;
  selectedSubcategory: string;
  searchQuery: string;
  favoritesOnly: boolean;
  onCategorySelect: (cat: string) => void;
  onSubcategorySelect: (sub: string) => void;
  onSearchChange: (q: string) => void;
  onFavoritesOnlyChange: (v: boolean) => void;
  onClearFilters: () => void;
  totalTools: number;
  filteredCount: number;
  categoryCounts: Record<string, number>;
  onManageCategories: () => void;
}

export function SidebarFilters({
  categories, selectedCategory, searchQuery, favoritesOnly,
  onCategorySelect, onSearchChange, onFavoritesOnlyChange, onClearFilters,
  categoryCounts, onManageCategories,
}: SidebarFiltersProps) {
  return (
    <div className="w-64 min-h-screen border-r border-slate-800 bg-slate-950 p-4 space-y-4">
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Buscar</h3>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar ferramentas..." className="pl-8 bg-slate-900 border-slate-700 text-white text-sm" />
        </div>
      </div>

      <div className="space-y-2">
        <button onClick={() => onFavoritesOnlyChange(!favoritesOnly)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${favoritesOnly ? 'bg-violet-600/20 text-violet-400' : 'text-slate-400 hover:bg-slate-900'}`}>
          <Heart className={`w-4 h-4 ${favoritesOnly ? 'fill-current' : ''}`} />
          Favoritos
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Categorias</h3>
          <button onClick={onManageCategories} className="text-[10px] text-violet-400 hover:text-violet-300">Gerenciar</button>
        </div>
        <button onClick={() => onCategorySelect('')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${!selectedCategory ? 'bg-violet-600/20 text-violet-400' : 'text-slate-400 hover:bg-slate-900'}`}>
          <FolderOpen className="w-4 h-4" />
          Todas
          <span className="ml-auto text-xs text-slate-600">{Object.values(categoryCounts).reduce((a: any, b: any) => a + b, 0)}</span>
        </button>
        {categories.map((cat: any) => (
          <button key={cat.id} onClick={() => onCategorySelect(cat.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === cat.id ? 'bg-violet-600/20 text-violet-400' : 'text-slate-400 hover:bg-slate-900'}`}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || '#8b5cf6' }} />
            {cat.name}
            <span className="ml-auto text-xs text-slate-600">{categoryCounts[cat.id] || 0}</span>
          </button>
        ))}
      </div>

      {(selectedCategory || searchQuery || favoritesOnly) && (
        <button onClick={onClearFilters} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-900 transition-colors">
          <X className="w-4 h-4" /> Limpar filtros
        </button>
      )}
    </div>
  );
}
