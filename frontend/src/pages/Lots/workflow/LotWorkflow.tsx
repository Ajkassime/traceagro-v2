import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import { Spinner } from '../../../components/ui/Spinner';
import { ReceptionSection } from './ReceptionSection';
import { ClassificationSection } from './ClassificationSection';

export const LotWorkflow: React.FC<{ lotId: string }> = ({ lotId }) => {
  const { data: reception, isLoading: loadingReception } = useQuery({
    queryKey: ['lot-reception', lotId],
    queryFn: () => api.get(`/lots/${lotId}/reception`).then(r => r.data.data),
  });

  const { data: workflow, isLoading: loadingWorkflow } = useQuery({
    queryKey: ['lot-workflow', lotId],
    queryFn: () => api.get(`/lots/${lotId}/workflow`).then(r => r.data.data),
  });

  if (loadingReception || loadingWorkflow) {
    return <Spinner />;
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <ReceptionSection lotId={lotId} data={reception} />
      <ClassificationSection lotId={lotId} phases={workflow ?? []} />
    </div>
  );
};
