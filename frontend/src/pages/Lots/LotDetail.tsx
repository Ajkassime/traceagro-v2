import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Scale, Calendar, Plus, QrCode, FileText, BarChart2 } from 'lucide-react';
import { QRCodeManager } from '../../components/qr/QRCodeManager';
import { ScanAnalyticsDashboard } from '../../components/qr/ScanAnalyticsDashboard';
import { AntifraudPanel } from '../../components/qr/AntifraudPanel';
import { Shield } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Card, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, ScoreBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/Spinner';
import { LOT_STATUS_CONFIG, formatDate, formatKg } from '../../lib/utils';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export const LotDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [stepModal, setStepModal] = useState(false);
  const [step, setStep] = useState({ stepName: '', stepOrder: 1, startedAt: '', operatorName: '', location: '', inputQuantity: '', outputQuantity: '', qualityScore: '', notes: '' });

  const { data: lot, isLoading } = useQuery({
    queryKey: ['lot', id],
    queryFn: () => api.get(`/lots/${id}`).then((r) => r.data.data),
  });

  const addStep = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/lots/${id}/steps`, {
        ...step,
        stepOrder: parseInt(step.stepOrder as any),
        startedAt: new Date(step.startedAt).toISOString(),
        inputQuantity: step.inputQuantity ? parseFloat(step.inputQuantity) : undefined,
        outputQuantity: step.outputQuantity ? parseFloat(step.outputQuantity) : undefined,
        qualityScore: step.qualityScore ? parseFloat(step.qualityScore) : undefined,
      });
      toast.success('Étape ajoutée');
      setStepModal(false);
      qc.invalidateQueries({ queryKey: ['lot', id] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  if (isLoading || !lot) return <PageLoader />;

  return (
    <div className="flex flex-col min-h-full">
      <Header>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/lots')} icon={<ArrowLeft size={16} />}>Retour</Button>
          <div>
            <h1 className="font-mono text-lg font-bold text-forest-400">{lot.lotNumber}</h1>
            <p className="text-xs text-gray-500">{lot.product?.name} · {lot.producer?.name}</p>
          </div>
          <StatusBadge config={LOT_STATUS_CONFIG[lot.status]} />
        </div>
      </Header>

      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in">
        {/* Info principale */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader title="Informations du lot" />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Scale size={16} className="text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Quantité récoltée</p>
                  <p className="font-medium text-white">{formatKg(lot.quantityKg)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Date de récolte</p>
                  <p className="font-medium text-white">{formatDate(lot.harvestDate)}</p>
                </div>
              </div>
              {(lot.harvestLatitude && lot.harvestLongitude) && (
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Position GPS</p>
                    <p className="font-mono text-xs text-white">{lot.harvestLatitude.toFixed(4)}, {lot.harvestLongitude.toFixed(4)}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Score qualité</p>
                <ScoreBadge score={lot.qualityScore} />
              </div>
            </div>
            {lot.notes && <p className="mt-3 text-sm text-gray-400 bg-white/5 rounded-lg p-3">{lot.notes}</p>}
          </Card>

          {/* Timeline étapes */}
          <Card>
            <CardHeader
              title="Étapes de transformation"
              subtitle={`${lot.processingSteps?.length ?? 0} étapes`}
              action={<Button size="sm" onClick={() => setStepModal(true)} icon={<Plus size={14} />}>Ajouter</Button>}
            />
            {(lot.processingSteps ?? []).length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">Aucune étape enregistrée</p>
            ) : (
              <div className="space-y-3">
                {lot.processingSteps.map((step: any, i: number) => (
                  <div key={step.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-forest-600/20 border border-forest-600/40 flex items-center justify-center text-xs font-bold text-forest-400">{step.stepOrder}</div>
                      {i < lot.processingSteps.length - 1 && <div className="w-0.5 h-full bg-white/10 mt-1" />}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-white text-sm">{step.stepName}</p>
                        {step.qualityScore && <ScoreBadge score={step.qualityScore} />}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        {step.operatorName && <span>👤 {step.operatorName}</span>}
                        {step.location && <span>📍 {step.location}</span>}
                        <span>📅 {formatDate(step.startedAt)}</span>
                        {step.inputQuantity && <span>⬇️ {step.inputQuantity} kg</span>}
                        {step.outputQuantity && <span>⬆️ {step.outputQuantity} kg</span>}
                      </div>
                      {step.notes && <p className="text-xs text-gray-600 mt-1">{step.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar droite */}
        <div className="space-y-4">
          {/* Producteur */}
          <Card>
            <CardHeader title="Producteur" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-white">{lot.producer?.name}</p>
              <p className="text-gray-500">📍 {lot.producer?.region}, {lot.producer?.country}</p>
              <Button variant="secondary" size="sm" className="w-full justify-center mt-2" onClick={() => navigate(`/producers/${lot.producerId}`)}>
                Voir le profil
              </Button>
            </div>
          </Card>

          {/* QR Code Manager */}
          <Card>
            <CardHeader title="QR Code" subtitle="Passeport numérique" icon={<QrCode size={15} />} />
            <QRCodeManager
              lotId={lot.id}
              lotNumber={lot.lotNumber}
              qrCodeUrl={lot.qrCodeUrl}
            />
          </Card>

          {/* Analytics de scan */}
          <Card>
            <CardHeader title="Analytics" subtitle="Statistiques de scan" icon={<BarChart2 size={15} />} />
            <ScanAnalyticsDashboard lotId={lot.id} />
          </Card>

          {/* Anti-Contrefaçon */}
          <Card>
            <CardHeader title="Anti-Contrefaçon" subtitle="Innovation #5 — Surveillance active" icon={<Shield size={15} />} />
            <AntifraudPanel lotId={lot.id} />
          </Card>

          {/* Expéditions */}
          {lot.shipmentLots?.length > 0 && (
            <Card>
              <CardHeader title="Expéditions" />
              {lot.shipmentLots.map((sl: any) => (
                <div key={sl.shipment.id} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs text-blue-400">{sl.shipment.reference}</span>
                  <span className="text-gray-500">{sl.shipment.status}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      {/* Add Step Modal */}
      <Modal open={stepModal} onClose={() => setStepModal(false)} title="Ajouter une étape" size="md">
        <form onSubmit={addStep} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Nom de l'étape *</label>
              <input className="input" placeholder="ex: Blanchiment" value={step.stepName} onChange={(e) => setStep((s) => ({ ...s, stepName: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Ordre</label>
              <input type="number" className="input" value={step.stepOrder} onChange={(e) => setStep((s) => ({ ...s, stepOrder: parseInt(e.target.value) }))} required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Date de début *</label>
            <input type="datetime-local" className="input" value={step.startedAt} onChange={(e) => setStep((s) => ({ ...s, startedAt: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Opérateur</label>
              <input className="input" placeholder="Nom" value={step.operatorName} onChange={(e) => setStep((s) => ({ ...s, operatorName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Lieu</label>
              <input className="input" placeholder="Lieu" value={step.location} onChange={(e) => setStep((s) => ({ ...s, location: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Qté entrée (kg)</label>
              <input type="number" step="0.1" className="input" value={step.inputQuantity} onChange={(e) => setStep((s) => ({ ...s, inputQuantity: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Qté sortie (kg)</label>
              <input type="number" step="0.1" className="input" value={step.outputQuantity} onChange={(e) => setStep((s) => ({ ...s, outputQuantity: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Score qualité</label>
              <input type="number" step="0.1" min="0" max="10" className="input" placeholder="0-10" value={step.qualityScore} onChange={(e) => setStep((s) => ({ ...s, qualityScore: e.target.value }))} />
            </div>
          </div>
          <textarea className="input h-16 resize-none" placeholder="Notes..." value={step.notes} onChange={(e) => setStep((s) => ({ ...s, notes: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setStepModal(false)}>Annuler</Button>
            <Button type="submit">Ajouter l'étape</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
