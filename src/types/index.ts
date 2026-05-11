// ============================================================
// TYPES - registAI
// ============================================================

export interface Tool {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  image_url?: string;
  created_at?: string;
  is_premium?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface UserTool {
  id: string;
  user_id: string;
  tool_id: string;
  created_at?: string;
  tool?: Tool;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  theme?: 'light' | 'dark';
  is_admin?: boolean;
  is_blocked?: boolean;
  created_at?: string;
  updated_at?: string;
  notifications?: AppNotification[];
}

export interface ToolClick {
  id: string;
  user_id: string;
  tool_id: string;
  clicked_at?: string;
}

export interface TrendingAd {
  id: string;
  title: string;
  link: string;
  image_url?: string;
  source?: string;
  status?: string;
  expires_at?: string;
  created_at?: string;
  owner_email?: string;
}

export interface NewsItem {
  title: string;
  link: string;
  imageUrl: string;
  source?: string;
  pubDate?: string;
  adId?: string;
}

export interface ToolTransfer {
  id: string;
  from_user_id: string;
  to_user_email: string;
  tool_ids: string[];
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  from_user_email?: string;
}

export interface AppNotification {
  id: string;
  type: 'ad_report' | 'system' | 'alert';
  title: string;
  message: string;
  data: any;
  status: 'unread' | 'read';
  created_at: string;
  read_at?: string;
  user_email?: string;
}

export interface Budget {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  period: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  cost: number;
  currency: string;
  period: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  status: string;
  created_at?: string;
}
