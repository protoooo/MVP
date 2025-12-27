'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import AgentIcon from '@/components/AgentIcon'
import SmartProgress from '@/components/SmartProgress'

const MAX_FILES = 50
const MIN_RECOMMENDED_FILES = 30

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  (process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1` : '') ||
  null
const AUTH_HEADER = process.env.NEXT_PUBLIC_USER_API_KEY
  ? { Authorization: `Bearer ${process.env.NEXT_PUBLIC_USER_API_KEY}` }
  : {}

function buildUrl(path) {
  if (!API_BASE) throw new Error('API base is not configured')
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

async function requestJson(path, init = {}) {
  if (!API_BASE) throw new Error('API base is not configured')

  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...AUTH_HEADER,
    },
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : {}

  if (!response.ok) {
    const statusPart = response.status ? ` (HTTP ${response.status})` : ''
    throw new Error((data?.error || response.statusText || 'Request failed') + statusPart)
  }
  return data
}

const createSessionRequest = () =>
  requestJson('/createSession', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'audit', area_tags: [] }),
  })

const uploadMediaRequest = (sessionId, file) => {
  const form = new FormData()
  form.append('session_id', sessionId)
  form.append('file', file)
  return requestJson('/uploadMedia', { method: 'POST', body: form })
}

const processSessionRequest = (sessionId) =>
  requestJson('/processSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  })

const getReportRequest = (sessionId) =>
  requestJson('/getReport', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  })

export default function UploadPage() {
  const [files, setFiles] = useState([])
  const [sessionId, setSessionId] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [report, setReport] = useState(null)
  const [progressActive, setProgressActive] = useState(false)
  const [requestKey, setRequestKey] = useState(0)
  const [uploadStep, setUploadStep] = useState({ current: 0, total: 0 })

  const inputRef = useRef(null)

  const resetPreviews = useCallback((list = []) => {
    list.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    })
  }, [])

  const handleFiles = useCallback(
    (list) => {
      const selected = Array.from(list || [])
        .filter((file) => file.type.startsWith('image') || file.type.startsWith('video'))
        .slice(0, MAX_FILES)

      setFiles((prev) => {
        resetPreviews(prev)
        return selected.map((file) => ({
          id: makeId(),
          file,
          previewUrl: file.type.startsWith('image') ? URL.createObjectURL(file) : '',
        }))
      })
    },
    [resetPreviews],
  )

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault()
      if (event.dataTransfer?.files?.length) {
        handleFiles(event.dataTransfer.files)
      }
    },
    [handleFiles],
  )

  const openFilePicker = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const statusNote = useMemo(() => {
    if (status === 'uploading') return `Uploading ${uploadStep.current} of ${uploadStep.total}`
    if (status === 'processing') return 'Processing… please wait'
    if (status === 'ready') return 'Report ready'
    if (status === 'error') return error || 'Something went wrong. Check your API configuration.'
    return `Select ${MIN_RECOMMENDED_FILES}–${MAX_FILES} images or videos for best results`
  }, [status, uploadStep, error])

  const startUpload = useCallback(async () => {
    if (!files.length) return
    setError('')
    setReport(null)
    setStatus('uploading')
    setUploadStep({ current: 0, total: files.length })
    setProgressActive(true)
    setRequestKey((key) => key + 1)

    try {
      const session = await createSessionRequest()
      setSessionId(session.session_id)

      for (let i = 0; i < files.length; i += 1) {
        await uploadMediaRequest(session.session_id, files[i].file)
        setUploadStep({ current: i + 1, total: files.length })
      }

      setStatus('processing')
      await processSessionRequest(session.session_id)
      const finalReport = await getReportRequest(session.session_id)
      setReport(finalReport)
      setStatus('ready')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Upload failed. Confirm API configuration and try again.')
      setStatus('error')
    } finally {
      setProgressActive(false)
    }
  }, [files])

  const handleDownload = useCallback(() => {
    if (!report) return

    if (report.json_report) {
      const jsonBlob = new Blob([JSON.stringify(report.json_report, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(jsonBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `session-${sessionId || 'report'}.json`
      link.click()
      URL.revokeObjectURL(url)
    }

    if (report.pdf_url) {
      const link = document.createElement('a')
      link.href = report.pdf_url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.download = `session-${sessionId || 'report'}.pdf`
      link.click()
    }
  }, [report, sessionId])

  const hasFiles = files.length > 0
  const isBusy = status === 'uploading' || status === 'processing'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Upload → Process → Download</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Compliance Report Builder</h1>
            <p className="mt-1 text-sm text-slate-600">
              Drag in your images or videos, let the AI process everything, then grab the JSON + PDF report.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm">
            <AgentIcon type="vision" className="text-emerald-500" />
            <span className="font-medium text-slate-700">{statusNote}</span>
          </div>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
          <div
            role="button"
            tabIndex={0}
            onClick={openFilePicker}
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openFilePicker()
              }
            }}
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center transition hover:border-emerald-200 hover:bg-emerald-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
              <AgentIcon type="chat" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">Drop your images or videos here</p>
              <p className="text-sm text-slate-600">Supports up to 50 files · Best results with 30–50</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={openFilePicker}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
              >
                Select files
              </button>
              <span className="text-xs text-slate-500">or drag & drop</span>
            </div>
            <input
              ref={inputRef}
              id="uploader-input"
              type="file"
              multiple
              accept="image/*,video/*"
              className="sr-only"
              onChange={(event) => handleFiles(event.target.files)}
            />
          </div>

          {hasFiles && (
            <div className="mt-6 space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AgentIcon type="history" className="text-blue-600" />
                  <p className="text-sm font-semibold text-slate-800">{files.length} file(s) queued</p>
                </div>
                <span className="text-xs text-slate-500">Images &amp; videos are processed together</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {files.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white p-3 shadow-[0_1px_6px_rgba(15,23,42,0.04)]"
                  >
                    <div className="h-12 w-12 overflow-hidden rounded-md bg-slate-100 ring-1 ring-slate-200">
                      {item.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                          <AgentIcon type="pdf" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{item.file.name}</p>
                      <p className="text-xs text-slate-500">
                        {(item.file.type || 'file').split('/')[0]} ·{' '}
                        {item.file?.size ? (item.file.size / 1024 ** 2).toFixed(1) : '0.0'} MB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 space-y-3">
            <SmartProgress active={progressActive} mode="vision" requestKey={requestKey} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                {statusNote}
                {status === 'ready' && report?.summary && <span className="ml-1 font-semibold text-slate-800">· {report.summary}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!hasFiles || isBusy}
                  onClick={startUpload}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
                >
                  <AgentIcon type="vision" className="text-emerald-300" />
                  {isBusy ? 'Uploading & processing…' : 'Upload & process'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetPreviews(files)
                    setFiles([])
                    setReport(null)
                    setStatus('idle')
                    setError('')
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
                >
                  Clear selection
                </button>
              </div>
            </div>
            {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
          </div>

          {status === 'ready' && report && (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-6 py-5 text-center">
              <div className="flex items-center gap-2 text-emerald-700">
                <AgentIcon type="pdf" className="text-emerald-600" />
                <span className="text-sm font-semibold">Report ready — download JSON + PDF</span>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
              >
                <AgentIcon type="settings" className="text-white" />
                Download JSON + PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
let fallbackCounter = 0
const makeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  fallbackCounter += 1
  return `id-${Date.now().toString(16)}-${fallbackCounter}-${Math.random().toString(16).slice(2)}`
}
