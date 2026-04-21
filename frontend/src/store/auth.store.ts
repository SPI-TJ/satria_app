import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user:      User | null;
  token:     string | null;
  isLoading: boolean;
  setAuth:   (user: User, token: string) => void;
  logout:    () => void;
}

const storedUser  = localStorage.getItem('satria_user');
const storedToken = localStorage.getItem('satria_token');

export const useAuthStore = create<AuthState>((set) => ({
  user:      storedUser  ? JSON.parse(storedUser) as User : null,
  token:     storedToken ?? null,
  isLoading: false,

  setAuth: (user, token) => {
    localStorage.setItem('satria_user',  JSON.stringify(user));
    localStorage.setItem('satria_token', token);
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('satria_user');
    localStorage.removeItem('satria_token');
    set({ user: null, token: null });
  },
}));
