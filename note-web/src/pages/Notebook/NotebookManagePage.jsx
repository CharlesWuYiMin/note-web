﻿import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  message,
  Empty,
  Spin,
  Tag,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  LockOutlined,
  FileTextOutlined,
  HistoryOutlined,
  StarOutlined,
  ShareAltOutlined,
  ClearOutlined,
} from '@ant-design/icons'
import useNotebook from '@/hooks/useNotebook'
import WorkspaceSectionLayout from '@/components/workspace/WorkspaceSectionLayout'
import { openCenteredConfirm } from '@/utils/centeredConfirm'

const { TextArea } = Input

export function NotebookCard({ notebook, onEdit, onDelete, isDefault }) {
  const { t } = useTranslation()

  return (
    <Card
      hoverable
      style={{
        borderRadius: 16,
        minHeight: 160,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 22px rgba(16,34,58,0.04)',
      }}
      styles={{ body: { flex: 1, padding: 20, display: 'flex', flexDirection: 'column' } }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: notebook.color || 'rgba(0,97,164,0.08)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
          }} data-testid="folder-icon">
            <FolderOutlined />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              color: '#10223a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              {notebook.name}
              {isDefault && (
                <LockOutlined style={{ fontSize: 12, color: '#bfbfbf' }} data-testid="lock-icon" />
              )}
            </h3>
            {notebook.description && (
              <p style={{
                margin: '4px 0 0',
                fontSize: 13,
                color: '#8c8c8c',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {notebook.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTop: '1px solid rgba(0,0,0,0.06)',
      }}>
        <span style={{ fontSize: 13, color: '#bfbfbf', display: 'flex', alignItems: 'center', gap: 4 }}>
          <FileTextOutlined />
          {notebook.noteCount || 0} {t('notebook.noteCount')}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(notebook)} />
          {!isDefault && (
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(notebook.id)}
            />
          )}
        </div>
      </div>
    </Card>
  )
}

function NotebookManagePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    notebooks,
    isLoading,
    fetchNotebooks,
    createNotebook,
    updateNotebook,
    deleteNotebook,
  } = useNotebook()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingNotebook, setEditingNotebook] = useState(null)
  const [form] = Form.useForm()
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  useEffect(() => {
    let active = true
    setIsBootstrapping(true)
    Promise.resolve(fetchNotebooks()).finally(() => {
      if (active) {
        setIsBootstrapping(false)
      }
    })

    return () => {
      active = false
    }
  }, [fetchNotebooks])

  const stats = useMemo(() => {
    const defaultCount = notebooks.filter((nb) => nb.isDefault).length
    return [
      { key: 'total', label: '笔记本数量', value: notebooks.length, hint: '分类管理的总入口', icon: <FolderOutlined /> },
      { key: 'default', label: '默认笔记本', value: defaultCount, hint: '默认保存的笔记本', icon: <LockOutlined /> },
      { key: 'notes', label: '关联笔记', value: notebooks.reduce((sum, nb) => sum + (nb.noteCount || 0), 0), hint: '所有笔记本内的笔记总量', icon: <FileTextOutlined /> },
      { key: 'sync', label: '同步状态', value: '在线', hint: '当前数据已同步到服务端', icon: <ShareAltOutlined /> },
    ]
  }, [notebooks])

  const tabs = [
    { key: 'recent', label: '近期笔记', icon: <HistoryOutlined />, active: false, onClick: () => navigate('/cloudnote/recent') },
    { key: 'starred', label: '星标笔记', icon: <StarOutlined />, active: false, onClick: () => navigate('/cloudnote/starred') },
    { key: 'myshares', label: '我的分享', icon: <ShareAltOutlined />, active: false, onClick: () => navigate('/cloudnote/myshares') },
    { key: 'notebooks', label: '笔记本', icon: <FolderOutlined />, active: true, onClick: () => navigate('/cloudnote/notebooks') },
    { key: 'recyclebin', label: '回收站', icon: <DeleteOutlined />, active: false, onClick: () => navigate('/cloudnote/recyclebin') },
  ]

  const actions = [
    {
      key: 'create',
      label: '新建笔记本',
      icon: <PlusOutlined />,
      primary: true,
      onClick: () => {
        setEditingNotebook(null)
        form.resetFields()
        setModalOpen(true)
      },
    },
    { key: 'refresh', label: '刷新列表', icon: <ClearOutlined />, onClick: () => fetchNotebooks() },
  ]

  const handleEdit = (notebook) => {
    setEditingNotebook(notebook)
    form.setFieldsValue({
      name: notebook.name,
      description: notebook.description || '',
      color: notebook.color || '#e6f4ff',
    })
    setModalOpen(true)
  }

  const handleDelete = async (id) => {
    openCenteredConfirm({
      title: t('notebook.delete'),
      content: t('notebook.confirmDelete'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
      onOk: async () => {
        try {
          await deleteNotebook(id)
          message.success(t('common.success'))
        } catch (err) {
          message.error(err.message || t('common.error'))
          throw err
        }
      },
    })
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      if (editingNotebook) {
        await updateNotebook(editingNotebook.id, values)
      } else {
        await createNotebook(values)
      }
      message.success(t('common.success'))
      setModalOpen(false)
    } catch (err) {
      // validation or API error
    }
  }

  const main = (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#10223a' }}>{t('notebook.title')}</div>
          <div style={{ fontSize: 13, color: 'rgba(16,34,58,0.54)', marginTop: 4 }}>笔记本、近期笔记、星标和回收站都在同一个主页面框架里。</div>
        </div>
        <Tag color="blue" style={{ borderRadius: 999 }}>网格视图</Tag>
      </div>

      <Spin spinning={isLoading || isBootstrapping}>
        {notebooks.length === 0 && !isLoading && !isBootstrapping ? (
          <Empty description={t('notebook.empty')} image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '48px 0' }} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}>
            {notebooks.map((nb) => (
              <NotebookCard
                key={nb.id}
                notebook={nb}
                isDefault={nb.isDefault}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </Spin>

      <Modal
        title={editingNotebook ? t('notebook.editNotebook') : t('notebook.createNotebook')}
        open={modalOpen}
        centered
        onOk={handleModalOk}
        onCancel={() => setModalOpen(false)}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        width={480}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t('notebook.notebookName')}
            rules={[{ required: true, message: t('notebook.nameRequired') }]}
          >
            <Input placeholder={t('notebook.notebookName')} maxLength={50} />
          </Form.Item>
          <Form.Item name="description" label={t('notebook.description')}>
            <TextArea rows={3} placeholder={t('notebook.description')} maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )

  const side = (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <InfoCard title="笔记本结构" content="默认笔记本、个人笔记本和协作笔记本都可以在这里集中管理。" />
      <InfoCard title="使用建议" content={[ '创建后即可从左侧导航快速切换', '默认笔记本通常不可删除', '可在此统一维护笔记分类' ]} />
    </div>
  )

  return (
    <WorkspaceSectionLayout
      title="笔记本"
      subtitle="所有笔记本都使用同一套主页面框架，只是这里展示的是网格管理视图。"
      description="你可以在这里创建、编辑、删除笔记本，也能和近期笔记页保持统一的视觉语言。"
      icon={<FolderOutlined />}
      actions={actions}
      tabs={tabs}
      stats={stats}
      main={main}
      side={side}
    />
  )
}

function InfoCard({ title, content }) {
  return (
    <div style={{
      borderRadius: 20,
      padding: 18,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(246,249,253,0.96))',
      border: '1px solid rgba(16,34,58,0.06)',
      boxShadow: '0 10px 24px rgba(16,34,58,0.04)',
    }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#10223a' }}>{title}</div>
      {Array.isArray(content) ? (
        <ul style={{ margin: '14px 0 0', paddingLeft: 18, color: 'rgba(16,34,58,0.7)', lineHeight: 1.8 }}>
          {content.map((line) => <li key={line}>{line}</li>)}
        </ul>
      ) : (
        <div style={{ marginTop: 12, color: 'rgba(16,34,58,0.7)', lineHeight: 1.8 }}>{content}</div>
      )}
    </div>
  )
}

export default NotebookManagePage
