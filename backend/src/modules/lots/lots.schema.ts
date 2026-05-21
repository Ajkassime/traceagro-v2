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

export const upsertReceptionSchema = z.object({
  quantite:     z.number().positive().optional(),
  origine:      z.string().optional(),
  ristourne:    z.number().min(0).optional(),
  poids:        z.number().positive().optional(),
  contrePesage: z.boolean().optional(),
  emplacement:  z.string().optional(),
  nbSousVide:   z.number().int().min(0).optional(),
  odeur:        z.string().optional(),
  etatFondu:    z.boolean().optional(),
  moisissure:   z.boolean().optional(),
  validatedAt:  z.string().datetime().nullable().optional(),
});

export const upsertPhaseSchema = z.object({
  nomResponsable:  z.string().optional(),
  poids:           z.number().positive().optional(),
  isValidated:     z.boolean().optional(),
  qualiteOk:       z.boolean().nullable().optional(),
  isNouvelEmploye: z.boolean().optional(),
  autres:          z.string().optional(),
  nbSachets:       z.number().int().min(0).optional(),
});

export const addTeamMemberSchema = z.object({
  nom:          z.string().min(1, 'Nom requis'),
  quotas:       z.number().min(0).optional(),
  activite:     z.string().optional(),
  quantiteFini: z.number().min(0).optional(),
  observation:  z.string().optional(),
});

export const updateTeamMemberSchema = z.object({
  nom:          z.string().min(1).optional(),
  quotas:       z.number().min(0).optional(),
  activite:     z.string().optional(),
  quantiteFini: z.number().min(0).optional(),
  observation:  z.string().optional(),
});

export const upsertStockEntrySchema = z.object({
  specification:    z.string().optional(),
  fondusPoids:      z.number().min(0).optional(),
  fondusNbSousVide: z.number().int().min(0).optional(),
  tk:               z.number().min(0).optional(),
  moisi:            z.number().min(0).optional(),
  cuts:             z.number().min(0).optional(),
  poquee:           z.number().min(0).optional(),
  noirGourmet:      z.number().min(0).optional(),
  noirTk:           z.number().min(0).optional(),
  rougeUs:          z.number().min(0).optional(),
  rougeEurope:      z.number().min(0).optional(),
  validatedAt:      z.string().datetime().nullable().optional(),
});

export type UpsertReceptionInput  = z.infer<typeof upsertReceptionSchema>;
export type UpsertPhaseInput      = z.infer<typeof upsertPhaseSchema>;
export type AddTeamMemberInput    = z.infer<typeof addTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;
export type UpsertStockEntryInput = z.infer<typeof upsertStockEntrySchema>;
