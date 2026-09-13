import React, { useEffect, useState, useCallback } from 'react'
import { FaCog, FaPlus, FaTrashAlt, FaCheck, FaTimes, FaSyncAlt, FaDownload, FaUpload } from 'react-icons/fa'
import { loadUserConfig, saveUserConfig, resetUserConfig, isContentSubdomain } from '../../lib/config-db.ts'
import { probeGateway, probeRouter } from '../../lib/health-check.ts'
import { normalizeGatewayEntry, normalizeRouterEntry } from '../../sw/lib/runtime-config.ts'
import { Button } from '../components/button.tsx'
import { IconButton } from '../components/icon-button.tsx'
import './default-page-styles.css'
import type { PersistedConfig } from '../../lib/config-db.ts'
import type { HealthResult } from '../../lib/health-check.ts'
import type { ReactElement } from 'react'

type EntryKind = 'gateways' | 'routers'

interface EntryState {
  value: string
  health: HealthResult | null
  probing: boolean
}

interface ConfigState {
  gateways: EntryState[]
  routers: EntryState[]
}

const EMPTY_CONFIG: ConfigState = {
  gateways: [],
  routers: []
}

function toEntryState (value: string): EntryState {
  return { value, health: null, probing: false }
}

function fromPersisted (cfg: PersistedConfig | undefined): ConfigState {
  if (cfg == null) {
    return EMPTY_CONFIG
  }
  return {
    gateways: cfg.gateways.map(toEntryState),
    routers: cfg.routers.map(toEntryState)
  }
}

function toValues (entries: EntryState[]): string[] {
  return entries.map(e => e.value).filter(v => v.trim() !== '')
}

/**
 * Show the canonical template an entry resolves to, so the user understands
 * how their input is interpreted. Returns null when the entry is invalid or
 * empty.
 */
function previewGateway (value: string): string | null {
  const n = normalizeGatewayEntry(value)
  return n?.template ?? null
}

function previewRouter (value: string): string | null {
  const n = normalizeRouterEntry(value)
  return n ?? null
}

function HealthBadge ({ result }: { result: HealthResult | null }): ReactElement {
  if (result == null) {
    return <span className='gray-muted f6 ml2' />
  }
  const color = result.ok ? 'green' : 'red'
  const icon = result.ok ? <FaCheck /> : <FaTimes />
  return (
    <span className={`f6 ml2 ${color}`} title={result.message}>
      {icon} <span className='gray-muted'>{result.message}</span>
    </span>
  )
}

interface EntryListProps {
  kind: EntryKind
  entries: EntryState[]
  setEntries (next: EntryState[]): void
}

function EntryList ({ kind, entries, setEntries }: EntryListProps): ReactElement {
  const label = kind === 'gateways' ? 'Trustless Gateways' : 'Delegated Routers'
  const placeholder = kind === 'gateways'
    ? 'https://my-gw.example  or  https://{cid}.ipfs.my-gw.example'
    : 'https://delegated-ipfs.dev'
  const preview = kind === 'gateways' ? previewGateway : previewRouter

  const add = (): void => {
    setEntries([...entries, toEntryState('')])
  }

  const remove = (i: number): void => {
    setEntries(entries.filter((_, idx) => idx !== i))
  }

  const update = (i: number, value: string): void => {
    setEntries(entries.map((e, idx) => idx === i ? { ...e, value, health: null } : e))
  }

  const probeOne = async (i: number): Promise<void> => {
    const entry = entries[i]
    if (entry.value.trim() === '') {
      return
    }
    setEntries(entries.map((e, idx) => idx === i ? { ...e, probing: true } : e))
    try {
      const result = kind === 'gateways'
        ? await probeGateway(entry.value)
        : await probeRouter(entry.value)
      setEntries(entries.map((e, idx) => idx === i ? { ...e, health: result, probing: false } : e))
    } catch (err: any) {
      setEntries(entries.map((e, idx) => idx === i ? { ...e, health: { ok: false, message: err?.message ?? String(err) }, probing: false } : e))
    }
  }

  return (
    <div className='mb4'>
      <h2 className='f4 ma0 mb2 teal'>{label}</h2>
      <p className='f6 gray-muted mt0 mb3'>
        {kind === 'gateways'
          ? 'Trustless gateways serve raw blocks with ?format=raw. A bare origin is expanded to /ipfs/{cid}?format=raw.'
          : 'Delegated routers expose /routing/v1. A bare origin is used verbatim.'}
      </p>
      {entries.length === 0 && (
        <p className='f6 gray-muted i'>No entries — build-time defaults will be used.</p>
      )}
      {entries.map((entry, i) => {
        const canonical = preview(entry.value)
        return (
          <div key={i} className='flex items-center mb2'>
            <input
              type='text'
              className='flex-auto pa2 mr2 br2 bn bg-snow-muted'
              placeholder={placeholder}
              value={entry.value}
              onChange={(e) => update(i, e.target.value)}
            />
            <IconButton onClick={() => probeOne(i)} title='Health check'>
              <FaSyncAlt className={entry.probing ? 'spin' : ''} />
            </IconButton>
            <IconButton onClick={() => remove(i)} title='Remove'>
              <FaTrashAlt />
            </IconButton>
            <HealthBadge result={entry.health} />
            {canonical != null && entry.value.trim() !== '' && (
              <div className='w-100 mt1 mb2 f6 gray-muted'>
                <code>{canonical}</code>
              </div>
            )}
          </div>
        )
      })}
      <Button onClick={add} className='mt1'>
        <FaPlus className='mr1' /> Add {kind === 'gateways' ? 'gateway' : 'router'}
      </Button>
    </div>
  )
}

