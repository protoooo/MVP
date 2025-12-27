'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'

const AREAS = [
  { id: 'kitchen', label: 'Kitchen', accent: 'bg-amber-100 text-amber-900' },
  { id: 'front', label: 'Front Counter', accent: 'bg-blue-100 text-blue-900' },
  { id: 'back', label: 'Back of House', accent: 'bg-emerald-100 text-emerald-900' },
  { id: 'storage', label: 'Storage', accent: 'bg-indigo-100 text-indigo-900' },
  { id: 'restrooms', label: 'Restrooms', accent: 'bg-rose-100 text-rose-900' },
]

const functionBase =
  typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
    : ''

const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const MAX_SIMULATED_PROGRESS = 95

const formatBytes = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

async function callFunction(name, { body, apiKey, isForm = false }) {
  if (!functionBase) throw new Error('Supabase function URL is not configured')
  const headers = {
    'x-api-key': apiKey || '',
    Accept: 'application/json',
  }
  if (anonKey) {
    headers.Authorization = `Bearer ${anonKey}`
    headers.apikey = anonKey
  }

  const requestInit = {
    method: 'POST',
    headers: isForm ? headers : { ...headers, 'Content-Type': 'application/json' },
    body: isForm ? body : JSON.stringify(body),
  }

  const response = await fetch(`${functionBase}/${name}`, requestInit)
  const text = await response.text()
  const data = text ? JSON.parse(text) : {}

  if (!response.ok) {
    throw new Error(data?.error || 'Request failed')
  }
  return data
}

const ActionIcon = ({ children, label }) => (
  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg shadow-slate-200 ring-1 ring-slate-100">
    <span className="sr-only">{label}</span>
    {children}
  </div>
)

