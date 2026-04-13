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
import noteService from '@/services/noteService'

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
      fileId: voice?.fileId || key,
      url: voice?.audioUrl || '',
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
    <button
      type="button"
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
          onClick={(event) => {
            event.stopPropagation()
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
    </button>
  )
}

function RecorderButton({ title, onClick, children, active = false, danger = false, disabled = false }) {
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
        border: danger ? '1px solid rgba(239,68,68,0.24)' : '1px solid rgba(226,232,240,0.9)',
        background: danger ? 'rgba(239,68,68,0.08)' : active ? 'rgba(2,86,210,0.08)' : '#ffffff',
        color: danger ? '#ef4444' : active ? 'var(--primary)' : '#64748b',
        boxShadow: '0 10px 22px rgba(16,34,58,0.08)',
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

  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const recordingChunksRef = useRef([])
  const recordingStartedAtRef = useRef(0)
  const accumulatedElapsedRef = useRef(0)
  const elapsedTimerRef = useRef(null)
  const playbackAudioRef = useRef(null)
  const playbackObjectUrlRef = useRef('')
  const playbackVolumeRef = useRef(1)
  const playbackLastVolumeRef = useRef(1)
  const playbackRateRef = useRef(1)
  const recordingStateRef = useRef('idle')
  const playbackStateRef = useRef('idle')
  const recordingsRef = useRef(recordings)
  const pendingRecordingMetaRef = useRef(null)
  const transcriptSourceKeyRef = useRef('01')
  const sourceRecordingKeyRef = useRef('01')

  const voicePanelVisible = typeof controlledVisible === 'boolean' ? controlledVisible : localVoicePanelVisible
  const visibleTranscripts = transcriptGroups[selectedRecording] || transcriptGroups[transcriptSourceKeyRef.current] || []
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

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop()
        } catch {
          // ignore cleanup errors
        }
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      if (playbackAudioRef.current) {
        playbackAudioRef.current.pause()
        playbackAudioRef.current.src = ''
        playbackAudioRef.current = null
      }

      if (playbackObjectUrlRef.current) {
        URL.revokeObjectURL(playbackObjectUrlRef.current)
        playbackObjectUrlRef.current = ''
      }
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
    recordingChunksRef.current = []
    recordingStartedAtRef.current = 0
    accumulatedElapsedRef.current = 0
    pendingRecordingMetaRef.current = null
    setRecordingElapsedMs(0)
    setRecordingPulseTick(0)
    setRecordingState('idle')
    recordingStateRef.current = 'idle'
  }

  const releaseRecordingResources = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    mediaRecorderRef.current = null
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

  const ensurePlaybackAudio = async (fileId) => {
    if (!fileId) {
      return null
    }

    const audio = playbackAudioRef.current || new Audio()
    if (audio.__sourceFileId !== fileId) {
      const blob = await noteService.getVoiceFile(fileId)
      const objectUrl = URL.createObjectURL(blob)

      audio.pause()
      if (playbackObjectUrlRef.current) {
        URL.revokeObjectURL(playbackObjectUrlRef.current)
      }
      playbackObjectUrlRef.current = objectUrl
      audio.src = objectUrl
      audio.currentTime = 0
      audio.__sourceFileId = fileId
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

    if (!recording?.fileId) {
      message.info('请先选择一条可播放的语音卡片')
      return
    }

    const audio = await ensurePlaybackAudio(recording.fileId)
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
    if (!audio || !selectedRecordingData?.fileId || !playbackDurationMs) {
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
        background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,250,255,0.96))',
        boxShadow: '0 18px 40px rgba(16,34,58,0.14)',
        border: '1px solid rgba(226,232,240,0.9)',
        backdropFilter: 'blur(16px)',
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
            background: 'rgba(2,86,210,0.08)',
            color: 'var(--primary)',
            borderRadius: 999,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'inset 0 0 0 1px rgba(2,86,210,0.08)',
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

  const addGeneratedVoiceCard = ({ fileId, url, durationMs, language }) => {
    const nextKey = String(recordingsRef.current.length + 1).padStart(2, '0')
    const durationText = formatElapsed(durationMs || 1000)
    const nextCard = {
      code: `RECORDING ${nextKey}`,
      key: nextKey,
      title: `${getLanguageLabel(language)}录音`,
      duration: durationText,
      durationMs: durationMs || 1000,
      time: '刚刚',
      language,
      status: '已上传',
      fileId,
      url,
    }

    setRecordings((current) => [...current, nextCard])
    setTranscriptGroups((current) => ({
      ...current,
      [nextKey]: [
        {
          avatar: 'REC',
          name: 'Recording',
          time: '00:00',
          text: '录音已上传，正在生成转写...',
          active: true,
        },
        ...(current[sourceRecordingKeyRef.current] || []).slice(0, 2),
      ],
    }))
    setSelectedRecording(nextKey)
  }

  const handleSelectRecording = (key) => {
    setSelectedRecording(key)
    transcriptSourceKeyRef.current = key
    if (playbackStateRef.current !== 'idle') {
      stopPlayback()
    }
  }

  const handleDeleteRecordingCard = (card) => {
    if (!note?.id || !card?.fileId) {
      return
    }

    Modal.confirm({
      title: '删除语音卡片',
      content: '确认删除这条语音素材吗？删除后将同步清理服务端归档。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        try {
          await noteService.deleteVoiceFile(note.id, card.fileId)

          setRecordings((current) => {
            const remaining = current.filter((item) => item.fileId !== card.fileId)
            if (remaining.length > 0) {
              const nextSelected = remaining.find((item) => item.key === selectedRecording) ? selectedRecording : remaining[0].key
              setSelectedRecording(nextSelected)
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

          await onNoteRefresh?.()
          message.success('语音卡片已删除')
        } catch (error) {
          message.error(error?.message || '删除语音卡片失败')
        }
      },
    })
  }

  const uploadRecordedAudio = async (blob, durationMs, language) => {
    if (!note?.id) {
      message.error('缺少笔记 ID，无法上传语音')
      return
    }

    const mimeType = blob.type || 'audio/webm'
    const extension = mimeType.includes('wav') ? 'wav' : 'webm'
    const file = new File([blob], `voice-${Date.now()}.${extension}`, { type: mimeType })

    try {
      const result = await noteService.uploadVoiceFile(note.id, file)
      addGeneratedVoiceCard({
        fileId: result?.fileId,
        url: result?.url,
        durationMs,
        language,
      })
      message.success('语音上传成功')
    } catch (error) {
      message.error(error?.message || '语音上传失败')
    } finally {
      releaseRecordingResources()
      resetRecordingSession()
    }
  }

  useEffect(() => {
    if (!selectedRecordingData?.fileId) {
      stopPlayback()
      return undefined
    }

    if (playbackAudioRef.current && playbackAudioRef.current.__sourceFileId && playbackAudioRef.current.__sourceFileId !== selectedRecordingData.fileId) {
      stopPlayback()
    }

    return undefined
  }, [selectedRecordingData?.fileId])

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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const preferredMimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
      const mimeType = preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported?.(type)) || ''
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)

      sourceRecordingKeyRef.current = selectedRecording
      pendingRecordingMetaRef.current = { language }
      recordingChunksRef.current = []
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

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data)
        }
      }

      recorder.onerror = () => {
        message.error('录音设备出现错误')
      }

      recorder.onstop = async () => {
        const durationMs = accumulatedElapsedRef.current
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || 'audio/webm' })

        if (!blob.size) {
          message.error('录音内容为空')
          releaseRecordingResources()
          resetRecordingSession()
          return
        }

        await uploadRecordedAudio(blob, durationMs, pendingRecordingMetaRef.current?.language || language)
      }

      recorder.start()
      message.success(`已开始${getLanguageLabel(language)}录音`)
    } catch (error) {
      releaseRecordingResources()
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

    try {
      mediaRecorderRef.current.stop()
    } catch (error) {
      releaseRecordingResources()
      resetRecordingSession()
      message.error(error?.message || '停止录音失败')
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(247,249,251,0.92), rgba(255,255,255,0.98))',
      }}
    >
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
          background: linear-gradient(90deg, rgba(226,232,240,0.88), rgba(226,232,240,0.65));
          height: 6px;
          border-radius: 999px;
        }

        .voice-volume-slider .ant-slider-track {
          background: linear-gradient(90deg, #0057d7 0%, #4f86ff 100%);
          height: 6px;
          border-radius: 999px;
        }

        .voice-volume-slider .ant-slider-handle::after {
          box-shadow: 0 0 0 3px rgba(2,86,210,0.10);
        }

        .voice-volume-slider .ant-slider-handle {
          width: 16px;
          height: 16px;
          margin-top: -5px;
          border: 2px solid #fff;
          background: linear-gradient(180deg, #0057d7, #3a7cff);
          box-shadow: 0 8px 18px rgba(2,86,210,0.22);
        }

        .voice-playback-rate-menu .ant-dropdown-menu {
          min-width: 176px;
          padding: 8px;
          border-radius: 18px;
          background: rgba(255,255,255,0.98);
          box-shadow: 0 18px 40px rgba(16,34,58,0.14);
          border: 1px solid rgba(226,232,240,0.9);
          backdrop-filter: blur(16px);
        }

        .voice-playback-rate-menu .ant-dropdown-menu-item {
          border-radius: 12px;
          padding: 10px 12px;
          margin: 4px 0;
          color: #334155;
          font-weight: 700;
        }

        .voice-playback-rate-menu .ant-dropdown-menu-item-selected {
          background: rgba(2,86,210,0.08);
          color: var(--primary);
        }

        .voice-playback-rate-menu .ant-dropdown-menu-item:hover {
          background: rgba(2,86,210,0.06);
        }
      `}</style>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, height: '100%', alignItems: 'stretch', overflow: 'hidden' }}>
        {voicePanelVisible ? (
          <section
            style={{
              flex: '0 0 50%',
              minWidth: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              background: '#ffffff',
              borderRight: '1px solid rgba(226,232,240,0.8)',
              position: 'relative',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center' }}>
                  <VoicePulse />
                </span>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' }}>转写内容</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <button
                  type="button"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--primary)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  观点提取
                </button>
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
              borderBottom: '1px solid rgba(226,232,240,0.65)',
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
                    onDelete={selectedRecording === key && recording.fileId ? () => handleDeleteRecordingCard({ key, ...recording }) : null}
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
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    flex: '1 1 auto',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '14px 16px 176px',
                    overflow: 'hidden',
                  }}
                >
                {visibleTranscripts.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', minHeight: 0, flex: 1 }}>
                    {visibleTranscripts.map((item) => (
                      <TranscriptItem key={`${item.name}-${item.time}`} {...item} />
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
                        height: '100%',
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
                style={{
                  position: 'absolute',
                  left: 14,
                  right: 14,
                  bottom: 14,
                  padding: '14px 18px 16px',
                  borderRadius: 22,
                  border: '1px solid rgba(226,232,240,0.78)',
                  background: 'rgba(255,255,255,0.96)',
                  boxShadow: '0 18px 42px rgba(15,23,42,0.10)',
                  backdropFilter: 'blur(14px)',
                  zIndex: 2,
                  flexShrink: 0,
                }}
              >
                {recordingState === 'idle' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 52 }}>
                    <RecorderButton
                      title={isPlaying ? '暂停播放' : '播放'}
                      onClick={handleTogglePlayback}
                      disabled={!selectedRecordingData?.fileId}
                      active={isPlaying}
                    >
                      {isPlaying ? <PauseOutlined style={{ fontSize: 16 }} /> : <PlayCircleFilled style={{ fontSize: 16 }} />}
                    </RecorderButton>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 64, color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}>
                      <span>{formatElapsed(playbackPositionMs)}</span>
                      <span>{formatElapsed(playbackDurationMs || selectedRecordingData?.durationMs || 32000)}</span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button
                        type="button"
                        onClick={handlePlaybackSeek}
                        aria-label="播放进度"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          height: 8,
                          border: 'none',
                          background: 'transparent',
                          padding: 0,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ width: '100%', height: 4, borderRadius: 999, background: '#e5edf7', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${playbackDurationMs > 0 ? Math.min(100, (playbackPositionMs / playbackDurationMs) * 100) : 0}%`,
                              height: '100%',
                              borderRadius: 999,
                              background: 'linear-gradient(90deg, #0057d7 0%, #7aa8ff 100%)',
                              transition: 'width 120ms linear',
                            }}
                          />
                        </div>
                      </button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94a3b8', flexShrink: 0 }}>
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
                              color: playbackVolume <= 0 ? '#cbd5e1' : '#64748b',
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
                                  <span>{`${rate.toFixed(2).replace(/\.00$/, '')}X`}</span>
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
                              background: 'rgba(248,250,252,0.82)',
                              color: '#475569',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: '5px 10px',
                              borderRadius: 999,
                              backgroundImage: 'linear-gradient(180deg, rgba(248,250,252,0.95), rgba(255,255,255,0.72))',
                              boxShadow: 'inset 0 0 0 1px rgba(226,232,240,0.85)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span>{`${playbackRate.toFixed(2).replace(/\.00$/, '')}X`}</span>
                            <DownOutlined style={{ fontSize: 10, color: '#94a3b8' }} />
                          </button>
                        </Dropdown>
                      </div>
                    </div>

                    <RecorderButton title="开始录音" onClick={handleStartMicClick} active>
                      <MicIcon size={18} color="currentColor" />
                    </RecorderButton>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <RecorderButton
                      title={isRecording ? '暂停录音' : '继续录音'}
                      onClick={isRecording ? handlePauseRecording : handleResumeRecording}
                      active={isRecording}
                      disabled={isUploading}
                    >
                      {isRecording ? <PauseOutlined style={{ fontSize: 16 }} /> : <PlayCircleFilled style={{ fontSize: 16 }} />}
                    </RecorderButton>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 96, color: '#64748b' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
                        {isUploading ? '正在上传' : isPaused ? '已暂停' : `录音中 · ${getLanguageLabel(pendingLanguage)}`}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#475569', fontFamily: 'monospace' }}>
                        {formatElapsed(recordingElapsedMs)}
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 2, height: 22 }}>
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
        ) : null}

        <section
          style={{
            flex: voicePanelVisible ? '0 0 50%' : '0 0 100%',
            minWidth: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: '#ffffff',
          }}
        >
          <PageEditor
            key={`${note?.id || 'voice-note'}-${voicePanelVisible ? 'split' : 'full'}`}
            note={note}
            {...editorProps}
          />
        </section>
      </div>

      <Modal
        open={languageModalOpen}
        onCancel={() => setLanguageModalOpen(false)}
        footer={null}
        centered
        width={520}
        title={null}
        styles={{
          body: { padding: 0 },
          content: {
            borderRadius: 24,
            overflow: 'hidden',
            background: '#fff',
            boxShadow: '0 24px 60px rgba(15,23,42,0.18)',
          },
        }}
      >
        <div style={{ padding: '24px 26px 22px' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 10 }}>选择录音语言</div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 18 }}>录音开始前先选中文或英文，便于后续转写处理。</div>

          <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPendingLanguage(option.value)}
                style={{
                  flex: 1,
                  minHeight: 84,
                  borderRadius: 18,
                  border: pendingLanguage === option.value ? '2px solid rgba(2,86,210,0.65)' : '1px solid rgba(226,232,240,0.95)',
                  background: pendingLanguage === option.value ? 'rgba(2,86,210,0.08)' : '#fff',
                  color: pendingLanguage === option.value ? 'var(--primary)' : '#111827',
                  fontSize: 20,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: pendingLanguage === option.value ? '0 10px 24px rgba(2,86,210,0.10)' : 'none',
                }}
              >
                <div>{option.label}</div>
                <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, opacity: 0.78 }}>{option.hint}</div>
              </button>
            ))}
          </div>

          <div style={{ borderRadius: 18, background: 'rgba(248,250,252,0.96)', padding: '18px 18px 16px', marginBottom: 22 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 10 }}>注意事项</div>
            <div style={{ fontSize: 15, lineHeight: 1.8, color: '#334155' }}>
              语音记录功能受录音环境与拾音设备影响较大。为保证转写效果，建议使用有线耳机进行录制。
            </div>
          </div>

          <Button
            type="primary"
            block
            size="large"
            onClick={handleConfirmLanguage}
            style={{
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #0057d7 0%, #1f4fff 100%)',
              border: 'none',
              fontWeight: 800,
              fontSize: 16,
              boxShadow: '0 14px 28px rgba(2,86,210,0.24)',
            }}
          >
            开始录音
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default VoiceNoteEditor
