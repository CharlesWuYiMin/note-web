import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import i18n from '@/i18n'
import authService from '@/services/authService'
import aiService from '@/services/aiService'
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

function getLanguageOptions() {
  return [
    {
      value: 'zh-CN',
      label: i18n.t('settings.languageOptionZh', { defaultValue: '中文' }),
      hint: i18n.t('voice.language.zhHint', { defaultValue: '简体中文' }),
    },
    {
      value: 'en-US',
      label: i18n.t('voice.language.english', { defaultValue: '英文' }),
      hint: i18n.t('voice.language.enHint', { defaultValue: 'English' }),
    },
  ]
}

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
const RECORDER_TIMESLICE_MS = 1000

function getLanguageLabel(language) {
  const normalized = String(language || '').replace(/_/g, '-').toLowerCase()

  if (normalized.startsWith('en-')) {
    return i18n.t('voice.language.english', { defaultValue: '英文' })
  }

  if (normalized.startsWith('zh-')) {
    return i18n.t('settings.languageOptionZh', { defaultValue: '中文' })
  }

  return getLanguageOptions().find((option) => option.value === language)?.label
    || i18n.t('settings.languageOptionZh', { defaultValue: '中文' })
}

function buildInitialRecordings() {
  return []
}

function buildInitialTranscriptGroups() {
  return {}
}

function formatVoiceCardTime(value) {
  if (!value) {
    return i18n.t('voice.justNow', { defaultValue: '刚刚' })
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return i18n.t('voice.justNow', { defaultValue: '刚刚' })
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}/${month}/${day} ${hours}:${minutes}`
}

function truncateText(value, maxLength = 48) {
  const text = String(value || '').trim()

  if (!text) {
    return ''
  }

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, Math.max(0, maxLength - 1))}…`
}

function normalizeTranscriptText(value = '') {
  return String(value || '')
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isLikelyNoiseTranscript(value = '') {
  const normalized = normalizeTranscriptText(value)

  if (!normalized) {
    return true
  }

  const compact = normalized
    .replace(/[。！？!?、,，.·~\-—\s]/g, '')
    .toLowerCase()

  if (!compact) {
    return true
  }

  if (compact.length <= 1) {
    return true
  }

  return ['嗯', '啊', '呃', '唔', '哦', 'em', 'uh', 'mm', '嗯嗯', '啊啊', '呃呃'].includes(compact)
}

function getTranscriptStatusLabel(status) {
  const statusMap = {
    pending: i18n.t('voice.status.pending', { defaultValue: '待转写' }),
    processing: i18n.t('voice.status.processing', { defaultValue: '转写中' }),
    paused: i18n.t('voice.status.paused', { defaultValue: '已暂停' }),
    completed: i18n.t('voice.status.completed', { defaultValue: '已转写' }),
    failed: i18n.t('voice.status.failed', { defaultValue: '转写失败' }),
  }

  return statusMap[status] || i18n.t('voice.status.default', { defaultValue: '语音' })
}

function normalizeRealtimeLanguage(language) {
  return language === 'en-US' ? 'en_US' : 'zh_CN'
}

function createLiveRecordingCard({ key, language, title = '', sessionId = null }) {
  return {
    code: `RECORDING ${key}`,
    key,
    title: title || i18n.t('voice.realtimeTitle', { defaultValue: '{{language}}实时转写', language: getLanguageLabel(language) }),
    duration: i18n.t('voice.status.processing', { defaultValue: '转写中' }),
    durationMs: 0,
    time: i18n.t('voice.justNow', { defaultValue: '刚刚' }),
    language,
    status: 'processing',
    fileId: null,
    sessionId,
    voiceId: null,
    url: '',
    isLocalPreview: false,
    transcript: '',
    transcriptStatus: 'processing',
    kind: 'live',
  }
}

function createTranscriptEntry({ avatar = 'REC', name = 'Recording', time, text = '', active = false }) {
  return {
    avatar,
    name,
    time: time || i18n.t('voice.justNow', { defaultValue: '刚刚' }),
    text,
    active,
  }
}

function createLiveTranscriptCardEntry(segmentIndex = 1, text = '', active = false) {
  const resolvedIndex = Number.isFinite(segmentIndex) && segmentIndex > 0 ? segmentIndex : 1
  const label = String(resolvedIndex).padStart(2, '0')

  return {
    ...createTranscriptEntry({
      avatar: `C${label}`,
      name: i18n.t('voice.cardLabel', { defaultValue: '卡片 {{index}}', index: label }),
      time: i18n.t('voice.justNow', { defaultValue: '刚刚' }),
      text,
      active,
    }),
    segmentIndex: resolvedIndex,
  }
}

function getNextLiveTranscriptCardIndex(cards = []) {
  return cards.reduce((max, card) => {
    const numericIndex = Number(card?.segmentIndex || 0)
    return Number.isFinite(numericIndex) && numericIndex > max ? numericIndex : max
  }, 0) + 1
}

function resolveLiveTranscriptCardIndex(cards = [], currentCard = null, segmentIndex = null) {
  const currentIndex = Number(currentCard?.segmentIndex || 0)
  const hintedIndex = Number.isFinite(segmentIndex) && segmentIndex > 0 ? segmentIndex : 0
  const nextIndex = getNextLiveTranscriptCardIndex(cards)

  if (currentCard?.active) {
    return Math.max(currentIndex, hintedIndex, nextIndex - 1)
  }

  return hintedIndex || nextIndex
}

const VOICE_REALTIME_DEBUG_ENABLED =
  import.meta.env.DEV || (typeof window !== 'undefined' && window.localStorage?.getItem('voiceRealtimeDebug') === '1')

function voiceRealtimeLog(step, details = {}) {
  if (!VOICE_REALTIME_DEBUG_ENABLED) {
    return
  }

  console.info('[voice-realtime]', step, details)
}

function getNextRecordingKey(recordings = []) {
  const maxIndex = recordings.reduce((max, item) => {
    const numericKey = Number.parseInt(item?.key, 10)
    if (Number.isFinite(numericKey)) {
      return Math.max(max, numericKey)
    }

    return max
  }, 0)

  return String(maxIndex + 1).padStart(2, '0')
}

function getRealtimeStatusMeta(recordingState) {
  const statusMap = {
    recording: {
      label: i18n.t('voice.liveRecognizing', { defaultValue: '实时识别中' }),
      tone: 'active',
      hint: i18n.t('voice.liveRecognizingHint', { defaultValue: '音频正在实时送达转写引擎' }),
    },
    paused: {
      label: i18n.t('voice.status.paused', { defaultValue: '已暂停' }),
      tone: 'paused',
      hint: i18n.t('voice.pausedHint', { defaultValue: '当前会话已暂停，等待继续录音' }),
    },
    interrupted: {
      label: i18n.t('voice.interrupted', { defaultValue: '连接中断' }),
      tone: 'interrupted',
      hint: i18n.t('voice.interruptedHint', { defaultValue: '连接暂时中断，恢复后可继续录音' }),
    },
    uploading: {
      label: i18n.t('voice.processing', { defaultValue: '处理中' }),
      tone: 'processing',
      hint: i18n.t('voice.processingHint', { defaultValue: '正在完成实时会话并刷新语音卡片' }),
    },
    idle: {
      label: i18n.t('voice.ready', { defaultValue: '待开始' }),
      tone: 'idle',
      hint: i18n.t('voice.readyHint', { defaultValue: '点击右下角按钮开始实时转写' }),
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
    interrupted: {
      background: 'rgba(251,191,36,0.12)',
      color: '#b45309',
      border: '1px solid rgba(251,191,36,0.28)',
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

function getSessionSummaryStatus(session = {}) {
  if (session?.status === 'finished') {
    return 'completed'
  }

  if (session?.status === 'failed') {
    return 'failed'
  }

  if (session?.status === 'paused') {
    return 'paused'
  }

  if (session?.status === 'opened' || session?.status === 'streaming') {
    return 'processing'
  }

  return session?.status || 'processing'
}

function normalizeTranscriptCards(cards = [], fallbackName = i18n.t('voice.segment', { defaultValue: '分段' })) {
  const sortedCards = cards
    .filter(Boolean)
    .sort((left, right) => (
      Number(left?.segmentIndex || 0) - Number(right?.segmentIndex || 0)
      || Number(left?.startOffsetMs || 0) - Number(right?.startOffsetMs || 0)
    ))

  const normalizedCards = []

  sortedCards.forEach((card, index) => {
    const segmentIndex = Number(card?.segmentIndex || index + 1)
    const displayText = normalizeTranscriptText(card?.transcript || card?.segmentTranscript || card?.finalTranscript || '')

    if (!displayText) {
      return
    }

    if (index === 0 && isLikelyNoiseTranscript(displayText) && sortedCards.length > 1) {
      return
    }

    const displayIndex = normalizedCards.length + 1
    normalizedCards.push(createTranscriptEntry({
      avatar: `C${String(displayIndex).padStart(2, '0')}`,
      name: `${fallbackName} ${String(displayIndex).padStart(2, '0')}`,
      time: card?.startTimeLabel || formatVoiceCardTime(card?.createdAt || card?.updatedAt),
      text: displayText,
      active: Boolean(card?.active),
    }))
  })

  return normalizedCards
}

function buildVoiceTranscriptGroups({ fileVoice, session } = {}) {
  const sessionCards = Array.isArray(session?.cards) ? session.cards : []
  return normalizeTranscriptCards(sessionCards)
}

function buildVoiceStateFromNote(note = {}) {
  const voiceNotes = Array.isArray(note?.voiceNote) ? note.voiceNote.filter(Boolean) : []
  const voiceRealtimeSessions = Array.isArray(note?.voiceRealtimeSessions) ? note.voiceRealtimeSessions.filter(Boolean) : []
  const sessionById = new Map()
  let preferredSelectedKey = null

  voiceRealtimeSessions.forEach((session) => {
    if (session?.sessionId) {
      sessionById.set(session.sessionId, session)
    }
  })

  const recordings = []
  const transcriptGroups = {}
  const usedSessionIds = new Set()

  voiceNotes.forEach((voice, index) => {
    const key = String(index + 1).padStart(2, '0')
    const session = voice?.sessionId ? sessionById.get(voice.sessionId) || null : null
    if (session?.sessionId) {
      usedSessionIds.add(session.sessionId)
    }

    const transcriptStatus = voice?.transcriptStatus || (voice?.transcript ? 'completed' : getSessionSummaryStatus(session) || 'pending')

    recordings.push({
      code: `FILE ${key}`,
      key,
      title: session?.sessionId
        ? i18n.t('voice.fileLabel', { defaultValue: '语音文件 {{index}}', index: key })
        : i18n.t('voice.cardFileLabel', { defaultValue: '语音卡片 {{index}}', index: key }),
      duration: getTranscriptStatusLabel(transcriptStatus),
      durationMs: Number.isFinite(voice?.durationMs) ? voice.durationMs : Number(session?.durationMs) || 0,
      time: formatVoiceCardTime(voice?.createdAt || voice?.updatedAt || session?.finishedAt || session?.startedAt),
      language: voice?.language || session?.language || 'zh-CN',
      status: transcriptStatus,
      fileId: voice?.fileId ?? null,
      sessionId: voice?.sessionId ?? session?.sessionId ?? null,
      voiceId: voice?.id ?? null,
      url: voice?.audioUrl || '',
      isLocalPreview: false,
      transcript: voice?.transcript || session?.finalTranscript || '',
      transcriptStatus,
      kind: 'file',
    })

    transcriptGroups[key] = buildVoiceTranscriptGroups({ fileVoice: voice, session })
  })

  voiceRealtimeSessions.forEach((session) => {
    if (!session?.sessionId || usedSessionIds.has(session.sessionId)) {
      return
    }

    const hasSessionContent = Boolean(
      String(session?.finalTranscript || session?.partialTranscript || '').trim()
      || (Array.isArray(session?.cards) && session.cards.length > 0)
      || session?.status
    )

    if (!hasSessionContent) {
      return
    }

    const key = String(recordings.length + 1).padStart(2, '0')

    recordings.push({
      code: `SESSION ${key}`,
      key,
      title: i18n.t('voice.realtimeSessionLabel', { defaultValue: '实时会话 {{index}}', index: key }),
      duration: getTranscriptStatusLabel(getSessionSummaryStatus(session)),
      durationMs: Number(session?.receivedBytes) || 0,
      time: formatVoiceCardTime(session?.startedAt || session?.finishedAt || session?.updatedAt),
      language: session?.language || 'zh_CN',
      status: session?.status || 'opened',
      fileId: session?.fileId ?? null,
      sessionId: session?.sessionId ?? null,
      voiceId: session?.id ?? null,
      url: '',
      isLocalPreview: false,
      transcript: String(session?.finalTranscript || session?.partialTranscript || '').trim(),
      transcriptStatus: getSessionSummaryStatus(session),
      kind: 'session',
    })

    transcriptGroups[key] = buildVoiceTranscriptGroups({ session })

    if (!preferredSelectedKey) {
      const hasCards = Array.isArray(session?.cards) && session.cards.length > 0
      const hasTranscript = Boolean(String(session?.finalTranscript || session?.partialTranscript || '').trim())
      const isActiveSession = session?.status === 'streaming' || session?.status === 'opened'

      if (isActiveSession || hasCards || hasTranscript) {
        preferredSelectedKey = key
      }
    }
  })

  const selectedKey = preferredSelectedKey || recordings[0]?.key || null

  return {
    recordings,
    transcriptGroups,
    selectedKey,
    sourceKey: selectedKey || '01',
  }
}

function RecordingCard({ active, code, title, duration, time, language, onClick }) {
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
    </div>
  )
}

function RecorderButton({ title, onClick, children, active = false, danger = false, disabled = false, tone = 'neutral', style }) {
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
        ...style,
      }}
    >
      {children}
    </button>
  )
}

function RecorderSecondaryButton({ title, onClick, disabled = false, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 38,
        borderRadius: 999,
        border: '1px solid rgba(191,214,255,0.88)',
        background: 'rgba(248,251,255,0.96)',
        color: 'var(--primary)',
        boxShadow: '0 8px 18px rgba(47,111,255,0.08)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: '0 14px',
        fontSize: 12,
        fontWeight: 800,
        flexShrink: 0,
        opacity: disabled ? 0.65 : 1,
      }}
    >
      {children}
    </button>
  )
}

