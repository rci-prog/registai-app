export interface Tool {
  id: string;
  name: string;
  url: string;
  description: string;
  category: string;
  subcategory: string;
  image: string;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string;
  createdAt: Date;
}

export interface FilterState {
  category: string | null;
  subcategory: string | null;
  search: string;
  favoritesOnly: boolean;
}
