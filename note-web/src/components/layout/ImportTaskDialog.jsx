import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Empty, Modal, Spin, message } from 'antd'
import { CloseOutlined, UploadOutlined } from '@ant-design/icons'
import useNote from '@/hooks/useNote'

const DEFAULT_POLL_INTERVAL_MS = 2000
const MAX_IMPORT_ARCHIVE_BYTES = 1024 * 1024 * 1024
const MODAL_WIDTH = 880
const MODAL_HEIGHT = '66vh'

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
      return { color: '#2563eb', background: 'rgba(37,99,235,0.08)' }
    case 3:
      return { color: '#0a59f7', background: 'rgba(10,89,247,0.10)' }
    case 4:
      return { color: '#dc2626', background: 'rgba(220,38,38,0.10)' }
    default:
      return { color: '#4d86ff', background: 'rgba(77,134,255,0.10)' }
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

function ImportTaskDialog({ open, onClose }) {
  const { t, i18n } = useTranslation()
  const {
    importDocumentArchive,
    getImportTasks,
    getImportTaskPollIntervalMs,
  } = useNote()
  const [activeTab, setActiveTab] = useState('create')
  const [dragActive, setDragActive] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  const [tasks, setTasks] = useState([])
  const inputRef = useRef(null)
  const pollTimerRef = useRef(null)

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
    if (Number(file.size) > MAX_IMPORT_ARCHIVE_BYTES) {
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
          border-radius: 26px;\
          overflow: hidden;\
          background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(245,249,253,0.96));\
          border: 1px solid rgba(16, 34, 58, 0.06);\
          box-shadow: 0 18px 42px rgba(16, 34, 58, 0.08);\
        }\
        .import-task-dialog-root .ant-modal-mask {\
          background: rgba(15, 23, 42, 0.32);\
        }\
        .import-task-dialog-root .import-task-list-scroll {\
          scrollbar-width: none;\
          -ms-overflow-style: none;\
        }\
        .import-task-dialog-root .import-task-list-scroll::-webkit-scrollbar {\
          width: 0;\
          height: 0;\
        }\
      `}</style>

      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        centered
        destroyOnHidden
        width={MODAL_WIDTH}
        title={null}
        rootClassName="import-task-dialog-root"
        closeIcon={<CloseOutlined style={{ fontSize: 18, color: '#94a3b8' }} />}
        styles={{
          body: { padding: 0, height: '100%' },
          content: {
            width: '100%',
            height: MODAL_HEIGHT,
            maxHeight: '76vh',
            borderRadius: 26,
            overflow: 'hidden',
            border: '1px solid rgba(16,34,58,0.06)',
            boxShadow: '0 18px 42px rgba(16,34,58,0.08)',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <div style={{
          padding: '18px 20px 20px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              paddingRight: 20,
              marginBottom: 14,
              borderBottom: '1px solid rgba(226,232,240,0.95)',
              flexShrink: 0,
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
                    padding: '0 0 13px',
                    fontSize: 16,
                    fontWeight: active ? 700 : 500,
                    color: active ? 'var(--on-surface)' : 'var(--on-surface-muted)',
                    borderBottom: active ? '3px solid var(--primary)' : '3px solid transparent',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            {activeTab === 'create' ? (
              <div style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}>
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
                  minHeight: 260,
                  borderRadius: 22,
                  border: dragActive
                    ? '1px solid rgba(10,89,247,0.26)'
                    : '1px dashed rgba(16,34,58,0.12)',
                  background: dragActive
                    ? 'linear-gradient(180deg, rgba(242,247,255,0.96), rgba(232,241,255,0.9))'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.98))',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  cursor: isSubmitting ? 'progress' : 'pointer',
                  transition: 'all 0.18s ease',
                  flexShrink: 0,
                  boxShadow: '0 10px 24px rgba(16,34,58,0.04)',
                }}
              >
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(242,247,255,0.98))',
                    color: 'var(--primary)',
                    border: '1px solid rgba(10,89,247,0.10)',
                    boxShadow: '0 10px 18px rgba(10,89,247,0.08)',
                    fontSize: 25,
                  }}
                >
                  {isSubmitting ? <Spin /> : <UploadOutlined />}
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 500,
                    color: 'var(--on-surface)',
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

              <div style={{
                marginTop: 2,
                color: 'var(--on-surface-soft)',
                lineHeight: 1.8,
                fontSize: 14,
                borderRadius: 18,
                padding: '16px 18px',
                background: 'rgba(255,255,255,0.82)',
                border: '1px solid rgba(16,34,58,0.06)',
                boxShadow: '0 8px 18px rgba(16,34,58,0.04)',
              }}>
                <div style={{ fontWeight: 700, color: 'var(--on-surface)' }}>
                  {t('importTask.noticeTitle', { defaultValue: '温馨提示：' })}
                </div>
                <div>1. {t('importTask.noticeZip', { defaultValue: '请导入 .zip 格式压缩包，上限大小 1024MB。' })}</div>
                <div>2. {t('importTask.noticeProcess', { defaultValue: '导入任务创建后，可在“导入列表”中查看当前状态。' })}</div>
              </div>
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 22,
                  border: '1px solid rgba(16,34,58,0.06)',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))',
                  overflow: 'hidden',
                  boxShadow: '0 10px 24px rgba(16,34,58,0.04)',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1.8fr) minmax(180px, 0.9fr) 140px',
                    gap: 0,
                    padding: '14px 20px',
                    background: 'linear-gradient(180deg, rgba(242,247,255,0.92), rgba(248,250,252,0.94))',
                    color: 'var(--on-surface-soft)',
                    fontSize: 14,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  <div>{t('importTask.table.taskName', { defaultValue: '任务名称' })}</div>
                  <div>{t('importTask.table.createTime', { defaultValue: '创建时间' })}</div>
                  <div>{t('importTask.table.status', { defaultValue: '状态' })}</div>
                </div>

                {isLoadingTasks ? (
                  <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Spin />
                  </div>
                ) : sortedTasks.length === 0 ? (
                  <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={t('importTask.empty', { defaultValue: '暂无数据' })}
                    />
                  </div>
                ) : (
                  <div
                    className="import-task-list-scroll"
                    style={{
                      flex: 1,
                      minHeight: 0,
                      overflowY: 'auto',
                      overflowX: 'hidden',
                    }}
                  >
                    {sortedTasks.map((task) => {
                      const tone = getStatusTone(task?.status)
                      return (
                        <div
                          key={task?.taskId || task?.task_id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1.8fr) minmax(180px, 0.9fr) 140px',
                        gap: 0,
                            padding: '14px 20px',
                            borderTop: '1px solid rgba(241,245,249,0.96)',
                            alignItems: 'center',
                          }}
                        >
                          <div
                          style={{
                            minWidth: 0,
                            color: 'var(--on-surface)',
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
                          <div style={{ color: 'var(--on-surface-soft)', fontSize: 14 }}>
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
                                border: '1px solid rgba(10,89,247,0.08)',
                                boxShadow: '0 6px 14px rgba(10,89,247,0.06)',
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
        </div>
      </Modal>
    </>
  )
}

export default ImportTaskDialog
