
import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { PageLoader } from '../components/ui/Spinner'
import toast from 'react-hot-toast'
import api from '../lib/api'

// ─── Flux réel AGK-COMORES (doc officiel v1 — 23/06/22) ─────────────────────
const STEP_ICONS = {
  'Réception':          '📦',
  'Échaudage':          '🌡️',
  'Étuvage':            '🔥',
  'Séchage au soleil':  '☀️',
  "Séchage à l'ombre":  '🌫️',
  'Triage':             '⚖️',
  'Affinage':           '🫙',
  'Classement':         '🏷️',
  'Mise en botte':      '🌿',
  'Pesage final':       '🔬',
  'Emballage':          '📫',
}

const STEP_DOCS = {
  'Réception':    ['CAHIER DE PESAGE', 'CAHIER STOCK VANILLE VERTE', 'BON DE LIVRAISON'],
  'Triage':       ['CHECK LIST CONTROLE PRODUCTION'],
  'Affinage':     ['FICHE MALLE'],
  'Pesage final': ['CAHIER DE PESAGE'],
  'Emballage':    ['ÉTIQUETTE CARTON', 'FICHE SORTIE STOCK'],
}

// Seuils de durée (heures) — process réel AGK-COMORES + HACCP vanille
const STEP_THRESHOLDS = {
  'Réception':          { warn: 6,    crit: 12,   avg: 3,    label: 'Réception'          },
  'Échaudage':          { warn: 4,    crit: 8,    avg: 2,    label: 'Échaudage'          },
  'Étuvage':            { warn: 60,   crit: 72,   avg: 48,   minH: 42, label: 'Étuvage' },
  'Séchage au soleil':  { warn: 240,  crit: 336,  avg: 192,  label: 'Séchage au soleil'  },
  "Séchage à l'ombre":  { warn: 120,  crit: 240,  avg: 96,   label: "Séchage à l'ombre"  },
  'Triage':             { warn: 8,    crit: 16,   avg: 5,    label: 'Triage'             },
  'Affinage':           { warn: 720,  crit: 1440, avg: 600,  label: 'Affinage'           },
  'Classement':         { warn: 4,    crit: 8,    avg: 2,    label: 'Classement'         },
  'Mise en botte':      { warn: 6,    crit: 12,   avg: 4,    label: 'Mise en botte'      },
  'Pesage final':       { warn: 2,    crit: 4,    avg: 1,    label: 'Pesage final'       },
  'Emballage':          { warn: 4,    crit: 8,    avg: 2,    label: 'Emballage'          },
}

// Délais max entre fin d'une étape et début de la suivante (heures)
const TRANSITION_THRESHOLDS = {
  'Réception':          { warn: 4,   crit: 12  }, // → Échaudage rapide (risque micro)
  'Échaudage':          { warn: 2,   crit: 6   }, // → Étuvage
  'Étuvage':            { warn: 4,   crit: 24  }, // → Séchage
  'Séchage au soleil':  { warn: 2,   crit: 8   }, // → Séchage ombre
  "Séchage à l'ombre":  { warn: 2,   crit: 8   }, // → Triage
  'Triage':             { warn: 4,   crit: 24  }, // → Affinage
  'Affinage':           { warn: 2,   crit: 12  }, // → Classement
  'Classement':         { warn: 2,   crit: 8   }, // → Mise en botte
  'Mise en botte':      { warn: 1,   crit: 4   }, // → Pesage
  'Pesage final':       { warn: 2,   crit: 6   }, // → Emballage
}

const QUALITY_THRESHOLDS = {
  moldPercent:   { warn: 5,  crit: 10, label: 'Moisie'  },
  splitPercent:  { warn: 30, crit: 50, label: 'Fendue'  },
  phenolPercent: { warn: 5,  crit: 10, label: 'Phénol'  },
  pocketPercent: { warn: 10, crit: 20, label: 'Poquet'  },
}

// Classification officielle
const CLASSIFICATIONS = [
  { key: '3eme_noire',   label: '3ème — Noire',   icon: '⬛' },
  { key: '3eme_gourmet', label: '3ème — Gourmet', icon: '🌟' },
  { key: '4eme_noire',   label: '4ème — Noire',   icon: '⬛' },
  { key: '4eme_rouge',   label: '4ème — Rouge',   icon: '🔴' },
  { key: 'mauvais',      label: 'Mauvais',        icon: '⚠️' },
  { key: 'sec_soleil',   label: 'Sec soleil',     icon: '🌵' },
]