export default function AuditCollector() {
  const [apiKey, setApiKey] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [sections, setSections] = useState(
    () =>
      AREAS.reduce(
        (acc, area) => ({
          ...acc,
          [area.id]: { items: [], collapsed: false },
        }),
        {},
      ),
  )
  const [processing, setProcessing] = useState(false)
  const [report, setReport] = useState(null)
  const [search, setSearch] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const uploadInputs = useRef({})

  useEffect(() => {
    const storedKey = typeof window !== 'undefined' ? localStorage.getItem('plm_api_key') : ''
    if (storedKey) setApiKey(storedKey)
  }, [])

  useEffect(() => {
    if (apiKey && typeof window !== 'undefined') localStorage.setItem('plm_api_key', apiKey)
  }, [apiKey])

  const ensureSession = async () => {
    if (sessionId) return sessionId
    const data = await callFunction('createSession', {
      apiKey,
      body: { type: 'restaurant', area_tags: AREAS.map((a) => a.label) },
    })
    setSessionId(data.session_id)
    return data.session_id
  }

  const handleFileSelect = async (areaId, files) => {
    const selected = Array.from(files).slice(0, 50)
    if (!selected.length) return

    const newItems = selected.map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      size: file.size,
      type: file.type.startsWith('video') ? 'video' : 'image',
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
    }))

    setSections((prev) => ({
      ...prev,
      [areaId]: { ...prev[areaId], items: [...newItems, ...prev[areaId].items].slice(0, 50) },
    }))

    const currentSession = await ensureSession()

    await Promise.all(
      newItems.map(async (item) => {
        setSections((prev) => ({
          ...prev,
          [areaId]: {
            ...prev[areaId],
            items: prev[areaId].items.map((it) => (it.id === item.id ? { ...it, status: 'uploading' } : it)),
          },
        }))

        const formData = new FormData()
        formData.append('session_id', currentSession)
        formData.append('area', AREAS.find((a) => a.id === areaId)?.label || areaId)
        formData.append('file', item.file, item.name)

          const progressTimer = setInterval(() => {
            setSections((prev) => ({
              ...prev,
              [areaId]: {
                ...prev[areaId],
                items: prev[areaId].items.map((it) =>
                  it.id === item.id
                    ? { ...it, progress: Math.min(MAX_SIMULATED_PROGRESS, (it.progress || 0) + Math.random() * 10) }
                    : it,
                ),
              },
            }))
        }, 400)

        try {
          const res = await callFunction('uploadMedia', { apiKey, body: formData, isForm: true })
          clearInterval(progressTimer)
          setSections((prev) => ({
            ...prev,
            [areaId]: {
              ...prev[areaId],
              items: prev[areaId].items.map((it) =>
                it.id === item.id ? { ...it, status: 'uploaded', progress: 100, mediaId: res.media_id } : it,
              ),
            },
          }))
        } catch (err) {
          clearInterval(progressTimer)
          setSections((prev) => ({
            ...prev,
            [areaId]: {
              ...prev[areaId],
              items: prev[areaId].items.map((it) =>
                it.id === item.id ? { ...it, status: 'error', error: err.message } : it,
              ),
            },
          }))
          setStatusMessage(err.message)
        }
      }),
    )
  }

  const handleGenerateReport = async () => {
    if (!sessionId) {
      setStatusMessage('Start a session with uploads first.')
      return
    }
    setProcessing(true)
    setStatusMessage('Processing media and preparing report...')
    try {
      const data = await callFunction('processSession', { apiKey, body: { session_id: sessionId } })
      setReport(data.report)
      const results = data.results || []
      setSections((prev) => {
        const next = { ...prev }
        results.forEach((r) => {
          Object.keys(next).forEach((areaId) => {
            next[areaId] = {
              ...next[areaId],
              items: next[areaId].items.map((it) =>
                it.mediaId === r.media_id ? { ...it, status: 'processed', result: r } : it,
              ),
            }
          })
        })
        return next
      })
      setStatusMessage('Report ready.')
    } catch (err) {
      setStatusMessage(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleFetchReport = async () => {
    if (!sessionId) return
    try {
      const data = await callFunction('getReport', { apiKey, body: { session_id: sessionId } })
      setReport(data)
      setStatusMessage('Report fetched.')
    } catch (err) {
      setStatusMessage(err.message)
    }
  }

  const filteredSections = useMemo(() => {
    if (!search.trim()) return sections
    const term = search.toLowerCase()
    const filtered = {}
    Object.entries(sections).forEach(([key, value]) => {
      filtered[key] = {
        ...value,
        items: value.items.filter(
          (item) =>
            item.name.toLowerCase().includes(term) ||
            item.result?.violation?.toLowerCase().includes(term) ||
            item.result?.citation?.toLowerCase().includes(term),
        ),
      }
    })
    return filtered
  }, [sections, search])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-12 pt-10 sm:px-6 lg:px-8 lg:pb-16">
          <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Protocol LM</p>
                <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">
                  Restaurant Compliance Collector
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Upload kitchen, counter, and storage walkthroughs. Track progress, preview evidence, and generate a
                  clean report without juggling chat threads.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Team API key"
                  className="w-52 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  aria-label="API key"
                />
                <div className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-300">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden />
                  Session {sessionId ? sessionId.slice(0, 6) : 'not started'}
                </div>
              </div>
            </div>

            <div className="relative grid gap-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-[1.2fr,1fr]">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Uploads</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {Object.values(sections).reduce((acc, area) => acc + area.items.length, 0)}
                  </p>
                  <p className="text-sm text-slate-500">Images & videos captured</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Status</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {processing ? 'Processing' : report ? 'Report ready' : 'Collecting'}
                  </p>
                  <p className="text-sm text-slate-500">{statusMessage || 'Awaiting uploads'}</p>
                </div>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white via-slate-50 to-slate-100 blur-2xl" />
                <div className="relative flex h-48 w-48 items-center justify-center rounded-full bg-white shadow-xl shadow-slate-200 ring-1 ring-slate-100">
                  <button
                    type="button"
                    onClick={handleGenerateReport}
                    disabled={processing}
                    className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-xl shadow-blue-200 transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Generate report"
                  >
                    <span className="text-sm font-semibold">{processing ? 'Working…' : 'Generate'}</span>
                  </button>

                  <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                    <button
                      type="button"
                      onClick={handleFetchReport}
                      className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-md shadow-slate-200 ring-1 ring-slate-200 transition hover:-translate-y-0.5"
                    >
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700 shadow-inner">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
                          <path d="M14 2v6h6" />
                          <path d="M8 13h8" />
                          <path d="M8 17h5" />
                        </svg>
                      </span>
                      PDF export
                    </button>
                  </div>

                  <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    <button
                      type="button"
                      onClick={() => uploadInputs.current?.kitchen?.click()}
                      className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-md shadow-slate-200 ring-1 ring-slate-200 transition hover:translate-x-0.5"
                    >
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 shadow-inner">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M8 8h8v8H8z" />
                          <path d="M4 4h16v16H4z" />
                        </svg>
                      </span>
                      Media review
                    </button>
                  </div>

                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
                    <button
                      type="button"
                      onClick={() => setStatusMessage('Search is filtering below.')}
                      className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-md shadow-slate-200 ring-1 ring-slate-200 transition hover:translate-y-0.5"
                    >
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-inner">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="11" cy="11" r="6" />
                          <path d="m21 21-4.3-4.3" />
                        </svg>
                      </span>
                      Q&A search
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search findings or filenames"
                  className="w-64 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
                Uploaded
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-400" aria-hidden />
                Processing
                <span className="inline-flex h-2 w-2 rounded-full bg-rose-400" aria-hidden />
                Needs attention
              </div>
            </div>
          </header>

          <main className="grid gap-6 lg:grid-cols-2">
            {AREAS.map((area) => {
              const areaState = filteredSections[area.id]
              const total = areaState.items.length
              const uploaded = areaState.items.filter((i) => i.status !== 'pending' && i.status !== 'error').length
              return (
                <section
                  key={area.id}
                  className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/50"
                  aria-label={`${area.label} uploads`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${area.accent}`}>{area.label}</span>
                      <p className="text-sm text-slate-500">
                        {uploaded}/{Math.max(total, 1)} uploaded
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSections((prev) => ({
                            ...prev,
                            [area.id]: { ...prev[area.id], collapsed: !prev[area.id].collapsed },
                          }))
                        }
                        className="text-xs font-semibold text-slate-600 underline decoration-slate-300"
                      >
                        {areaState.collapsed ? 'Expand' : 'Collapse'}
                      </button>
                      <button
                        type="button"
                        onClick={() => uploadInputs.current?.[area.id]?.click()}
                        className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5"
                      >
                        Add media
                      </button>
                      <input
                        ref={(node) => {
                          uploadInputs.current[area.id] = node
                        }}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileSelect(area.id, e.target.files)}
                      />
                    </div>
                  </div>

                  {!areaState.collapsed && (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {areaState.items.length === 0 && (
                        <div className="col-span-1 flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                          Drop up to 50 photos or videos
                        </div>
                      )}
                      {areaState.items.map((item) => (
                        <article
                          key={item.id}
                          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                        >
                          <div className="flex items-start gap-3 p-3">
                            <div className="relative h-20 w-28 overflow-hidden rounded-xl bg-slate-100">
                              {item.type === 'image' ? (
                                <Image
                                  src={item.previewUrl}
                                  alt={item.name}
                                  fill
                                  sizes="112px"
                                  className="object-cover"
                                />
                              ) : (
                                <video
                                  src={item.previewUrl}
                                  className="h-full w-full object-cover"
                                  muted
                                  playsInline
                                  aria-label={`${item.name} video preview`}
                                />
                              )}
                            </div>
                            <div className="flex flex-1 flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-slate-900 line-clamp-1">{item.name}</p>
                                <span className="text-xs text-slate-500">{formatBytes(item.size)}</span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={`h-2 rounded-full ${
                                    item.status === 'uploaded'
                                      ? 'bg-emerald-400'
                                      : item.status === 'processed'
                                      ? 'bg-blue-500'
                                      : item.status === 'error'
                                      ? 'bg-rose-400'
                                      : 'bg-amber-400'
                                  }`}
                                  style={{ width: `${Math.min(item.progress || 10, 100)}%` }}
                                />
                              </div>
                              {item.result && (
                                <div className="rounded-xl bg-slate-50 p-2 text-xs text-slate-700">
                                  <p className="font-semibold text-slate-900">{item.result.violation}</p>
                                  <p className="text-slate-600">
                                    Citation: {item.result.citation || '—'} • Severity: {item.result.severity || '—'}
                                  </p>
                                </div>
                              )}
                              {item.error && <p className="text-xs text-rose-500">Upload failed: {item.error}</p>}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </main>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Report overview</h2>
                <p className="text-sm text-slate-600">
                  Export the compiled summary once uploads finish. Results stay grouped by section for review.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {report?.pdf_url && (
                  <a
                    href={report.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5"
                  >
                    Download PDF
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={processing}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processing ? 'Processing…' : 'Generate report'}
                </button>
              </div>
            </div>
            {report && (
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Critical</p>
                  <p className="text-2xl font-semibold text-rose-500">{report.json_report?.summary?.critical ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Minor</p>
                  <p className="text-2xl font-semibold text-amber-500">{report.json_report?.summary?.minor ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Info</p>
                  <p className="text-2xl font-semibold text-emerald-500">{report.json_report?.summary?.info ?? 0}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
