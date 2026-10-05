# Lot Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete lot reception workflow tracking system (Réception → Classification → Entrée Stock) to the Lot detail page with persistent storage in PostgreSQL.

**Architecture:** 4 new Prisma models, 9 new REST endpoints added to the existing lots module, and 6 new React components in a tabbed `LotDetail` page.

**Spec:** `docs/superpowers/specs/2026-05-21-lot-workflow-design.md`

**Tech Stack:** Prisma + PostgreSQL, Express + Zod, React + React Query + Tailwind CSS

---

## File Map

**Backend — modified:**
- `backend/src/prisma/schema.prisma` — 4 new models + Lot relations
- `backend/src/modules/lots/lots.schema.ts` — 5 new Zod schemas
- `backend/src/modules/lots/lots.service.ts` — 9 new service methods + 1 private helper
- `backend/src/modules/lots/lots.controller.ts` — 9 new controller handlers
- `backend/src/modules/lots/lots.routes.ts` — 9 new routes

**Frontend — modified:**
- `frontend/src/pages/Lots/LotDetail.tsx` — add 3-tab system

**Frontend — created:**
- `frontend/src/pages/Lots/workflow/LotWorkflow.tsx`
- `frontend/src/pages/Lots/workflow/ReceptionSection.tsx`
- `frontend/src/pages/Lots/workflow/ClassificationSection.tsx`
- `frontend/src/pages/Lots/workflow/PhaseAccordion.tsx`
- `frontend/src/pages/Lots/workflow/TeamTable.tsx`
- `frontend/src/pages/Lots/workflow/LotStockEntry.tsx`

---

## Task 1: Prisma Schema — 4 new models

**Files:**
- Modify: `backend/src/prisma/schema.prisma`

- [ ] **Step 1: Add relations to the Lot model**

In `schema.prisma`, find the Lot model (around line 180) and add 3 new relation fields before the closing `@@map("lots")`:

```prisma
  reception      LotReception?
  workflowPhases LotWorkflowPhase[]
  stockEntry     LotStockEntry?
```

- [ ] **Step 2: Add the 4 new models at the end of schema.prisma**

Append after the last model (`ScanLog` or `ConditioningStep`):

```prisma
// ─── LOT RECEPTION ────────────────────────────────────────────────────────────
model LotReception {
  id           String    @id @default(uuid())
  lotId        String    @unique @map("lot_id")
  quantite     Float?
  origine      String?
  ristourne    Float?
  poids        Float?
  contrePesage Boolean   @default(false) @map("contre_pesage")
  emplacement  String?
  nbSousVide   Int?      @map("nb_sous_vide")
  odeur        String?
  etatFondu    Boolean?  @map("etat_fondu")
  moisissure   Boolean?  @map("moisissure")
  validatedAt  DateTime? @map("validated_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  lot Lot @relation(fields: [lotId], references: [id], onDelete: Cascade)

  @@map("lot_receptions")
}

// ─── LOT WORKFLOW PHASE ───────────────────────────────────────────────────────
model LotWorkflowPhase {
  id              String   @id @default(uuid())
  lotId           String   @map("lot_id")
  vanillaType     String   @map("vanilla_type")
  phaseType       String   @map("phase_type")
  phaseIndex      Int      @default(1) @map("phase_index")
  nomResponsable  String?  @map("nom_responsable")
  poids           Float?
  isValidated     Boolean  @default(false) @map("is_validated")
  qualiteOk       Boolean? @map("qualite_ok")
  isNouvelEmploye Boolean  @default(false) @map("is_nouvel_employe")
  autres          String?
  nbSachets       Int?     @map("nb_sachets")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  lot         Lot             @relation(fields: [lotId], references: [id], onDelete: Cascade)
  teamMembers LotTeamMember[]

  @@unique([lotId, vanillaType, phaseType, phaseIndex])
  @@map("lot_workflow_phases")
}

// ─── LOT TEAM MEMBER ──────────────────────────────────────────────────────────
model LotTeamMember {
  id           String   @id @default(uuid())
  phaseId      String   @map("phase_id")
  nom          String
  quotas       Float?
  activite     String?
  quantiteFini Float?   @map("quantite_fini")
  observation  String?
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  phase LotWorkflowPhase @relation(fields: [phaseId], references: [id], onDelete: Cascade)

  @@map("lot_team_members")
}

// ─── LOT STOCK ENTRY ──────────────────────────────────────────────────────────
model LotStockEntry {
  id               String    @id @default(uuid())
  lotId            String    @unique @map("lot_id")
  specification    String?
  fondusPoids      Float?    @map("fondus_poids")
  fondusNbSousVide Int?      @map("fondus_nb_sous_vide")
  tk               Float?
  moisi            Float?
  cuts             Float?
  poquee           Float?
  noirGourmet      Float?    @map("noir_gourmet")
  noirTk           Float?    @map("noir_tk")
  rougeUs          Float?    @map("rouge_us")
  rougeEurope      Float?    @map("rouge_europe")
  validatedAt      DateTime? @map("validated_at")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  lot Lot @relation(fields: [lotId], references: [id], onDelete: Cascade)

  @@map("lot_stock_entries")
}
```

- [ ] **Step 3: Run Prisma migration**

```bash
cd backend && npx prisma migrate dev --name add_lot_workflow
```

Expected output: `✔ Generated Prisma Client` and migration applied successfully.

- [ ] **Step 4: Commit**

```bash
git add backend/src/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: add lot workflow prisma models (reception, phases, team, stock)"
```

---

## Task 2: Backend Zod Schemas

**Files:**
- Modify: `backend/src/modules/lots/lots.schema.ts`