// ─── Phases ──────────────────────────────────────────────────────────────────
const PHASES = [
  {
    label: 'PHASE 1 — PRÉ-TRAITEMENT',
    icon: '🌿',
    accent: '#4ade80',
    steps: ['Réception', 'Échaudage', 'Étuvage'],
  },
  {
    label: 'PHASE 2 — SÉCHAGE & AFFINAGE',
    icon: '☀️',
    accent: '#fb923c',
    steps: ['Séchage au soleil', "Séchage à l'ombre", 'Triage', 'Affinage'],
  },
  {
    label: 'PHASE 3 — CONDITIONNEMENT',
    icon: '📦',
    accent: '#93c5fd',
    steps: ['Classement', 'Mise en botte', 'Pesage final', 'Emballage'],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDuration(minutes) {
  if (minutes < 1) return '< 1min'
  if (minutes < 60) return `${Math.round(minutes)}min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h < 24) return m > 0 ? `${h}h ${m}min` : `${h}h`
  const d = Math.floor(h / 24)
  const rh = h % 24
  return rh > 0 ? `${d}j ${rh}h` : `${d}j`
}

function formatDateTime(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

function getStepDuration(step) {
  if (!step.startedAt) return null
  const end = step.completedAt ? new Date(step.completedAt) : new Date()
  return Math.floor((end - new Date(step.startedAt)) / 60000)
}

function parseHumNorm(order) {
  if (!order) return null
  if (order.productType === 'vanille_noire') return [36, 38]
  if (order.destination === 'us') return [25, 28]
  if (order.destination === 'eu') return [28, 32]
  return null
}

// ─── Alertes par étape ────────────────────────────────────────────────────────
function getStepAlerts(step, order) {
  const alerts = []
  const thr = STEP_THRESHOLDS[step.stepName]

  // 1. Durée excessive (étape active)
  if (step.startedAt && step.status === 'en_cours' && thr) {
    const hours = (Date.now() - new Date(step.startedAt)) / 3600000
    if (hours > thr.crit) {
      alerts.push({ level: 'critical', type: 'duration', msg: `Durée critique : ${formatDuration(Math.floor(hours * 60))} — seuil dépassé (max : ${thr.crit}h)` })
    } else if (hours > thr.warn) {
      alerts.push({ level: 'warning', type: 'duration', msg: `Durée longue : ${formatDuration(Math.floor(hours * 60))} — recommandé < ${thr.warn}h` })
    }
  }

  // 2. ÉCHAUDAGE — CCP température 60–65°C (document officiel)
  if (step.stepName === 'Échaudage') {
    if (step.temperature !== null && step.temperature !== undefined) {
      if (step.temperature < 60 || step.temperature > 65) {
        alerts.push({ level: 'critical', type: 'temp', msg: `Température ${step.temperature}°C hors norme CCP (60–65°C) — lot à bloquer` })
      } else if (step.temperature < 60.5 || step.temperature > 64.5) {
        alerts.push({ level: 'warning', type: 'temp', msg: `Température ${step.temperature}°C proche des limites CCP (60–65°C)` })
      }
    } else if (step.status === 'en_cours' && step.startedAt) {
      const mins = (Date.now() - new Date(step.startedAt)) / 60000
      if (mins > 30) alerts.push({ level: 'warning', type: 'temp_missing', msg: 'Température d\'échaudage non saisie — CCP obligatoire' })
    }
  }

  // 3. ÉTUVAGE — durée doit être ~48H (ni trop court ni trop long)
  if (step.stepName === 'Étuvage' && step.startedAt) {
    const durH = (Date.now() - new Date(step.startedAt)) / 3600000
    const minH = thr?.minH || 42
    if (step.status === 'en_cours' && durH > 72) {
      alerts.push({ level: 'critical', type: 'etuvage_long', msg: `Étuvage en cours depuis ${formatDuration(durH * 60)} — durée standard : 48H` })
    }
    if (step.completedAt) {
      const actualH = (new Date(step.completedAt) - new Date(step.startedAt)) / 3600000
      if (actualH < minH) {
        alerts.push({ level: 'critical', type: 'etuvage_short', msg: `Durée d'étuvage insuffisante : ${actualH.toFixed(0)}H (minimum requis : ${minH}H)` })
      }
    }
  }

  // 4. Humidité hors norme
  const norm = parseHumNorm(order)
  if (norm && step.humidityOut) {
    const val = parseFloat(step.humidityOut)
    const [min, max] = norm
    if (val < min || val > max) {
      alerts.push({ level: 'critical', type: 'humidity', msg: `Humidité ${val}% hors norme ${min}–${max}% — risque refus export` })
    } else if (val <= min + 0.5 || val >= max - 0.5) {
      alerts.push({ level: 'warning', type: 'humidity', msg: `Humidité ${val}% proche des limites (norme ${min}–${max}%)` })
    }
  }

  // 5. TRIAGE — défauts qualité
  if (step.stepName === 'Triage') {
    let warnCount = 0
    for (const [key, t] of Object.entries(QUALITY_THRESHOLDS)) {
      const val = parseFloat(step[key])
      if (!isNaN(val) && val > 0) {
        if (val >= t.crit) alerts.push({ level: 'critical', type: 'quality', msg: `${t.label} : ${val}% — seuil critique (> ${t.crit}%)` })
        else if (val >= t.warn) { alerts.push({ level: 'warning', type: 'quality', msg: `${t.label} : ${val}% — attention (> ${t.warn}%)` }); warnCount++ }
      }
    }
    if (warnCount >= 3) alerts.push({ level: 'critical', type: 'quality_cumul', msg: `${warnCount} défauts qualité simultanés — lot à surveillance renforcée` })
  }

  // 6. CLASSEMENT — mauvais ou sec soleil = qualité dégradée
  if (step.stepName === 'Classement') {
    if (step.classification === 'mauvais') {
      alerts.push({ level: 'critical', type: 'classification', msg: 'Lot classé "Mauvais" — valorisation export fortement limitée' })
    } else if (step.classification === 'sec_soleil') {
      alerts.push({ level: 'warning', type: 'classification', msg: 'Lot classé "Sec soleil" — valeur commerciale réduite' })
    }
  }

  // 7. PESAGE FINAL — taux de vanilline
  if (step.stepName === 'Pesage final' && step.vanillineRate !== null && step.vanillineRate !== undefined) {
    if (step.vanillineRate < 1.5) {
      alerts.push({ level: 'critical', type: 'vanilline', msg: `Taux de vanilline ${step.vanillineRate}% — en dessous du seuil export (≥ 1.5%)` })
    } else if (step.vanillineRate < 2.0) {
      alerts.push({ level: 'warning', type: 'vanilline', msg: `Taux de vanilline ${step.vanillineRate}% — faible (recommandé ≥ 2%)` })
    }
  }

  // 8. Documents requis manquants
  const requiredDocs = STEP_DOCS[step.stepName] || []
  if (requiredDocs.length > 0 && step.operatorName) {
    const missing = requiredDocs.filter(d => !(step.documents || []).includes(d))
    if (missing.length > 0) {
      alerts.push({ level: 'warning', type: 'docs', msg: `Document(s) manquant(s) : ${missing.join(', ')}` })
    }
  }

  // 9. Étape sans opérateur depuis 1h+
  if (step.status === 'en_cours' && !step.operatorName && step.startedAt) {
    const mins = (Date.now() - new Date(step.startedAt)) / 60000
    if (mins > 60) alerts.push({ level: 'warning', type: 'nooperator', msg: `Étape sans opérateur depuis ${formatDuration(mins)}` })
  }

  // 10. Perte de masse excessive
  if (step.quantityIn && step.quantityOut) {
    const qIn = parseFloat(step.quantityIn), qOut = parseFloat(step.quantityOut)
    if (qIn > 0) {
      const loss = (qIn - qOut) / qIn * 100
      if (loss > 25) alerts.push({ level: 'critical', type: 'weight', msg: `Perte ${loss.toFixed(1)}% — seuil critique (> 25%)` })
      else if (loss > 15) alerts.push({ level: 'warning', type: 'weight', msg: `Perte ${loss.toFixed(1)}% — attention (> 15%)` })
    }
  }

  // 11. Écart pesée réception vs lot
  if (step.stepName === 'Réception' && step.quantityIn && order?.lot?.quantityKg) {
    const lotKg = parseFloat(order.lot.quantityKg)
    const recv = parseFloat(step.quantityIn)
    if (lotKg > 0) {
      const diff = Math.abs(recv - lotKg) / lotKg * 100
      if (diff > 10) alerts.push({ level: 'critical', type: 'weight_mismatch', msg: `Pesée (${recv} kg) diffère de ${diff.toFixed(0)}% du lot déclaré (${lotKg} kg)` })
      else if (diff > 5) alerts.push({ level: 'warning', type: 'weight_mismatch', msg: `Différence pesée : ${diff.toFixed(0)}% vs lot (${lotKg} kg)` })
    }
  }

  return alerts
}

// Alertes de transition entre étapes
function getTransitionAlerts(steps) {
  const alerts = []
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1]
    const curr = steps[i]
    if (prev.status === 'termine' && curr.status === 'en_attente' && prev.completedAt) {
      const thr = TRANSITION_THRESHOLDS[prev.stepName]
      if (!thr) continue
      const hoursWaiting = (Date.now() - new Date(prev.completedAt)) / 3600000
      if (hoursWaiting > thr.crit) {
        alerts.push({ level: 'critical', type: 'transition', stepId: curr.id, msg: `Transition bloquée depuis ${formatDuration(hoursWaiting * 60)} — l'étape suivante n'a pas démarré (seuil : ${thr.crit}h)` })
      } else if (hoursWaiting > thr.warn) {
        alerts.push({ level: 'warning', type: 'transition', stepId: curr.id, msg: `Attente avant démarrage : ${formatDuration(hoursWaiting * 60)} (recommandé < ${thr.warn}h)` })
      }
    }
  }
  return alerts
}

