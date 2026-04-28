import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Empty, Modal, Spin, message } from 'antd'
import { CloseOutlined, UploadOutlined } from '@ant-design/icons'
import useNote from '@/hooks/useNote'

const DEFAULT_POLL_INTERVAL_MS = 2000
const DEFAULT_IMPORT_ARCHIVE_MAX_BYTES = 100 * 1024 * 1024

function getStatusText(task, t) {
  switch (task?.status) {
    case 1:
      return t('importTask.status.init', { defaultValue: '初始化' })
    case 2:
      return t('importTask.status.running', { defaultValue: '运行中' })
    case 3:
      return t('importTask.status.success', { defaultValue: '成功' })
    case 4:
      return t('importTask.status.failed', { defaultValue: '失败' })
    default:
      return t('importTask.status.unknown', { defaultValue: '未知' })
  }
}

function getStatusTone(status) {
  switch (status) {
    case 1:
      return { color: '#2563eb', background: 'rgba(37,99,235,0.10)' }
    case 2:
      return { color: '#0f766e', background: 'rgba(15,118,110,0.10)' }
    case 3:
      return { color: '#15803d', background: 'rgba(21,128,61,0.10)' }
    case 4:
      return { color: '#dc2626', background: 'rgba(220,38,38,0.10)' }
    default:
      return { color: '#64748b', background: 'rgba(100,116,139,0.10)' }
  }
}

