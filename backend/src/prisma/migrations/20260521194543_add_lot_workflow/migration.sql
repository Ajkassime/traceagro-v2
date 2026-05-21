-- CreateTable
CREATE TABLE "lot_receptions" (
    "id" TEXT NOT NULL,
    "lot_id" TEXT NOT NULL,
    "quantite" DOUBLE PRECISION,
    "origine" TEXT,
    "ristourne" DOUBLE PRECISION,
    "poids" DOUBLE PRECISION,
    "contre_pesage" BOOLEAN NOT NULL DEFAULT false,
    "emplacement" TEXT,
    "nb_sous_vide" INTEGER,
    "odeur" TEXT,
    "etat_fondu" BOOLEAN,
    "moisissure" BOOLEAN,
    "validated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lot_receptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot_workflow_phases" (
    "id" TEXT NOT NULL,
    "lot_id" TEXT NOT NULL,
    "vanilla_type" TEXT NOT NULL,
    "phase_type" TEXT NOT NULL,
    "phase_index" INTEGER NOT NULL DEFAULT 1,
    "nom_responsable" TEXT,
    "poids" DOUBLE PRECISION,
    "is_validated" BOOLEAN NOT NULL DEFAULT false,
    "qualite_ok" BOOLEAN,
    "is_nouvel_employe" BOOLEAN NOT NULL DEFAULT false,
    "autres" TEXT,
    "nb_sachets" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lot_workflow_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot_team_members" (
    "id" TEXT NOT NULL,
    "phase_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "quotas" DOUBLE PRECISION,
    "activite" TEXT,
    "quantite_fini" DOUBLE PRECISION,
    "observation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lot_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot_stock_entries" (
    "id" TEXT NOT NULL,
    "lot_id" TEXT NOT NULL,
    "specification" TEXT,
    "fondus_poids" DOUBLE PRECISION,
    "fondus_nb_sous_vide" INTEGER,
    "tk" DOUBLE PRECISION,
    "moisi" DOUBLE PRECISION,
    "cuts" DOUBLE PRECISION,
    "poquee" DOUBLE PRECISION,
    "noir_gourmet" DOUBLE PRECISION,
    "noir_tk" DOUBLE PRECISION,
    "rouge_us" DOUBLE PRECISION,
    "rouge_europe" DOUBLE PRECISION,
    "validated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lot_stock_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lot_receptions_lot_id_key" ON "lot_receptions"("lot_id");

-- CreateIndex
CREATE UNIQUE INDEX "lot_workflow_phases_lot_id_vanilla_type_phase_type_phase_in_key" ON "lot_workflow_phases"("lot_id", "vanilla_type", "phase_type", "phase_index");

-- CreateIndex
CREATE UNIQUE INDEX "lot_stock_entries_lot_id_key" ON "lot_stock_entries"("lot_id");

-- AddForeignKey
ALTER TABLE "lot_receptions" ADD CONSTRAINT "lot_receptions_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_workflow_phases" ADD CONSTRAINT "lot_workflow_phases_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_team_members" ADD CONSTRAINT "lot_team_members_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "lot_workflow_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_stock_entries" ADD CONSTRAINT "lot_stock_entries_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