export default function ConfigPage (): ReactElement {
  const [config, setConfig] = useState<ConfigState>(EMPTY_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err', text: string } | null>(null)
  const [readOnly, setReadOnly] = useState(false)

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const cfg = await loadUserConfig()
        setConfig(fromPersisted(cfg))
        setReadOnly(isContentSubdomain())
      } catch (err: any) {
        setMessage({ kind: 'err', text: `Could not load config: ${err?.message ?? String(err)}` })
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const notifySw = useCallback(async (): Promise<void> => {
    try {
      const reg = await navigator.serviceWorker?.getRegistration?.()
      reg?.active?.postMessage({ type: 'ipfs-sw-config-updated' })
    } catch {
      // SW may not be active yet; the in-memory cache TTL will refresh anyway.
    }
  }, [])

  const save = async (): Promise<void> => {
    setSaving(true)
    setMessage(null)
    try {
      const gateways = toValues(config.gateways)
      const routers = toValues(config.routers)
      await saveUserConfig({ gateways, routers })
      await notifySw()
      setMessage({ kind: 'ok', text: 'Saved. Subsequent fetches will use the new backends.' })
    } catch (err: any) {
      setMessage({ kind: 'err', text: `Could not save: ${err?.message ?? String(err)}` })
    } finally {
      setSaving(false)
    }
  }

  const reset = async (): Promise<void> => {
    setSaving(true)
    setMessage(null)
    try {
      await resetUserConfig()
      await notifySw()
      setConfig(EMPTY_CONFIG)
      setMessage({ kind: 'ok', text: 'Reset to build-time defaults.' })
    } catch (err: any) {
      setMessage({ kind: 'err', text: `Could not reset: ${err?.message ?? String(err)}` })
    } finally {
      setSaving(false)
    }
  }

  const exportConfig = (): void => {
    const blob = new Blob([JSON.stringify({
      gateways: toValues(config.gateways),
      routers: toValues(config.routers)
    }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ipfs-sw-gateway-config.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importConfig = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (file == null) {
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string)
        const gateways = Array.isArray(parsed.gateways) ? parsed.gateways.map(toEntryState) : []
        const routers = Array.isArray(parsed.routers) ? parsed.routers.map(toEntryState) : []
        setConfig({ gateways, routers })
        setMessage({ kind: 'ok', text: 'Config loaded. Click Save to persist.' })
      } catch (err: any) {
        setMessage({ kind: 'err', text: `Could not parse file: ${err?.message ?? String(err)}` })
      }
    }
    reader.readAsText(file)
  }

  if (loading) {
    return (
      <main className='e2e-section-config pa4-l bg-snow mw7 mv4-l center pa4 br2'>
        <p className='charcoal'>Loading…</p>
      </main>
    )
  }

  return (
    <main className='e2e-section-config pa4-l bg-snow mw7 mv4-l center pa4 br2'>
      <h1 className='pa0 f3 ma0 mb4 teal tc'>
        <FaCog className='mr2' /> Gateway & Router Settings
      </h1>

      {readOnly && (
        <p className='f6 yellow bg-washed-blue pa2 br2 mb3'>
          This page is read-only on content subdomains. Open it on the root origin to make changes.
        </p>
      )}

      <p className='charcoal db pt1 lh-copy mb4'>
        Override the trustless gateways and delegated routers used for content retrieval.
        Precedence: <strong>URL params</strong> (<code>?gateways=…&routers=…</code>) {'>'}{' '}
        <strong>persisted config</strong> (this page) {'>'} <strong>build-time defaults</strong>.
      </p>

      <EntryList
        kind='gateways'
        entries={config.gateways}
        setEntries={(next) => setConfig({ ...config, gateways: next })}
      />
      <EntryList
        kind='routers'
        entries={config.routers}
        setEntries={(next) => setConfig({ ...config, routers: next })}
      />

      {message != null && (
        <p className={`f6 pa2 br2 mb3 ${message.kind === 'ok' ? 'green bg-washed-blue' : 'red bg-washed-blue'}`}>
          {message.text}
        </p>
      )}

      <div className='flex flex-wrap items-center mt3'>
        <Button onClick={save} className='bg-navy'>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button onClick={reset} className='bg-charcoal'>
          Reset to defaults
        </Button>
        <Button onClick={exportConfig} className='bg-charcoal'>
          <FaDownload className='mr1' /> Export
        </Button>
        <label className='button bn br2 mr2 pa2 pl3 pr3 snow-muted bg-charcoal'>
          <FaUpload className='mr1' /> Import
          <input type='file' accept='application/json' className='dn' onChange={importConfig} />
        </label>
      </div>

      <p className='f6 gray-muted mt4'>
        URL params override this config for a single navigation. Persisted config is writable only
        from the root origin to prevent sibling subdomains from rewriting your backends.
      </p>
    </main>
  )
}
