import React, { useEffect, useRef, useState } from 'react'
import { Button, Dropdown, Modal, Popover, Slider, message } from 'antd'
import {
  CloseOutlined,
  DownOutlined,
  LoadingOutlined,
  MoreOutlined,
  PauseOutlined,
  PlayCircleFilled,
  StopOutlined,
} from '@ant-design/icons'
import PageEditor from '@/components/editors/PageEditor'
import VoicePromptModal from '@/components/voice/VoicePromptModal'
import authService from '@/services/authService'
import noteService from '@/services/noteService'
import voiceRealtimeService from '@/services/voiceRealtimeService'

function WaveMark({ active = false, height = 12 }) {
  return (
    <span
      style={{
        width: 2,
        height,
        borderRadius: 999,
        background: active ? 'var(--primary)' : 'rgba(148,163,184,0.45)',
      }}
    />
  )
}

function VoicePulse() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      <span style={{ width: 2, height: 8, borderRadius: 999, background: 'currentColor', opacity: 0.5 }} />
      <span style={{ width: 2, height: 14, borderRadius: 999, background: 'currentColor', opacity: 0.75 }} />
      <span style={{ width: 2, height: 18, borderRadius: 999, background: 'currentColor', opacity: 1 }} />
      <span style={{ width: 2, height: 12, borderRadius: 999, background: 'currentColor', opacity: 0.75 }} />
      <span style={{ width: 2, height: 8, borderRadius: 999, background: 'currentColor', opacity: 0.5 }} />
    </span>
  )
}

function MicIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <path
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 11a7 7 0 0 1-14 0"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 18v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M8 21h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const LANGUAGE_OPTIONS = [
  { value: 'zh-CN', label: '中文', hint: '简体中文' },
  { value: 'en-US', label: '英文', hint: 'English' },
]

