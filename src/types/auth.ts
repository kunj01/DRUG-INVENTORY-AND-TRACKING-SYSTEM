
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  organization?: string;
  phone?: string;
  address?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface OrderFeedback {
  id: string;
  orderId: string;
  userId: string;
  quality: number;
  time: number;
  service: number;
  comment: string;
  createdAt: string;
}