- [ ] **Step 1: Append 5 new schemas to the end of lots.schema.ts**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/lots/lots.schema.ts
git commit -m "feat: add lot workflow zod schemas"
```

---

## Task 3: Backend Service — 9 new methods

**Files:**
- Modify: `backend/src/modules/lots/lots.service.ts`

- [ ] **Step 1: Add the import for new types at top of lots.service.ts**

After the existing imports, ensure the new schema types are imported:

```typescript
import type {
  UpsertReceptionInput,
  UpsertPhaseInput,
  AddTeamMemberInput,
  UpdateTeamMemberInput,
  UpsertStockEntryInput,
} from './lots.schema';
```

- [ ] **Step 2: Add private helper + 9 new methods inside the LotsService class**

Add these methods at the end of the `LotsService` class, before the closing `}`:

```typescript
  private async findLotOrThrow(id: string) {
    const lot = await prisma.lot.findUnique({ where: { id }, select: { id: true } });
    if (!lot) throw { statusCode: 404, message: 'Lot introuvable' };
    return lot;
  }

  // ─── RÉCEPTION ───────────────────────────────────────────────────────────────
  async getReception(lotId: string) {
    await this.findLotOrThrow(lotId);
    return prisma.lotReception.findUnique({ where: { lotId } });
  }

  async upsertReception(lotId: string, data: UpsertReceptionInput) {
    await this.findLotOrThrow(lotId);
    return prisma.lotReception.upsert({
      where:  { lotId },
      update: data,
      create: { lotId, ...data },
    });
  }

  // ─── WORKFLOW PHASES ─────────────────────────────────────────────────────────
  async getWorkflow(lotId: string) {
    await this.findLotOrThrow(lotId);
    return prisma.lotWorkflowPhase.findMany({
      where:   { lotId },
      include: { teamMembers: { orderBy: { createdAt: 'asc' } } },
      orderBy: [{ vanillaType: 'asc' }, { phaseType: 'asc' }, { phaseIndex: 'asc' }],
    });
  }

  async upsertPhase(
    lotId: string,
    vanillaType: string,
    phaseType: string,
    phaseIndex: number,
    data: UpsertPhaseInput,
  ) {
    await this.findLotOrThrow(lotId);
    return prisma.lotWorkflowPhase.upsert({
      where: {
        lotId_vanillaType_phaseType_phaseIndex: { lotId, vanillaType, phaseType, phaseIndex },
      },
      update: data,
      create: { lotId, vanillaType, phaseType, phaseIndex, ...data },
      include: { teamMembers: { orderBy: { createdAt: 'asc' } } },
    });
  }

  // ─── ÉQUIPE ──────────────────────────────────────────────────────────────────
  async addTeamMember(phaseId: string, data: AddTeamMemberInput) {
    const phase = await prisma.lotWorkflowPhase.findUnique({ where: { id: phaseId } });
    if (!phase) throw { statusCode: 404, message: 'Phase introuvable' };
    if (phase.isValidated) throw { statusCode: 403, message: 'Phase verrouillée — modification impossible' };
    return prisma.lotTeamMember.create({ data: { phaseId, ...data } });
  }

  async updateTeamMember(memberId: string, data: UpdateTeamMemberInput) {
    const member = await prisma.lotTeamMember.findUnique({
      where:   { id: memberId },
      include: { phase: { select: { isValidated: true } } },
    });
    if (!member) throw { statusCode: 404, message: 'Membre introuvable' };
    if (member.phase.isValidated) throw { statusCode: 403, message: 'Phase verrouillée — modification impossible' };
    return prisma.lotTeamMember.update({ where: { id: memberId }, data });
  }

  async deleteTeamMember(memberId: string) {
    const member = await prisma.lotTeamMember.findUnique({
      where:   { id: memberId },
      include: { phase: { select: { isValidated: true } } },
    });
    if (!member) throw { statusCode: 404, message: 'Membre introuvable' };
    if (member.phase.isValidated) throw { statusCode: 403, message: 'Phase verrouillée — modification impossible' };
    await prisma.lotTeamMember.delete({ where: { id: memberId } });
  }

  // ─── ENTRÉE STOCK ────────────────────────────────────────────────────────────
  async getStockEntry(lotId: string) {
    await this.findLotOrThrow(lotId);
    return prisma.lotStockEntry.findUnique({ where: { lotId } });
  }

  async upsertStockEntry(lotId: string, data: UpsertStockEntryInput) {
    await this.findLotOrThrow(lotId);
    return prisma.lotStockEntry.upsert({
      where:  { lotId },
      update: data,
      create: { lotId, ...data },
    });
  }
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/lots/lots.service.ts
git commit -m "feat: add lot workflow service methods"
```

---

## Task 4: Backend Controller + Routes

**Files:**
- Modify: `backend/src/modules/lots/lots.controller.ts`
- Modify: `backend/src/modules/lots/lots.routes.ts`

- [ ] **Step 1: Add 9 new controller handlers to lots.controller.ts**

Add these methods inside the `LotsController` class, at the end before the closing `}`:

```typescript
  // ─── RÉCEPTION ───────────────────────────────────────────────────────────────
  async getReception(req: Request, res: Response) {
    try {
      const data = await lotsService.getReception(req.params.id);
      return sendSuccess(res, data);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async upsertReception(req: Request, res: Response) {
    try {
      const data = await lotsService.upsertReception(req.params.id, req.body);
      return sendSuccess(res, data);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  // ─── WORKFLOW ─────────────────────────────────────────────────────────────────
  async getWorkflow(req: Request, res: Response) {
    try {
      const data = await lotsService.getWorkflow(req.params.id);
      return sendSuccess(res, data);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async upsertPhase(req: Request, res: Response) {
    try {
      const { id, vanillaType, phaseType, index } = req.params;
      const data = await lotsService.upsertPhase(id, vanillaType, phaseType, parseInt(index), req.body);
      return sendSuccess(res, data);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async addTeamMember(req: Request, res: Response) {
    try {
      const data = await lotsService.addTeamMember(req.params.phaseId, req.body);
      return sendSuccess(res, data, 'Membre ajouté', 201);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async updateTeamMember(req: Request, res: Response) {
    try {
      const data = await lotsService.updateTeamMember(req.params.memberId, req.body);
      return sendSuccess(res, data);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async deleteTeamMember(req: Request, res: Response) {
    try {
      await lotsService.deleteTeamMember(req.params.memberId);
      return sendSuccess(res, null, 'Membre supprimé');
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  // ─── STOCK ENTRY ─────────────────────────────────────────────────────────────
  async getStockEntry(req: Request, res: Response) {
    try {
      const data = await lotsService.getStockEntry(req.params.id);
      return sendSuccess(res, data);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }

  async upsertStockEntry(req: Request, res: Response) {
    try {
      const data = await lotsService.upsertStockEntry(req.params.id, req.body);
      return sendSuccess(res, data);
    } catch (err: any) { return sendError(res, err.message, err.statusCode || 500); }
  }
```

- [ ] **Step 2: Add imports for new schemas in lots.routes.ts**

At the top of `lots.routes.ts`, update the schema import:

```typescript
import {
  createLotSchema,
  updateLotSchema,
  addStepSchema,
  upsertReceptionSchema,
  upsertPhaseSchema,
  addTeamMemberSchema,
  updateTeamMemberSchema,
  upsertStockEntrySchema,
} from './lots.schema';
```

- [ ] **Step 3: Add 9 new routes to lots.routes.ts**

Append after the existing routes:

```typescript
// ── Réception ────────────────────────────────────────────────────────────────
lotsRoutes.get ('/:id/reception',                        authenticate, lotsController.getReception.bind(lotsController));
lotsRoutes.put ('/:id/reception',                        authenticate, requireFieldOrAbove, validate(upsertReceptionSchema), lotsController.upsertReception.bind(lotsController));

// ── Workflow phases ───────────────────────────────────────────────────────────
lotsRoutes.get ('/:id/workflow',                         authenticate, lotsController.getWorkflow.bind(lotsController));
lotsRoutes.put ('/:id/workflow/phases/:vanillaType/:phaseType/:index', authenticate, requireFieldOrAbove, validate(upsertPhaseSchema), lotsController.upsertPhase.bind(lotsController));
lotsRoutes.post('/:id/workflow/phases/:phaseId/team',    authenticate, requireFieldOrAbove, validate(addTeamMemberSchema),    lotsController.addTeamMember.bind(lotsController));
lotsRoutes.put ('/:id/workflow/phases/:phaseId/team/:memberId', authenticate, requireFieldOrAbove, validate(updateTeamMemberSchema), lotsController.updateTeamMember.bind(lotsController));
lotsRoutes.delete('/:id/workflow/phases/:phaseId/team/:memberId', authenticate, requireFieldOrAbove, lotsController.deleteTeamMember.bind(lotsController));

// ── Entrée stock ──────────────────────────────────────────────────────────────
lotsRoutes.get ('/:id/stock-entry',                      authenticate, lotsController.getStockEntry.bind(lotsController));
lotsRoutes.put ('/:id/stock-entry',                      authenticate, requireFieldOrAbove, validate(upsertStockEntrySchema), lotsController.upsertStockEntry.bind(lotsController));
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/lots/lots.controller.ts backend/src/modules/lots/lots.routes.ts
git commit -m "feat: add lot workflow controller handlers and routes"
```

---

## Task 5: Frontend — Tab System in LotDetail

**Files:**
- Modify: `frontend/src/pages/Lots/LotDetail.tsx`

The goal is to add a 3-tab system. The existing content (lot info card + timeline + sidebar) moves to the "Vue d'ensemble" tab. Two new tabs are added.

- [ ] **Step 1: Add activeTab state and imports**

After `const [stepModal, setStepModal] = useState(false);` (around line 311), add:

```typescript
const [activeTab, setActiveTab] = useState<'overview' | 'workflow' | 'stock'>('overview');
```

Add these imports at the top of the file:

```typescript
import { LotWorkflow } from './workflow/LotWorkflow';
import { LotStockEntry } from './workflow/LotStockEntry';
```

- [ ] **Step 2: Add the tab navigation bar**

After the `<Header>...</Header>` block and before the `<div className="flex-1 p-6 grid...">`, add:

```tsx
{/* Tab navigation */}
<div className="flex border-b px-6" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
  {([
    { key: 'overview',  label: "Vue d'ensemble" },
    { key: 'workflow',  label: 'Processus de réception' },
    { key: 'stock',     label: 'Entrée stock' },
  ] as const).map(({ key, label }) => (
    <button
      key={key}
      onClick={() => setActiveTab(key)}
      className={`px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
        activeTab === key
          ? 'border-teal-400 text-teal-400'
          : 'border-transparent text-gray-500 hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  ))}
</div>
```

- [ ] **Step 3: Wrap existing content in overview tab condition**

Wrap the existing `<div className="flex-1 p-6 grid cols-1 lg:grid-cols-3 gap-4">` block with:

```tsx
{activeTab === 'overview' && (
  <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
    {/* ... existing content unchanged ... */}
  </div>
)}
{activeTab === 'workflow' && (
  <div className="flex-1 p-6">
    <LotWorkflow lotId={lot.id} />
  </div>
)}
{activeTab === 'stock' && (
  <div className="flex-1 p-6">
    <LotStockEntry lotId={lot.id} />
  </div>
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

(The workflow components don't exist yet — add `// @ts-ignore` or create stub files first. See Task 6 for actual components.)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Lots/LotDetail.tsx
git commit -m "feat: add 3-tab system to LotDetail (overview/processus/stock)"
```

---

## Task 6: Frontend — TeamTable Component

**Files:**
- Create: `frontend/src/pages/Lots/workflow/TeamTable.tsx`

- [ ] **Step 1: Create the TeamTable component**

```tsx
import React, { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import toast from 'react-hot-toast';

interface TeamMember {
  id: string;
  nom: string;
  quotas?: number | null;
  activite?: string | null;
  quantiteFini?: number | null;
  observation?: string | null;
}

interface TeamTableProps {
  lotId: string;
  phaseId: string;
  members: TeamMember[];
  isLocked: boolean;
}

const EMPTY_MEMBER = { nom: '', quotas: '', activite: '', quantiteFini: '', observation: '' };

export const TeamTable: React.FC<TeamTableProps> = ({ lotId, phaseId, members, isLocked }) => {
  const qc = useQueryClient();
  const [newRow, setNewRow] = useState(EMPTY_MEMBER);
  const [addingRow, setAddingRow] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['lot-workflow', lotId] });

  const addMember = useMutation({
    mutationFn: (data: typeof EMPTY_MEMBER) =>
      api.post(`/lots/${lotId}/workflow/phases/${phaseId}/team`, {
        nom:          data.nom,
        quotas:       data.quotas       ? parseFloat(data.quotas)       : undefined,
        activite:     data.activite     || undefined,
        quantiteFini: data.quantiteFini ? parseFloat(data.quantiteFini) : undefined,
        observation:  data.observation  || undefined,
      }),
    onSuccess: () => { invalidate(); setNewRow(EMPTY_MEMBER); setAddingRow(false); toast.success('Membre ajouté'); },
    onError: () => toast.error('Erreur lors de l\'ajout'),
  });

  const deleteMember = useMutation({
    mutationFn: (memberId: string) =>
      api.delete(`/lots/${lotId}/workflow/phases/${phaseId}/team/${memberId}`),
    onSuccess: () => { invalidate(); toast.success('Membre supprimé'); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-navy-400)' }}>
        Formulaire équipe
      </p>
      <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              {['Nom', 'Quotas', 'Activité', 'Qté fini', 'Observation', ''].map(h => (
                <th key={h} className="text-left px-3 py-2 text-xs font-medium" style={{ color: 'var(--color-navy-400)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <td className="px-3 py-2 text-white">{m.nom}</td>
                <td className="px-3 py-2 text-gray-300">{m.quotas ?? '—'}</td>
                <td className="px-3 py-2 text-gray-300">{m.activite ?? '—'}</td>
                <td className="px-3 py-2 text-gray-300">{m.quantiteFini ?? '—'}</td>
                <td className="px-3 py-2 text-gray-400 max-w-xs truncate">{m.observation ?? '—'}</td>
                <td className="px-3 py-2">
                  {!isLocked && (
                    <button
                      onClick={() => deleteMember.mutate(m.id)}
                      disabled={deleteMember.isPending}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {/* New row form */}
            {addingRow && (
              <tr style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                {(['nom', 'quotas', 'activite', 'quantiteFini', 'observation'] as const).map(field => (
                  <td key={field} className="px-2 py-1.5">
                    <input
                      className="input text-xs py-1"
                      placeholder={field === 'nom' ? 'Nom *' : field}
                      value={newRow[field]}
                      onChange={e => setNewRow(r => ({ ...r, [field]: e.target.value }))}
                    />
                  </td>
                ))}
                <td className="px-2 py-1.5 flex gap-1">
                  <Button
                    size="sm"
                    loading={addMember.isPending}
                    onClick={() => { if (newRow.nom.trim()) addMember.mutate(newRow); else toast.error('Nom requis'); }}
                  >
                    OK
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAddingRow(false); setNewRow(EMPTY_MEMBER); }}>
                    ✕
                  </Button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!isLocked && !addingRow && (
        <Button
          size="sm"
          variant="secondary"
          icon={<Plus size={13} />}
          className="mt-2"
          onClick={() => setAddingRow(true)}
        >
          Ajouter membre
        </Button>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Lots/workflow/TeamTable.tsx
git commit -m "feat: add TeamTable component for lot workflow phases"
```

---

## Task 7: Frontend — PhaseAccordion Component

**Files:**
- Create: `frontend/src/pages/Lots/workflow/PhaseAccordion.tsx`

- [ ] **Step 1: Create the PhaseAccordion component**

```tsx
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, Clock, Lock } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { TeamTable } from './TeamTable';
import toast from 'react-hot-toast';

interface PhaseData {
  id: string;
  phaseType: string;
  phaseIndex: number;
  vanillaType: string;
  nomResponsable?: string | null;
  poids?: number | null;
  isValidated: boolean;
  qualiteOk?: boolean | null;
  isNouvelEmploye: boolean;
  autres?: string | null;
  nbSachets?: number | null;
  teamMembers: any[];
}

interface PhaseAccordionProps {
  lotId: string;
  vanillaType: 'non_conditionne' | 'conditionne';
  phaseType: string;
  phaseIndex: number;
  label: string;
  quotaLabel: string | null;
  data?: PhaseData;
}

const PHASE_LABELS: Record<string, string> = {
  triage:          'Triage',
  lasoge:          'Lasoge',
  mesurage:        'Mesurage',
  detecteur_metaux:'Détecteur Métaux',
  sous_vide:       'Sous Vide',
};

export const PhaseAccordion: React.FC<PhaseAccordionProps> = ({
  lotId, vanillaType, phaseType, phaseIndex, label, quotaLabel, data,
}) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nomResponsable:  data?.nomResponsable  ?? '',
    poids:           data?.poids           != null ? String(data.poids) : '',
    qualiteOk:       data?.qualiteOk       ?? false,
    isNouvelEmploye: data?.isNouvelEmploye ?? false,
    autres:          data?.autres          ?? '',
    nbSachets:       data?.nbSachets       != null ? String(data.nbSachets) : '',
  });

  useEffect(() => {
    setForm({
      nomResponsable:  data?.nomResponsable  ?? '',
      poids:           data?.poids           != null ? String(data.poids) : '',
      qualiteOk:       data?.qualiteOk       ?? false,
      isNouvelEmploye: data?.isNouvelEmploye ?? false,
      autres:          data?.autres          ?? '',
      nbSachets:       data?.nbSachets       != null ? String(data.nbSachets) : '',
    });
  }, [data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['lot-workflow', lotId] });

  const saveMutation = useMutation({
    mutationFn: (payload: object) =>
      api.put(`/lots/${lotId}/workflow/phases/${vanillaType}/${phaseType}/${phaseIndex}`, payload),
    onSuccess: () => { invalidate(); toast.success('Phase enregistrée'); },
    onError:   () => toast.error('Erreur lors de la sauvegarde'),
  });

  const handleSave = () => {
    saveMutation.mutate({
      nomResponsable:  form.nomResponsable  || undefined,
      poids:           form.poids           ? parseFloat(form.poids)   : undefined,
      qualiteOk:       vanillaType === 'conditionne' ? form.qualiteOk : undefined,
      isNouvelEmploye: phaseType === 'mesurage' ? form.isNouvelEmploye : undefined,
      autres:          phaseType === 'detecteur_metaux' ? form.autres || undefined : undefined,
      nbSachets:       phaseType === 'sous_vide' && form.nbSachets ? parseInt(form.nbSachets) : undefined,
    });
  };

  const handleValidate = () => {
    saveMutation.mutate({ isValidated: true }, {
      onSuccess: () => { invalidate(); toast.success('Phase validée'); setOpen(false); },
    });
  };

  const isLocked    = data?.isValidated ?? false;
  const isCompleted = isLocked;

  const effectiveQuota = phaseType === 'mesurage' && form.isNouvelEmploye
    ? '15 kg/jour/pers'
    : quotaLabel;

  return (
    <div className="rounded-xl border transition-all duration-200"
      style={{
        borderColor: isCompleted ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)',
        background:  isCompleted ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.02)',
      }}
    >
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          {isCompleted
            ? <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
            : <Clock size={16} className="text-gray-500 flex-shrink-0" />
          }
          <span className="font-medium text-white text-sm">{label}</span>
          {effectiveQuota && (
            <span className="text-xs px-2 py-0.5 rounded-full font-mono"
              style={{ background: 'rgba(42,122,144,0.2)', color: '#2a7a90' }}>
              {effectiveQuota}
            </span>
          )}
          {isLocked && (
            <span className="text-xs flex items-center gap-1 text-gray-500">
              <Lock size={11} /> Verrouillé
            </span>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="pt-4 space-y-3">

            {/* Nom responsable (not for detecteur_metaux) */}
            {phaseType !== 'detecteur_metaux' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Nom responsable</label>
                <input
                  className="input"
                  value={form.nomResponsable}
                  onChange={e => setForm(f => ({ ...f, nomResponsable: e.target.value }))}
                  disabled={isLocked}
                  placeholder="Anarana responsable"
                />
              </div>
            )}

            {/* Poids (not for detecteur_metaux) */}
            {phaseType !== 'detecteur_metaux' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Poids (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={form.poids}
                  onChange={e => setForm(f => ({ ...f, poids: e.target.value }))}
                  disabled={isLocked}
                  placeholder="0.0"
                />
              </div>
            )}

            {/* Autres — Détecteur Métaux only */}
            {phaseType === 'detecteur_metaux' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Autres</label>
                <input
                  className="input"
                  value={form.autres}
                  onChange={e => setForm(f => ({ ...f, autres: e.target.value }))}
                  disabled={isLocked}
                  placeholder="Observations..."
                />
              </div>
            )}

            {/* Nb sachets — Sous Vide only */}
            {phaseType === 'sous_vide' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Nombre de sachets</label>
                <input
                  type="number"
                  className="input"
                  value={form.nbSachets}
                  onChange={e => setForm(f => ({ ...f, nbSachets: e.target.value }))}
                  disabled={isLocked}
                  placeholder="0"
                />
              </div>
            )}

            {/* Nouvel employé toggle — Mesurage only */}
            {phaseType === 'mesurage' && !isLocked && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isNouvelEmploye}
                  onChange={e => setForm(f => ({ ...f, isNouvelEmploye: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-gray-300">Nouvel employé</span>
                <span className="text-xs text-gray-500">(quota : 15 kg/jour/pers)</span>
              </label>
            )}

            {/* Équipe Qualité — conditionné path only */}
            {vanillaType === 'conditionne' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.qualiteOk ?? false}
                  onChange={e => setForm(f => ({ ...f, qualiteOk: e.target.checked }))}
                  disabled={isLocked}
                  className="rounded"
                />
                <span className="text-sm text-gray-300">Équipe Qualité ✓</span>
              </label>
            )}

            {/* Action buttons */}
            {!isLocked && (
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="secondary" loading={saveMutation.isPending} onClick={handleSave}>
                  Enregistrer
                </Button>
                <Button size="sm" onClick={handleValidate} loading={saveMutation.isPending}>
                  Valider la phase
                </Button>
              </div>
            )}
          </div>

          {/* Team table — always visible when phase exists */}
          {data?.id && (
            <TeamTable
              lotId={lotId}
              phaseId={data.id}
              members={data.teamMembers}
              isLocked={isLocked}
            />
          )}
          {!data?.id && !isLocked && (
            <p className="mt-3 text-xs text-gray-500">Enregistrez d'abord la phase pour ajouter des membres.</p>
          )}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Lots/workflow/PhaseAccordion.tsx
git commit -m "feat: add PhaseAccordion component for lot workflow"
```

---

## Task 8: Frontend — ReceptionSection Component

**Files:**
- Create: `frontend/src/pages/Lots/workflow/ReceptionSection.tsx`

- [ ] **Step 1: Create ReceptionSection**

```tsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';
import api from '../../../lib/api';
import { Card, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import toast from 'react-hot-toast';

interface ReceptionData {
  quantite?:     number | null;
  origine?:      string | null;
  ristourne?:    number | null;
  poids?:        number | null;
  contrePesage?: boolean;
  emplacement?:  string | null;
  nbSousVide?:   number | null;
  odeur?:        string | null;
  etatFondu?:    boolean | null;
  moisissure?:   boolean | null;
  validatedAt?:  string | null;
}

interface ReceptionSectionProps {
  lotId: string;
  data?: ReceptionData | null;
}

export const ReceptionSection: React.FC<ReceptionSectionProps> = ({ lotId, data }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    quantite:     data?.quantite     != null ? String(data.quantite)     : '',
    origine:      data?.origine      ?? '',
    ristourne:    data?.ristourne    != null ? String(data.ristourne)    : '',
    poids:        data?.poids        != null ? String(data.poids)        : '',
    contrePesage: data?.contrePesage ?? false,
    emplacement:  data?.emplacement  ?? '',
    nbSousVide:   data?.nbSousVide   != null ? String(data.nbSousVide)   : '',
    odeur:        data?.odeur        ?? '',
    etatFondu:    data?.etatFondu    ?? false,
    moisissure:   data?.moisissure   ?? false,
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      quantite:     data.quantite     != null ? String(data.quantite)     : '',
      origine:      data.origine      ?? '',
      ristourne:    data.ristourne    != null ? String(data.ristourne)    : '',
      poids:        data.poids        != null ? String(data.poids)        : '',
      contrePesage: data.contrePesage ?? false,
      emplacement:  data.emplacement  ?? '',
      nbSousVide:   data.nbSousVide   != null ? String(data.nbSousVide)   : '',
      odeur:        data.odeur        ?? '',
      etatFondu:    data.etatFondu    ?? false,
      moisissure:   data.moisissure   ?? false,
    });
  }, [data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['lot-reception', lotId] });

  const saveMutation = useMutation({
    mutationFn: (payload: object) => api.put(`/lots/${lotId}/reception`, payload),
    onSuccess: () => { invalidate(); toast.success('Réception enregistrée'); },
    onError:   () => toast.error('Erreur lors de l\'enregistrement'),
  });

  const isLocked = !!data?.validatedAt;

  const buildPayload = (validate = false) => ({
    quantite:     form.quantite     ? parseFloat(form.quantite)     : undefined,
    origine:      form.origine      || undefined,
    ristourne:    form.ristourne    ? parseFloat(form.ristourne)    : undefined,
    poids:        form.poids        ? parseFloat(form.poids)        : undefined,
    contrePesage: form.contrePesage,
    emplacement:  form.emplacement  || undefined,
    nbSousVide:   form.nbSousVide   ? parseInt(form.nbSousVide)     : undefined,
    odeur:        form.odeur        || undefined,
    etatFondu:    form.etatFondu,
    moisissure:   form.moisissure,
    ...(validate ? { validatedAt: new Date().toISOString() } : {}),
  });

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );

  return (
    <Card>
      <CardHeader
        title="Réception"
        subtitle="Bon de livraison · Contre-pesage · Échantillonnage"
        action={isLocked ? (
          <span className="flex items-center gap-1.5 text-xs text-green-400">
            <CheckCircle size={14} /> Validée
          </span>
        ) : undefined}
      />

      <div className="space-y-5">
        {/* Bon de Livraison */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-navy-400)' }}>
            Bon de Livraison
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantité (kg)">
              <input type="number" step="0.1" className="input" disabled={isLocked}
                value={form.quantite} onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))} placeholder="0.0" />
            </Field>
            <Field label="Origine">
              <input className="input" disabled={isLocked}
                value={form.origine} onChange={e => setForm(f => ({ ...f, origine: e.target.value }))} placeholder="Région / Zone" />
            </Field>
            <Field label="Ristourne (taxe état)">
              <input type="number" step="0.01" className="input" disabled={isLocked}
                value={form.ristourne} onChange={e => setForm(f => ({ ...f, ristourne: e.target.value }))} placeholder="0.00" />
            </Field>
            <Field label="Poids constaté (kg)">
              <input type="number" step="0.1" className="input" disabled={isLocked}
                value={form.poids} onChange={e => setForm(f => ({ ...f, poids: e.target.value }))} placeholder="0.0" />
            </Field>
          </div>
        </div>

        {/* Contre-pesage + Emplacement */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.contrePesage} disabled={isLocked}
              onChange={e => setForm(f => ({ ...f, contrePesage: e.target.checked }))} className="rounded" />
            <span className="text-sm text-gray-300">Contre-pesage effectué</span>
          </label>
          <Field label="Emplacement / Quarantaine">
            <input className="input" disabled={isLocked}
              value={form.emplacement} onChange={e => setForm(f => ({ ...f, emplacement: e.target.value }))} placeholder="Zone brute — quarantaine" />
          </Field>
        </div>

        {/* Échantillonnage */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-navy-400)' }}>
            Échantillonnage — Vérification qualité
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nb sous-vide prélevés (cible : 10)">
              <input type="number" className="input" disabled={isLocked}
                value={form.nbSousVide} onChange={e => setForm(f => ({ ...f, nbSousVide: e.target.value }))} placeholder="10" />
            </Field>
            <Field label="Odeur">
              <input className="input" disabled={isLocked}
                value={form.odeur} onChange={e => setForm(f => ({ ...f, odeur: e.target.value }))} placeholder="Observations odeur..." />
            </Field>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.etatFondu} disabled={isLocked}
                onChange={e => setForm(f => ({ ...f, etatFondu: e.target.checked }))} className="rounded" />
              <span className="text-sm text-gray-300">Fondu</span>
              <span className="text-xs text-gray-500">(décoché = Non Fondu)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.moisissure} disabled={isLocked}
                onChange={e => setForm(f => ({ ...f, moisissure: e.target.checked }))} className="rounded" />
              <span className="text-sm text-gray-300">Moisissure détectée</span>
            </label>
          </div>
        </div>

        {!isLocked && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="secondary" loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate(buildPayload(false))}>
              Enregistrer
            </Button>
            <Button size="sm" loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate(buildPayload(true))}>
              Valider la réception
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Lots/workflow/ReceptionSection.tsx
git commit -m "feat: add ReceptionSection component"
```

---

## Task 9: Frontend — ClassificationSection Component

**Files:**
- Create: `frontend/src/pages/Lots/workflow/ClassificationSection.tsx`

- [ ] **Step 1: Create ClassificationSection**

```tsx
import React, { useState } from 'react';
import { Card, CardHeader } from '../../../components/ui/Card';
import { PhaseAccordion } from './PhaseAccordion';

interface PhaseData {
  id: string;
  vanillaType: string;
  phaseType: string;
  phaseIndex: number;
  nomResponsable?: string | null;
  poids?: number | null;
  isValidated: boolean;
  qualiteOk?: boolean | null;
  isNouvelEmploye: boolean;
  autres?: string | null;
  nbSachets?: number | null;
  teamMembers: any[];
}

interface ClassificationSectionProps {
  lotId: string;
  phases: PhaseData[];
}

type VanillaType = 'non_conditionne' | 'conditionne';

const PHASE_SEQUENCE = [
  { phaseType: 'triage',          phaseIndex: 1, label: 'Triage',          quotaLabel: '35 kg/jour/pers' },
  { phaseType: 'lasoge',          phaseIndex: 1, label: 'Lasoge',          quotaLabel: '50 kg/jour/pers' },
  { phaseType: 'mesurage',        phaseIndex: 1, label: 'Mesurage',        quotaLabel: '30 kg/jour/pers' },
  { phaseType: 'lasoge',          phaseIndex: 2, label: 'Lasoge',          quotaLabel: '50 kg/jour/pers' },
  { phaseType: 'detecteur_metaux',phaseIndex: 1, label: 'Détecteur Métaux',quotaLabel: null },
  { phaseType: 'sous_vide',       phaseIndex: 1, label: 'Sous Vide',       quotaLabel: '75 sachets/j/pers · 350 kg/j/pers' },
];

export const ClassificationSection: React.FC<ClassificationSectionProps> = ({ lotId, phases }) => {
  const existingType = phases.length > 0
    ? (phases[0].vanillaType as VanillaType)
    : null;

  const [selectedType, setSelectedType] = useState<VanillaType | null>(existingType);

  const getPhaseData = (phaseType: string, phaseIndex: number) =>
    phases.find(p => p.phaseType === phaseType && p.phaseIndex === phaseIndex && p.vanillaType === selectedType);

  const validatedCount = PHASE_SEQUENCE.filter(
    ({ phaseType, phaseIndex }) => getPhaseData(phaseType, phaseIndex)?.isValidated
  ).length;

  return (
    <Card>
      <CardHeader
        title="Classification"
        subtitle={`${validatedCount} / ${PHASE_SEQUENCE.length} phases validées`}
      />

      {/* Vanilla type selector — locked once phases exist */}
      {!existingType && (
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-navy-400)' }}>
            Type de vanille reçue
          </p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: 'non_conditionne', label: 'Non conditionné', desc: 'Vanille brute — traitement complet requis' },
              { key: 'conditionne',     label: 'Conditionné',     desc: 'Vanille déjà préparée — validation qualité requise' },
            ] as const).map(({ key, label, desc }) => (
              <button
                key={key}
                onClick={() => setSelectedType(key)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedType === key
                    ? 'border-teal-400 bg-teal-400/10'
                    : 'border-white/10 hover:border-white/20 bg-white/2'
                }`}
              >
                <p className="font-medium text-sm text-white">{label}</p>
                <p className="text-xs text-gray-400 mt-1">{desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {existingType && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: 'rgba(42,122,144,0.2)', color: '#2a7a90' }}>
            {existingType === 'non_conditionne' ? 'Non conditionné' : 'Conditionné'}
          </span>
          <span className="text-xs text-gray-500">Type verrouillé (phases en cours)</span>
        </div>
      )}

      {/* Progress bar */}
      {selectedType && (
        <div className="mb-4">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(validatedCount / PHASE_SEQUENCE.length) * 100}%`,
                background: 'linear-gradient(90deg, #1e5c6e, #2a7a90)',
              }}
            />
          </div>
        </div>
      )}

      {/* Phase accordions */}
      {selectedType && (
        <div className="space-y-2">
          {PHASE_SEQUENCE.map(({ phaseType, phaseIndex, label, quotaLabel }) => (
            <PhaseAccordion
              key={`${phaseType}-${phaseIndex}`}
              lotId={lotId}
              vanillaType={selectedType}
              phaseType={phaseType}
              phaseIndex={phaseIndex}
              label={label}
              quotaLabel={quotaLabel}
              data={getPhaseData(phaseType, phaseIndex)}
            />
          ))}
        </div>
      )}
    </Card>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Lots/workflow/ClassificationSection.tsx
git commit -m "feat: add ClassificationSection with phase accordions"
```

---

## Task 10: Frontend — LotWorkflow Container + LotStockEntry

**Files:**
- Create: `frontend/src/pages/Lots/workflow/LotWorkflow.tsx`
- Create: `frontend/src/pages/Lots/workflow/LotStockEntry.tsx`

- [ ] **Step 1: Create LotWorkflow.tsx**

```tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import { ReceptionSection } from './ReceptionSection';
import { ClassificationSection } from './ClassificationSection';
import { PageLoader } from '../../../components/ui/Spinner';

export const LotWorkflow: React.FC<{ lotId: string }> = ({ lotId }) => {
  const { data: reception, isLoading: loadingReception } = useQuery({
    queryKey: ['lot-reception', lotId],
    queryFn: () => api.get(`/lots/${lotId}/reception`).then(r => r.data.data),
  });

  const { data: workflow, isLoading: loadingWorkflow } = useQuery({
    queryKey: ['lot-workflow', lotId],
    queryFn: () => api.get(`/lots/${lotId}/workflow`).then(r => r.data.data),
  });

  if (loadingReception || loadingWorkflow) return <PageLoader />;

  return (
    <div className="space-y-4 max-w-3xl">
      <ReceptionSection lotId={lotId} data={reception} />
      <ClassificationSection lotId={lotId} phases={workflow ?? []} />
    </div>
  );
};
```

- [ ] **Step 2: Create LotStockEntry.tsx**

```tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';
import api from '../../../lib/api';
import { Card, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { PageLoader } from '../../../components/ui/Spinner';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { key: 'tk',          label: 'TK' },
  { key: 'moisi',       label: 'Moisi' },
  { key: 'cuts',        label: 'Cuts' },
  { key: 'poquee',      label: 'Poquée' },
  { key: 'noirGourmet', label: 'Noir Gourmet' },
  { key: 'noirTk',      label: 'Noir TK' },
  { key: 'rougeUs',     label: 'Rouge US' },
  { key: 'rougeEurope', label: 'Rouge Europe' },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

type FormState = {
  specification:    string;
  fondusPoids:      string;
  fondusNbSousVide: string;
} & Record<CategoryKey, string>;

const EMPTY_FORM: FormState = {
  specification: '', fondusPoids: '', fondusNbSousVide: '',
  tk: '', moisi: '', cuts: '', poquee: '', noirGourmet: '', noirTk: '', rougeUs: '', rougeEurope: '',
};

export const LotStockEntry: React.FC<{ lotId: string }> = ({ lotId }) => {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['lot-stock-entry', lotId],
    queryFn: () => api.get(`/lots/${lotId}/stock-entry`).then(r => r.data.data),
  });

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (!data) return;
    setForm({
      specification:    data.specification    ?? '',
      fondusPoids:      data.fondusPoids      != null ? String(data.fondusPoids)      : '',
      fondusNbSousVide: data.fondusNbSousVide != null ? String(data.fondusNbSousVide) : '',
      tk:               data.tk              != null ? String(data.tk)              : '',
      moisi:            data.moisi           != null ? String(data.moisi)           : '',
      cuts:             data.cuts            != null ? String(data.cuts)            : '',
      poquee:           data.poquee          != null ? String(data.poquee)          : '',
      noirGourmet:      data.noirGourmet     != null ? String(data.noirGourmet)     : '',
      noirTk:           data.noirTk          != null ? String(data.noirTk)          : '',
      rougeUs:          data.rougeUs         != null ? String(data.rougeUs)         : '',
      rougeEurope:      data.rougeEurope     != null ? String(data.rougeEurope)     : '',
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: object) => api.put(`/lots/${lotId}/stock-entry`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lot-stock-entry', lotId] });
      toast.success('Entrée stock enregistrée');
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  });

  const isLocked = !!data?.validatedAt;

  const buildPayload = (validate = false) => ({
    specification:    form.specification    || undefined,
    fondusPoids:      form.fondusPoids      ? parseFloat(form.fondusPoids)      : undefined,
    fondusNbSousVide: form.fondusNbSousVide ? parseInt(form.fondusNbSousVide)   : undefined,
    ...Object.fromEntries(
      CATEGORIES.map(({ key }) => [key, form[key] ? parseFloat(form[key]) : undefined])
    ),
    ...(validate ? { validatedAt: new Date().toISOString() } : {}),
  });

  if (isLoading) return <PageLoader />;

  return (
    <Card className="max-w-3xl">
      <CardHeader
        title="Entrée Stock"
        subtitle="Détails par taille et catégorie"
        action={isLocked ? (
          <span className="flex items-center gap-1.5 text-xs text-green-400">
            <CheckCircle size={14} /> Validée
          </span>
        ) : undefined}
      />

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Spécification</label>
          <textarea
            className="input h-20 resize-none"
            disabled={isLocked}
            value={form.specification}
            onChange={e => setForm(f => ({ ...f, specification: e.target.value }))}
            placeholder="Spécification libre..."
          />
        </div>

        {/* Fondus */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-navy-400)' }}>
            Fondus
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Poids (kg)</label>
              <input type="number" step="0.1" className="input" disabled={isLocked}
                value={form.fondusPoids} onChange={e => setForm(f => ({ ...f, fondusPoids: e.target.value }))} placeholder="0.0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Nombre sous-vide</label>
              <input type="number" className="input" disabled={isLocked}
                value={form.fondusNbSousVide} onChange={e => setForm(f => ({ ...f, fondusNbSousVide: e.target.value }))} placeholder="0" />
            </div>
          </div>
        </div>

        {/* Catégories */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-navy-400)' }}>
            Détails par taille (kg)
          </p>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  disabled={isLocked}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder="0.0"
                />
              </div>
            ))}
          </div>
        </div>

        {!isLocked && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="secondary" loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate(buildPayload(false))}>
              Enregistrer
            </Button>
            <Button size="sm" loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate(buildPayload(true))}>
              Valider l'entrée stock
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Lots/workflow/LotWorkflow.tsx frontend/src/pages/Lots/workflow/LotStockEntry.tsx
git commit -m "feat: add LotWorkflow container and LotStockEntry tab"
```

---

## Task 11: Final TypeScript Check + Smoke Test

- [ ] **Step 1: Check backend TypeScript**

```bash
cd backend && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Check frontend TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Start backend and verify new endpoints exist**

```bash
cd backend && npm run dev
```

In another terminal:
```bash
# Replace <TOKEN> and <LOT_ID> with real values
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/lots/<LOT_ID>/reception
```

Expected: `{"success":true,"data":null}` (null if no reception yet)

- [ ] **Step 4: Start frontend and verify tabs render**

```bash
cd frontend && npm run dev
```

Navigate to a lot detail page. Confirm three tabs appear: "Vue d'ensemble", "Processus de réception", "Entrée stock".

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: lot workflow complete — reception, classification, stock entry"
```