function RecordingWaveStrip({ active = false, paused = false, tick = 0 }) {
  const wavePattern = [10, 16, 24, 14, 20, 10, 18, 12, 16, 10, 14, 18]
  const baseHeights = Array.from({ length: 28 }, (_, index) => wavePattern[index % wavePattern.length])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        height: 28,
        width: '100%',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      {baseHeights.map((height, index) => {
        const animatedHeight = active && !paused
          ? Math.max(6, height + (((tick + index) % 5) - 2) * 1.5)
          : height

        return (
          <span
            key={index}
            style={{
              width: 4,
              minWidth: 4,
              height: animatedHeight,
              borderRadius: 999,
              background: active && !paused
                ? 'linear-gradient(180deg, #0057d7, #7aa8ff)'
                : paused
                  ? '#2f6fff'
                  : 'rgba(148,163,184,0.36)',
              opacity: paused ? 0.92 : 1,
              transition: 'height 140ms ease, background 140ms ease, opacity 140ms ease',
              flexShrink: 0,
            }}
          />
        )
      })}
    </div>
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
        {text || (active ? '正在识别语音内容...' : '暂无正文')}
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
  const { t, i18n: i18nInstance } = useTranslation()
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
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false)
  const [liveTranscriptText, setLiveTranscriptText] = useState('')
  const [liveTranscriptSegments, setLiveTranscriptSegments] = useState([])
  const [voiceContentView, setVoiceContentView] = useState('transcript')
  const [extractionText, setExtractionText] = useState('')
  const [extractionError, setExtractionError] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)

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
  const realtimeConfiguredMimeTypeRef = useRef('')
  const realtimePendingChunksRef = useRef([])
  const realtimeFinishResolverRef = useRef(null)
  const realtimeFinishRejectRef = useRef(null)
  const realtimeFinishPromiseRef = useRef(null)
  const realtimeFinishedRef = useRef(false)
  const realtimeClosingRef = useRef(false)
  const realtimeAbortRef = useRef(false)
  const realtimeCleanupSilentRef = useRef(false)
  const realtimeReconnectTimerRef = useRef(null)
  const realtimeReconnectAttemptsRef = useRef(0)
  const realtimeAudioChunksRef = useRef([])
  const voiceActivityContextRef = useRef(null)
  const voiceActivitySourceRef = useRef(null)
  const voiceActivityAnalyserRef = useRef(null)
  const voiceActivityBufferRef = useRef(null)
  const voiceActivityTimerRef = useRef(null)
  const voiceActivitySilenceStartedAtRef = useRef(0)
  const voiceActivitySilenceNotifiedRef = useRef(false)
  const voiceActivityAutoResumeRef = useRef(false)
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
  const liveTranscriptCommittedTextRef = useRef('')
  const liveTranscriptCommittedSegmentIndexRef = useRef(0)
  const liveTranscriptSegmentsRef = useRef([])
  const transcriptSourceKeyRef = useRef('01')
  const sourceRecordingKeyRef = useRef('01')
  const playbackControlsRef = useRef(null)
  const autoStartRecordingInFlightRef = useRef(null)
  const autoStartRecordingTimerRef = useRef(null)
  const extractionAbortRef = useRef(null)

  const voicePanelVisible = typeof controlledVisible === 'boolean' ? controlledVisible : localVoicePanelVisible
  const liveRecordingKey = realtimeDraftKeyRef.current
  const isLiveRealtimeSelected = Boolean(liveRecordingKey && selectedRecording === liveRecordingKey)
  const visibleTranscripts = isLiveRealtimeSelected
    ? liveTranscriptSegments
    : (transcriptGroups[selectedRecording] || transcriptGroups[transcriptSourceKeyRef.current] || [])
  const selectedRecordingData = recordings.find((item) => item.key === selectedRecording) || null
  const isRecording = recordingState === 'recording'
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

  const seedLiveTranscriptCards = () => {
    setLiveTranscriptSegments([createLiveTranscriptCardEntry(1, '', true)])
    setLiveTranscriptText('')
    liveTranscriptCommittedTextRef.current = ''
    liveTranscriptCommittedSegmentIndexRef.current = 0
    voiceRealtimeLog('seed-live-cards', { segmentCount: 1 })
  }

  const updateLiveTranscriptCards = (text, segmentIndex = null) => {
    const normalizedText = normalizeTranscriptText(text)
    if (!normalizedText) {
      return
    }
    setLiveTranscriptText(normalizedText)
    voiceRealtimeLog('update-live-transcript', {
      segmentIndex,
      text: truncateText(normalizedText, 80),
      committedText: truncateText(liveTranscriptCommittedTextRef.current, 80),
    })
  }

  const commitLiveTranscriptCard = (text, segmentIndex = null, advance = true) => {
    const normalizedText = normalizeTranscriptText(text)
    const committedText = normalizeTranscriptText(liveTranscriptCommittedTextRef.current)
    const finalText = normalizedText

    if (!finalText) {
      return
    }

    const hintedIndex = Number.isFinite(segmentIndex) && segmentIndex > 0 ? segmentIndex : 0
    const committedSegmentIndex = Number(liveTranscriptCommittedSegmentIndexRef.current || 0)

    if (hintedIndex > 0 && hintedIndex <= committedSegmentIndex) {
      if (!committedText || finalText === committedText) {
        voiceRealtimeLog('skip-duplicate-segment', {
          segmentIndex: hintedIndex,
          text: truncateText(finalText, 80),
        })
        return
      }
    }

    if (!liveTranscriptSegmentsRef.current.some((item) => !item?.active && String(item?.text || '').trim()) && isLikelyNoiseTranscript(finalText)) {
      voiceRealtimeLog('skip-noise-segment', {
        segmentIndex,
        text: truncateText(finalText, 80),
      })
      return
    }

    setLiveTranscriptSegments((current) => {
      const next = [...current]
      const currentCard = next[next.length - 1] || null

      const committedIndex = resolveLiveTranscriptCardIndex(next, currentCard, segmentIndex)
      if (currentCard && currentCard.active) {
        next[next.length - 1] = {
          ...currentCard,
          segmentIndex: committedIndex,
          avatar: `C${String(committedIndex).padStart(2, '0')}`,
          name: `卡片 ${String(committedIndex).padStart(2, '0')}`,
          text: finalText,
          active: false,
        }
      } else {
        next.push(createLiveTranscriptCardEntry(committedIndex, finalText, false))
      }
      if (advance) {
        next.push(createLiveTranscriptCardEntry(committedIndex + 1, '', true))
      }
      voiceRealtimeLog('commit-live-transcript', {
        segmentIndex: committedIndex,
        text: truncateText(finalText, 80),
        advance,
        hadActiveCard: Boolean(currentCard?.active),
        nextCount: next.length,
      })
      return next
    })

    liveTranscriptCommittedTextRef.current = finalText
    liveTranscriptCommittedSegmentIndexRef.current = Number.isFinite(hintedIndex) && hintedIndex > 0
      ? hintedIndex
      : committedSegmentIndex
    setLiveTranscriptText('')
  }

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
    if (autoStartRecordingKey == null) {
      return
    }

    if (!note?.id) {
      return
    }

    if (recordingStateRef.current !== 'idle') {
      return
    }

    if (
      autoStartRecordingRef.current === autoStartRecordingKey
      || autoStartRecordingInFlightRef.current === autoStartRecordingKey
    ) {
      return
    }

    if (autoStartRecordingTimerRef.current != null) {
      window.clearTimeout(autoStartRecordingTimerRef.current)
    }

    autoStartRecordingTimerRef.current = window.setTimeout(() => {
      autoStartRecordingTimerRef.current = null

      if (recordingStateRef.current !== 'idle') {
        return
      }

      if (
        autoStartRecordingRef.current === autoStartRecordingKey
        || autoStartRecordingInFlightRef.current === autoStartRecordingKey
      ) {
        return
      }

      autoStartRecordingInFlightRef.current = autoStartRecordingKey
      setLanguageModalOpen(false)
      void startRecording(autoStartLanguage || 'zh-CN')
        .then((started) => {
          if (started) {
            autoStartRecordingRef.current = autoStartRecordingKey
          }
        })
        .catch((error) => {
          autoStartRecordingRef.current = null
          console.error('[VoiceNoteEditor] auto start recording failed', error)
          message.error(error?.message || '启动语音转录失败')
        })
        .finally(() => {
          autoStartRecordingInFlightRef.current = null
        })
    }, 0)

    return () => {
      if (autoStartRecordingTimerRef.current != null) {
        window.clearTimeout(autoStartRecordingTimerRef.current)
        autoStartRecordingTimerRef.current = null
      }
    }
  }, [autoStartLanguage, autoStartRecordingKey, note?.id])

  useEffect(() => {
    if (recordingStateRef.current !== 'idle' || realtimeSessionIdRef.current) {
      voiceRealtimeLog('skip-note-sync-during-active-recording', {
        recordingState: recordingStateRef.current,
        sessionId: realtimeSessionIdRef.current,
        noteId: note?.id || null,
      })
      return
    }

    const hasVoiceData = (
      (Array.isArray(note?.voiceNote) && note.voiceNote.length > 0)
      || (Array.isArray(note?.voiceRealtimeSessions) && note.voiceRealtimeSessions.length > 0)
    )
    extractionAbortRef.current?.abort()
    extractionAbortRef.current = null
    setVoiceContentView('transcript')
    setExtractionText('')
    setExtractionError('')
    setIsExtracting(false)
    clearRealtimeSession()
    clearLocalPreviewUrls()

    if (!hasVoiceData) {
      setRecordings([])
      setTranscriptGroups({})
      setSelectedRecording(null)
      transcriptSourceKeyRef.current = '01'
      sourceRecordingKeyRef.current = '01'
      stopPlayback()
      return
    }

    const nextState = buildVoiceStateFromNote(note)
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
  }, [i18nInstance.language, note?.id, note?.voiceNote, note?.voiceRealtimeSessions])

  useEffect(() => {
    return () => {
      extractionAbortRef.current?.abort()

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
    liveTranscriptCommittedTextRef.current = ''
    liveTranscriptCommittedSegmentIndexRef.current = 0
    voiceActivitySilenceNotifiedRef.current = false
    setStopConfirmOpen(false)
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

  const clearRealtimeReconnectTimer = () => {
    if (realtimeReconnectTimerRef.current) {
      window.clearTimeout(realtimeReconnectTimerRef.current)
      realtimeReconnectTimerRef.current = null
    }
    realtimeReconnectAttemptsRef.current = 0
  }

  const stopVoiceActivityMonitor = () => {
    if (voiceActivityTimerRef.current) {
      window.clearTimeout(voiceActivityTimerRef.current)
      voiceActivityTimerRef.current = null
    }

    voiceActivitySilenceStartedAtRef.current = 0
    voiceActivitySilenceNotifiedRef.current = false
    voiceActivityAutoResumeRef.current = false

    if (voiceActivitySourceRef.current) {
      try {
        voiceActivitySourceRef.current.disconnect()
      } catch {
        // ignore monitor cleanup errors
      }
      voiceActivitySourceRef.current = null
    }

    if (voiceActivityAnalyserRef.current) {
      try {
        voiceActivityAnalyserRef.current.disconnect()
      } catch {
        // ignore monitor cleanup errors
      }
      voiceActivityAnalyserRef.current = null
    }

    if (voiceActivityContextRef.current) {
      void voiceActivityContextRef.current.close().catch(() => {})
      voiceActivityContextRef.current = null
    }

    voiceActivityBufferRef.current = null
  }

  const getRealtimeSilenceThresholdMs = () => {
    const segmentSilenceMs = Number(realtimeSessionRef.current?.segmentSilenceMs)
    if (Number.isFinite(segmentSilenceMs) && segmentSilenceMs > 0) {
      return Math.max(800, Math.min(1200, Math.floor(segmentSilenceMs * 0.8)))
    }

    return 1200
  }

  const getRealtimeAudioLevel = () => {
    const analyser = voiceActivityAnalyserRef.current
    const buffer = voiceActivityBufferRef.current
    if (!analyser || !buffer) {
      return 0
    }

    analyser.getByteTimeDomainData(buffer)

    let sumSquares = 0
    for (let index = 0; index < buffer.length; index += 1) {
      const normalized = (buffer[index] - 128) / 128
      sumSquares += normalized * normalized
    }

    return Math.sqrt(sumSquares / buffer.length)
  }

  const createRealtimePauseSignal = async () => {
    const sessionId = realtimeSessionIdRef.current
    voiceRealtimeLog('send-pause-signal', {
      sessionId,
      socketState: realtimeSocketRef.current?.readyState,
    })
    const signaled = sendRealtimePayload({ type: 'pause' })
    if (!signaled && sessionId) {
      await voiceRealtimeService.pauseVoiceRealtimeSession(sessionId).catch(() => {})
    }
  }

  const createRealtimeConfigSignal = async (mimeType = realtimeMimeTypeRef.current) => {
    if (!mimeType) {
      return false
    }

    return sendRealtimePayload({ type: 'config', mimeType })
  }

  const syncMimeTypeAndConfig = (mimeType, source, { force = false } = {}) => {
    const normalizedMimeType = String(mimeType || '').trim()
    if (!normalizedMimeType) {
      return false
    }

    realtimeMimeTypeRef.current = normalizedMimeType

    if (!realtimeSocketRef.current || realtimeSocketRef.current.readyState !== WebSocket.OPEN) {
      return false
    }

    if (!force && realtimeConfiguredMimeTypeRef.current === normalizedMimeType) {
      return false
    }

    realtimeConfiguredMimeTypeRef.current = normalizedMimeType
    sendRealtimePayload({ type: 'config', mimeType: normalizedMimeType })
    voiceRealtimeLog('sync-mime-config', {
      mimeType: normalizedMimeType,
      source: source || 'unknown',
      force,
    })
    return true
  }

  const createRealtimeResumeSignal = async (mimeType = realtimeMimeTypeRef.current) => {
    const sessionId = realtimeSessionIdRef.current
    voiceRealtimeLog('send-resume-signal', {
      sessionId,
      mimeType,
      socketState: realtimeSocketRef.current?.readyState,
    })
    const signaled = sendRealtimePayload({ type: 'resume', mimeType })
    if (!signaled && sessionId) {
      await voiceRealtimeService.resumeVoiceRealtimeSession(sessionId).catch(() => {})
    }
  }

  const attachRealtimeRecorder = (stream, { startReason = 'manual', preferredMimeType = '' } = {}) => {
    if (!stream) {
      throw new Error('缺少可用的麦克风流')
    }

    const mimeCandidates = [
      preferredMimeType,
      realtimeMimeTypeRef.current,
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
    ]
      .map((candidate) => String(candidate || '').trim())
      .filter(Boolean)
    const triedMimeTypes = []
    let recorder = null
    let effectiveMimeType = ''
    let lastError = null

    for (const candidate of [...mimeCandidates, '']) {
      const mimeType = candidate && MediaRecorder.isTypeSupported?.(candidate) ? candidate : ''
      if (candidate && mimeType !== candidate) {
        voiceRealtimeLog('recorder-mime-unsupported', {
          candidate,
          sessionId: realtimeSessionIdRef.current,
        })
        continue
      }

      triedMimeTypes.push(candidate || '(default)')
      voiceRealtimeLog('recorder-create-attempt', {
        candidate: candidate || '(default)',
        requestedMimeType: preferredMimeType || realtimeMimeTypeRef.current || '',
        sessionId: realtimeSessionIdRef.current,
        streamActive: Boolean(stream?.active),
        trackCount: stream?.getTracks?.().length || 0,
      })
      try {
        recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream)
        effectiveMimeType = recorder.mimeType || mimeType || candidate || preferredMimeType || realtimeMimeTypeRef.current || 'audio/webm'
        voiceRealtimeLog('recorder-create-success', {
          candidate: candidate || '(default)',
          mimeType: recorder.mimeType || '',
          effectiveMimeType,
          sessionId: realtimeSessionIdRef.current,
        })
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            const actualMimeType = String(event.data.type || recorder.mimeType || effectiveMimeType || '').trim()
            voiceRealtimeLog('recorder-chunk', {
              size: event.data.size,
              type: actualMimeType || effectiveMimeType,
              recorderState: recorder.state,
              recordingState: recordingStateRef.current,
              sessionId: realtimeSessionIdRef.current,
            })
            if (actualMimeType && actualMimeType !== realtimeMimeTypeRef.current) {
              realtimeMimeTypeRef.current = actualMimeType
              voiceRealtimeLog('recorder-mime-updated', {
                mimeType: actualMimeType,
                sessionId: realtimeSessionIdRef.current,
              })
              void createRealtimeConfigSignal(actualMimeType)
            }
            realtimeAudioChunksRef.current.push(event.data)
            sendRealtimeChunk(event.data)
          }
        }

        recorder.onerror = () => {
          voiceRealtimeLog('recorder-error', {
            sessionId: realtimeSessionIdRef.current,
            recorderState: recorder.state,
          })
          message.error('录音设备出现错误')
        }

        recorder.onstop = () => {
          const stopIntent = recorder.__voiceStopIntent || 'finish'
          recorder.__voiceStopIntent = ''
          voiceRealtimeLog('recorder-stop', {
            sessionId: realtimeSessionIdRef.current,
            recorderState: recorder.state,
            abort: realtimeAbortRef.current,
            stopIntent,
          })

          if (stopIntent === 'pause') {
            if (mediaRecorderRef.current === recorder) {
              mediaRecorderRef.current = null
            }
            if (mediaStreamRef.current === stream) {
              mediaStreamRef.current.getTracks().forEach((track) => track.stop())
              mediaStreamRef.current = null
            } else {
              stream.getTracks().forEach((track) => track.stop())
            }
            return
          }

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
              cleanupRealtimeRecording({ abort: false })
              resetRecordingSession()
            }
          })()
        }

        voiceRealtimeLog('recorder-start-attempt', {
          candidate: candidate || '(default)',
          mimeType: recorder.mimeType || effectiveMimeType || '',
          timeslice: RECORDER_TIMESLICE_MS,
          sessionId: realtimeSessionIdRef.current,
        })
        recorder.start(RECORDER_TIMESLICE_MS)
        voiceRealtimeLog('recorder-start-success', {
          candidate: candidate || '(default)',
          mimeType: recorder.mimeType || effectiveMimeType || '',
          state: recorder.state,
          sessionId: realtimeSessionIdRef.current,
        })
        break
      } catch (error) {
        voiceRealtimeLog('recorder-create-failed', {
          candidate: candidate || '(default)',
          requestedMimeType: preferredMimeType || realtimeMimeTypeRef.current || '',
          message: error?.message || String(error),
          name: error?.name || 'Error',
          sessionId: realtimeSessionIdRef.current,
        })
        console.error('[VoiceNoteEditor] attachRealtimeRecorder failed', {
          candidate: candidate || '(default)',
          preferredMimeType,
          error,
        })
        lastError = error
        recorder = null
        effectiveMimeType = ''
        continue
      }
    }

    if (!recorder) {
      throw lastError || new Error('无法创建录音器')
    }

    mediaStreamRef.current = stream
    mediaRecorderRef.current = recorder
    realtimeMimeTypeRef.current = effectiveMimeType
    syncMimeTypeAndConfig(effectiveMimeType, startReason || 'recorder start', {
      force: String(startReason || '').includes('resume'),
    })
    voiceRealtimeLog('recorder-ready', {
      message: 'Microphone started. Chunk interval=' + RECORDER_TIMESLICE_MS + 'ms, mimeType=' + effectiveMimeType,
      requestedMimeType: preferredMimeType || realtimeMimeTypeRef.current || '',
      effectiveMimeType,
      startReason: startReason || 'manual',
      triedMimeTypes,
      tracks: stream.getTracks().map(function (track) {
        return {
          kind: track.kind,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState
        }
      })
    })

    return recorder
  }

  const startVoiceActivityMonitor = async (stream) => {
    stopVoiceActivityMonitor()

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext
    if (!AudioContextCtor || !stream) {
      return false
    }

    try {
      const context = new AudioContextCtor()
      const source = context.createMediaStreamSource(stream)
      const analyser = context.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.65
      source.connect(analyser)
      await context.resume().catch(() => {})

      voiceActivityContextRef.current = context
      voiceActivitySourceRef.current = source
      voiceActivityAnalyserRef.current = analyser
      voiceActivityBufferRef.current = new Uint8Array(analyser.fftSize)

      const tick = async () => {
        const recorder = mediaRecorderRef.current
        if (!recorder || realtimeFinishedRef.current || realtimeClosingRef.current) {
          return
        }

        const currentState = recordingStateRef.current
        if (currentState === 'idle' || currentState === 'uploading' || currentState === 'interrupted') {
          return
        }

        const level = getRealtimeAudioLevel()
        const speaking = level >= 0.02
        const now = Date.now()
        voiceRealtimeLog('vad-tick', {
          recorderState: recorder.state,
          recordingState: currentState,
          level: Number(level.toFixed(4)),
          speaking,
          silenceMs: voiceActivitySilenceStartedAtRef.current ? now - voiceActivitySilenceStartedAtRef.current : 0,
        })

        if (speaking) {
          voiceActivitySilenceStartedAtRef.current = 0
          if (voiceActivitySilenceNotifiedRef.current) {
            voiceRealtimeLog('vad-speaking-resumed', {
              recorderState: recorder.state,
              recordingState: currentState,
              level: Number(level.toFixed(4)),
            })
          }
          voiceActivitySilenceNotifiedRef.current = false
        } else if (currentState === 'recording' && recorder.state === 'recording') {
          if (!voiceActivitySilenceStartedAtRef.current) {
            voiceActivitySilenceStartedAtRef.current = now
            voiceRealtimeLog('vad-silence-started', {
              recorderState: recorder.state,
              recordingState: currentState,
              level: Number(level.toFixed(4)),
            })
          }

          if (!voiceActivitySilenceNotifiedRef.current && now - voiceActivitySilenceStartedAtRef.current >= getRealtimeSilenceThresholdMs()) {
            voiceActivitySilenceNotifiedRef.current = true
            voiceRealtimeLog('vad-silence-threshold-reached', {
              recorderState: recorder.state,
              recordingState: currentState,
              level: Number(level.toFixed(4)),
              thresholdMs: getRealtimeSilenceThresholdMs(),
            })
          }
        }

        voiceActivityTimerRef.current = window.setTimeout(() => {
          void tick()
        }, 120)
      }

      voiceActivityTimerRef.current = window.setTimeout(() => {
        void tick()
      }, 120)
      return true
    } catch {
      stopVoiceActivityMonitor()
      return false
    }
  }

  const detachRealtimeSocket = () => {
    const socket = realtimeSocketRef.current
    if (!socket) {
      return
    }

    socket.onopen = null
    socket.onmessage = null
    socket.onerror = null
    socket.onclose = null
    realtimeSocketRef.current = null
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

    return ''
  }

  const clearRealtimeSession = () => {
    clearRealtimeReconnectTimer()

    const socket = realtimeSocketRef.current
    if (socket) {
      detachRealtimeSocket()
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
    realtimeConfiguredMimeTypeRef.current = ''
    realtimePendingChunksRef.current = []
    realtimeFinishResolverRef.current = null
    realtimeFinishRejectRef.current = null
    realtimeFinishPromiseRef.current = null
    realtimeFinishedRef.current = false
    realtimeClosingRef.current = false
    realtimeAudioChunksRef.current = []
    stopVoiceActivityMonitor()
    setLiveTranscriptText('')
    setLiveTranscriptSegments([])
    liveTranscriptCommittedTextRef.current = ''
    liveTranscriptCommittedSegmentIndexRef.current = 0
    voiceActivitySilenceNotifiedRef.current = false
    setStopConfirmOpen(false)
  }

  const markRealtimeInterrupted = (reason = '实时转写连接已断开') => {
    if (recordingStateRef.current === 'idle') {
      return false
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      accumulatedElapsedRef.current += Date.now() - recordingStartedAtRef.current
      setRecordingElapsedMs(accumulatedElapsedRef.current)
      stopElapsedTimer()

      try {
        mediaRecorderRef.current.pause()
      } catch {
        // ignore interruption cleanup errors
      }
    }

    detachRealtimeSocket()
    setRecordingState('interrupted')
    recordingStateRef.current = 'interrupted'
    updateLiveRecordingCard((card) => ({
      ...card,
      duration: '连接中断',
      durationMs: accumulatedElapsedRef.current,
      status: 'paused',
      transcriptStatus: 'paused',
    }))

    if (reason) {
      message.warning(`${reason}，可继续恢复录音`)
    }

    return true
  }

  const pauseRealtimeRecording = async ({ auto = false } = {}) => {
    if (mediaRecorderRef.current?.state !== 'recording') {
      return false
    }

    accumulatedElapsedRef.current += Date.now() - recordingStartedAtRef.current
    setRecordingElapsedMs(accumulatedElapsedRef.current)
    stopElapsedTimer()
    voiceActivitySilenceStartedAtRef.current = 0
    voiceActivityAutoResumeRef.current = auto
    voiceRealtimeLog('pause-request', {
      auto,
      recorderState: mediaRecorderRef.current?.state || 'missing',
      sessionId: realtimeSessionIdRef.current,
    })

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.__voiceStopIntent = 'pause'
    }

    try {
      mediaRecorderRef.current?.stop()
    } catch {
      // ignore pause errors
    }

    try {
      await createRealtimePauseSignal()
    } catch {
      // ignore pause fallback errors
    }

    setRecordingState('paused')
    recordingStateRef.current = 'paused'
    updateLiveRecordingCard((card) => ({
      ...card,
      duration: auto ? '静音中' : '已暂停',
    }))

    return true
  }

  const resumeRealtimeRecording = async ({ auto = false } = {}) => {
    const needsRemoteResume = voiceActivityAutoResumeRef.current

    if (recordingStateRef.current !== 'paused' && !needsRemoteResume) {
      return false
    }

    const sessionId = realtimeSessionIdRef.current
    const session = await resolveRealtimeSession(realtimeSessionRef.current || sessionId)

    if (!session) {
      throw new Error('缺少可恢复的实时会话')
    }

    if (!realtimeSocketRef.current || realtimeSocketRef.current.readyState !== WebSocket.OPEN) {
      try {
        await voiceRealtimeService.resumeVoiceRealtimeSession(sessionId).catch(() => {})
        const resumedSession = await resolveRealtimeSession(session)
        realtimeSessionRef.current = resumedSession || session
        await createRealtimeSocketConnection(realtimeSessionRef.current, realtimeMimeTypeRef.current)
      } catch (error) {
        message.error(error?.message || '恢复连接失败')
        markRealtimeInterrupted(error?.message || '恢复连接失败')
        return false
      }
    }

    let stream = mediaStreamRef.current
    if (!stream || mediaRecorderRef.current?.state === 'inactive') {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (error) {
        message.error(error?.message || '恢复麦克风失败')
        return false
      }
      mediaStreamRef.current = stream
    }

    await createRealtimeResumeSignal(realtimeMimeTypeRef.current)

    attachRealtimeRecorder(stream, {
      startReason: auto ? 'auto resume' : 'resume',
      preferredMimeType: realtimeMimeTypeRef.current,
    })
    void startVoiceActivityMonitor(stream)

    setRecordingState('recording')
    recordingStateRef.current = 'recording'
    recordingStartedAtRef.current = Date.now()
    startElapsedTimer()
    voiceActivityAutoResumeRef.current = false
    voiceActivitySilenceStartedAtRef.current = 0
    voiceActivitySilenceNotifiedRef.current = false
    voiceRealtimeLog('resume-request', {
      auto,
      recorderState: mediaRecorderRef.current?.state || 'missing',
      sessionId: realtimeSessionIdRef.current,
    })
    updateLiveRecordingCard((card) => ({
      ...card,
      duration: '转写中',
    }))

    return true
  }

  const scheduleRealtimeReconnect = (reason = '实时转写连接已断开') => {
    if (realtimeFinishedRef.current || realtimeClosingRef.current) {
      return false
    }

    if (recordingStateRef.current !== 'recording') {
      return false
    }

    if (realtimeReconnectTimerRef.current) {
      return true
    }

    const sessionId = realtimeSessionIdRef.current
    if (!sessionId) {
      return false
    }

    const session = realtimeSessionRef.current || {
      sessionId,
      websocketPath: `/v1/note/voice-realtime/ws?sessionId=${sessionId}`,
    }

    const attempt = realtimeReconnectAttemptsRef.current + 1
    realtimeReconnectAttemptsRef.current = attempt

    const delay = Math.min(1500, 200 * attempt)
    realtimeReconnectTimerRef.current = window.setTimeout(async () => {
      realtimeReconnectTimerRef.current = null

      if (realtimeFinishedRef.current || realtimeClosingRef.current || recordingStateRef.current !== 'recording') {
        return
      }

      try {
        detachRealtimeSocket()
        const resolvedSession = await resolveRealtimeSession(session)
        if (!resolvedSession) {
          throw new Error('缺少可恢复的实时会话')
        }
        realtimeSessionRef.current = resolvedSession
        await createRealtimeSocketConnection(resolvedSession, realtimeMimeTypeRef.current)
        realtimeReconnectAttemptsRef.current = 0
        updateLiveRecordingCard((card) => ({
          ...card,
          duration: '转写中',
        }))
      } catch (error) {
        console.warn('Realtime voice reconnect failed', error)
        scheduleRealtimeReconnect(reason)
      }
    }, delay)

    return true
  }

  const syncVoiceCardsFromNote = (refreshedNote, preferred = {}) => {
    const nextState = buildVoiceStateFromNote(refreshedNote || {})

    if (nextState.recordings.length === 0) {
      return false
    }

    setRecordings(nextState.recordings)
    setTranscriptGroups(nextState.transcriptGroups)
    setSelectedRecording((current) => (
      preferred.recordingKey && nextState.recordings.some((item) => item.key === preferred.recordingKey)
        ? preferred.recordingKey
        : preferred.fileId && nextState.recordings.some((item) => item.fileId === preferred.fileId)
          ? nextState.recordings.find((item) => item.fileId === preferred.fileId)?.key
          : preferred.sessionId && nextState.recordings.some((item) => item.sessionId === preferred.sessionId)
            ? nextState.recordings.find((item) => item.sessionId === preferred.sessionId)?.key
            : (current && nextState.recordings.some((item) => item.key === current)
              ? current
              : nextState.selectedKey)
    ))
    transcriptSourceKeyRef.current = nextState.sourceKey
    sourceRecordingKeyRef.current = nextState.sourceKey
    return true
  }

  const registerLiveRecordingCard = (language, title = '') => {
    const key = getNextRecordingKey(recordingsRef.current)
    realtimeDraftKeyRef.current = key
    setRecordings((current) => [createLiveRecordingCard({ key, language, title, sessionId: realtimeSessionIdRef.current }), ...current])
    setSelectedRecording(key)
    seedLiveTranscriptCards()
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

    const draftSegments = Array.isArray(liveTranscriptSegmentsRef.current)
      ? liveTranscriptSegmentsRef.current.filter((item) => String(item?.text || '').trim())
      : []
    const elapsedMs = accumulatedElapsedRef.current + (
      recordingStateRef.current === 'recording'
        ? Math.max(0, Date.now() - recordingStartedAtRef.current)
        : 0
    )
    const previewUrl = createLocalPreviewUrl()
    const hasAudioPreview = Boolean(previewUrl)

    if (draftSegments.length === 0 && elapsedMs <= 0 && !hasAudioPreview) {
      return false
    }

    setTranscriptGroups((current) => ({
      ...current,
      [key]: draftSegments,
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
      transcript: draftSegments.map((item) => item.text).join('\n'),
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

  const resolveRealtimeSession = async (sessionOrId) => {
    const sessionId = typeof sessionOrId === 'string'
      ? sessionOrId
      : sessionOrId?.sessionId

    if (!sessionId) {
      return null
    }

    try {
      const latestSession = await voiceRealtimeService.getVoiceRealtimeSession(sessionId)
      return {
        ...(typeof sessionOrId === 'object' && sessionOrId ? sessionOrId : {}),
        ...(latestSession || {}),
        sessionId,
      }
    } catch {
      return typeof sessionOrId === 'object' && sessionOrId
        ? sessionOrId
        : {
            sessionId,
            websocketPath: `/v1/note/voice-realtime/ws?sessionId=${sessionId}`,
          }
    }
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
    voiceRealtimeLog('cleanup-realtime-recording', {
      abort,
      silent,
      recordingState: recordingStateRef.current,
      sessionId: realtimeSessionIdRef.current,
      recorderState: mediaRecorderRef.current?.state || 'missing',
      socketState: realtimeSocketRef.current?.readyState,
    })
    if (abort) {
      realtimeAbortRef.current = true
      realtimeCleanupSilentRef.current = silent
    }

    stopVoiceActivityMonitor()

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
    clearRealtimeReconnectTimer()
    const sessionId = realtimeSessionIdRef.current
    const audioMimeType = realtimeMimeTypeRef.current || 'audio/webm'
    const audioBlob = realtimeAudioChunksRef.current.length > 0
      ? new Blob(realtimeAudioChunksRef.current, { type: audioMimeType })
      : null
    let uploadedVoice = null

    try {
      const finishPromise = waitForRealtimeFinish()
      const signaled = sendRealtimePayload({ type: 'finish' })
      if (!signaled && sessionId) {
        await voiceRealtimeService.finishVoiceRealtimeSession(sessionId).catch(() => {})
      }

      await Promise.race([
        finishPromise,
        new Promise((resolve) => window.setTimeout(resolve, 5000)),
      ])

      if (audioBlob && audioBlob.size > 0 && note?.id) {
        try {
          uploadedVoice = await noteService.uploadVoiceFile(note.id, audioBlob, { sessionId })
        } catch (error) {
          preserveInterruptedRecordingDraft(error?.message || '音频上传失败')
          throw error
        }
      }

      if (uploadedVoice) {
        updateLiveRecordingCard((card) => ({
          ...card,
          fileId: uploadedVoice.fileId || card.fileId,
          url: uploadedVoice.url || card.url,
          duration: uploadedVoice.duration != null ? `${uploadedVoice.duration}s` : card.duration,
          durationMs: Number.isFinite(uploadedVoice.duration) ? uploadedVoice.duration * 1000 : card.durationMs,
          status: 'completed',
          transcriptStatus: 'completed',
          transcript: liveTranscriptSegmentsRef.current.map((item) => item.text).filter(Boolean).join('\n') || liveTranscriptTextRef.current || card.transcript,
          sessionId: sessionId || card.sessionId,
        }))
      }

      try {
        const refreshedNote = await onNoteRefresh?.()
        const synced = syncVoiceCardsFromNote(refreshedNote, {
          fileId: uploadedVoice?.fileId,
          sessionId,
        })
        if (!synced && !uploadedVoice) {
          preserveInterruptedRecordingDraft('实时语音已结束，但未能同步到详情')
        }
      } catch (error) {
        if (!uploadedVoice) {
          preserveInterruptedRecordingDraft(error?.message || '实时语音已结束，详情刷新失败')
        }
      }
    } finally {
      cleanupRealtimeRecording({ abort: false })
      resetRecordingSession()
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

    voiceRealtimeLog('ws-message', {
      type: payload.type || 'unknown',
      sessionId: payload.sessionId || realtimeSessionIdRef.current,
      status: payload.status || '',
      transcript: truncateText(payload.transcript || '', 80),
      finalTranscript: truncateText(payload.finalTranscript || '', 80),
      segmentTranscript: truncateText(payload.segmentTranscript || '', 80),
      segmentIndex: payload.segmentIndex,
      sequence: payload.sequence,
      final: payload.isFinal,
    })

    switch (payload.type) {
      case 'session.ready':
        realtimeSessionRef.current = payload
        if (Number.isFinite(payload?.segmentSilenceMs)) {
          realtimeSessionRef.current.segmentSilenceMs = payload.segmentSilenceMs
        }
        break
      case 'transcript.partial':
        updateLiveTranscriptCards(payload.transcript || '', payload?.segmentIndex)
        updateLiveRecordingCard((card) => ({
          ...card,
          title: t('voice.realtimeTitle', {
            defaultValue: '{{language}}实时转写',
            language: getLanguageLabel(pendingLanguage),
          }),
        }))
        break
      case 'transcript.segment': {
        const segmentText = String(
          payload.segmentTranscript
          || liveTranscriptTextRef.current
          || liveTranscriptSegmentsRef.current.at(-1)?.text
          || '',
        ).trim()
        commitLiveTranscriptCard(segmentText, payload?.segmentIndex)
        break
      }
      case 'session.paused':
        voiceActivityAutoResumeRef.current = false
        {
          const pausedSegmentText = String(
            payload.segmentTranscript
            || liveTranscriptTextRef.current
            || liveTranscriptSegmentsRef.current.at(-1)?.text
            || '',
          ).trim()
          commitLiveTranscriptCard(pausedSegmentText, payload?.segmentIndex, false)
        }
        updateLiveRecordingCard((card) => ({
          ...card,
          duration: '转写中',
        }))
        break
      case 'session.resumed':
        voiceActivityAutoResumeRef.current = false
        voiceActivitySilenceStartedAtRef.current = 0
        if (recordingStateRef.current === 'interrupted' && mediaRecorderRef.current?.state === 'paused') {
          recordingStartedAtRef.current = Date.now()
          try {
            mediaRecorderRef.current.resume()
          } catch {
            // ignore resume errors
          }
        }
        if (recordingStateRef.current !== 'recording') {
          setRecordingState('recording')
          recordingStateRef.current = 'recording'
          startElapsedTimer()
        }
        updateLiveRecordingCard((card) => ({
          ...card,
          duration: '转写中',
        }))
        break
      case 'session.finished':
        realtimeFinishedRef.current = true
        voiceActivityAutoResumeRef.current = false
        {
          const finishedSegmentText = String(
            payload.segmentTranscript
            || liveTranscriptTextRef.current
            || liveTranscriptSegmentsRef.current.at(-1)?.text
            || '',
          ).trim()
          commitLiveTranscriptCard(finishedSegmentText, payload?.segmentIndex, false)
        }
        clearRealtimeReconnectTimer()
        resolveRealtimeFinish()
        break
      case 'session.failed':
      case 'session.error':
        clearRealtimeReconnectTimer()
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

    socket.binaryType = 'arraybuffer'
    realtimeSocketRef.current = socket
    voiceRealtimeLog('ws-connecting', {
      sessionId: session?.sessionId,
      mimeType,
      websocketPath: session?.websocketPath,
    })

    await new Promise((resolve, reject) => {
      socket.onopen = () => {
        voiceRealtimeLog('ws-open', {
          sessionId: session?.sessionId,
          mimeType,
        })
        syncMimeTypeAndConfig(mimeType, 'ws-open', { force: true })
        flushRealtimeChunks()
        resolve()
      }

      socket.onmessage = (event) => {
        handleRealtimeSocketMessage(event).catch((error) => {
          console.error('Realtime voice message handling failed', error)
        })
      }

      socket.onerror = () => {
        voiceRealtimeLog('ws-error', {
          sessionId: session?.sessionId,
          mimeType,
          readyState: socket.readyState,
        })
        const error = new Error('实时转写连接失败')
        if (!realtimeFinishedRef.current && !realtimeClosingRef.current && recordingStateRef.current === 'recording') {
          scheduleRealtimeReconnect(error.message)
        }
        reject(error)
      }

      socket.onclose = (event) => {
        voiceRealtimeLog('ws-close', {
          sessionId: session?.sessionId,
          mimeType,
          code: event?.code,
          reason: event?.reason || '',
          readyState: socket.readyState,
        })
        if (!realtimeFinishedRef.current && !realtimeClosingRef.current && recordingStateRef.current === 'recording') {
          const error = new Error('实时转写连接已断开')
          scheduleRealtimeReconnect(error.message)
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
        voiceRealtimeLog('playback-load-voice-file', {
          fileId: recording.fileId,
          sessionId: recording.sessionId || null,
        })
        const blob = await noteService.getVoiceFile(recording.fileId)
        const objectUrl = URL.createObjectURL(blob)
        playbackObjectUrlRef.current = objectUrl
        audio.src = objectUrl
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

  const handleExtractViewpoints = async () => {
    if (!note?.id) {
      message.error('缺少笔记 ID，无法提取观点')
      return
    }

    extractionAbortRef.current?.abort()
    const controller = new AbortController()
    extractionAbortRef.current = controller

    setExtractionText('')
    setExtractionError('')
    setIsExtracting(true)

    try {
      const response = await aiService.extraction(
        note.id,
        t('voice.extractionPrompt', { defaultValue: '请基于当前语音笔记提取关键观点、结论和待跟进事项。' }),
        {
          signal: controller.signal,
          onDelta: (deltaText) => {
            setExtractionText((current) => `${current}${deltaText}`)
          },
        }
      )

      setExtractionText(response?.result || '')
    } catch (error) {
      if (controller.signal.aborted) {
        return
      }

      const errorMessage = error?.message || t('voice.extractionError', { defaultValue: '观点提取失败，请稍后重试' })
      setExtractionError(errorMessage)
      message.error(errorMessage)
    } finally {
      if (extractionAbortRef.current === controller) {
        extractionAbortRef.current = null
      }
      setIsExtracting(false)
    }
  }

  const handleShowExtraction = () => {
    setVoiceContentView('extraction')
    if (!isExtracting && (!extractionText.trim() || extractionError)) {
      void handleExtractViewpoints()
    }
  }

  const handleShowTranscript = () => {
    setVoiceContentView('transcript')
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
      return false
    }

    if (!note?.id) {
      message.error('缺少笔记 ID，无法开始录音')
      return false
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
      const preferredMimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find((type) => MediaRecorder.isTypeSupported?.(type)) || realtimeMimeTypeRef.current || 'audio/webm'

      const resolvedSession = await resolveRealtimeSession(session)
      if (!resolvedSession?.sessionId) {
        throw new Error('创建实时语音会话失败')
      }

      realtimeAbortRef.current = false
      realtimeCleanupSilentRef.current = false
      realtimeSessionRef.current = resolvedSession
      realtimeSessionIdRef.current = resolvedSession.sessionId
      realtimeMimeTypeRef.current = preferredMimeType
      realtimePendingChunksRef.current = []
      realtimeAudioChunksRef.current = []
      realtimeFinishedRef.current = false
      realtimeDraftKeyRef.current = null
      voiceActivityAutoResumeRef.current = false
      voiceActivitySilenceStartedAtRef.current = 0
      voiceActivitySilenceNotifiedRef.current = false
      setLiveTranscriptText('')
      setLiveTranscriptSegments([])
      voiceRealtimeLog('start-recording-session', {
        noteId: note.id,
        sessionId,
        language: normalizeRealtimeLanguage(language),
        selectedRecording: selectedRecording || null,
        recordingMimeType: preferredMimeType,
      })

      sourceRecordingKeyRef.current = selectedRecording
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
      voiceRealtimeLog('recorder-attach-begin', {
        sessionId,
        liveKey,
        selectedRecording: selectedRecording || null,
        preferredMimeType,
        streamTracks: stream?.getTracks?.().map((track) => ({
          kind: track.kind,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
        })) || [],
      })
      const attachedRecorder = attachRealtimeRecorder(stream, {
        startReason: 'manual start',
        preferredMimeType,
      })
      voiceRealtimeLog('recorder-attach-complete', {
        sessionId,
        mimeType: attachedRecorder?.mimeType || realtimeMimeTypeRef.current || '',
        recorderState: attachedRecorder?.state || 'missing',
        selectedRecording: selectedRecording || null,
      })
      void startVoiceActivityMonitor(stream)
      voiceRealtimeLog('recorder-start', {
        sessionId,
        mimeType: attachedRecorder?.mimeType || realtimeMimeTypeRef.current || 'audio/webm',
        selectedRecording: selectedRecording || null,
      })

      voiceRealtimeLog('ws-connect-attempt', {
        sessionId: resolvedSession.sessionId,
        preferredMimeType,
        websocketPath: resolvedSession.websocketPath,
      })
      await createRealtimeSocketConnection(resolvedSession, preferredMimeType)
      voiceRealtimeLog('ws-connect-success', {
        sessionId: resolvedSession.sessionId,
        preferredMimeType,
        websocketPath: resolvedSession.websocketPath,
      })
      message.success(t('voice.realtimeStartedWithLanguage', {
        defaultValue: '已开始{{language}}实时转写',
        language: getLanguageLabel(language),
      }))
      return true
    } catch (error) {
      voiceRealtimeLog('start-recording-failed', {
        sessionId: realtimeSessionIdRef.current || null,
        message: error?.message || String(error),
        name: error?.name || 'Error',
      })
      console.error('[VoiceNoteEditor] startRecording failed', error)
      discardLiveRecordingCard()
      cleanupRealtimeRecording({ abort: true })
      resetRecordingSession()
      message.error(error?.message || '无法访问麦克风')
      return false
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
    voiceActivityAutoResumeRef.current = false
    void pauseRealtimeRecording({ auto: false })
  }

  const handleResumeRecording = async () => {
    await resumeRealtimeRecording({ auto: false })
  }

  const handleRequestStopRecording = () => {
    if (recordingState === 'idle' || isUploading) {
      return
    }

    setStopConfirmOpen(true)
  }

  const handleConfirmStopRecording = () => {
    setStopConfirmOpen(false)
    handleStopRecording()
  }

  const handleStopRecording = () => {
    const recorder = mediaRecorderRef.current
    const recorderState = recorder?.state

    if (!recorder || recorderState === 'inactive') {
      if (recordingStateRef.current === 'paused') {
        stopElapsedTimer()
        setRecordingState('uploading')
        recordingStateRef.current = 'uploading'
        realtimeAbortRef.current = false
        realtimeClosingRef.current = true
        void finalizeRealtimeRecording()
      }
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
      recorder.__voiceStopIntent = 'finish'
      recorder.stop()
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
        open={stopConfirmOpen}
        title="停止录制"
        centered
        okText="停止"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        onOk={handleConfirmStopRecording}
        onCancel={() => {
          if (isUploading) {
            return
          }
          setStopConfirmOpen(false)
        }}
        destroyOnHidden
      >
        <div style={{ color: '#475569', lineHeight: 1.7 }}>
          确认停止语音转录吗？停止后会生成当前语音卡片，并保留音频作为回放文件。
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
              <button
                type="button"
                onClick={handleShowTranscript}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: voiceContentView === 'transcript' ? '#1e3a8a' : '#475569',
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: 'pointer',
                  padding: 0,
                  whiteSpace: 'nowrap',
                  position: 'relative',
                }}
              >
                {t('voice.transcriptContent', { defaultValue: '转写内容' })}
              </button>
              <button
                type="button"
                onClick={handleShowExtraction}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: voiceContentView === 'extraction' ? '#1e3a8a' : '#475569',
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: 'pointer',
                  padding: 0,
                  whiteSpace: 'nowrap',
                  position: 'relative',
                }}
              >
                {t('voice.viewpointExtraction', { defaultValue: '观点提取' })}
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
                {t('voice.emptyCards', { defaultValue: '暂无语音卡片，开始录音后会在这里生成' })}
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
              {voiceContentView === 'extraction' ? (
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    borderRadius: 24,
                    background: 'linear-gradient(180deg, rgba(237,246,255,0.95), rgba(248,252,255,0.98))',
                    border: '1px solid rgba(147,197,253,0.58)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.72)',
                    padding: '18px 18px 20px',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#2563eb', marginBottom: 10 }}>
                    {t('voice.viewpointExtraction', { defaultValue: '观点提取' })}
                  </div>
                  {isExtracting ? (
                    <div style={{ color: '#475569', fontSize: 14, lineHeight: 1.8 }}>
                      {t('voice.extracting', { defaultValue: '正在提取观点...' })}
                    </div>
                  ) : null}
                  {!isExtracting && extractionError ? (
                    <div style={{ color: '#b91c1c', fontSize: 14, lineHeight: 1.8 }}>
                      {extractionError}
                    </div>
                  ) : null}
                  {!isExtracting && !extractionError && extractionText ? (
                    <div style={{ color: '#334155', fontSize: 14, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
                      {extractionText}
                    </div>
                  ) : null}
                  {!isExtracting && !extractionError && !extractionText ? (
                    <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.8 }}>
                      {t('voice.extractionEmpty', { defaultValue: '点击“观点提取”后，这里会显示提炼结果。' })}
                    </div>
                  ) : null}
                </div>
              ) : visibleTranscripts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', minHeight: 0, flex: 1 }}>
                  {recordingState !== 'idle' && liveTranscriptText ? (
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: 16,
                        border: '1px dashed rgba(47,111,255,0.22)',
                        background: 'rgba(47,111,255,0.04)',
                        color: '#475569',
                        fontSize: 13,
                        lineHeight: 1.7,
                      }}
                    >
                      <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 800, color: 'var(--primary)' }}>
                        {t('voice.livePreview', { defaultValue: '实时预览' })}
                      </div>
                      <div>{liveTranscriptText}</div>
                    </div>
                  ) : null}
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
                    {t('voice.emptyCards', { defaultValue: '暂无语音卡片，开始录音后会在这里生成' })}
                  </div>
                </div>
              )}
            </div>

            <div
              ref={playbackControlsRef}
              style={{
                flexShrink: 0,
                padding: recordingState === 'idle' ? '14px 18px 16px' : 0,
                borderRadius: recordingState === 'idle' ? 24 : 0,
                border: recordingState === 'idle' ? '1px solid rgba(191,214,255,0.80)' : 'none',
                background: recordingState === 'idle'
                  ? 'linear-gradient(180deg, rgba(247,250,255,0.98), rgba(255,255,255,0.98))'
                  : 'transparent',
                boxShadow: recordingState === 'idle' ? '0 14px 28px rgba(47,111,255,0.08)' : 'none',
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    width: '100%',
                    minHeight: 86,
                    padding: '14px 16px',
                    borderRadius: 28,
                    border: '1px solid rgba(191,214,255,0.80)',
                    background: 'linear-gradient(180deg, rgba(247,250,255,0.98), rgba(255,255,255,0.98))',
                    boxShadow: '0 14px 28px rgba(47,111,255,0.08)',
                    flexWrap: 'nowrap',
                  }}
                >
                  <RecorderButton
                    title={isRecording
                      ? t('voice.pauseRecording', { defaultValue: '暂停录制' })
                      : t('voice.resumeRecording', { defaultValue: '恢复录制' })}
                    onClick={isRecording ? handlePauseRecording : handleResumeRecording}
                    active={isRecording}
                    disabled={isUploading}
                    tone="accent"
                    style={{ width: 52, height: 52 }}
                  >
                    {isRecording ? <PauseOutlined style={{ fontSize: 18 }} /> : <PlayCircleFilled style={{ fontSize: 18 }} />}
                  </RecorderButton>

                  <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          borderRadius: 999,
                          background: 'rgba(232,241,255,0.96)',
                          boxShadow: 'inset 0 0 0 1px rgba(191,214,255,0.9)',
                          color: 'var(--primary)',
                          fontSize: 12,
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        <MicIcon size={14} color="currentColor" />
                        <span>
                          {isRecording
                            ? t('voice.liveRecognizing', { defaultValue: '实时识别中' })
                            : t('voice.status.paused', { defaultValue: '已暂停' })}
                        </span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', flexShrink: 0 }}>
                        {getLanguageLabel(pendingLanguage)}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#475569', fontFamily: 'monospace', flexShrink: 0 }}>
                        {formatElapsed(recordingElapsedMs)}
                      </span>
                    </div>

                    <div style={{ width: '100%', minWidth: 0 }}>
                      <RecordingWaveStrip
                        active={isRecording && !isUploading}
                        paused={!isRecording && !isUploading}
                        tick={recordingPulseTick}
                      />
                    </div>
                  </div>

                  <RecorderButton
                    title={t('voice.stopRecording', { defaultValue: '终止录制' })}
                    onClick={handleRequestStopRecording}
                    danger
                    disabled={isUploading}
                    style={{ width: 52, height: 52 }}
                  >
                    {isUploading ? <LoadingOutlined style={{ fontSize: 18 }} /> : <StopOutlined style={{ fontSize: 18 }} />}
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
