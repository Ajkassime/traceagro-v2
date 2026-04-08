import { z } from 'zod';

export const createLotSchema = z.object({
  producerId: z.string().uuid('ID producteur invalide'),
  productId: z.string().uuid('ID produit invalide'),
  harvestDate: z.string().datetime('Date invalide'),
  quantityKg: z.number().positive('Quantité doit être positive'),
  notes: z.string().optional(),
  harvestLatitude: z.number().optional(),
  harvestLongitude: z.number().optional(),
  conditioningType: z.enum(['vanille_noire', 'vanille_rouge']).optional(),
});

export const updateLotSchema = z.object({
  status: z.enum(['harvest', 'processing', 'processed', 'transit', 'exported', 'rejected']).optional(),
  quantityKg: z.number().positive().optional(),
  qualityScore: z.number().min(0).max(10).optional(),
  notes: z.string().optional(),
  regenerateQr: z.boolean().optional(),
  conditioningType: z.enum(['vanille_noire', 'vanille_rouge']).nullable().optional(),
});

export const addStepSchema = z.object({
  stepName: z.string().min(1, 'Nom de l\'étape requis'),
  stepOrder: z.number().int().positive(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  operatorName: z.string().optional(),
  location: z.string().optional(),
  inputQuantity: z.number().positive().optional(),
  outputQuantity: z.number().positive().optional(),
  qualityScore: z.number().min(0).max(10).optional(),
  notes: z.string().optional(),
});

export type CreateLotInput = z.infer<typeof createLotSchema>;
export type UpdateLotInput = z.infer<typeof updateLotSchema>;
export type AddStepInput = z.infer<typeof addStepSchema>;
