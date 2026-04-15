import React, { useState } from 'react'
import { Input } from 'antd'
import { SearchOutlined, CloseCircleFilled } from '@ant-design/icons'

const SearchBar = ({ onSearch, placeholder = '搜索笔记...', ...props }) => {
  const [value, setValue] = useState('')

  const handleSearch = (searchValue) => {
    onSearch(searchValue)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch(value)
    }
  }

  const handleChange = (e) => {
    setValue(e.target.value)
  }

  const handleClear = () => {
    setValue('')
    onSearch('')
  }

  return (
    <Input
      value={value}
      onChange={handleChange}
      onKeyPress={handleKeyPress}
      placeholder={placeholder}
      prefix={
        <SearchOutlined
          data-testid="search-icon"
          style={{ color: '#bfbfbf', fontSize: 16 }}
        />
      }
      suffix={value ? (
        <CloseCircleFilled
          onClick={handleClear}
          style={{ color: '#bfbfbf', cursor: 'pointer', fontSize: 14 }}
        />
      ) : null
      allowClear={false}
      style={{
        borderRadius: 20,
        padding: '6px 16px',
        background: '#f7f9fb',
        border: '1px solid rgba(172,179,183,0.15)',
        ...props.style,
      }}
      {...props}
    />
  )
}

export default SearchBar
