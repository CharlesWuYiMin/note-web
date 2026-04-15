import React from 'react'
import { Button, Dropdown } from 'antd'
import { FilterOutlined, OrderedListOutlined } from '@ant-design/icons'
import {
  SEARCH_SORT_FIELDS,
  SEARCH_SORT_ORDERS,
} from '@/utils/searchResultSort'

const FIELD_OPTIONS = [
  { value: SEARCH_SORT_FIELDS.CREATED_AT, label: '创建时间' },
  { value: SEARCH_SORT_FIELDS.UPDATED_AT, label: '修改时间' },
  { value: SEARCH_SORT_FIELDS.TITLE, label: '笔记名称' },
]

const ORDER_OPTIONS = [
  { value: SEARCH_SORT_ORDERS.DESC, label: '从 Z 到 A' },
  { value: SEARCH_SORT_ORDERS.ASC, label: '从 A 到 Z' },
]

function SelectionButton({ active, children, onClick }) {
  return (
    <Button
      type="text"
      block
      onClick={onClick}
      aria-pressed={active}
      style={{
        height: 40,
        justifyContent: 'space-between',
        borderRadius: 12,
        color: active ? '#0256d2' : '#10223a',
        fontWeight: active ? 700 : 500,
        background: active ? 'rgba(2,86,210,0.08)' : 'transparent',
      }}
    >
      {children}
    </Button>
  )
}

function SearchResultToolbar({ total, sort, onSortChange }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        padding: '4px 0 20px',
      }}
    >
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#10223a', lineHeight: 1.1 }}>
          {total} 篇笔记
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(16,34,58,0.54)' }}>
          根据当前查询结果展示，可继续按时间或名称排序。
        </div>
      </div>

      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        popupRender={() => (
          <div
            style={{
              width: 240,
              padding: 14,
              borderRadius: 20,
              background: 'rgba(255,255,255,0.98)',
              border: '1px solid rgba(16,34,58,0.08)',
              boxShadow: '0 20px 42px rgba(16,34,58,0.12)',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>
              排序依据
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              {FIELD_OPTIONS.map((option) => (
                <SelectionButton
                  key={option.value}
                  active={sort.field === option.value}
                  onClick={() => onSortChange({ field: option.value })}
                >
                  <span>{option.label}</span>
                  {sort.field === option.value ? <span>✓</span> : null}
                </SelectionButton>
              ))}
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', margin: '14px 0 8px' }}>
              排序
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              {ORDER_OPTIONS.map((option) => (
                <SelectionButton
                  key={option.value}
                  active={sort.order === option.value}
                  onClick={() => onSortChange({ order: option.value })}
                >
                  <span>{option.label}</span>
                  {sort.order === option.value ? <span>✓</span> : null}
                </SelectionButton>
              ))}
            </div>
          </div>
        )}
      >
        <Button
          aria-label="打开排序菜单"
          icon={<OrderedListOutlined />}
          style={{
            height: 42,
            borderRadius: 14,
            paddingInline: 14,
            background: '#fff',
            borderColor: 'rgba(16,34,58,0.08)',
            boxShadow: '0 8px 18px rgba(16,34,58,0.06)',
          }}
        >
          <FilterOutlined />
        </Button>
      </Dropdown>
    </div>
  )
}

export default SearchResultToolbar