function formatElapsed(ms = 0) {
  const safeMs = Math.max(0, Math.floor(ms))
  const totalSeconds = Math.floor(safeMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
  }

  return [minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
}

function formatPlaybackRate(rate = 1) {
  const normalized = Number(rate.toFixed(2))
  return Number.isInteger(normalized) ? normalized.toFixed(1) : String(normalized)
}

const SPEED_PRESETS = [0.75, 1, 1.25, 1.5, 2]

function getLanguageLabel(language) {
  return LANGUAGE_OPTIONS.find((option) => option.value === language)?.label || '中文'
}

function buildInitialRecordings() {
  return []
}

function buildInitialTranscriptGroups() {
  return {}
}

function formatVoiceCardTime(value) {
  if (!value) {
    return '刚刚'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '刚刚'
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}/${month}/${day} ${hours}:${minutes}`
}

function getTranscriptStatusLabel(status) {
  const statusMap = {
    pending: '待转写',
    processing: '转写中',
    completed: '已转写',
    failed: '转写失败',
  }

  return statusMap[status] || '语音'
}

function normalizeRealtimeLanguage(language) {
  return language === 'en-US' ? 'en_US' : 'zh_CN'
}

function createLiveRecordingCard({ key, language, title = '' }) {
  return {
    code: `RECORDING ${key}`,
    key,
    title: title || `${getLanguageLabel(language)}实时转写`,
    duration: '转写中',
    durationMs: 0,
    time: '刚刚',
    language,
    status: 'processing',
    fileId: null,
    voiceId: null,
    url: '',
    isLocalPreview: false,
    transcript: '',
    transcriptStatus: 'processing',
  }
}

function createTranscriptEntry({ avatar = 'REC', name = 'Recording', time = '刚刚', text = '', active = false }) {
  return {
    avatar,
    name,
    time,
    text,
    active,
  }
}

function getRealtimeStatusMeta(recordingState) {
  const statusMap = {
    recording: {
      label: '实时识别中',
      tone: 'active',
      hint: '音频正在实时送达转写引擎',
    },
    paused: {
      label: '已暂停',
      tone: 'paused',
      hint: '当前会话已暂停，等待继续录音',
    },
    uploading: {
      label: '处理中',
      tone: 'processing',
      hint: '正在完成实时会话并刷新语音卡片',
    },
    idle: {
      label: '待开始',
      tone: 'idle',
      hint: '点击右下角按钮开始实时转写',
    },
  }

  return statusMap[recordingState] || statusMap.idle
}

function RealtimeStatusBadge({ recordingState, compact = false }) {
  const meta = getRealtimeStatusMeta(recordingState)
  const toneStyles = {
    active: {
      background: 'rgba(47,111,255,0.10)',
      color: 'var(--primary)',
      border: '1px solid rgba(125,163,255,0.35)',
    },
    paused: {
      background: 'rgba(245,158,11,0.10)',
      color: '#d97706',
      border: '1px solid rgba(245,158,11,0.24)',
    },
    processing: {
      background: 'rgba(99,102,241,0.10)',
      color: '#4f46e5',
      border: '1px solid rgba(129,140,248,0.24)',
    },
    idle: {
      background: 'rgba(148,163,184,0.10)',
      color: '#64748b',
      border: '1px solid rgba(148,163,184,0.18)',
    },
  }

  const style = toneStyles[meta.tone] || toneStyles.idle

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? 6 : 8,
        padding: compact ? '6px 10px' : '7px 12px',
        borderRadius: 999,
        fontSize: compact ? 11 : 12,
        fontWeight: 800,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        color: style.color,
        background: style.background,
        border: style.border,
        boxShadow: '0 6px 14px rgba(15,23,42,0.04)',
      }}
    >
      {recordingState === 'recording' ? (
        <VoicePulse />
      ) : (
        <span
          style={{
            width: compact ? 7 : 8,
            height: compact ? 7 : 8,
            borderRadius: '50%',
            background: style.color,
            boxShadow: `0 0 0 3px ${style.color}14`,
            flexShrink: 0,
          }}
        />
      )}
      <span>{meta.label}</span>
    </div>
  )
}

function buildVoiceStateFromNoteVoiceNotes(voiceNotes = []) {
  const recordings = voiceNotes.map((voice, index) => {
    const key = String(index + 1).padStart(2, '0')
    const transcriptStatus = voice?.transcriptStatus || 'pending'

    return {
      code: `RECORDING ${key}`,
      key,
      title: `语音卡片 ${key}`,
      duration: getTranscriptStatusLabel(transcriptStatus),
      durationMs: Number.isFinite(voice?.durationMs) ? voice.durationMs : 0,
      time: formatVoiceCardTime(voice?.createdAt || voice?.updatedAt),
      language: voice?.language || 'zh-CN',
      status: transcriptStatus,
      fileId: voice?.fileId ?? null,
      voiceId: voice?.id ?? null,
      url: voice?.audioUrl || '',
      isLocalPreview: false,
      transcript: voice?.transcript || '',
      transcriptStatus,
    }
  })

  const transcriptGroups = voiceNotes.reduce((acc, voice, index) => {
    const key = String(index + 1).padStart(2, '0')
    const transcriptStatus = voice?.transcriptStatus || 'pending'

    acc[key] = [{
      avatar: 'REC',
      name: `Recording ${key}`,
      time: formatVoiceCardTime(voice?.createdAt || voice?.updatedAt),
      text: voice?.transcript || getTranscriptStatusLabel(transcriptStatus),
      active: transcriptStatus === 'completed' || transcriptStatus === 'processing',
    }]
    return acc
  }, {})

  const selectedKey = recordings[0]?.key || null

  return {
    recordings,
    transcriptGroups,
    selectedKey,
    sourceKey: selectedKey || '01',
  }
}

function RecordingCard({ active, code, title, duration, time, language, onClick, onDelete }) {
  const metaParts = [duration, time, language ? getLanguageLabel(language) : ''].filter(Boolean)

  return (
    <div
      onClick={onClick}
      style={{
        minWidth: 174,
        padding: '14px 14px 12px',
        borderRadius: 16,
        border: active ? '2px solid rgba(2,86,210,0.96)' : '1px solid rgba(226,232,240,0.98)',
        background: active ? 'rgba(2,86,210,0.06)' : '#edf2f7',
        boxShadow: active ? '0 10px 26px rgba(2,86,210,0.10)' : 'none',
        textAlign: 'left',
        cursor: 'pointer',
        flexShrink: 0,
        position: 'relative',
        userSelect: 'none',
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
        }
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', color: active ? 'var(--primary)' : '#94a3b8' }}>
        {code}
      </div>
      <div style={{ marginTop: 8, fontSize: 13, fontWeight: 800, color: active ? 'var(--primary)' : '#334155', paddingRight: 22 }}>
        {title}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: active ? 'rgba(2,86,210,0.58)' : '#94a3b8', paddingRight: 22 }}>
        {metaParts.join(' - ')}
      </div>
      {onDelete ? (
        <button
          type="button"
          tabIndex={-1}
          onPointerDown={(event) => {
            event.stopPropagation()
          }}
          onMouseDown={(event) => {
            event.stopPropagation()
          }}
          onClick={(event) => {
            event.stopPropagation()
            event.preventDefault()
            onDelete()
          }}
          aria-label="删除语音卡片"
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255,255,255,0.82)',
            color: '#94a3b8',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 6px 14px rgba(15,23,42,0.08)',
            zIndex: 2,
            pointerEvents: 'auto',
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
            <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M10 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M14 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M9 7V4h6v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}
    </div>
  )
}

function RecorderButton({ title, onClick, children, active = false, danger = false, disabled = false, tone = 'neutral' }) {
  const isAccent = tone === 'accent'

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: danger
          ? '1px solid rgba(239,68,68,0.24)'
          : isAccent
            ? '1px solid rgba(185,208,255,0.92)'
            : '1px solid rgba(226,232,240,0.94)',
        background: danger
          ? 'rgba(239,68,68,0.08)'
          : isAccent
            ? active
              ? 'linear-gradient(180deg, #2f6fff 0%, #1f57e7 100%)'
              : 'rgba(232,241,255,0.96)'
            : active
              ? 'rgba(47,111,255,0.08)'
              : '#ffffff',
        color: danger ? '#ef4444' : isAccent ? (active ? '#ffffff' : 'var(--primary)') : active ? 'var(--primary)' : '#64748b',
        boxShadow: isAccent ? '0 8px 18px rgba(47,111,255,0.12)' : '0 8px 18px rgba(16,34,58,0.06)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        flexShrink: 0,
        opacity: disabled ? 0.65 : 1,
      }}
    >
      {children}
    </button>
  )
}

function TranscriptItem({ avatar, name, time, text, active }) {
  const waveHeights = active
    ? [8, 14, 22, 12, 18, 8, 14, 10, 18, 12, 20, 8, 12, 14, 8]
    : [6, 12, 10, 16, 8, 12, 14, 8, 10, 12, 8, 16, 8, 12, 10]

  return (
    <div style={{ borderRadius: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: active ? 'rgba(2,86,210,0.12)' : 'rgba(148,163,184,0.16)',
              color: active ? 'var(--primary)' : '#64748b',
              fontSize: 10,
              fontWeight: 800,
            }}
          >
            {avatar}
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#475569' }}>{name}</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{time}</span>
        </div>
        <Button type="text" icon={<MoreOutlined />} style={{ width: 24, height: 24, padding: 0, color: '#94a3b8' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 10, paddingLeft: 4 }}>
        {waveHeights.map((height, index) => (
          <WaveMark key={`${name}-${index}`} active={active && index < 5} height={height} />
        ))}
      </div>
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.7,
          color: '#334155',
          background: 'rgba(248,250,252,0.82)',
          borderRadius: 14,
          padding: '10px 12px',
        }}
      >
        {text}
      </div>
    </div>
  )
}

function VoiceNoteEditor({
  note,
  voicePanelVisible: controlledVisible,
  onVoicePanelToggle,
  onNoteRefresh,
  autoStartRecordingKey = null,
  autoStartLanguage = 'zh-CN',
  ...editorProps
}) {
  const [selectedRecording, setSelectedRecording] = useState(null)
  const [localVoicePanelVisible, setLocalVoicePanelVisible] = useState(true)
  const [recordings, setRecordings] = useState(buildInitialRecordings)
  const [transcriptGroups, setTranscriptGroups] = useState(buildInitialTranscriptGroups)
  const [languageModalOpen, setLanguageModalOpen] = useState(false)
  const [pendingLanguage, setPendingLanguage] = useState('zh-CN')
  const [recordingState, setRecordingState] = useState('idle')
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0)
  const [recordingPulseTick, setRecordingPulseTick] = useState(0)
  const [playbackState, setPlaybackState] = useState('idle')
  const [playbackPositionMs, setPlaybackPositionMs] = useState(0)
  const [playbackDurationMs, setPlaybackDurationMs] = useState(0)
  const [playbackPulseTick, setPlaybackPulseTick] = useState(0)
  const [playbackVolume, setPlaybackVolume] = useState(1)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [volumePopoverOpen, setVolumePopoverOpen] = useState(false)
  const [isPlaybackControlsCompact, setIsPlaybackControlsCompact] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteConfirmLoading, setDeleteConfirmLoading] = useState(false)
  const [pendingDeleteCard, setPendingDeleteCard] = useState(null)
  const [liveTranscriptText, setLiveTranscriptText] = useState('')
  const [liveTranscriptSegments, setLiveTranscriptSegments] = useState([])

  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const recordingStartedAtRef = useRef(0)
  const accumulatedElapsedRef = useRef(0)
  const elapsedTimerRef = useRef(null)
  const realtimeSocketRef = useRef(null)
  const realtimeSessionRef = useRef(null)
  const realtimeSessionIdRef = useRef(null)
  const realtimeDraftKeyRef = useRef(null)
  const realtimeMimeTypeRef = useRef('audio/webm')
  const realtimePendingChunksRef = useRef([])
  const realtimeFinishResolverRef = useRef(null)
  const realtimeFinishRejectRef = useRef(null)
  const realtimeFinishPromiseRef = useRef(null)
  const realtimeFinishedRef = useRef(false)
  const realtimeClosingRef = useRef(false)
  const realtimeAbortRef = useRef(false)
  const realtimeCleanupSilentRef = useRef(false)
  const realtimeAudioChunksRef = useRef([])
  const localPreviewUrlsRef = useRef(new Set())
  const playbackAudioRef = useRef(null)
  const playbackObjectUrlRef = useRef('')
  const playbackVolumeRef = useRef(1)
  const playbackLastVolumeRef = useRef(1)
  const playbackRateRef = useRef(1)
  const recordingStateRef = useRef('idle')
  const playbackStateRef = useRef('idle')
  const recordingsRef = useRef(recordings)
  const liveTranscriptTextRef = useRef('')
  const liveTranscriptSegmentsRef = useRef([])
  const transcriptSourceKeyRef = useRef('01')
  const sourceRecordingKeyRef = useRef('01')
  const playbackControlsRef = useRef(null)

  const voicePanelVisible = typeof controlledVisible === 'boolean' ? controlledVisible : localVoicePanelVisible
  const liveRecordingKey = realtimeDraftKeyRef.current
  const isLiveRealtimeSelected = Boolean(liveRecordingKey && selectedRecording === liveRecordingKey)
  const visibleTranscripts = isLiveRealtimeSelected
    ? liveTranscriptSegments
    : (transcriptGroups[selectedRecording] || transcriptGroups[transcriptSourceKeyRef.current] || [])
  const selectedRecordingData = recordings.find((item) => item.key === selectedRecording) || null
  const isRecording = recordingState === 'recording'
  const isPaused = recordingState === 'paused'
  const isUploading = recordingState === 'uploading'
  const isPlaying = playbackState === 'playing'
  const toggleVoicePanel = onVoicePanelToggle || (() => setLocalVoicePanelVisible((value) => !value))
  const autoStartRecordingRef = useRef(null)

  useEffect(() => {
    recordingsRef.current = recordings
  }, [recordings])

  useEffect(() => {
    liveTranscriptTextRef.current = liveTranscriptText
  }, [liveTranscriptText])

  useEffect(() => {
    liveTranscriptSegmentsRef.current = liveTranscriptSegments
  }, [liveTranscriptSegments])

  useEffect(() => {
    recordingStateRef.current = recordingState
  }, [recordingState])

  useEffect(() => {
    playbackStateRef.current = playbackState
  }, [playbackState])

  useEffect(() => {
    playbackVolumeRef.current = playbackVolume
    if (playbackAudioRef.current) {
      playbackAudioRef.current.volume = playbackVolume
      playbackAudioRef.current.muted = playbackVolume <= 0
    }
  }, [playbackVolume])

  useEffect(() => {
    playbackRateRef.current = playbackRate
    if (playbackAudioRef.current) {
      playbackAudioRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  useEffect(() => {
    if (selectedRecording) {
      transcriptSourceKeyRef.current = selectedRecording
    }
  }, [selectedRecording])

  useEffect(() => {
    const node = playbackControlsRef.current
    if (!node || typeof ResizeObserver === 'undefined') {
      return undefined
    }

    const updateCompactState = () => {
      setIsPlaybackControlsCompact(node.getBoundingClientRect().width < 620)
    }

    updateCompactState()
    const observer = new ResizeObserver(() => updateCompactState())
    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (autoStartRecordingKey == null || autoStartRecordingRef.current === autoStartRecordingKey) {
      return
    }

    autoStartRecordingRef.current = autoStartRecordingKey

    if (recordingStateRef.current !== 'idle') {
      return
    }

    setLanguageModalOpen(false)
    startRecording(autoStartLanguage || 'zh-CN')
  }, [autoStartLanguage, autoStartRecordingKey, note?.id])

  useEffect(() => {
    const voiceNotes = Array.isArray(note?.voiceNote) ? note.voiceNote : []
    clearRealtimeSession()
    clearLocalPreviewUrls()

    if (voiceNotes.length === 0) {
      setRecordings([])
      setTranscriptGroups({})
      setSelectedRecording(null)
      transcriptSourceKeyRef.current = '01'
      sourceRecordingKeyRef.current = '01'
      stopPlayback()
      return
    }

    const nextState = buildVoiceStateFromNoteVoiceNotes(voiceNotes)
    setRecordings(nextState.recordings)
    setTranscriptGroups(nextState.transcriptGroups)
    setSelectedRecording((current) => (
      current && nextState.recordings.some((item) => item.key === current)
        ? current
        : nextState.selectedKey
    ))
    transcriptSourceKeyRef.current = nextState.sourceKey
    sourceRecordingKeyRef.current = nextState.sourceKey
    stopPlayback()
  }, [note?.id, note?.voiceNote])

  useEffect(() => {
    return () => {
      if (elapsedTimerRef.current) {
        window.clearInterval(elapsedTimerRef.current)
      }

      cleanupRealtimeRecording({ abort: true, silent: true })

      if (playbackAudioRef.current) {
        playbackAudioRef.current.pause()
        playbackAudioRef.current.src = ''
        playbackAudioRef.current = null
      }

      if (playbackObjectUrlRef.current) {
        URL.revokeObjectURL(playbackObjectUrlRef.current)
        playbackObjectUrlRef.current = ''
      }

      clearLocalPreviewUrls()
    }
  }, [])

  const stopElapsedTimer = () => {
    if (elapsedTimerRef.current) {
      window.clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = null
    }
  }

  const updateElapsedDisplay = () => {
    const currentState = recordingStateRef.current
    const runningElapsed = currentState === 'recording' ? Date.now() - recordingStartedAtRef.current : 0
    setRecordingElapsedMs(accumulatedElapsedRef.current + runningElapsed)
    if (currentState === 'recording') {
      setRecordingPulseTick((tick) => tick + 1)
    }
  }

  const startElapsedTimer = () => {
    stopElapsedTimer()
    elapsedTimerRef.current = window.setInterval(updateElapsedDisplay, 200)
  }

  const resetRecordingSession = () => {
    stopElapsedTimer()
    recordingStartedAtRef.current = 0
    accumulatedElapsedRef.current = 0
    setRecordingElapsedMs(0)
    setRecordingPulseTick(0)
    setRecordingState('idle')
    recordingStateRef.current = 'idle'
    setLiveTranscriptText('')
    setLiveTranscriptSegments([])
  }

  const stopPlayback = () => {
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause()
      playbackAudioRef.current.currentTime = 0
    }
    if (playbackObjectUrlRef.current) {
      URL.revokeObjectURL(playbackObjectUrlRef.current)
      playbackObjectUrlRef.current = ''
    }
    setPlaybackPositionMs(0)
    setPlaybackDurationMs(0)
    setPlaybackPulseTick(0)
    setPlaybackState('idle')
    playbackStateRef.current = 'idle'
  }

  const revokeLocalPreviewUrl = (url) => {
    if (!url || !localPreviewUrlsRef.current.has(url)) {
      return
    }

    URL.revokeObjectURL(url)
    localPreviewUrlsRef.current.delete(url)
  }

  const clearLocalPreviewUrls = () => {
    localPreviewUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url)
    })
    localPreviewUrlsRef.current.clear()
  }

  const createLocalPreviewUrl = () => {
    if (realtimeAudioChunksRef.current.length === 0) {
      return ''
    }

    const blob = new Blob(realtimeAudioChunksRef.current, {
      type: realtimeMimeTypeRef.current || 'audio/webm',
    })

    if (!blob.size) {
      return ''
    }

    const objectUrl = URL.createObjectURL(blob)
    localPreviewUrlsRef.current.add(objectUrl)
    return objectUrl
  }

  const getRecordingPlaybackKey = (recording) => {
    if (recording?.fileId) {
      return `file:${recording.fileId}`
    }

    if (recording?.url) {
      return `url:${recording.url}`
    }

    return ''
  }

  const clearRealtimeSession = () => {
    const socket = realtimeSocketRef.current
    if (socket) {
      socket.onopen = null
      socket.onmessage = null
      socket.onerror = null
      socket.onclose = null
      try {
        realtimeClosingRef.current = true
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close(1000, 'client-cleanup')
        }
      } catch {
        // ignore cleanup errors
      }
      window.setTimeout(() => {
        realtimeClosingRef.current = false
      }, 0)
    }

    realtimeSocketRef.current = null
    realtimeSessionRef.current = null
    realtimeSessionIdRef.current = null
    realtimeDraftKeyRef.current = null
    realtimeMimeTypeRef.current = 'audio/webm'
    realtimePendingChunksRef.current = []
    realtimeFinishResolverRef.current = null
    realtimeFinishRejectRef.current = null
    realtimeFinishPromiseRef.current = null
    realtimeFinishedRef.current = false
    realtimeClosingRef.current = false
    realtimeAudioChunksRef.current = []
    setLiveTranscriptText('')
    setLiveTranscriptSegments([])
  }

  const syncVoiceCardsFromNote = (refreshedNote) => {
    const refreshedVoiceNotes = Array.isArray(refreshedNote?.voiceNote) ? refreshedNote.voiceNote : null

    if (!refreshedVoiceNotes || refreshedVoiceNotes.length === 0) {
      return false
    }

    const nextState = buildVoiceStateFromNoteVoiceNotes(refreshedVoiceNotes)
    setRecordings(nextState.recordings)
    setTranscriptGroups(nextState.transcriptGroups)
    setSelectedRecording((current) => (
      current && nextState.recordings.some((item) => item.key === current)
        ? current
        : nextState.selectedKey
    ))
    transcriptSourceKeyRef.current = nextState.sourceKey
    sourceRecordingKeyRef.current = nextState.sourceKey
    return true
  }

  const registerLiveRecordingCard = (language, title = '') => {
    const key = String(recordingsRef.current.length + 1).padStart(2, '0')
    realtimeDraftKeyRef.current = key
    setRecordings((current) => [createLiveRecordingCard({ key, language, title }), ...current])
    setSelectedRecording(key)
    setLiveTranscriptText('')
    setLiveTranscriptSegments([])
    return key
  }

  const discardLiveRecordingCard = () => {
    const key = realtimeDraftKeyRef.current
    if (!key) {
      return
    }

    const currentCard = recordingsRef.current.find((item) => item.key === key)
    if (currentCard?.isLocalPreview && currentCard.url) {
      revokeLocalPreviewUrl(currentCard.url)
    }

    setRecordings((current) => current.filter((item) => item.key !== key))
    setTranscriptGroups((current) => {
      if (!current[key]) {
        return current
      }

      const nextGroups = { ...current }
      delete nextGroups[key]
      return nextGroups
    })

    if (selectedRecording === key || playbackStateRef.current !== 'idle') {
      stopPlayback()
    }

    setSelectedRecording((current) => {
      if (current !== key) {
        return current
      }

      const nextSelected = sourceRecordingKeyRef.current
        || recordingsRef.current.find((item) => item.key !== key)?.key
        || null

      return nextSelected
    })

    realtimeDraftKeyRef.current = null
  }

  const preserveInterruptedRecordingDraft = (reason = '实时转写连接已断开') => {
    const key = realtimeDraftKeyRef.current
    if (!key) {
      return false
    }

    const draftText = String(liveTranscriptTextRef.current || '').trim()
    const draftSegments = Array.isArray(liveTranscriptSegmentsRef.current)
      ? liveTranscriptSegmentsRef.current.filter((item) => String(item?.text || '').trim())
      : []
    const hasTranscript = draftSegments.length > 0 || Boolean(draftText)
    const elapsedMs = accumulatedElapsedRef.current + (
      recordingStateRef.current === 'recording'
        ? Math.max(0, Date.now() - recordingStartedAtRef.current)
        : 0
    )
    const previewUrl = createLocalPreviewUrl()
    const hasAudioPreview = Boolean(previewUrl)

    if (!hasTranscript && elapsedMs <= 0 && !hasAudioPreview) {
      return false
    }

    const preservedEntries = [...draftSegments]
    if (draftText) {
      preservedEntries.push(createTranscriptEntry({
        name: '实时转写',
        time: '刚刚',
        text: draftText,
        active: false,
      }))
    }

    if (preservedEntries.length === 0) {
      preservedEntries.push(createTranscriptEntry({
        name: '实时转写',
        time: '刚刚',
        text: `${reason}，已保留当前未完成录音草稿。`,
        active: false,
      }))
    }

    setTranscriptGroups((current) => ({
      ...current,
      [key]: preservedEntries,
    }))
    setSelectedRecording(key)
    transcriptSourceKeyRef.current = key
    sourceRecordingKeyRef.current = key
    updateLiveRecordingCard((card) => ({
      ...card,
      duration: '连接中断',
      durationMs: elapsedMs,
      status: 'failed',
      transcriptStatus: 'failed',
      title: card.title.includes('未完成') ? card.title : `${card.title} · 未完成`,
      url: previewUrl || card.url,
      isLocalPreview: Boolean(previewUrl) || card.isLocalPreview,
      transcript: preservedEntries.map((item) => item.text).join('\n'),
    }))

    return true
  }

  const updateLiveRecordingCard = (mutator) => {
    const key = realtimeDraftKeyRef.current
    if (!key) {
      return
    }

    setRecordings((current) => current.map((item) => {
      if (item.key !== key) {
        return item
      }

      return mutator(item)
    }))
  }

  const appendLiveSegment = (text) => {
    const normalizedText = String(text || '').trim()
    if (!normalizedText) {
      return
    }

    setLiveTranscriptSegments((current) => ([
      ...current,
      createTranscriptEntry({
        name: '实时转写',
        time: '刚刚',
        text: normalizedText,
        active: false,
      }),
    ]))
  }

  const sendRealtimePayload = (payload) => {
    const socket = realtimeSocketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false
    }

    try {
      socket.send(JSON.stringify(payload))
      return true
    } catch {
      return false
    }
  }

  const sendRealtimeChunk = (chunk) => {
    const socket = realtimeSocketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      realtimePendingChunksRef.current.push(chunk)
      return
    }

    try {
      socket.send(chunk)
    } catch {
      realtimePendingChunksRef.current.push(chunk)
    }
  }

  const flushRealtimeChunks = () => {
    const socket = realtimeSocketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return
    }

    while (realtimePendingChunksRef.current.length > 0) {
      const nextChunk = realtimePendingChunksRef.current.shift()
      try {
        socket.send(nextChunk)
      } catch {
        realtimePendingChunksRef.current.unshift(nextChunk)
        break
      }
    }
  }

  const waitForRealtimeFinish = () => {
    if (realtimeFinishPromiseRef.current) {
      return realtimeFinishPromiseRef.current
    }

    realtimeFinishPromiseRef.current = new Promise((resolve, reject) => {
      realtimeFinishResolverRef.current = resolve
      realtimeFinishRejectRef.current = reject
    })

    return realtimeFinishPromiseRef.current
  }

  const resolveRealtimeFinish = () => {
    if (realtimeFinishResolverRef.current) {
      realtimeFinishResolverRef.current()
    }

    realtimeFinishResolverRef.current = null
    realtimeFinishRejectRef.current = null
    realtimeFinishPromiseRef.current = null
  }

  const rejectRealtimeFinish = (error) => {
    if (realtimeFinishRejectRef.current) {
      realtimeFinishRejectRef.current(error)
    }

    realtimeFinishResolverRef.current = null
    realtimeFinishRejectRef.current = null
    realtimeFinishPromiseRef.current = null
  }

  const cleanupRealtimeRecording = ({ abort = true, silent = false } = {}) => {
    if (abort) {
      realtimeAbortRef.current = true
      realtimeCleanupSilentRef.current = silent
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        // ignore cleanup errors
      }
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    mediaRecorderRef.current = null
    clearRealtimeSession()
  }

  const finalizeRealtimeRecording = async () => {
    try {
      sendRealtimePayload({ type: 'finish' })
      await Promise.race([
        waitForRealtimeFinish(),
        new Promise((resolve) => window.setTimeout(resolve, 5000)),
      ])
    } finally {
      try {
        const refreshedNote = await onNoteRefresh?.()
        const synced = syncVoiceCardsFromNote(refreshedNote)
        if (!synced) {
          discardLiveRecordingCard()
        }
      } finally {
        cleanupRealtimeRecording({ abort: false })
        resetRecordingSession()
      }
    }
  }

  const handleRealtimeSocketMessage = async (event) => {
    let payload = event?.data ?? null

    if (payload instanceof Blob) {
      payload = await payload.text()
    } else if (payload instanceof ArrayBuffer) {
      payload = new TextDecoder().decode(payload)
    }

    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload)
      } catch {
        return
      }
    }

    if (!payload || typeof payload !== 'object') {
      return
    }

    switch (payload.type) {
      case 'session.ready':
        realtimeSessionRef.current = payload
        break
      case 'transcript.partial':
        setLiveTranscriptText(String(payload.transcript || payload.finalTranscript || '').trim())
        updateLiveRecordingCard((card) => ({
          ...card,
          title: `${getLanguageLabel(pendingLanguage)}实时转写`,
        }))
        break
      case 'transcript.segment': {
        const segmentText = String(payload.segmentTranscript || payload.finalTranscript || payload.transcript || '').trim()
        if (segmentText) {
          appendLiveSegment(segmentText)
        }
        setLiveTranscriptText('')
        break
      }
      case 'session.paused':
        setRecordingState('paused')
        recordingStateRef.current = 'paused'
        updateLiveRecordingCard((card) => ({
          ...card,
          duration: '已暂停',
        }))
        break
      case 'session.resumed':
        setRecordingState('recording')
        recordingStateRef.current = 'recording'
        updateLiveRecordingCard((card) => ({
          ...card,
          duration: '转写中',
        }))
        break
      case 'session.finished':
        realtimeFinishedRef.current = true
        resolveRealtimeFinish()
        break
      case 'session.error':
        message.error(payload.error || '实时转写失败')
        rejectRealtimeFinish(new Error(payload.error || '实时转写失败'))
        break
      default:
        break
    }
  }

  const createRealtimeSocketConnection = async (session, mimeType) => {
    const socket = voiceRealtimeService.createVoiceRealtimeSocket({
      websocketPath: session?.websocketPath,
      sessionId: session?.sessionId,
      appId: authService.getAppId(),
      userId: authService.getUserId(),
      token: authService.getToken(),
      mimeType,
    })

    realtimeSocketRef.current = socket

    await new Promise((resolve, reject) => {
      socket.onopen = () => {
        flushRealtimeChunks()
        resolve()
      }

      socket.onmessage = (event) => {
        handleRealtimeSocketMessage(event).catch((error) => {
          console.error('Realtime voice message handling failed', error)
        })
      }

      socket.onerror = () => {
        const error = new Error('实时转写连接失败')
        if (!realtimeFinishedRef.current && !realtimeClosingRef.current && recordingStateRef.current !== 'idle') {
          preserveInterruptedRecordingDraft(error.message)
          message.error(error.message)
          cleanupRealtimeRecording({ abort: true, silent: true })
          resetRecordingSession()
        }
        reject(error)
      }

      socket.onclose = () => {
        if (!realtimeFinishedRef.current && !realtimeClosingRef.current && recordingStateRef.current !== 'idle') {
          const error = new Error('实时转写连接已断开')
          preserveInterruptedRecordingDraft(error.message)
          message.error(error.message)
          cleanupRealtimeRecording({ abort: true, silent: true })
          resetRecordingSession()
          reject(error)
        }
      }
    })
  }

  const handlePlaybackVolumeChange = (value) => {
    const nextValue = Array.isArray(value) ? value[0] : value
    const normalized = Math.max(0, Math.min(1, Number(nextValue) || 0))
    if (normalized > 0) {
      playbackLastVolumeRef.current = normalized
    }
    setPlaybackVolume(normalized)
    if (playbackAudioRef.current) {
      playbackAudioRef.current.volume = normalized
      playbackAudioRef.current.muted = normalized <= 0
    }
  }

  const handleToggleMute = () => {
    const nextValue = playbackVolume > 0 ? 0 : (playbackLastVolumeRef.current || 1)
    handlePlaybackVolumeChange(nextValue)
  }

  const closeVolumePopover = () => setVolumePopoverOpen(false)

  const handlePlaybackRateSelect = (rate) => {
    setPlaybackRate(rate)
    if (playbackAudioRef.current) {
      playbackAudioRef.current.playbackRate = rate
    }
  }

  const syncPlaybackProgress = () => {
    const audio = playbackAudioRef.current
    if (!audio) {
      return
    }

    const nextDuration = Number.isFinite(audio.duration) ? Math.floor(audio.duration * 1000) : 0
    const nextPosition = Number.isFinite(audio.currentTime) ? Math.floor(audio.currentTime * 1000) : 0
    setPlaybackDurationMs(nextDuration)
    setPlaybackPositionMs(nextPosition)

    if (playbackStateRef.current === 'playing') {
      setPlaybackPulseTick((tick) => tick + 1)
    }
  }

  const handlePlaybackEnded = () => {
    setPlaybackPositionMs(0)
    setPlaybackState('idle')
    playbackStateRef.current = 'idle'
  }

  const ensurePlaybackAudio = async (recording) => {
    const playbackKey = getRecordingPlaybackKey(recording)
    if (!playbackKey) {
      return null
    }

    const audio = playbackAudioRef.current || new Audio()
    if (audio.__sourceKey !== playbackKey) {
      audio.pause()
      if (playbackObjectUrlRef.current) {
        URL.revokeObjectURL(playbackObjectUrlRef.current)
        playbackObjectUrlRef.current = ''
      }

      if (recording?.fileId) {
        const blob = await noteService.getVoiceFile(recording.fileId)
        const objectUrl = URL.createObjectURL(blob)
        playbackObjectUrlRef.current = objectUrl
        audio.src = objectUrl
      } else if (recording?.url) {
        audio.src = recording.url
      }

      audio.currentTime = 0
      audio.__sourceKey = playbackKey
    }

    audio.onloadedmetadata = syncPlaybackProgress
    audio.ontimeupdate = syncPlaybackProgress
    audio.onplay = () => {
      setPlaybackState('playing')
      playbackStateRef.current = 'playing'
      audio.volume = playbackVolumeRef.current
      audio.playbackRate = playbackRateRef.current
      audio.muted = playbackVolumeRef.current <= 0
    }
    audio.onpause = () => {
      if (playbackStateRef.current === 'playing') {
        setPlaybackState('paused')
        playbackStateRef.current = 'paused'
      }
    }
    audio.onended = handlePlaybackEnded
    audio.onerror = () => {
      message.error('语音播放失败')
      handlePlaybackEnded()
    }

    playbackAudioRef.current = audio
    return audio
  }

  const handleTogglePlayback = async () => {
    const recording = selectedRecordingData

    if (!getRecordingPlaybackKey(recording)) {
      message.info('请先选择一条可播放的语音卡片')
      return
    }

    const audio = await ensurePlaybackAudio(recording)
    if (!audio) {
      return
    }

    try {
      if (playbackStateRef.current === 'playing') {
        audio.pause()
        return
      }

      await audio.play()
      syncPlaybackProgress()
    } catch (error) {
      message.error(error?.message || '语音播放失败')
      handlePlaybackEnded()
    }
  }

  const handlePlaybackSeek = async (event) => {
    const audio = playbackAudioRef.current
    if (!audio || !getRecordingPlaybackKey(selectedRecordingData) || !playbackDurationMs) {
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    const nextTime = ratio * audio.duration
    audio.currentTime = nextTime
    setPlaybackPositionMs(Math.floor(nextTime * 1000))
  }

  const volumePopoverContent = (
    <div
      style={{
        width: 244,
        padding: 16,
        borderRadius: 20,
        background: 'linear-gradient(180deg, rgba(247,250,255,0.98), rgba(255,255,255,0.98))',
        boxShadow: '0 14px 28px rgba(47,111,255,0.10)',
        border: '1px solid rgba(191,214,255,0.78)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>音量</div>
          <div style={{ marginTop: 2, fontSize: 11, color: '#94a3b8' }}>{Math.round(playbackVolume * 100)}%</div>
        </div>
        <button
          type="button"
          onClick={handleToggleMute}
          style={{
            border: 'none',
            background: 'rgba(232,241,255,0.96)',
            color: 'var(--primary)',
            borderRadius: 999,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'inset 0 0 0 1px rgba(191,214,255,0.9)',
          }}
        >
          {playbackVolume <= 0 ? '恢复音量' : '静音'}
        </button>
      </div>
      <div className="voice-volume-slider">
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={playbackVolume}
          onChange={handlePlaybackVolumeChange}
          tooltip={{ open: false }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
        <span>静音</span>
        <span>{Math.round(playbackVolume * 100)}%</span>
      </div>
    </div>
  )

  const handleSelectRecording = (key) => {
    setSelectedRecording(key)
    transcriptSourceKeyRef.current = key
    if (playbackStateRef.current !== 'idle') {
      stopPlayback()
    }
  }

  const handleDeleteRecordingCard = (card) => {
    if (!note?.id || !card?.fileId) {
      message.warning('当前语音卡片缺少 fileId，暂时无法删除')
      return
    }

    setPendingDeleteCard(card)
    setDeleteConfirmOpen(true)
  }

  const confirmDeleteRecordingCard = async () => {
    const card = pendingDeleteCard
    if (!note?.id || !card?.fileId) {
      setDeleteConfirmOpen(false)
      setPendingDeleteCard(null)
      return
    }

    setDeleteConfirmLoading(true)

    try {
      await noteService.deleteVoiceFile(note.id, card.fileId)

      const refreshedNote = await onNoteRefresh?.()
      const refreshedVoiceNotes = Array.isArray(refreshedNote?.voiceNote) ? refreshedNote.voiceNote : null

      if (refreshedVoiceNotes) {
        const nextState = buildVoiceStateFromNoteVoiceNotes(refreshedVoiceNotes)
        setRecordings(nextState.recordings)
        setTranscriptGroups(nextState.transcriptGroups)
        setSelectedRecording((current) => (
          current && nextState.recordings.some((item) => item.key === current)
            ? current
            : nextState.selectedKey
        ))
        transcriptSourceKeyRef.current = nextState.sourceKey
        sourceRecordingKeyRef.current = nextState.sourceKey
      } else {
        setRecordings((current) => {
          const remaining = current.filter((item) => item.fileId !== card.fileId)
          if (remaining.length > 0) {
            const nextSelected = remaining.find((item) => item.key === selectedRecording)
              ? selectedRecording
              : remaining[0].key
            setSelectedRecording(nextSelected)
          } else {
            setSelectedRecording(null)
          }
          return remaining
        })

        if (selectedRecording === card.key || playbackStateRef.current !== 'idle') {
          stopPlayback()
        }

        setTranscriptGroups((current) => {
          const nextGroups = { ...current }
          if (card.key) {
            delete nextGroups[card.key]
          }
          return nextGroups
        })
      }

      message.success('语音卡片已删除')
      setDeleteConfirmOpen(false)
      setPendingDeleteCard(null)
    } catch (error) {
      message.error(error?.message || '删除语音卡片失败')
    } finally {
      setDeleteConfirmLoading(false)
    }
  }

  useEffect(() => {
    const playbackKey = getRecordingPlaybackKey(selectedRecordingData)

    if (!playbackKey) {
      stopPlayback()
      return undefined
    }

    if (playbackAudioRef.current && playbackAudioRef.current.__sourceKey && playbackAudioRef.current.__sourceKey !== playbackKey) {
      stopPlayback()
    }

    return undefined
  }, [selectedRecordingData?.fileId, selectedRecordingData?.url])

  const startRecording = async (language) => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      message.error('当前浏览器不支持麦克风录音')
      return
    }

    if (!note?.id) {
      message.error('缺少笔记 ID，无法开始录音')
      return
    }

    try {
      const session = await voiceRealtimeService.createVoiceRealtimeSession(
        note.id,
        normalizeRealtimeLanguage(language)
      )
      const sessionId = session?.sessionId

      if (!sessionId) {
        throw new Error('创建实时语音会话失败')
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const preferredMimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
      const mimeType = preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported?.(type)) || ''
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      const recordingMimeType = recorder.mimeType || mimeType || 'audio/webm'

      await createRealtimeSocketConnection(session, recordingMimeType)

      realtimeAbortRef.current = false
      realtimeCleanupSilentRef.current = false
      realtimeSessionRef.current = session
      realtimeSessionIdRef.current = sessionId
      realtimeMimeTypeRef.current = recordingMimeType
      realtimePendingChunksRef.current = []
      realtimeAudioChunksRef.current = []
      realtimeFinishedRef.current = false
      realtimeDraftKeyRef.current = null
      setLiveTranscriptText('')
      setLiveTranscriptSegments([])

      sourceRecordingKeyRef.current = selectedRecording
      mediaStreamRef.current = stream
      mediaRecorderRef.current = recorder
      recordingStartedAtRef.current = Date.now()
      accumulatedElapsedRef.current = 0
      setRecordingElapsedMs(0)
      setRecordingPulseTick(0)
      setPendingLanguage(language)
      setRecordingState('recording')
      recordingStateRef.current = 'recording'
      startElapsedTimer()

      const liveKey = registerLiveRecordingCard(language)
      setSelectedRecording(liveKey)

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          realtimeAudioChunksRef.current.push(event.data)
          sendRealtimeChunk(event.data)
        }
      }

      recorder.onerror = () => {
        message.error('录音设备出现错误')
      }

      recorder.onstop = () => {
        void (async () => {
          if (realtimeAbortRef.current) {
            if (!realtimeCleanupSilentRef.current) {
              discardLiveRecordingCard()
              cleanupRealtimeRecording({ abort: false })
              resetRecordingSession()
            }
            return
          }

          try {
            await finalizeRealtimeRecording()
          } catch (error) {
            message.error(error?.message || '实时转写处理失败')
            discardLiveRecordingCard()
            cleanupRealtimeRecording({ abort: false })
            resetRecordingSession()
          }
        })()
      }

      recorder.start(250)
      message.success(`已开始${getLanguageLabel(language)}实时转写`)
    } catch (error) {
      discardLiveRecordingCard()
      cleanupRealtimeRecording({ abort: true })
      resetRecordingSession()
      message.error(error?.message || '无法访问麦克风')
    }
  }

  const handleConfirmLanguage = async () => {
    const language = pendingLanguage
    setLanguageModalOpen(false)
    await startRecording(language)
  }

  const handleStartMicClick = () => {
    setLanguageModalOpen(true)
  }

  const handlePauseRecording = () => {
    if (mediaRecorderRef.current?.state !== 'recording') {
      return
    }

    accumulatedElapsedRef.current += Date.now() - recordingStartedAtRef.current
    setRecordingElapsedMs(accumulatedElapsedRef.current)
    stopElapsedTimer()
    mediaRecorderRef.current.pause()
    setRecordingState('paused')
    recordingStateRef.current = 'paused'
    sendRealtimePayload({ type: 'pause' })
    updateLiveRecordingCard((card) => ({
      ...card,
      duration: '已暂停',
    }))
  }

  const handleResumeRecording = () => {
    if (mediaRecorderRef.current?.state !== 'paused') {
      return
    }

    recordingStartedAtRef.current = Date.now()
    mediaRecorderRef.current.resume()
    setRecordingState('recording')
    recordingStateRef.current = 'recording'
    startElapsedTimer()
    sendRealtimePayload({ type: 'resume', mimeType: realtimeMimeTypeRef.current })
    updateLiveRecordingCard((card) => ({
      ...card,
      duration: '转写中',
    }))
  }

  const handleStopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return
    }

    if (recordingState === 'recording') {
      accumulatedElapsedRef.current += Date.now() - recordingStartedAtRef.current
      setRecordingElapsedMs(accumulatedElapsedRef.current)
    }

    stopElapsedTimer()
    setRecordingState('uploading')
    recordingStateRef.current = 'uploading'
    realtimeAbortRef.current = false

    try {
      mediaRecorderRef.current.stop()
    } catch (error) {
      discardLiveRecordingCard()
      cleanupRealtimeRecording({ abort: true })
      resetRecordingSession()
      message.error(error?.message || '停止录音失败')
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 auto',
        width: '100%',
        minHeight: 0,
        minWidth: 0,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(247,249,251,0.92), rgba(255,255,255,0.98))',
      }}
    >
      <Modal
        open={deleteConfirmOpen}
        title="删除语音卡片"
        centered
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: deleteConfirmLoading }}
        onOk={confirmDeleteRecordingCard}
        onCancel={() => {
          if (deleteConfirmLoading) {
            return
          }
          setDeleteConfirmOpen(false)
          setPendingDeleteCard(null)
        }}
        destroyOnHidden
      >
        <div style={{ color: '#475569', lineHeight: 1.7 }}>
          确认删除这条语音素材吗？删除后将同步清理服务端归档。
        </div>
      </Modal>

      <style>{`
        @keyframes voice-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }

        .voice-volume-popover .ant-popover-inner {
          padding: 0;
          border-radius: 20px;
          overflow: hidden;
          background: transparent;
        }

        .voice-volume-popover .ant-popover-arrow {
          display: none;
        }

        .voice-volume-slider .ant-slider {
          margin: 0;
        }

        .voice-volume-slider .ant-slider-rail {
          background: linear-gradient(90deg, #dbeafe, #bfdbfe);
          height: 6px;
          border-radius: 999px;
        }

        .voice-volume-slider .ant-slider-track {
          background: linear-gradient(90deg, #2f6fff 0%, #7aa8ff 100%);
          height: 6px;
          border-radius: 999px;
        }

        .voice-volume-slider .ant-slider-handle::after {
          box-shadow: 0 0 0 3px rgba(47,111,255,0.10);
        }

        .voice-volume-slider .ant-slider-handle {
          width: 16px;
          height: 16px;
          margin-top: -5px;
          border: 2px solid #fff;
          background: linear-gradient(180deg, #2f6fff, #1f57e7);
          box-shadow: 0 8px 18px rgba(47,111,255,0.22);
        }

        .voice-playback-rate-menu .ant-dropdown-menu {
          min-width: 176px;
          padding: 8px;
          border-radius: 18px;
          background: rgba(247,250,255,0.98);
          box-shadow: 0 14px 28px rgba(47,111,255,0.10);
          border: 1px solid rgba(191,214,255,0.78);
        }

        .voice-playback-rate-menu .ant-dropdown-menu-item {
          border-radius: 12px;
          padding: 10px 12px;
          margin: 4px 0;
          color: #334155;
          font-weight: 700;
        }

        .voice-playback-rate-menu .ant-dropdown-menu-item-selected {
          background: rgba(47,111,255,0.10);
          color: var(--primary);
        }

        .voice-playback-rate-menu .ant-dropdown-menu-item:hover {
          background: rgba(47,111,255,0.08);
        }
      `}</style>

      <div
        style={{
          display: 'grid',
          flex: 1,
          minHeight: 0,
          alignItems: 'stretch',
          overflow: 'hidden',
          gridTemplateColumns: voicePanelVisible
            ? 'minmax(0, 1fr) minmax(0, 1fr)'
            : 'minmax(0, 0fr) minmax(0, 1fr)',
          transition: 'grid-template-columns 320ms cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'grid-template-columns',
        }}
      >
        <section
          aria-hidden={!voicePanelVisible}
          style={{
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: '#ffffff',
            borderRight: '1px solid rgba(226,232,240,0.8)',
            position: 'relative',
            opacity: voicePanelVisible ? 1 : 0,
            transform: voicePanelVisible ? 'translateX(0)' : 'translateX(-12px)',
            pointerEvents: voicePanelVisible ? 'auto' : 'none',
            transition: 'opacity 180ms ease, transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
            willChange: 'opacity, transform',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid rgba(226,232,240,0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flexWrap: 'nowrap' }}>
              <span style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center' }}>
                <VoicePulse />
              </span>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>转写内容</div>
              <button
                type="button"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#475569',
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: 'pointer',
                  padding: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                观点提取
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span style={{ width: 1, height: 18, background: 'rgba(203,213,225,0.9)' }} />
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={toggleVoicePanel}
                style={{
                  width: 30,
                  height: 30,
                  padding: 0,
                  color: '#94a3b8',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              overflowX: 'auto',
              padding: '12px 16px 14px',
              flexShrink: 0,
            }}
          >
            {recordings.length > 0 ? (
              recordings.map(({ key, ...recording }) => (
                <RecordingCard
                  key={key}
                  active={selectedRecording === key}
                  {...recording}
                  onClick={() => handleSelectRecording(key)}
                  onDelete={recording.fileId ? () => handleDeleteRecordingCard({ key, ...recording }) : null}
                />
              ))
            ) : (
              <div
                style={{
                  width: '100%',
                  minHeight: 120,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontSize: 13,
                  borderRadius: 16,
                  background: 'linear-gradient(180deg, rgba(248,250,252,0.7), rgba(255,255,255,0.2))',
                }}
              >
                暂无语音卡片，开始录音后会在这里生成
              </div>
            )}
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              padding: '14px 16px 16px',
              gap: 14,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {isLiveRealtimeSelected ? (
                <div
                  style={{
                    marginBottom: 14,
                    borderRadius: 18,
                    border: '1px solid rgba(191,214,255,0.78)',
                    background: 'linear-gradient(180deg, rgba(239,246,255,0.98), rgba(255,255,255,0.98))',
                    boxShadow: '0 10px 22px rgba(47,111,255,0.08)',
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                        实时转写
                      </div>
                      <RealtimeStatusBadge recordingState={recordingState} compact />
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                      {getRealtimeStatusMeta(recordingState).hint}
                    </div>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#64748b', flexWrap: 'wrap' }}>
                    <span>{getLanguageLabel(pendingLanguage)}</span>
                    <span>·</span>
                    <span>{formatElapsed(recordingElapsedMs)}</span>
                    {isUploading ? <span>·</span> : null}
                    {isUploading ? <span>正在整理语音卡片</span> : null}
                  </div>
                  <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.7, color: '#334155', minHeight: 24 }}>
                    {liveTranscriptText || (isPaused ? '当前会话已暂停，等待继续录音。' : '正在识别语音内容...')}
                  </div>
                </div>
              ) : null}

              {visibleTranscripts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', minHeight: 0, flex: 1 }}>
                  {visibleTranscripts.map((item, index) => (
                    <TranscriptItem key={`${item.name}-${item.time}-${index}`} {...item} />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    alignItems: 'stretch',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      flex: 1,
                      borderRadius: 24,
                      background: 'linear-gradient(180deg, rgba(248,250,252,0.78), rgba(255,255,255,0.42))',
                      border: '1px solid rgba(226,232,240,0.55)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      fontSize: 13,
                      textAlign: 'center',
                      padding: '24px',
                    }}
                  >
                    暂无语音卡片，开始录音后会在这里生成
                  </div>
                </div>
              )}
            </div>

            <div
              ref={playbackControlsRef}
              style={{
                flexShrink: 0,
                padding: '14px 18px 16px',
                borderRadius: 24,
                border: '1px solid rgba(191,214,255,0.80)',
                background: 'linear-gradient(180deg, rgba(247,250,255,0.98), rgba(255,255,255,0.98))',
                boxShadow: '0 14px 28px rgba(47,111,255,0.08)',
                zIndex: 2,
              }}
            >
              {recordingState === 'idle' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 48, flexWrap: 'wrap', rowGap: 10 }}>
                  <RecorderButton
                    title={isPlaying ? '暂停播放' : '播放'}
                    onClick={handleTogglePlayback}
                    disabled={!getRecordingPlaybackKey(selectedRecordingData)}
                    active={isPlaying}
                    tone="accent"
                  >
                    {isPlaying ? <PauseOutlined style={{ fontSize: 16 }} /> : <PlayCircleFilled style={{ fontSize: 16 }} />}
                  </RecorderButton>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 68, color: '#64748b', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, lineHeight: 1.15, flexShrink: 0 }}>
                    <span>{formatElapsed(playbackPositionMs)}</span>
                    <span>{formatElapsed(playbackDurationMs || selectedRecordingData?.durationMs || 32000)}</span>
                  </div>

                  <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="button"
                      onClick={handlePlaybackSeek}
                      aria-label="播放进度"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        height: 10,
                        border: 'none',
                        background: 'transparent',
                        padding: 0,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ width: '100%', height: 4, borderRadius: 999, background: '#dbeafe', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${playbackDurationMs > 0 ? Math.min(100, (playbackPositionMs / playbackDurationMs) * 100) : 0}%`,
                            height: '100%',
                            borderRadius: 999,
                            background: 'linear-gradient(90deg, #2f6fff 0%, #7aa8ff 100%)',
                            transition: 'width 120ms linear',
                          }}
                        />
                      </div>
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b', flexShrink: 0, flexWrap: 'wrap' }}>
                    <Popover
                      open={volumePopoverOpen}
                      onOpenChange={setVolumePopoverOpen}
                      trigger="click"
                      placement="topRight"
                      content={volumePopoverContent}
                      overlayClassName="voice-volume-popover"
                      overlayStyle={{ zIndex: 1200 }}
                    >
                      <button
                        type="button"
                        title="调整音量"
                        aria-label="调整音量"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: playbackVolume <= 0 ? '#cbd5e1' : '#334155',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          transition: 'transform 160ms ease, color 160ms ease',
                          transform: volumePopoverOpen ? 'translateY(-1px)' : 'none',
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                          <path d="M3 14h4l5 4V6L7 10H3v4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                          {playbackVolume > 0 ? (
                            <>
                              <path d="M16 9a4 4 0 0 1 0 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              <path d="M18.5 6.5a8 8 0 0 1 0 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </>
                          ) : (
                            <path d="M15 9l6 6M21 9l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          )}
                        </svg>
                      </button>
                    </Popover>
                    <Dropdown
                      trigger={['click']}
                      placement="topRight"
                      menu={{
                        items: SPEED_PRESETS.map((rate) => ({
                          key: String(rate),
                          label: (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 92 }}>
                              <span>{`${formatPlaybackRate(rate)}X`}</span>
                              {playbackRate === rate ? <span style={{ color: 'var(--primary)', fontWeight: 800 }}>✓</span> : null}
                            </div>
                          ),
                        })),
                        onClick: ({ key }) => handlePlaybackRateSelect(Number(key)),
                        selectable: true,
                        selectedKeys: [String(playbackRate)],
                      }}
                      overlayClassName="voice-playback-rate-menu"
                      >
                        <button
                          type="button"
                          title="调整倍速"
                          aria-label="调整倍速"
                            style={{
                              border: 'none',
                              background: 'rgba(232,241,255,0.96)',
                              color: '#334155',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: '5px 10px',
                              borderRadius: 999,
                              backgroundImage: 'linear-gradient(180deg, rgba(243,248,255,0.98), rgba(232,241,255,0.88))',
                              boxShadow: 'inset 0 0 0 1px rgba(191,214,255,0.9)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                        >
                          <span>{`${formatPlaybackRate(playbackRate)}X`}</span>
                          <DownOutlined style={{ fontSize: 10, color: '#94a3b8' }} />
                        </button>
                      </Dropdown>
                  </div>

                  <RecorderButton title="开始录音" onClick={handleStartMicClick} active tone="accent">
                    <MicIcon size={18} color="currentColor" />
                  </RecorderButton>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', rowGap: 12 }}>
                  <RecorderButton
                    title={isRecording ? '暂停录音' : '继续录音'}
                    onClick={isRecording ? handlePauseRecording : handleResumeRecording}
                    active={isRecording}
                    disabled={isUploading}
                  >
                    {isRecording ? <PauseOutlined style={{ fontSize: 16 }} /> : <PlayCircleFilled style={{ fontSize: 16 }} />}
                  </RecorderButton>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 96, color: '#64748b', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <RealtimeStatusBadge recordingState={recordingState} compact />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
                        {getLanguageLabel(pendingLanguage)}
                      </span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#475569', fontFamily: 'monospace' }}>
                      {formatElapsed(recordingElapsedMs)}
                    </div>
                  </div>

                  <div style={{ flex: '1 1 200px', minWidth: 120, display: 'flex', alignItems: 'center', gap: 2, height: 22 }}>
                    {[10, 16, 24, 14, 20, 10, 18, 12, 16, 10, 14].map((height, index) => {
                      const animatedHeight = isRecording && !isUploading
                        ? height + (((recordingPulseTick + index) % 5) - 2) * 1.5
                        : isPlaying
                          ? height + (((playbackPulseTick + index) % 5) - 2) * 1.2
                          : height

                      return (
                        <span
                          key={index}
                          style={{
                            width: 2,
                            height: animatedHeight,
                            borderRadius: 999,
                            background: isRecording && !isUploading
                              ? 'linear-gradient(180deg, #0057d7, #7aa8ff)'
                              : isPlaying
                                ? 'linear-gradient(180deg, #3b82f6, #93c5fd)'
                                : 'rgba(148,163,184,0.28)',
                            transform: isRecording && !isUploading ? 'translateY(0) scaleY(1)' : 'none',
                            transition: 'height 140ms ease, background 140ms ease, transform 140ms ease',
                          }}
                        />
                      )
                    })}
                  </div>

                  <RecorderButton title="终止录音" onClick={handleStopRecording} danger disabled={isUploading}>
                    {isUploading ? <LoadingOutlined style={{ fontSize: 16 }} /> : <StopOutlined style={{ fontSize: 16 }} />}
                  </RecorderButton>
                </div>
              )}
            </div>
          </div>
        </section>

        <section
          style={{
            flex: '1 1 0%',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: '#ffffff',
            minHeight: 0,
          }}
        >
          <PageEditor
            note={note}
            {...editorProps}
          />
        </section>
      </div>

      <VoicePromptModal
        open={languageModalOpen}
        selectedLanguage={pendingLanguage}
        onSelectLanguage={setPendingLanguage}
        onConfirm={handleConfirmLanguage}
        onCancel={() => setLanguageModalOpen(false)}
      />
    </div>
  )
}

export default VoiceNoteEditor
