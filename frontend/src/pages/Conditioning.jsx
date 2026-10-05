
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { PageLoader, EmptyState } from '../components/ui/Spinner'
import api from '../lib/api'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  en_cours:     { label: 'En cours',     bg: '#EAE2EB',  color: '#352638', dot: '#352638', solid: '#352638' },
  termine:      { label: 'Terminé',      bg: '#E5ECD9',   color: '#435432', dot: '#435432', solid: '#435432' },
  non_conforme: { label: 'Non conforme', bg: '#F8E6E8',   color: '#963C47', dot: '#963C47', solid: '#963C47' },
}

const PRODUCT_CONFIG = {
  vanille_noire: { label: 'Vanille Noire', icon: '🖤', color: 'var(--ink)', bg: '#EAE2EB'  },
  vanille_rouge: { label: 'Vanille Rouge', icon: '❤️', color: 'var(--clay)', bg: '#F8E6E8'  },
}

const STEP_ICONS = {
  'Reception': '📦', 'Sechage': '☀️', 'Triage et mesurage': '⚖️',
  'Mise en sachet sous-vide': '🛍️', 'Detecteur de metal': '🔍',
  'Mise en carton': '📫', 'Transfert stock fini': '✅',
}

const STEP_THRESHOLDS = {
  'Reception':                { warn: 6,   crit: 12  },
  'Sechage':                  { warn: 48,  crit: 96  },
  'Triage et mesurage':       { warn: 8,   crit: 16  },
  'Mise en sachet sous-vide': { warn: 6,   crit: 12  },
  'Detecteur de metal':       { warn: 2,   crit: 4   },
  'Mise en carton':           { warn: 4,   crit: 8   },
  'Transfert stock fini':     { warn: 2,   crit: 6   },
}

const QUALITY_THRESHOLDS = {
  moldPercent:   { warn: 5,  crit: 10 },
  splitPercent:  { warn: 30, crit: 50 },
  phenolPercent: { warn: 5,  crit: 10 },
  pocketPercent: { warn: 10, crit: 20 },
}

