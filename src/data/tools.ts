import type { Tool, Category, User } from '@/types';

export const categories: Category[] = [
  {
    id: 'Chatbots',
    name: 'Chatbots',
    subcategories: [],
  },
  {
    id: 'Imagens',
    name: 'Imagens',
    subcategories: [],
  },
  {
    id: 'Vídeos',
    name: 'Vídeos',
    subcategories: [],
  },
  {
    id: 'Apresentações',
    name: 'Apresentações',
    subcategories: [],
  },
  {
    id: 'Áudio',
    name: 'Áudio',
    subcategories: [],
  },
  {
    id: 'Produtividade',
    name: 'Produtividade',
    subcategories: [],
  },
  {
    id: 'Desenvolvimento',
    name: 'Desenvolvimento',
    subcategories: [],
  },
  {
    id: 'PDF',
    name: 'PDF',
    subcategories: [],
  },
];

export const initialTools: Tool[] = [];

export const initialUsers: User[] = [
  {
    id: '1',
    name: 'Administrador',
    email: 'admin@aitools.com',
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    createdAt: new Date(),
  },
  {
    id: '2',
    name: 'Usuário',
    email: 'user@aitools.com',
    role: 'user',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
    createdAt: new Date(),
  },
];