// ─── Formulaire de saisie par étape ──────────────────────────────────────────
function StepForm({ step, order, onSave, saving }) {
  const [data, setData] = useState({
    operatorName:   step.operatorName   || '',
    quantityIn:     step.quantityIn     || '',
    quantityOut:    step.quantityOut    || '',
    humidityIn:     step.humidityIn     || '',
    humidityOut:    step.humidityOut    || '',
    moldPercent:    step.moldPercent    || '',
    splitPercent:   step.splitPercent   || '',
    phenolPercent:  step.phenolPercent  || '',
    pocketPercent:  step.pocketPercent  || '',
    boxCount:       step.boxCount       || '',
    notes:          step.notes          || '',
    documents:      step.documents      || [],
    // Nouveaux champs
    temperature:    step.temperature    || '',
    vanillineRate:  step.vanillineRate  || '',
    classification: step.classification || '',
    isFendue:       step.isFendue       !== undefined ? step.isFendue : null,
    bundleType:     step.bundleType     || '',
    bundleCount:    step.bundleCount    || '',
  })

  // Auto-suggestion poids depuis étape précédente
  const steps = order?.steps || []
  const stepIdx = steps.findIndex(s => s.id === step.id)
  const prevStep = stepIdx > 0 ? steps[stepIdx - 1] : null
  const suggestedQIn = prevStep?.quantityOut && !step.quantityIn ? parseFloat(prevStep.quantityOut) : null

  const field = (label, key, type = 'text', placeholder = '', required = false) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>
        {label}{required && <span style={{ color: '#963C47', marginLeft: 3 }}>*</span>}
      </label>
      <input type={type} value={data[key]} onChange={e => setData(d => ({ ...d, [key]: e.target.value }))}
        placeholder={placeholder}
        style={{ width: '100%', padding: '8px 11px', border: `1.5px solid ${required && !data[key] ? '#963C47' : 'var(--border-input, #96878E)'}`, borderRadius: 6, fontSize: 13, background: 'var(--paper)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none' }} />
    </div>
  )

  const norm = parseHumNorm(order)
  const liveQIn  = parseFloat(data.quantityIn)
  const liveQOut = parseFloat(data.quantityOut)
  const liveLoss = !isNaN(liveQIn) && !isNaN(liveQOut) && liveQIn > 0
    ? ((liveQIn - liveQOut) / liveQIn * 100).toFixed(1) : null
  const liveHum = parseFloat(data.humidityOut)
  const humOk = norm && !isNaN(liveHum) ? (liveHum >= norm[0] && liveHum <= norm[1]) : null
  const liveTemp = parseFloat(data.temperature)
  const tempOk = !isNaN(liveTemp) ? (liveTemp >= 60 && liveTemp <= 65) : null

  const toggleDoc = (doc) => setData(d => ({
    ...d, documents: d.documents.includes(doc) ? d.documents.filter(x => x !== doc) : [...d.documents, doc],
  }))
  const docs = STEP_DOCS[step.stepName] || []
  const isEchaudage = step.stepName === 'Échaudage'
  const isEtuvage   = step.stepName === 'Étuvage'
  const isSechage   = ['Séchage au soleil', "Séchage à l'ombre"].includes(step.stepName)
  const isTriage    = step.stepName === 'Triage'
  const isAffinage  = step.stepName === 'Affinage'
  const isClassement = step.stepName === 'Classement'
  const isMiseEnBotte = step.stepName === 'Mise en botte'
  const isPesageFinal = step.stepName === 'Pesage final'
  const isEmballage  = step.stepName === 'Emballage'
  const isReception  = step.stepName === 'Réception'

  return (
    <div>
      {/* Suggestion auto poids */}
      {suggestedQIn && (
        <div onClick={() => setData(d => ({ ...d, quantityIn: String(suggestedQIn) }))} style={{
          marginBottom: 14, padding: '9px 14px', borderRadius: 6,
          background: 'var(--cream)', border: '1px solid var(--border)',
          fontSize: 12, color: 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          💡 Suggéré : <strong>{suggestedQIn} kg</strong> (sortie étape précédente) — cliquer pour appliquer
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {field('Opérateur', 'operatorName', 'text', 'Nom de l\'opérateur')}

        {/* RÉCEPTION */}
        {isReception && field('Quantité reçue (kg)', 'quantityIn', 'number', '0.000')}

        {/* ÉCHAUDAGE — CCP température */}
        {isEchaudage && (<>
          {field('Quantité (kg)', 'quantityIn', 'number', '0.000')}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>
              Température (°C) <span style={{ color: '#963C47' }}>* CCP</span>
            </label>
            <input type="number" value={data.temperature} onChange={e => setData(d => ({ ...d, temperature: e.target.value }))}
              placeholder="60–65°C"
              style={{ width: '100%', padding: '8px 11px', border: `1.5px solid ${tempOk === false ? '#963C47' : tempOk === true ? '#435432' : 'var(--border-input, #96878E)'}`, borderRadius: 6, fontSize: 13, background: 'var(--paper)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none' }} />
            {tempOk !== null && (
              <div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: tempOk ? '#435432' : '#963C47' }}>
                {tempOk ? '✓ Température conforme (60–65°C)' : `✕ Hors norme CCP ! Norme : 60–65°C`}
              </div>
            )}
          </div>
        </>)}

        {/* ÉTUVAGE + SÉCHAGES */}
        {(isEtuvage || isSechage) && (<>
          {field('Quantité entrante (kg)', 'quantityIn', 'number', '0.000')}
          {field('Quantité sortante (kg)', 'quantityOut', 'number', '0.000')}
          {field('Humidité entrante (%)', 'humidityIn', 'number', '0.0')}
          {field('Humidité sortante (%)', 'humidityOut', 'number', '0.0')}
        </>)}

        {/* TRIAGE */}
        {isTriage && (<>
          {field('Quantité entrante (kg)', 'quantityIn', 'number', '0.000')}
          {field('Quantité sortante (kg)', 'quantityOut', 'number', '0.000')}
          {field('% Moisie',              'moldPercent',   'number', '0.0')}
          {field('% Phénol',              'phenolPercent', 'number', '0.0')}
          {field('% Poquet',              'pocketPercent', 'number', '0.0')}
        </>)}

        {/* CLASSEMENT — Fendue / Non fendue + grade */}
        {isClassement && (<>
          {field('Quantité (kg)', 'quantityIn', 'number', '0.000')}
          <div style={{ gridColumn: '1/-1', marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 6 }}>
              Fendue / Non fendue *
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ val: false, label: 'Non fendue', icon: '✓' }, { val: true, label: 'Fendue', icon: '⚡' }].map(opt => (
                <div key={String(opt.val)} onClick={() => setData(d => ({ ...d, isFendue: opt.val }))} style={{
                  flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                  border: `1.5px solid ${data.isFendue === opt.val ? (opt.val ? '#795015' : '#435432') : 'var(--border)'}`,
                  background: data.isFendue === opt.val ? (opt.val ? '#F5E8CC' : '#E5ECD9') : 'var(--paper)',
                  color: data.isFendue === opt.val ? (opt.val ? '#795015' : '#435432') : 'var(--ink)',
                  fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                }}>
                  {opt.icon} {opt.label}
                </div>
              ))}
            </div>
          </div>
          <div style={{ gridColumn: '1/-1', marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 6 }}>Classement *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {CLASSIFICATIONS.map(c => (
                <div key={c.key} onClick={() => setData(d => ({ ...d, classification: c.key }))} style={{
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                  border: `1.5px solid ${data.classification === c.key ? 'var(--clay)' : 'var(--border)'}`,
                  background: data.classification === c.key ? '#F8E6E8' : 'var(--paper)',
                  fontSize: 12, fontWeight: 600, color: data.classification === c.key ? 'var(--clay)' : 'var(--ink)',
                  transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: 16, marginBottom: 3 }}>{c.icon}</div>
                  {c.label}
                </div>
              ))}
            </div>
          </div>
        </>)}

        {/* MISE EN BOTTE */}
        {isMiseEnBotte && (<>
          {field('Quantité (kg)', 'quantityIn', 'number', '0.000')}
          {field('Nombre de bottes', 'bundleCount', 'number', '0')}
          <div style={{ gridColumn: '1/-1', marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 6 }}>Type de conditionnement *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { key: 'ficelle', label: 'Ficelle', sub: 'N/F 3ème/4ème', icon: '🪢' },
                { key: 'raphia',  label: 'Raphia',  sub: 'Fendue/Mauvais', icon: '🌾' },
                { key: 'vrac',    label: 'En vrac', sub: '',               icon: '📦' },
              ].map(bt => (
                <div key={bt.key} onClick={() => setData(d => ({ ...d, bundleType: bt.key }))} style={{
                  padding: '10px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                  border: `1.5px solid ${data.bundleType === bt.key ? 'var(--clay)' : 'var(--border)'}`,
                  background: data.bundleType === bt.key ? '#F8E6E8' : 'var(--paper)',
                  fontSize: 12, fontWeight: 600, color: data.bundleType === bt.key ? 'var(--clay)' : 'var(--ink)',
                  transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: 18, marginBottom: 3 }}>{bt.icon}</div>
                  {bt.label}
                  {bt.sub && <div style={{ fontSize: 10, color: 'var(--mist)', marginTop: 2 }}>{bt.sub}</div>}
                </div>
              ))}
            </div>
          </div>
        </>)}

        {/* PESAGE FINAL */}
        {isPesageFinal && (<>
          {field('Poids final (kg)', 'quantityIn', 'number', '0.000')}
          {field('Humidité finale (%)', 'humidityOut', 'number', '0.0')}
          <div style={{ marginBottom: 12, gridColumn: 'span 1' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>
              Taux de vanilline (%) *
            </label>
            <input type="number" step="0.01" value={data.vanillineRate} onChange={e => setData(d => ({ ...d, vanillineRate: e.target.value }))}
              placeholder="≥ 1.5%"
              style={{ width: '100%', padding: '8px 11px', border: `1.5px solid ${data.vanillineRate && parseFloat(data.vanillineRate) < 1.5 ? '#963C47' : 'var(--border-input, #96878E)'}`, borderRadius: 6, fontSize: 13, background: 'var(--paper)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none' }} />
            {data.vanillineRate && (
              <div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: parseFloat(data.vanillineRate) >= 2 ? '#435432' : parseFloat(data.vanillineRate) >= 1.5 ? '#795015' : '#963C47' }}>
                {parseFloat(data.vanillineRate) >= 2 ? '✓ Excellent' : parseFloat(data.vanillineRate) >= 1.5 ? '⚡ Acceptable (min 1.5%)' : '✕ En dessous du seuil export'}
              </div>
            )}
          </div>
        </>)}

        {/* EMBALLAGE */}
        {isEmballage && (<>
          {field('Quantité (kg)', 'quantityIn', 'number', '0.000')}
          {field('Nombre de cartons', 'boxCount', 'number', '0')}
        </>)}
      </div>

      {/* Indicateurs en temps réel */}
      {liveLoss !== null && (
        <div style={{
          marginBottom: 10, padding: '8px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6,
          background: parseFloat(liveLoss) > 25 ? '#F8E6E8' : parseFloat(liveLoss) > 15 ? '#F5E8CC' : '#E5ECD9',
          border: `1px solid ${parseFloat(liveLoss) > 25 ? '#963C47' : parseFloat(liveLoss) > 15 ? '#795015' : '#435432'}`,
          fontSize: 12, fontWeight: 600,
          color: parseFloat(liveLoss) > 25 ? '#963C47' : parseFloat(liveLoss) > 15 ? '#795015' : '#435432',
        }}>
          📉 Perte : {liveLoss}% ({(liveQIn - liveQOut).toFixed(3)} kg)
          {parseFloat(liveLoss) > 25 && <span style={{ marginLeft: 4 }}>— ✕ Critique</span>}
        </div>
      )}
      {humOk !== null && (
        <div style={{
          marginBottom: 10, padding: '8px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6,
          background: humOk ? '#E5ECD9' : '#F8E6E8',
          border: `1px solid ${humOk ? '#435432' : '#963C47'}`,
          fontSize: 12, fontWeight: 600, color: humOk ? '#435432' : '#963C47',
        }}>
          💧 {liveHum}% — {humOk ? `✓ Conforme (${norm[0]}–${norm[1]}%)` : `✕ Hors norme — cible : ${norm[0]}–${norm[1]}%`}
        </div>
      )}

      {/* Notes */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>
          {isAffinage ? 'Notes de visite hebdomadaire' : 'Notes / Observations'}
        </label>
        <textarea value={data.notes} onChange={e => setData(d => ({ ...d, notes: e.target.value }))}
          rows={isAffinage ? 4 : 2}
          placeholder={isAffinage ? "Date de visite, état de la vanille, quantité moisie, observations..." : "Remarques, anomalies..."}
          style={{ width: '100%', padding: '8px 11px', border: '1.5px solid var(--border-input, #96878E)', borderRadius: 6, fontSize: 13, resize: 'vertical', background: 'var(--paper)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none' }} />
      </div>

      {/* Documents */}
      {docs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 6 }}>Documents à cocher</label>
          {docs.map(doc => (
            <label key={doc} onClick={() => toggleDoc(doc)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 6,
              cursor: 'pointer', marginBottom: 6, transition: 'all 0.15s',
              border: `1.5px solid ${data.documents.includes(doc) ? 'var(--clay)' : 'var(--border)'}`,
              background: data.documents.includes(doc) ? 'var(--cream)' : 'var(--paper)',
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                border: `2px solid ${data.documents.includes(doc) ? 'var(--clay)' : 'var(--border)'}`,
                background: data.documents.includes(doc) ? 'var(--clay)' : 'var(--paper)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {data.documents.includes(doc) && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>{doc}</span>
            </label>
          ))}
        </div>
      )}

      <button onClick={() => onSave(data)} disabled={saving} style={{
        width: '100%', padding: '10px', borderRadius: 8, border: 'none',
        background: 'var(--green)', color: 'white', fontSize: 13.5, fontWeight: 600,
        opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s',
      }}>
        {saving ? '⏳ Enregistrement...' : '💾 Enregistrer'}
      </button>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function ConditioningDetail() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeStep, setActiveStep] = useState(null)
  const [showStepModal, setShowStepModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [showValidate, setShowValidate] = useState(null)
  const [validateForm, setValidateForm] = useState({ isConform: null, notes: '' })
  const [lastRefreshed, setLastRefreshed] = useState(null)

  const load = useCallback(() => {
    api.get(`/conditioning/${id}`)
      .then(res => { if (res.data?.success) { setOrder(res.data.data); setLastRefreshed(new Date()) } })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!order || order.status !== 'en_cours') return
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [order?.status, load])

  const handleSaveStep = async (data) => {
    setSaving(true)
    try {
      const res = await api.put(`/conditioning/${id}/steps/${activeStep.id}`, data)
      if (res.data?.success) {
        toast.success('✅ Données enregistrées')
        setShowStepModal(false)
        load()
      } else { toast.error(res.data?.message || 'Erreur enregistrement') }
    } catch (err) { toast.error(err?.response?.data?.message || 'Erreur réseau') }
    finally { setSaving(false) }
  }

  const openValidate = (step) => {
    const criticals = getStepAlerts(step, order).filter(a => a.level === 'critical')
    setShowValidate(step)
    setValidateForm({
      isConform: criticals.length > 0 ? false : null,
      notes: criticals.length > 0 ? `⚠️ Alertes :\n${criticals.map(a => `• ${a.msg}`).join('\n')}` : '',
    })
  }

  const handleValidate = async () => {
    setValidating(true)
    try {
      const res = await api.post(`/conditioning/${id}/steps/${showValidate.id}/validate`, validateForm)
      if (res.data?.success) {
        toast.success(validateForm.isConform ? '✅ Étape validée' : '❌ Non conforme')
        setShowValidate(null)
        setValidateForm({ isConform: null, notes: '' })
        load()
      } else { toast.error(res.data?.message || 'Erreur validation') }
    } catch (err) { toast.error(err?.response?.data?.message || 'Erreur réseau') }
    finally { setValidating(false) }
  }

  if (loading) return <PageLoader />
  if (!order) return <div style={{ padding: 48, textAlign: 'center', color: '#f87171' }}>Ordre introuvable</div>

  const isQualityManager = user?.role === 'admin' || user?.role === 'quality_manager'
  const humNorm = order.productType === 'vanille_noire' ? '36–38%'
    : order.destination === 'us' ? '25–28% (US)' : '28–32% (EU)'
  const norm = parseHumNorm(order)

  // ─── KPIs ──────────────────────────────────────────────────────────────────
  const receptStep  = order.steps?.find(s => s.stepName === 'Réception')
  const weightIn    = receptStep?.quantityIn ? parseFloat(receptStep.quantityIn) : null
  const lastWithOut = [...(order.steps || [])].reverse().find(s => s.quantityOut)
  const weightOut   = lastWithOut?.quantityOut ? parseFloat(lastWithOut.quantityOut) : null
  const lossPct     = weightIn && weightOut ? ((weightIn - weightOut) / weightIn * 100) : null
  const elapsedMins = Math.floor((Date.now() - new Date(order.createdAt)) / 60000)
  const completedSteps = order.steps?.filter(s => s.status === 'termine').length || 0
  const totalSteps  = order.steps?.length || 11
  const progressPct = Math.round(completedSteps / totalSteps * 100)
  const pesageFinalStep = order.steps?.find(s => s.stepName === 'Pesage final')
  const vanillineRate = pesageFinalStep?.vanillineRate

  // Fin estimée
  const remainingSteps = order.steps?.filter(s => s.status !== 'termine') || []
  const estRemainingMins = order.status === 'en_cours' ? remainingSteps.reduce((sum, s) => {
    const thr = STEP_THRESHOLDS[s.stepName]
    const baseline = (thr?.avg || thr?.warn || 4) * 60
    if (s.status === 'en_cours' && s.startedAt) {
      const elapsed = (Date.now() - new Date(s.startedAt)) / 60000
      return sum + Math.max(0, baseline - elapsed)
    }
    return sum + baseline
  }, 0) : 0
  const estEndTime = order.status === 'en_cours' ? new Date(Date.now() + estRemainingMins * 60000) : null

  // ─── Alertes ───────────────────────────────────────────────────────────────
  const transitionAlerts = getTransitionAlerts(order.steps || [])
  const allAlerts        = [...(order.steps?.flatMap(s => getStepAlerts(s, order)) || []), ...transitionAlerts]
  const criticalAlerts   = allAlerts.filter(a => a.level === 'critical')
  const warningAlerts    = allAlerts.filter(a => a.level === 'warning')

  // ─── Tendance humidité ─────────────────────────────────────────────────────
  const humidityPoints = order.steps?.filter(s => s.humidityOut).map(s => ({
    step: s.stepName, val: parseFloat(s.humidityOut),
    ok: norm ? (parseFloat(s.humidityOut) >= norm[0] && parseFloat(s.humidityOut) <= norm[1]) : null,
  })) || []

  return (
    <div style={{ padding: '28px 36px', minHeight: '100vh' }} className="fade-in">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <button onClick={() => navigate('/conditioning')} style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--pale)', color: 'var(--green)', fontSize: 13, flexShrink: 0, border: 'none', cursor: 'pointer' }}>← Retour</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', fontWeight: 700 }}>
            🏭 {order.productType === 'vanille_noire' ? '🖤 Vanille Noire' : '❤️ Vanille Rouge'} — Passage #{order.passNumber}
          </h1>
          <p style={{ color: 'var(--mist)', fontSize: 13, marginTop: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span>{order.lot?.lotNumber} — {order.lot?.producer?.name}</span>
            {order.destination && <span style={{ background: 'rgba(99,102,241,0.2)', color: '#93c5fd', padding: '1px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600 }}>{order.destination.toUpperCase()}</span>}
            <span>Norme humidité : <strong style={{ color: 'var(--ink)' }}>{humNorm}</strong></span>
            {order.lot?.quantityKg && <span>⚖️ {Number(order.lot.quantityKg).toLocaleString()} kg</span>}
            {lastRefreshed && order.status === 'en_cours' && <span style={{ fontSize: 11, color: '#4ade80' }}>🟢 {lastRefreshed.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <div style={{
          padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, flexShrink: 0,
          background: order.status === 'termine' ? 'rgba(34,197,94,0.15)' : order.status === 'non_conforme' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
          color: order.status === 'termine' ? '#4ade80' : order.status === 'non_conforme' ? '#f87171' : '#fb923c',
        }}>
          {order.status === 'termine' ? '✅ Terminé' : order.status === 'non_conforme' ? '⚠️ Non conforme' : '⚙️ En cours'}
        </div>
      </div>

      {/* ── KPI BAR ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '⬇️', label: 'Poids entrant',   value: weightIn  ? `${Number(weightIn).toLocaleString('fr-FR')} kg`  : '—', color: 'var(--ink)' },
          { icon: '⬆️', label: 'Poids sortant',   value: weightOut ? `${Number(weightOut).toLocaleString('fr-FR')} kg` : '—', color: 'var(--ink)' },
          { icon: '📉', label: 'Perte de masse',   value: lossPct !== null ? `${lossPct.toFixed(1)}%` : '—', sub: lossPct !== null ? `${(weightIn - weightOut).toFixed(2)} kg` : null, color: lossPct === null ? 'var(--slate)' : lossPct > 25 ? '#f87171' : lossPct > 15 ? '#fb923c' : '#4ade80' },
          { icon: '🔬', label: 'Taux vanilline',   value: vanillineRate !== null && vanillineRate !== undefined ? `${vanillineRate}%` : '—', color: vanillineRate === null || vanillineRate === undefined ? 'var(--slate)' : vanillineRate >= 2 ? '#4ade80' : vanillineRate >= 1.5 ? '#fb923c' : '#f87171' },
          { icon: '📊', label: 'Avancement',        value: `${progressPct}%`, sub: `${completedSteps} / ${totalSteps} étapes`, color: progressPct === 100 ? '#4ade80' : 'var(--ink)' },
          { icon: estEndTime ? '🏁' : '✅', label: estEndTime ? 'Fin estimée' : 'Clôturé le', value: estEndTime ? estEndTime.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—', sub: estEndTime ? estEndTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null, color: estEndTime ? '#fb923c' : 'var(--ink)' },
        ].map((kpi, i) => (
          <Card key={i} style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{kpi.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: kpi.color, lineHeight: 1.2 }}>{kpi.value}</div>
            {kpi.sub && <div style={{ fontSize: 10.5, color: 'var(--mist)', marginTop: 2 }}>{kpi.sub}</div>}
            <div style={{ fontSize: 11, color: 'var(--mist)', marginTop: 3 }}>{kpi.label}</div>
          </Card>
        ))}
      </div>

      {/* ── TENDANCE HUMIDITÉ ──────────────────────────────────────────────── */}
      {humidityPoints.length > 0 && (
        <Card style={{ padding: '14px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--mist)', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            💧 Suivi humidité{norm ? ` — Norme export : ${norm[0]}–${norm[1]}%` : ''}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {humidityPoints.map((pt, i) => (
              <React.Fragment key={i}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 14 }}>{STEP_ICONS[pt.step] || '●'}</span>
                  <div style={{
                    padding: '4px 10px', borderRadius: 6, fontWeight: 700, fontSize: 14,
                    background: pt.ok === null ? 'var(--cream)' : pt.ok ? '#E5ECD9' : '#F8E6E8',
                    color: pt.ok === null ? 'var(--slate)' : pt.ok ? '#435432' : '#963C47',
                    border: `1px solid ${pt.ok === null ? 'var(--border)' : pt.ok ? '#435432' : '#963C47'}`,
                  }}>{pt.val}%</div>
                  <span style={{ fontSize: 10, color: 'var(--mist)', maxWidth: 72, textAlign: 'center', lineHeight: 1.3 }}>
                    {pt.step.length > 10 ? pt.step.split(' ')[0] : pt.step}
                  </span>
                </div>
                {i < humidityPoints.length - 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ color: 'var(--border)', fontSize: 18 }}>→</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: humidityPoints[i + 1].val < pt.val ? '#435432' : humidityPoints[i + 1].val > pt.val ? '#963C47' : 'var(--mist)' }}>
                      {humidityPoints[i + 1].val < pt.val ? '↘' : humidityPoints[i + 1].val > pt.val ? '↗' : '→'}
                    </span>
                  </div>
                )}
              </React.Fragment>
            ))}
            {norm && <div style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: 6, background: '#E5ECD9', border: '1px solid #435432', fontSize: 11.5, color: '#435432', fontWeight: 600 }}>🎯 Cible : {norm[0]}–{norm[1]}%</div>}
          </div>
        </Card>
      )}

      {/* ── BANNIÈRE ALERTES ───────────────────────────────────────────────── */}
      {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
        <div style={{
          marginBottom: 20, borderRadius: 8, padding: '14px 18px',
          background: criticalAlerts.length > 0 ? '#F8E6E8' : '#F5E8CC',
          border: `1px solid ${criticalAlerts.length > 0 ? '#963C47' : '#795015'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>{criticalAlerts.length > 0 ? '✕' : '⚡'}</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: criticalAlerts.length > 0 ? '#963C47' : '#795015' }}>
              {criticalAlerts.length > 0
                ? `${criticalAlerts.length} alerte${criticalAlerts.length > 1 ? 's' : ''} critique${criticalAlerts.length > 1 ? 's' : ''}`
                : `${warningAlerts.length} avertissement${warningAlerts.length > 1 ? 's' : ''}`
              }
            </span>
            {criticalAlerts.length > 0 && warningAlerts.length > 0 && (
              <span style={{ fontSize: 11.5, color: '#795015', marginLeft: 4 }}>+ {warningAlerts.length} avert.</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[...criticalAlerts, ...warningAlerts].slice(0, 6).map((alert, i) => (
              <div key={i} style={{
                fontSize: 12, padding: '4px 10px', borderRadius: 4,
                background: alert.level === 'critical' ? '#FCECEE' : '#FAF2DE',
                color: alert.level === 'critical' ? '#963C47' : '#795015',
                display: 'flex', alignItems: 'flex-start', gap: 6, fontWeight: 500,
              }}>
                <span>{alert.level === 'critical' ? '✕' : '⚡'}</span>{alert.msg}
              </div>
            ))}
            {allAlerts.length > 6 && <div style={{ fontSize: 11.5, color: 'var(--mist)', paddingLeft: 4 }}>+ {allAlerts.length - 6} autres</div>}
          </div>
        </div>
      )}

      {/* ── PHASES ─────────────────────────────────────────────────────────── */}
      {(() => {
        const allPhaseNames = PHASES.flatMap(p => p.steps)
        const legacySteps   = order.steps?.filter(s => !allPhaseNames.includes(s.stepName)) || []
        const hasNewSteps   = order.steps?.some(s => allPhaseNames.includes(s.stepName))
        if (!hasNewSteps && legacySteps.length > 0) {
          return (
            <Card style={{ marginBottom: 20, overflow: 'hidden' }}>
              <div style={{ background: 'rgba(255,255,255,0.025)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--mist)', fontSize: 12, fontWeight: 700, letterSpacing: 1.5 }}>⚙️ ÉTAPES DE CONDITIONNEMENT</span>
                <span style={{ fontSize: 11.5, padding: '2px 10px', borderRadius: 20, fontWeight: 600, background: 'rgba(255,255,255,0.05)', color: 'var(--mist)' }}>
                  {legacySteps.filter(s => s.status === 'termine').length}/{legacySteps.length} étapes
                </span>
              </div>
              <div style={{ padding: '16px 20px' }}>
                {legacySteps.map((step, idx) => {
                  const isActive  = step.status === 'en_cours'
                  const isDone    = step.status === 'termine'
                  const isPending = step.status === 'en_attente'
                  const stepAlerts = getStepAlerts(step, order)
                  const stepDur  = getStepDuration(step)
                  return (
                    <div key={step.id} style={{ display: 'flex', gap: 14, paddingBottom: idx < legacySteps.length - 1 ? 14 : 0, marginBottom: idx < legacySteps.length - 1 ? 14 : 0, borderBottom: idx < legacySteps.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', opacity: isPending ? 0.55 : 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, flexShrink: 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, background: isDone ? 'rgba(34,197,94,0.15)' : isActive ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)', border: `2px solid ${isDone ? '#4ade80' : isActive ? '#fb923c' : 'rgba(255,255,255,0.1)'}`, color: isDone ? '#4ade80' : isActive ? '#fb923c' : 'var(--mist)' }}>
                          {isDone ? '✓' : isActive ? '▶' : step.stepOrder}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                          <span style={{ fontWeight: 600, fontSize: 13.5, color: isActive ? '#fb923c' : isDone ? '#4ade80' : 'var(--ink)' }}>
                            {STEP_ICONS[step.stepName] || '⚙️'} {step.stepName}
                          </span>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {stepDur !== null && <span style={{ fontSize: 11.5, color: 'var(--mist)' }}>⏱ {formatDuration(stepDur)}</span>}
                            {isActive && isQualityManager && (
                              <button onClick={() => { setActiveStep(step); setShowStepModal(true) }} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.1)', color: '#fb923c', cursor: 'pointer' }}>Saisir</button>
                            )}
                            {(isActive || isDone) && isQualityManager && !isDone && (
                              <button onClick={() => { setShowValidate(step); setValidateForm({ isConform: null, notes: '' }) }} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.1)', color: '#4ade80', cursor: 'pointer' }}>Valider</button>
                            )}
                          </div>
                        </div>
                        {step.operatorName && <div style={{ fontSize: 11.5, color: 'var(--mist)', marginBottom: 2 }}>👤 {step.operatorName}</div>}
                        {stepAlerts.length > 0 && (
                          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {stepAlerts.map((a, i) => (
                              <div key={i} style={{ fontSize: 11.5, padding: '3px 10px', borderRadius: 6, background: a.level === 'critical' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${a.level === 'critical' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`, color: a.level === 'critical' ? '#fca5a5' : '#fcd34d', display: 'flex', gap: 6 }}>
                                <span>{a.level === 'critical' ? '🚨' : '⚠️'}</span>{a.msg}
                              </div>
                            ))}
                          </div>
                        )}
                        {isPending && <div style={{ fontSize: 12, color: 'var(--mist)', fontStyle: 'italic', marginTop: 4 }}>En attente de l'étape précédente</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        }
        return null
      })()}
      {PHASES.map(phase => {
        const phaseSteps = order.steps?.filter(s => phase.steps.includes(s.stepName)) || []
        const phaseDone  = phaseSteps.filter(s => s.status === 'termine').length
        const phaseComplete = phaseDone === phaseSteps.length && phaseSteps.length > 0
        if (phaseSteps.length === 0) return null
        return (
          <Card key={phase.label} style={{ marginBottom: 20, overflow: 'hidden' }}>
            <div style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--ink)', fontSize: 12, fontWeight: 700, letterSpacing: 1.5 }}>{phase.icon} {phase.label}</span>
              <span style={{ fontSize: 11.5, padding: '2px 10px', borderRadius: 20, fontWeight: 600, background: phaseComplete ? '#E5ECD9' : 'var(--paper)', color: phaseComplete ? '#435432' : 'var(--mist)', border: `1px solid ${phaseComplete ? '#435432' : 'var(--border)'}` }}>
                {phaseComplete ? '✓ ' : ''}{phaseDone}/{phaseSteps.length} étapes
              </span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {phaseSteps.map((step, idx) => {
                const isActive  = step.status === 'en_cours'
                const isDone    = step.status === 'termine'
                const isPending = step.status === 'en_attente'
                const stepAlerts    = getStepAlerts(step, order)
                const stepTransAlts = transitionAlerts.filter(a => a.stepId === step.id)
                const allStepAlts   = [...stepAlerts, ...stepTransAlts]
                const stepCriticals = allStepAlts.filter(a => a.level === 'critical')
                const stepWarnings  = allStepAlts.filter(a => a.level === 'warning')
                const durMins   = getStepDuration(step)
                const thr       = STEP_THRESHOLDS[step.stepName]
                const durHours  = durMins !== null ? durMins / 60 : 0
                const durIsCrit = thr && isActive && durHours > thr.crit
                const durIsWarn = thr && isActive && durHours > thr.warn
                const humComplianceOk = norm && step.humidityOut
                  ? parseFloat(step.humidityOut) >= norm[0] && parseFloat(step.humidityOut) <= norm[1]
                  : null
                const tempOk = step.temperature !== null && step.temperature !== undefined
                  ? (step.temperature >= 60 && step.temperature <= 65) : null
                const classLabel = CLASSIFICATIONS.find(c => c.key === step.classification)

                return (
                  <div key={step.id} style={{ display: 'flex', gap: 16, marginBottom: idx < phaseSteps.length - 1 ? 18 : 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 40 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: isDone ? '#435432' : isActive ? '#AD5138' : 'var(--cream)',
                        color: isDone || isActive ? 'white' : 'var(--mist)',
                        border: `2px solid ${isDone ? '#435432' : isActive ? '#AD5138' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, transition: 'all 0.3s',
                      }}>
                        {isDone ? '✓' : STEP_ICONS[step.stepName] || step.stepOrder}
                      </div>
                      {idx < phaseSteps.length - 1 && (
                        <div style={{ width: 2, flex: 1, minHeight: 24, background: isDone ? '#435432' : 'var(--border)', marginTop: 4, transition: 'background 0.3s' }} />
                      )}
                    </div>

                    <div style={{
                      flex: 1, borderRadius: 8, padding: '12px 16px', marginBottom: 4, transition: 'border-color 0.2s',
                      border: `1.5px solid ${stepCriticals.length > 0 ? '#963C47' : isActive ? '#AD5138' : 'var(--border)'}`,
                      background: isActive ? 'var(--cream)' : 'var(--paper)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{step.stepName}</span>
                            {step.operatorName && <span style={{ fontSize: 12, color: 'var(--mist)' }}>👤 {step.operatorName}</span>}
                            {stepCriticals.length > 0 && (
                              <span style={{ fontSize: 10.5, padding: '1px 7px', borderRadius: 4, background: '#F8E6E8', color: '#963C47', fontWeight: 700, border: '1px solid #963C47' }}>
                                ✕ {stepCriticals.length} critique{stepCriticals.length > 1 ? 's' : ''}
                              </span>
                            )}
                            {stepWarnings.length > 0 && stepCriticals.length === 0 && (
                              <span style={{ fontSize: 10.5, padding: '1px 7px', borderRadius: 4, background: '#F5E8CC', color: '#795015', fontWeight: 700, border: '1px solid #795015' }}>
                                ⚡ {stepWarnings.length}
                              </span>
                            )}
                          </div>
                          {(step.startedAt || step.completedAt) && (
                            <div style={{ fontSize: 11, color: 'var(--mist)', marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                              {step.startedAt   && <span>▶ {formatDateTime(step.startedAt)}</span>}
                              {step.completedAt && <span>■ {formatDateTime(step.completedAt)}</span>}
                            </div>
                          )}
                          {durMins !== null && (
                            <div style={{ marginTop: 5 }}>
                              <span style={{
                                fontSize: 11, padding: '2px 8px', borderRadius: 4,
                                background: durIsCrit ? '#F8E6E8' : durIsWarn ? '#F5E8CC' : 'var(--cream)',
                                color: durIsCrit ? '#963C47' : durIsWarn ? '#795015' : 'var(--mist)',
                                border: `1px solid ${durIsCrit ? '#963C47' : durIsWarn ? '#795015' : 'var(--border)'}`,
                              }}>
                                {durIsCrit ? '✕' : '⏱'} {isDone ? 'Durée : ' : 'En cours : '}{formatDuration(durMins)}
                                {thr && isActive && <span style={{ opacity: 0.7 }}> / max {thr.crit}h</span>}
                              </span>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, marginLeft: 10 }}>
                          {isActive && <button onClick={() => { setActiveStep(step); setShowStepModal(true) }} style={{ padding: '5px 12px', borderRadius: 7, background: '#f97316', color: 'white', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>✏️ Saisir</button>}
                          {isActive && isQualityManager && step.operatorName && <button onClick={() => openValidate(step)} style={{ padding: '5px 12px', borderRadius: 7, background: 'var(--green)', color: 'white', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>✅ Valider</button>}
                          {isDone && <button onClick={() => { setActiveStep(step); setShowStepModal(true) }} style={{ padding: '5px 12px', borderRadius: 7, background: 'var(--pale)', color: 'var(--green)', fontSize: 12, border: 'none', cursor: 'pointer' }}>👁 Voir</button>}
                        </div>
                      </div>

                      {/* Données saisies */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 12, color: 'var(--slate)', marginTop: 4 }}>
                        {step.quantityIn  && <span>⬇️ {Number(step.quantityIn).toLocaleString()} kg</span>}
                        {step.quantityOut && <span>⬆️ {Number(step.quantityOut).toLocaleString()} kg</span>}
                        {step.temperature !== null && step.temperature !== undefined && (
                          <span style={{ color: tempOk ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                            🌡️ {step.temperature}°C {tempOk ? '✓' : '✗'}
                          </span>
                        )}
                        {step.humidityIn  && <span>💧 Entrée: {step.humidityIn}%</span>}
                        {step.humidityOut && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            💧 Sortie: {step.humidityOut}%
                            {humComplianceOk !== null && (
                              <span style={{ fontSize: 10, padding: '0 5px', borderRadius: 6, background: humComplianceOk ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: humComplianceOk ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                                {humComplianceOk ? '✓' : '✗'}
                              </span>
                            )}
                          </span>
                        )}
                        {step.moldPercent   > 0 && <span>🍄 Moisie: {step.moldPercent}%</span>}
                        {step.phenolPercent > 0 && <span>🧪 Phénol: {step.phenolPercent}%</span>}
                        {step.pocketPercent > 0 && <span>🫙 Poquet: {step.pocketPercent}%</span>}
                        {classLabel && <span style={{ color: classLabel.key === 'mauvais' || classLabel.key === 'sec_soleil' ? '#fb923c' : '#4ade80', fontWeight: 600 }}>{classLabel.icon} {classLabel.label}</span>}
                        {step.isFendue !== null && step.isFendue !== undefined && (
                          <span style={{ color: step.isFendue ? '#fb923c' : '#4ade80' }}>{step.isFendue ? '⚡ Fendue' : '✅ Non fendue'}</span>
                        )}
                        {step.bundleType && <span>🌿 {step.bundleType}{step.bundleCount ? ` — ${step.bundleCount} bottes` : ''}</span>}
                        {step.vanillineRate !== null && step.vanillineRate !== undefined && (
                          <span style={{ color: step.vanillineRate >= 2 ? '#4ade80' : step.vanillineRate >= 1.5 ? '#fb923c' : '#f87171', fontWeight: 600 }}>
                            🔬 Vanilline: {step.vanillineRate}%
                          </span>
                        )}
                        {step.boxCount && <span>📦 {step.boxCount} cartons</span>}
                        {step.quantityIn && step.quantityOut && (() => {
                          const loss = ((parseFloat(step.quantityIn) - parseFloat(step.quantityOut)) / parseFloat(step.quantityIn) * 100).toFixed(1)
                          return <span style={{ color: parseFloat(loss) > 25 ? '#f87171' : parseFloat(loss) > 15 ? '#fb923c' : 'var(--slate)' }}>📉 Perte: {loss}%</span>
                        })()}
                      </div>

                      {step.notes && (
                        <div style={{ fontSize: 11.5, color: 'var(--mist)', fontStyle: 'italic', marginTop: 7, display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                          <span style={{ flexShrink: 0 }}>💬</span>
                          <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{step.notes}</span>
                        </div>
                      )}
                      {step.documents?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                          {step.documents.map(doc => <span key={doc} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(34,197,94,0.15)', color: '#4ade80', fontWeight: 500 }}>✓ {doc}</span>)}
                        </div>
                      )}
                      {isDone && step.isConform !== null && step.isConform !== undefined && (
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 11.5, padding: '2px 10px', borderRadius: 10, fontWeight: 600, background: step.isConform ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: step.isConform ? '#4ade80' : '#f87171' }}>
                            {step.isConform ? '✅ Conforme' : '❌ Non conforme'}
                          </span>
                          {step.validatedBy && <span style={{ fontSize: 11, color: 'var(--mist)' }}>par {step.validatedBy}</span>}
                        </div>
                      )}
                      {isPending && <div style={{ fontSize: 12, color: 'var(--mist)', fontStyle: 'italic', marginTop: 6 }}>En attente de l'étape précédente</div>}
                      {allStepAlts.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {allStepAlts.map((alert, i) => (
                            <div key={i} style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 6, background: alert.level === 'critical' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${alert.level === 'critical' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`, color: alert.level === 'critical' ? '#fca5a5' : '#fcd34d', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                              <span>{alert.level === 'critical' ? '🚨' : '⚠️'}</span>{alert.msg}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )
      })}

      {/* ── MODAL SAISIE ───────────────────────────────────────────────────── */}
      <Modal open={showStepModal} onClose={() => setShowStepModal(false)}
        title={`${STEP_ICONS[activeStep?.stepName] || '⚙️'} ${activeStep?.stepName || ''}`} size="lg">
        {activeStep && <StepForm step={activeStep} order={order} onSave={handleSaveStep} saving={saving} />}
      </Modal>

      {/* ── MODAL VALIDATION ───────────────────────────────────────────────── */}
      <Modal open={!!showValidate} onClose={() => setShowValidate(null)}
        title={`✅ Validation — ${showValidate?.stepName || ''}`} size="sm">
        {showValidate && (
          <div>
            {validateForm.isConform === false && getStepAlerts(showValidate, order).filter(a => a.level === 'critical').length > 0 && (
              <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 6, background: '#F8E6E8', border: '1px solid #963C47', fontSize: 12, color: '#963C47' }}>
                ✕ Alertes critiques détectées — non-conformité pré-sélectionnée
              </div>
            )}
            <p style={{ fontSize: 13.5, color: 'var(--slate)', marginBottom: 20 }}>Confirmez-vous la conformité de cette étape ?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[{ val: true, label: 'Conforme', color: '#435432', bg: '#E5ECD9', icon: '✓' }, { val: false, label: 'Non conforme', color: '#963C47', bg: '#F8E6E8', icon: '✕' }].map(opt => (
                <div key={String(opt.val)} onClick={() => setValidateForm(f => ({ ...f, isConform: opt.val }))} style={{ padding: '14px', borderRadius: 8, cursor: 'pointer', textAlign: 'center', border: `1.5px solid ${validateForm.isConform === opt.val ? opt.color : 'var(--border)'}`, background: validateForm.isConform === opt.val ? opt.bg : 'var(--paper)', transition: 'all 0.15s' }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{opt.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: validateForm.isConform === opt.val ? opt.color : 'var(--ink)' }}>{opt.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--slate)', marginBottom: 5 }}>Commentaire</label>
              <textarea value={validateForm.notes} onChange={e => setValidateForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Observations..." style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border-input, #96878E)', borderRadius: 6, fontSize: 13, resize: 'vertical', background: 'var(--paper)', color: 'var(--ink)', boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowValidate(null)} style={{ padding: '9px 18px', borderRadius: 6, background: 'var(--cream)', color: 'var(--ink)', fontSize: 13.5, border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
              <button onClick={handleValidate} disabled={validating || validateForm.isConform === null} style={{ padding: '9px 18px', borderRadius: 6, background: 'var(--ink)', color: 'var(--paper)', fontSize: 13.5, fontWeight: 600, border: 'none', opacity: (validating || validateForm.isConform === null) ? 0.5 : 1, cursor: (validating || validateForm.isConform === null) ? 'not-allowed' : 'pointer' }}>
                {validating ? '⏳...' : 'Confirmer'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
