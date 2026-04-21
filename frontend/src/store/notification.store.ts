import { create } from 'zustand';
import { Notification } from '../types';

interface NotificationState {
  notifications:  Notification[];
  unreadCount:    number;
  isPanelOpen:    boolean;
  activeTab:      'All' | 'Unread' | 'Risk' | 'Program' | 'System';
  setNotifications: (items: Notification[], unread: number) => void;
  markRead:         (id: string) => void;
  markAllRead:      () => void;
  removeItem:       (id: string) => void;
  togglePanel:      () => void;
  closePanel:       () => void;
  setActiveTab:     (tab: NotificationState['activeTab']) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications:  [],
  unreadCount:    0,
  isPanelOpen:    false,
  activeTab:      'All',

  setNotifications: (items, unread) => set({ notifications: items, unreadCount: unread }),

  markRead: (id) => set((s) => ({
    notifications: s.notifications.map((n) => n.id === id ? { ...n, is_read: true } : n),
    unreadCount:   Math.max(0, s.unreadCount - (s.notifications.find(n => n.id === id)?.is_read ? 0 : 1)),
  })),

  markAllRead: () => set((s) => ({
    notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
    unreadCount:   0,
  })),

  removeItem: (id) => set((s) => ({
    notifications: s.notifications.filter((n) => n.id !== id),
    unreadCount:   Math.max(0, s.unreadCount - (s.notifications.find(n => n.id === id && !n.is_read) ? 1 : 0)),
  })),

  togglePanel:  () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),
  closePanel:   () => set({ isPanelOpen: false }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
