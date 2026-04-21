import { useEffect, useRef } from 'react';
import { Bell, X, Check, Trash2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useNotificationStore } from '../../store/notification.store';
import { notificationsApi } from '../../services/api';
import { Notification, NotificationType } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import toast from 'react-hot-toast';

const TABS = ['All', 'Unread', 'Risk', 'Program', 'System'] as const;

const TYPE_ICON: Record<NotificationType, JSX.Element> = {
  Risk:    <AlertCircle  className="w-5 h-5 text-red-500"    />,
  Program: <CheckCircle2 className="w-5 h-5 text-green-500"  />,
  System:  <Info         className="w-5 h-5 text-yellow-500" />,
};

const TYPE_BG: Record<NotificationType, string> = {
  Risk:    'bg-red-50',
  Program: 'bg-green-50',
  System:  'bg-yellow-50',
};

export default function NotificationPanel() {
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    notifications, unreadCount, isPanelOpen, activeTab,
    markRead, markAllRead, removeItem, closePanel, setActiveTab,
  } = useNotificationStore();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel();
      }
    };
    if (isPanelOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isPanelOpen, closePanel]);

  if (!isPanelOpen) return null;

  const filtered = notifications.filter((n) => {
    if (activeTab === 'All')    return true;
    if (activeTab === 'Unread') return !n.is_read;
    return n.type === activeTab;
  });

  async function handleMarkRead(n: Notification) {
    if (n.is_read) return;
    markRead(n.id);
    await notificationsApi.markAsRead(n.id).catch(() => null);
  }

  async function handleMarkAll() {
    markAllRead();
    await notificationsApi.markAllRead().catch(() => null);
    toast.success('Semua notifikasi ditandai sudah dibaca');
  }

  async function handleDelete(id: string) {
    removeItem(id);
    await notificationsApi.delete(id).catch(() => null);
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-14 z-50 w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 rounded-xl">
            <Bell className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Notifications</p>
            <p className="text-xs text-slate-400">{unreadCount} unread notifications</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary-600 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            <Check className="w-3.5 h-3.5" /> Mark all as read
          </button>
          <button onClick={closePanel} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 px-4 py-3 border-b border-slate-50">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'bg-primary-500 text-white'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {tab}
            {tab === 'Unread' && unreadCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-[440px]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Bell className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Tidak ada notifikasi</p>
          </div>
        ) : (
          filtered.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkRead={() => handleMarkRead(n)}
              onDelete={() => handleDelete(n.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function NotificationItem({
  notification: n,
  onMarkRead,
  onDelete,
}: {
  notification: Notification;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`flex gap-3 px-4 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
        !n.is_read ? 'bg-blue-50/30' : ''
      }`}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${TYPE_BG[n.type]}`}>
        {TYPE_ICON[n.type]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-slate-800' : 'font-medium text-slate-700'}`}>
            {n.title}
          </p>
          {!n.is_read && (
            <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[11px] text-slate-400">
            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: localeId })}
          </span>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
            n.type === 'Risk'    ? 'bg-red-100 text-red-600' :
            n.type === 'Program' ? 'bg-green-100 text-green-600' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {n.type}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {!n.is_read && (
              <button
                onClick={onMarkRead}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-primary-600 transition-colors"
              >
                <Check className="w-3 h-3" /> Mark as read
              </button>
            )}
            <button onClick={onDelete} className="text-slate-300 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
