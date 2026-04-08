import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PageLoader, EmptyState } from '../components/ui/Spinner';
import { formatRelative } from '../lib/utils';
import api from '../lib/api';
import toast from 'react-hot-toast';

export const NotificationsPage: React.FC = () => {
  const qc = useQueryClient();

  const { data: notifs, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data.data),
  });

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Toutes les notifications marquées comme lues');
    } catch { toast.error('Erreur'); }
  };

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      qc.invalidateQueries({ queryKey: ['notifications'] });
    } catch { toast.error('Erreur'); }
  };

  const TYPE_EMOJI: Record<string, string> = {
    cert_expiring: '🏅',
    lot_blocked: '⏸️',
    quality_anomaly: '⚠️',
    shipment_delayed: '🚢',
    new_lot: '📦',
    system: 'ℹ️',
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Notifications" subtitle={`${(notifs ?? []).filter((n: any) => !n.isRead).length} non lue(s)`}>
      </Header>
      <div className="flex-1 p-6 space-y-4 animate-fade-in">
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={markAllRead} icon={<CheckCheck size={14} />}>Tout marquer lu</Button>
        </div>

        {isLoading ? <PageLoader /> : (notifs ?? []).length === 0 ? (
          <EmptyState title="Aucune notification" icon={<Bell size={40} />} />
        ) : (
          <Card className="p-0 overflow-hidden divide-y divide-white/[0.04]">
            {(notifs ?? []).map((notif: any) => (
              <div key={notif.id} className={`flex items-start gap-3 p-4 transition-colors ${!notif.isRead ? 'bg-forest-500/5' : 'hover:bg-white/[0.02]'}`}>
                <span className="text-xl flex-shrink-0">{TYPE_EMOJI[notif.type] ?? 'ℹ️'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${notif.isRead ? 'text-gray-400' : 'text-white'}`}>{notif.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                  <p className="text-xs text-gray-700 mt-1">{formatRelative(notif.createdAt)}</p>
                </div>
                {!notif.isRead && (
                  <button onClick={() => markRead(notif.id)} className="text-forest-400 hover:text-forest-300 p-1">
                    <Check size={14} />
                  </button>
                )}
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
};