function formatCreateTime(value, locale) {
  if (!value) {
    return '--'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  return new Intl.DateTimeFormat(locale || undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatFileSizeLabel(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0B'
  }
  if (bytes >= 1024 ** 3) {
    return `${(bytes / (1024 ** 3)).toFixed(1).replace(/\.0$/, '')}GB`
  }
  if (bytes >= 1024 ** 2) {
    return `${(bytes / (1024 ** 2)).toFixed(1).replace(/\.0$/, '')}MB`
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1).replace(/\.0$/, '')}KB`
  }
  return `${bytes}B`
}

function ImportTaskDialog({ open, onClose }) {
  const { t, i18n } = useTranslation()
  const {
    importDocumentArchive,
    getImportTasks,
    getImportArchiveMaxBytes,
    getImportTaskPollIntervalMs,
  } = useNote()
  const [activeTab, setActiveTab] = useState('create')
  const [dragActive, setDragActive] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  const [tasks, setTasks] = useState([])
  const [maxImportArchiveBytes, setMaxImportArchiveBytes] = useState(DEFAULT_IMPORT_ARCHIVE_MAX_BYTES)
  const inputRef = useRef(null)
  const pollTimerRef = useRef(null)
  const maxImportArchiveLabel = formatFileSizeLabel(maxImportArchiveBytes)

  const sortedTasks = useMemo(
    () => [...tasks].sort((left, right) => {
      const leftTime = new Date(left?.createTime || left?.createdAt || 0).getTime()
      const rightTime = new Date(right?.createTime || right?.createdAt || 0).getTime()
      return rightTime - leftTime
    }),
    [tasks],
  )

  useEffect(() => () => {
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!open) {
      if (pollTimerRef.current) {
        window.clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
      }
      setDragActive(false)
      setIsSubmitting(false)
      return
    }

    void refreshTasks()
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false
    const loadImportLimit = async () => {
      const maxBytes = await getImportArchiveMaxBytes().catch(() => DEFAULT_IMPORT_ARCHIVE_MAX_BYTES)
      if (!cancelled) {
        setMaxImportArchiveBytes(maxBytes)
      }
    }

    void loadImportLimit()
    return () => {
      cancelled = true
    }
  }, [open, getImportArchiveMaxBytes])

  useEffect(() => {
    if (!open) {
      return
    }
    const hasRunningTask = tasks.some((task) => task?.status === 1 || task?.status === 2)
    if (!hasRunningTask) {
      if (pollTimerRef.current) {
        window.clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
      }
      return
    }

    let cancelled = false
    const schedule = async () => {
      const delay = await getImportTaskPollIntervalMs().catch(() => DEFAULT_POLL_INTERVAL_MS)
      if (cancelled) {
        return
      }
      pollTimerRef.current = window.setTimeout(() => {
        void refreshTasks(false)
      }, delay)
    }

    void schedule()
    return () => {
      cancelled = true
      if (pollTimerRef.current) {
        window.clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [open, tasks, getImportTaskPollIntervalMs])

  const refreshTasks = async (showLoading = true) => {
    if (showLoading) {
      setIsLoadingTasks(true)
    }
    try {
      const data = await getImportTasks()
      setTasks(Array.isArray(data) ? data : [])
    } catch (error) {
      if (showLoading) {
        message.error(error?.message || t('importTask.loadFailed', { defaultValue: '导入任务加载失败' }))
      }
    } finally {
      if (showLoading) {
        setIsLoadingTasks(false)
      }
    }
  }

  const validateFile = (file) => {
    if (!file) {
      return false
    }
    const isZip = /\.zip$/i.test(file.name || '')
    if (!isZip) {
      message.warning(t('importTask.zipRequired', { defaultValue: '请导入 .zip 格式压缩包' }))
      return false
    }
    const exceedsMaxImportArchiveBytes = Number(file.size) > maxImportArchiveBytes
    if (exceedsMaxImportArchiveBytes) {
      message.warning(t('importTask.fileTooLargeDynamic', {
        size: maxImportArchiveLabel,
        defaultValue: `鍘嬬缉鍖呭ぇ灏忎笉鑳借秴杩?${maxImportArchiveLabel}`,
      }))
      return false
    }
    if (false && Number(file.size) > maxImportArchiveBytes) {
      message.warning(t('importTask.fileTooLarge', { defaultValue: '压缩包大小不能超过 1024MB' }))
      return false
    }
    return true
  }

  const handleFile = async (file) => {
    if (!validateFile(file) || isSubmitting) {
      return
    }
    try {
      setIsSubmitting(true)
      await importDocumentArchive(file)
      setActiveTab('list')
      message.success(t('importTask.created', { defaultValue: '导入任务已创建' }))
      await refreshTasks()
    } catch (error) {
      message.error(error?.message || t('importTask.createFailed', { defaultValue: '导入任务创建失败' }))
    } finally {
      setIsSubmitting(false)
      setDragActive(false)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const tabs = [
    { key: 'create', label: t('importTask.createTab', { defaultValue: '创建任务' }) },
    { key: 'list', label: t('importTask.listTab', { defaultValue: '导入列表' }) },
  ]

  return (
    <>
      <style>{`\
        .import-task-dialog-root .ant-modal-content {\
          border-radius: 24px;\
          overflow: hidden;\
          background: rgba(255,255,255,0.98);\
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);\
        }\
        .import-task-dialog-root .ant-modal-mask {\
          background: rgba(15, 23, 42, 0.34);\
          backdrop-filter: blur(4px);\
        }\
        .import-task-dialog-notice {\
          display: flex;\
          flex-direction: column;\
        }\
        .import-task-dialog-notice > div:nth-child(3) {\
          order: 1;\
        }\
        .import-task-dialog-notice > div:nth-child(2) {\
          order: 2;\
        }\
        .import-task-dialog-notice > div:nth-child(4) {\
          display: none;\
        }\
        .import-task-dialog-notice > div:nth-child(5) {\
          order: 3;\
        }\
      `}</style>

      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        centered
        destroyOnHidden
        width={1024}
        title={null}
        rootClassName="import-task-dialog-root"
        closeIcon={<CloseOutlined style={{ fontSize: 18, color: '#94a3b8' }} />}
        styles={{
          body: { padding: 0 },
          content: { borderRadius: 24, overflow: 'hidden' },
        }}
      >
        <div style={{ padding: '26px 28px 28px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              paddingRight: 24,
              marginBottom: 22,
              borderBottom: '1px solid rgba(226,232,240,0.95)',
            }}
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: '0 0 14px',
                    fontSize: 18,
                    fontWeight: active ? 800 : 500,
                    color: active ? '#111827' : '#64748b',
                    borderBottom: active ? '3px solid #111827' : '3px solid transparent',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {activeTab === 'create' ? (
            <div>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault()
                  setDragActive(true)
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragActive(true)
                }}
                onDragLeave={(event) => {
                  event.preventDefault()
                  const nextTarget = event.relatedTarget
                  if (nextTarget && event.currentTarget.contains(nextTarget)) {
                    return
                  }
                  setDragActive(false)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  setDragActive(false)
                  const file = event.dataTransfer?.files?.[0]
                  void handleFile(file)
                }}
                style={{
                  width: '100%',
                  minHeight: 360,
                  borderRadius: 18,
                  border: dragActive
                    ? '2px solid rgba(37,99,235,0.45)'
                    : '1px dashed rgba(203,213,225,0.95)',
                  background: dragActive ? 'rgba(239,246,255,0.9)' : '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 18,
                  cursor: isSubmitting ? 'progress' : 'pointer',
                  transition: 'all 0.18s ease',
                }}
              >
                <div
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(248,250,252,0.95)',
                    color: '#475569',
                    fontSize: 28,
                  }}
                >
                  {isSubmitting ? <Spin /> : <UploadOutlined />}
                </div>
                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 400,
                    color: '#111827',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {t('importTask.dropOrClick', { defaultValue: '拖拽至此处或点击导入' })}
                </div>
              </button>

              <input
                ref={inputRef}
                type="file"
                accept=".zip,application/zip"
                style={{ display: 'none' }}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  void handleFile(file)
                }}
              />

              <div className="import-task-dialog-notice" style={{ marginTop: 22, color: '#64748b', lineHeight: 1.9, fontSize: 14 }}>
                <div style={{ display: 'none' }}>{maxImportArchiveLabel}</div>
                <div>1. {t('importTask.noticeZipDynamic', {
                  size: maxImportArchiveLabel,
                  defaultValue: `璇峰鍏?.zip 鏍煎紡鍘嬬缉鍖咃紝涓婇檺澶у皬 ${maxImportArchiveLabel}銆?`,
                })}</div>
                <div style={{ fontWeight: 700, color: '#475569' }}>
                  {t('importTask.noticeTitle', { defaultValue: '温馨提示：' })}
                </div>
                <div>1. {t('importTask.noticeZip', { defaultValue: '请导入 .zip 格式压缩包，上限大小 1024MB。' })}</div>
                <div>2. {t('importTask.noticeProcess', { defaultValue: '导入任务创建后，可在“导入列表”中查看当前状态。' })}</div>
              </div>
            </div>
          ) : (
            <div
              style={{
                minHeight: 430,
                borderRadius: 18,
                border: '1px solid rgba(241,245,249,0.96)',
                background: '#fff',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.6fr) minmax(180px, 0.9fr) 140px',
                  gap: 0,
                  padding: '18px 26px',
                  background: 'rgba(248,250,252,0.9)',
                  color: '#475569',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                <div>{t('importTask.table.taskName', { defaultValue: '任务名称' })}</div>
                <div>{t('importTask.table.createTime', { defaultValue: '创建时间' })}</div>
                <div>{t('importTask.table.status', { defaultValue: '状态' })}</div>
              </div>

              {isLoadingTasks ? (
                <div style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Spin />
                </div>
              ) : sortedTasks.length === 0 ? (
                <div style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={t('importTask.empty', { defaultValue: '暂无数据' })}
                  />
                </div>
              ) : (
                <div>
                  {sortedTasks.map((task) => {
                    const tone = getStatusTone(task?.status)
                    return (
                      <div
                        key={task?.taskId || task?.task_id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(180px, 0.9fr) 140px',
                          gap: 0,
                          padding: '18px 26px',
                          borderTop: '1px solid rgba(241,245,249,0.96)',
                          alignItems: 'center',
                        }}
                      >
                        <div
                          style={{
                            minWidth: 0,
                            color: '#111827',
                            fontSize: 14,
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={task?.taskName || task?.task_id}
                        >
                          {task?.taskName || task?.taskId || task?.task_id}
                        </div>
                        <div style={{ color: '#475569', fontSize: 14 }}>
                          {formatCreateTime(
                            task?.createTime || task?.createdAt || task?.created_at,
                            i18n.resolvedLanguage || i18n.language,
                          )}
                        </div>
                        <div>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: 70,
                              height: 30,
                              padding: '0 12px',
                              borderRadius: 999,
                              fontSize: 13,
                              fontWeight: 700,
                              color: tone.color,
                              background: tone.background,
                            }}
                          >
                            {getStatusText(task, t)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}

export default ImportTaskDialog