function formatDuration(minutes) {
  if (minutes < 60) return `${Math.round(minutes)}min`
  const h = Math.floor(minutes / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  const rh = h % 24
  return rh > 0 ? `${d}j ${rh}h` : `${d}j`
}

function parseHumNorm(order) {
  if (order.productType === 'vanille_noire') return [36, 38]
  if (order.destination === 'us') return [25, 28]
  if (order.destination === 'eu') return [28, 32]
  return null
}

function getLastActivity(order) {
  const dates = (order.steps || [])
    .flatMap(s => [s.updatedAt, s.startedAt, s.completedAt].filter(Boolean))
    .map(d => new Date(d))
  return dates.length > 0 ? new Date(Math.max(...dates)) : new Date(order.createdAt)
}

function getOrderAlerts(order) {
  let crit = 0, warn = 0
  for (const step of (order.steps || [])) {
    const thr = STEP_THRESHOLDS[step.stepName]
    if (step.startedAt && step.status === 'en_cours' && thr) {
      const hours = (Date.now() - new Date(step.startedAt)) / 3600000
      if (hours > thr.crit) crit++
      else if (hours > thr.warn) warn++
    }
    const norm = parseHumNorm(order)
    if (norm && step.humidityOut) {
      const val = parseFloat(step.humidityOut)
      if (val < norm[0] || val > norm[1]) crit++
      else if (val <= norm[0] + 0.5 || val >= norm[1] - 0.5) warn++
    }
    if (step.metalDetResult === 'Non conforme') crit++
    if (step.stepName === 'Triage et mesurage') {
      let warnCount = 0
      for (const [key, t] of Object.entries(QUALITY_THRESHOLDS)) {
        const val = parseFloat(step[key])
        if (!isNaN(val) && val > 0) {
          if (val >= t.crit) crit++
          else if (val >= t.warn) { warn++; warnCount++ }
        }
      }
      if (warnCount >= 3) crit++
    }
    if (step.status === 'en_cours' && !step.operatorName && step.startedAt) {
      if ((Date.now() - new Date(step.startedAt)) / 60000 > 60) warn++
    }
    if (step.quantityIn && step.quantityOut) {
      const loss = (parseFloat(step.quantityIn) - parseFloat(step.quantityOut)) / parseFloat(step.quantityIn) * 100
      if (loss > 25) crit++
      else if (loss > 15) warn++
    }
  }
  if (order.status === 'en_cours') {
    const lastAct = getLastActivity(order)
    const hoursStalled = (Date.now() - lastAct) / 3600000
    if (hoursStalled > 24) crit++
    else if (hoursStalled > 8) warn++
  }
  return { critical: crit, warning: warn }
}

export default function Conditioning() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('en_cours')
  const [productFilter, setProductFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [lots, setLots] = useState([])
  const [form, setForm] = useState({ lotId: '', productType: 'vanille_noire', destination: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const url = statusFilter ? `/conditioning?status=${statusFilter}` : '/conditioning'
    api.get(url)
      .then(res => {
        setOrders(res.data?.data || [])
        setStats(res.data?.stats || {})
      })
      .catch(() => toast.error('Erreur lors du chargement'))
      .finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!orders.some(o => o.status === 'en_cours')) return
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [orders.length, load])

  useEffect(() => {
    api.get('/lots', { params: { limit: 200 } }).then(r => setLots(r.data?.data || []))
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.post('/conditioning', form)
      if (res.data?.success) {
        toast.success('🏭 Ordre de conditionnement créé')
        setShowCreate(false)
        setForm({ lotId: '', productType: 'vanille_noire', destination: '' })
        navigate(`/conditioning/${res.data.data.id}`)
      } else {
        toast.error(res.data?.message || 'Erreur lors de la création')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  const currentStep = (order) => order.steps?.find(s => s.status === 'en_cours')
  const progressPct = (order) => {
    const done = order.steps?.filter(s => s.status === 'termine').length || 0
    return Math.round((done / (order.steps?.length || 7)) * 100)
  }

  const filteredOrders = useMemo(() => {
    let list = orders
    if (productFilter) list = list.filter(o => o.productType === productFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(o =>
        o.lot?.lotNumber?.toLowerCase().includes(q) ||
        o.lot?.producer?.name?.toLowerCase().includes(q)
      )
    }
    return list.slice().sort((a, b) => {
      const aA = getOrderAlerts(a), bA = getOrderAlerts(b)
      if (aA.critical !== bA.critical) return bA.critical - aA.critical
      if (aA.warning  !== bA.warning)  return bA.warning  - aA.warning
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
  }, [orders, productFilter, search])

  const globalAlerts = orders.reduce(
    (acc, o) => { const a = getOrderAlerts(o); return { critical: acc.critical + a.critical, warning: acc.warning + a.warning } },
    { critical: 0, warning: 0 }
  )

  const totalAll = Object.values(stats).reduce((a, b) => a + b, 0)
  const hasActiveOrders = orders.some(o => o.status === 'en_cours')

  return (
    <div style={{ padding: '32px 36px', minHeight: '100vh' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--ink)', fontWeight: 700 }}>
            🏭 Conditionnement
          </h1>
          <p style={{ color: 'var(--mist)', fontSize: 13, marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
            Suivi des process de production en temps réel
            {hasActiveOrders && <span style={{ fontSize: 11, color: '#4ade80' }}>🟢 Actualisation auto toutes les 60s</span>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {globalAlerts.critical > 0 && (
            <div style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: '#F8E6E8', border: '1px solid #963C47', color: '#963C47', display: 'flex', alignItems: 'center', gap: 6 }}>
              ✕ {globalAlerts.critical} alerte{globalAlerts.critical > 1 ? 's' : ''} critique{globalAlerts.critical > 1 ? 's' : ''}
            </div>
          )}
          {globalAlerts.critical === 0 && globalAlerts.warning > 0 && (
            <div style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: '#F5E8CC', border: '1px solid #795015', color: '#795015', display: 'flex', alignItems: 'center', gap: 6 }}>
              ⚡ {globalAlerts.warning} avertissement{globalAlerts.warning > 1 ? 's' : ''}
            </div>
          )}
          <Button onClick={() => setShowCreate(true)}>+ Nouvel ordre</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { key: '',             label: 'Tous',          icon: '📋', solid: '#352638', count: totalAll },
          { key: 'en_cours',     label: 'En cours',      icon: '⋯', solid: '#AD5138', count: stats.en_cours || 0 },
          { key: 'termine',      label: 'Terminés',      icon: '✓', solid: '#435432', count: stats.termine || 0 },
          { key: 'non_conforme', label: 'Non conformes', icon: '✕', solid: '#963C47', count: stats.non_conforme || 0 },
        ].map(s => (
          <div key={s.key} onClick={() => setStatusFilter(s.key)} style={{
            background: statusFilter === s.key ? s.solid : 'var(--paper)',
            border: `1.5px solid ${statusFilter === s.key ? s.solid : 'var(--border)'}`,
            borderRadius: 8, padding: '16px 20px', cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: '0 1px 3px rgba(53,38,56,0.05)'
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: statusFilter === s.key ? 'var(--paper)' : 'var(--ink)' }}>{s.count}</div>
            <div style={{ fontSize: 12, color: statusFilter === s.key ? 'rgba(255,252,246,0.85)' : 'var(--mist)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--mist)', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
          <input type="text" placeholder="Rechercher par lot, producteur..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid var(--border-input, #96878E)', borderRadius: 6, fontSize: 13, background: 'var(--paper)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {[{ key: '', label: 'Tous types' }, { key: 'vanille_noire', label: '🖤 Noire' }, { key: 'vanille_rouge', label: '❤️ Rouge' }].map(p => (
            <button key={p.key} onClick={() => setProductFilter(p.key)} style={{
              padding: '7px 14px', borderRadius: 6, fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: productFilter === p.key ? 'var(--ink)' : 'var(--paper)',
              color: productFilter === p.key ? 'var(--paper)' : 'var(--ink)',
              outline: `1px solid ${productFilter === p.key ? 'var(--ink)' : 'var(--border)'}`, transition: 'all 0.15s',
            }}>{p.label}</button>
          ))}
        </div>
        {(search || productFilter) && (
          <button onClick={() => { setSearch(''); setProductFilter('') }} style={{ padding: '7px 12px', borderRadius: 6, fontSize: 12, color: 'var(--mist)', background: 'var(--paper)', border: '1px solid var(--border)', cursor: 'pointer' }}>✕ Reset</button>
        )}
      </div>

      {loading ? (
        <PageLoader />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title={search || productFilter ? 'Aucun résultat' : 'Aucun ordre de conditionnement'}
          description={search || productFilter ? 'Modifiez vos filtres de recherche.' : 'Créez votre premier ordre pour démarrer le suivi de production.'}
          icon={<span style={{ fontSize: 40 }}>🏭</span>}
          action={!search && !productFilter && <Button onClick={() => setShowCreate(true)}>+ Nouvel ordre</Button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(390px, 1fr))', gap: 16 }}>
          {filteredOrders.map(order => {
            const cfg    = STATUS_CONFIG[order.status] || STATUS_CONFIG.en_cours
            const prod   = PRODUCT_CONFIG[order.productType] || {}
            const active = currentStep(order)
            const pct    = progressPct(order)
            const alerts = getOrderAlerts(order)
            const lastAct = getLastActivity(order)
            const minutesSinceActivity = Math.floor((Date.now() - lastAct) / 60000)
            const isStalled = order.status === 'en_cours' && minutesSinceActivity > 8 * 60

            return (
              <Card key={order.id} style={{ padding: '18px 20px', cursor: 'pointer', transition: 'all 0.2s', border: alerts.critical > 0 ? '1.5px solid rgba(239,68,68,0.35)' : undefined }}
                onClick={() => navigate(`/conditioning/${order.id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: prod.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{prod.icon}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>{prod.label}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--mist)', marginTop: 1 }}>Passage #{order.passNumber} — {order.lot?.lotNumber}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {alerts.critical > 0 && <div title={`${alerts.critical} alerte(s) critique(s)`} style={{ width: 22, height: 22, borderRadius: '50%', background: '#dc2626', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{alerts.critical}</div>}
                    {alerts.critical === 0 && alerts.warning > 0 && <div title={`${alerts.warning} avertissement(s)`} style={{ width: 22, height: 22, borderRadius: '50%', background: '#d97706', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{alerts.warning}</div>}
                    <div style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />{cfg.label}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 12.5, color: 'var(--slate)', marginBottom: 12, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <span>🌱 {order.lot?.producer?.name}</span>
                  {order.lot?.quantityKg && <span style={{ color: 'var(--mist)', fontSize: 11 }}>⚖️ {Number(order.lot.quantityKg).toLocaleString()} kg</span>}
                  {order.destination && <span style={{ background: '#EAE2EB', color: '#352638', padding: '1px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{order.destination.toUpperCase()}</span>}
                  <span style={{ color: 'var(--mist)', fontSize: 11 }}>{new Date(order.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--mist)' }}>{order.steps?.filter(s => s.status === 'termine').length || 0} / {order.steps?.length || 7} étapes</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: pct === 100 ? '#435432' : 'var(--clay)' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--cream)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: pct === 100 ? '#435432' : 'var(--clay)', transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                {active ? (
                  <div style={{ background: 'var(--cream)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{STEP_ICONS[active.stepName] || '⚙️'}</span>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{active.stepName}</div>
                        {active.operatorName ? <div style={{ fontSize: 11, color: 'var(--mist)' }}>👤 {active.operatorName}</div> : <div style={{ fontSize: 11, color: '#795015' }}>⚡ Opérateur non assigné</div>}
                      </div>
                    </div>
                    {active.startedAt && (() => {
                      const mins = Math.floor((Date.now() - new Date(active.startedAt)) / 60000)
                      const thr = STEP_THRESHOLDS[active.stepName]
                      const hours = mins / 60
                      const isCrit = thr && hours > thr.crit
                      const isWarn = thr && hours > thr.warn
                      return (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, color: isCrit ? '#963C47' : isWarn ? '#795015' : 'var(--mist)', background: isCrit ? '#F8E6E8' : isWarn ? '#F5E8CC' : 'var(--paper)', border: `1px solid ${isCrit ? '#963C47' : isWarn ? '#795015' : 'var(--border)'}` }}>
                          {isCrit ? '✕' : '⏱'} {formatDuration(mins)}
                        </span>
                      )
                    })()}
                  </div>
                ) : isStalled ? (
                  <div style={{ background: '#F8E6E8', borderRadius: 8, padding: '7px 12px', border: '1px solid #963C47' }}>
                    <span style={{ fontSize: 12, color: '#963C47' }}>⏸ Inactif depuis {formatDuration(minutesSinceActivity)} — aucune mise à jour</span>
                  </div>
                ) : null}

                {!active && order.status === 'en_cours' && !isStalled && (
                  <div style={{ fontSize: 11, color: 'var(--mist)', marginTop: 6 }}>🕐 Dernière activité : {formatDuration(minutesSinceActivity)} ago</div>
                )}

                <div style={{ display: 'flex', gap: 3, marginTop: 10 }}>
                  {order.steps?.map(s => (
                    <div key={s.id} title={s.stepName} style={{ flex: 1, height: 4, borderRadius: 2, background: s.status === 'termine' ? '#435432' : s.status === 'en_cours' ? '#AD5138' : 'var(--border)', transition: 'background 0.3s' }} />
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="+ Nouvel ordre de conditionnement" size="md">
        <form onSubmit={handleCreate}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--slate)', marginBottom: 5 }}>Lot à conditionner *</label>
            <select required value={form.lotId}
              onChange={e => {
                const lotId = e.target.value
                const lot = lots.find(l => l.id === lotId)
                let productType = form.productType
                if (lot) {
                  if (lot.conditioningType) {
                    productType = lot.conditioningType
                  } else {
                    const haystack = [lot.product?.name, lot.product?.variety, lot.product?.category].join(' ').toLowerCase()
                    productType = (haystack.includes('rouge') || haystack.includes('red')) ? 'vanille_rouge' : 'vanille_noire'
                  }
                }
                setForm(f => ({ ...f, lotId, productType, destination: '' }))
              }}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--border-input, #96878E)', borderRadius: 6, fontSize: 13.5, background: 'var(--paper)', color: 'var(--ink)', outline: 'none' }}>
              <option value="">-- Choisir un lot --</option>
              {lots.map(l => (
                <option key={l.id} value={l.id}>{l.lotNumber} — {l.product?.name} — {Number(l.quantityKg).toLocaleString()} kg ({l.producer?.name})</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--slate)' }}>Type de produit *</label>
              {form.lotId && (() => {
                const lot = lots.find(l => l.id === form.lotId)
                const isExplicit = !!lot?.conditioningType
                return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600, background: isExplicit ? '#E5ECD9' : '#F5E8CC', color: isExplicit ? '#435432' : '#795015' }}>{isExplicit ? '✓ Défini sur le lot' : '⚡ Déduit du produit'}</span>
              })()}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {Object.entries(PRODUCT_CONFIG).map(([key, cfg]) => (
                <div key={key} onClick={() => setForm(f => ({ ...f, productType: key, destination: '' }))} style={{ padding: '12px 16px', borderRadius: 8, cursor: 'pointer', border: `1.5px solid ${form.productType === key ? 'var(--ink)' : 'var(--border)'}`, background: form.productType === key ? 'var(--cream)' : 'var(--paper)', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s' }}>
                  <span style={{ fontSize: 22 }}>{cfg.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{cfg.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--mist)' }}>{key === 'vanille_noire' ? 'Norme : 36–38%' : 'Norme selon destination'}</div>
                  </div>
                  {form.productType === key && <span style={{ fontSize: 16, color: 'var(--clay)' }}>✓</span>}
                </div>
              ))}
            </div>
          </div>

          {form.productType === 'vanille_rouge' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--slate)', marginBottom: 5 }}>Destination — norme humidité *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[{ key: 'us', label: 'USA', norm: '25–28%', flag: '🇺🇸' }, { key: 'eu', label: 'Europe', norm: '28–32%', flag: '🇪🇺' }].map(d => (
                  <div key={d.key} onClick={() => setForm(f => ({ ...f, destination: d.key }))} style={{ padding: '10px 14px', borderRadius: 8, cursor: 'pointer', border: `1.5px solid ${form.destination === d.key ? 'var(--ink)' : 'var(--border)'}`, background: form.destination === d.key ? 'var(--cream)' : 'var(--paper)', transition: 'all 0.15s' }}>
                    <div style={{ fontSize: 20 }}>{d.flag}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginTop: 4 }}>{d.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--mist)' }}>Humidité {d.norm}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {form.lotId && (() => {
            const lot = lots.find(l => l.id === form.lotId)
            if (!lot) return null
            return (
              <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'var(--cream)', border: '1px solid var(--border)', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14 }}>📋</span>
                <span style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 600 }}>{lot.lotNumber}</span>
                <span style={{ fontSize: 12, color: 'var(--mist)' }}>🌱 {lot.producer?.name}</span>
                <span style={{ fontSize: 12, color: 'var(--mist)' }}>⚖️ {Number(lot.quantityKg).toLocaleString()} kg</span>
                <span style={{ fontSize: 12, color: 'var(--mist)' }}>🗓 {new Date(lot.harvestDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            )
          })()}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={() => setShowCreate(false)} style={{ padding: '9px 18px', borderRadius: 8, background: 'var(--pale)', color: 'var(--green)', fontSize: 13.5, fontWeight: 500, border: 'none', cursor: 'pointer' }}>Annuler</button>
            <button type="submit" disabled={saving || !form.lotId || (form.productType === 'vanille_rouge' && !form.destination)} style={{ padding: '9px 18px', borderRadius: 8, background: 'var(--green)', color: 'white', fontSize: 13.5, fontWeight: 500, border: 'none', cursor: 'pointer', opacity: (saving || !form.lotId || (form.productType === 'vanille_rouge' && !form.destination)) ? 0.6 : 1 }}>
              {saving ? '⏳ Création...' : '🚀 Lancer le conditionnement'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
