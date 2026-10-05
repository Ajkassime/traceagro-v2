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
          <Card className="p-0 overflow-hidden divide-y divide-[#D8CEC4]/60">
            {(notifs ?? []).map((notif: any) => (
              <div key={notif.id} className={`flex items-start gap-3.5 p-4 transition-colors ${!notif.isRead ? 'bg-[#EAE2EB]/40 font-medium' : 'hover:bg-[#F5F0E7]/60'}`}>
                <span className="text-xl flex-shrink-0">{TYPE_EMOJI[notif.type] ?? 'ℹ️'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${notif.isRead ? 'text-[#70656B]' : 'text-[#352638] font-semibold'}`}>{notif.title}</p>
                  <p className="text-xs text-[#70656B] mt-0.5 leading-relaxed">{notif.message}</p>
                  <p className="text-[11px] text-[#96878E] mt-1">{formatRelative(notif.createdAt)}</p>
                </div>
                {!notif.isRead && (
                  <button
                    onClick={() => markRead(notif.id)}
                    className="text-[#435432] hover:bg-[#E5ECD9] p-1.5 rounded-[4px] transition-colors"
                    title="Marquer comme lu"
                  >
                    <Check size={16} />
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
