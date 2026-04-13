import React, { useCallback, useMemo } from 'react'
import { createEditor, Transforms, Editor } from 'slate'
import { Slate, Editable, withReact } from 'slate-react'
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  UndoOutlined,
  RedoOutlined,
} from '@ant-design/icons'

const TextEditor = ({ value, onChange, onSave, placeholder, ...props }) => {
  const editor = useMemo(() => withReact(createEditor()), [])

  const initialValue = useMemo(() => {
    if (value) {
      try {
        return JSON.parse(value)
      } catch {
        return [{ type: 'paragraph', children: [{ text: value }] }]
      }
    }
    return [{ type: 'paragraph', children: [{ text: '' }] }]
  }, [value])

  const renderLeaf = useCallback((props) => {
    let { attributes, children, leaf } = props

    if (leaf.bold) {
      children = <strong>{children}</strong>
    }

    if (leaf.italic) {
      children = <em>{children}</em>
    }

    if (leaf.underline) {
      children = <u>{children}</u>
    }

    return (
      <span {...attributes} style={{
        fontWeight: leaf.bold ? 600 : 400,
        fontStyle: leaf.italic ? 'italic' : 'normal',
        textDecoration: leaf.underline ? 'underline' : 'none',
      }}>
        {children}
      </span>
    )
  }, [])

  const renderElement = useCallback((props) => {
    const { attributes, children, element } = props

    switch (element.type) {
      case 'list-item':
        return <li {...attributes}>{children}</li>
      case 'numbered-list':
        return <ol {...attributes}>{children}</ol>
      case 'bulleted-list':
        return <ul {...attributes}>{children}</ul>
      default:
        return (
          <p
            {...attributes}
            style={{
              margin: 0,
              padding: '4px 0',
              lineHeight: 1.6,
            }}
          >
            {children}
          </p>
        )
    }
  }, [])

  const toggleFormat = (format) => {
    const isActive = isFormatActive(editor, format)
    Transforms.setNodes(
      editor,
      { [format]: isActive ? null : true },
      { match: (n) => Editor.isBlock(editor, n) ? false : true }
    )
  }

  const isFormatActive = (editor, format) => {
    const [match] = Array.from(
      Editor.nodes(editor, {
        at: editor.selection,
        match: (n) => n[format] === true,
        mode: 'all',
      })
    )
    return !!match
  }

  const handleKeyDown = (event) => {
    if (!event.ctrlKey && !event.metaKey) return

    switch (event.key) {
      case 'b':
        event.preventDefault()
        toggleFormat('bold')
        break
      case 'i':
        event.preventDefault()
        toggleFormat('italic')
        break
      case 'u':
        event.preventDefault()
        toggleFormat('underline')
        break
    }
  }

  const handleChange = (newValue) => {
    onChange(JSON.stringify(newValue))
    
    if (onSave) {
      onSave(newValue)
    }
  }

  const FormatButton = ({ format, icon: Icon }) => {
    const isActive = isFormatActive(editor, format)
    return (
      <button
        data-testid={`toolbar-${format}`}
        title={format.charAt(0).toUpperCase() + format.slice(1)}
        onMouseDown={(e) => {
          e.preventDefault()
          toggleFormat(format)
        }}
        style={{
          padding: '6px 10px',
          border: 'none',
          background: isActive ? 'rgba(2,86,210,0.1)' : 'transparent',
          color: isActive ? '#0256d2' : '#5f6368',
          borderRadius: 6,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          transition: 'all 0.15s',
        }}
      >
        <Icon />
      </button>
    )
  }

  return (
    <div
      className="text-editor"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <div
        className="editor-toolbar"
        style={{
          display: 'flex',
          gap: 4,
          padding: '8px 12px',
          borderBottom: '1px solid rgba(172,179,183,0.15)',
          background: '#ffffff',
          alignItems: 'center',
        }}
      >
        <FormatButton format="bold" icon={BoldOutlined} />
        <FormatButton format="italic" icon={ItalicOutlined} />
        <FormatButton format="underline" icon={UnderlineOutlined} />
        
        <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.08)', margin: '0 8px' }} />
        
        <FormatButton format="bulleted-list" icon={UnorderedListOutlined} />
        <FormatButton format="numbered-list" icon={OrderedListOutlined} />

        <div style={{ flex: 1 }} />

        <button
          title="Undo"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.undo()}
          style={{
            padding: '6px 10px',
            border: 'none',
            background: 'transparent',
            color: '#5f6368',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          <UndoOutlined />
        </button>

        <button
          title="Redo"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.redo()}
          style={{
            padding: '6px 10px',
            border: 'none',
            background: 'transparent',
            color: '#5f6368',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          <RedoOutlined />
        </button>
      </div>

      <Slate
        editor={editor}
        value={initialValue}
        onChange={handleChange}
      >
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || '开始输入...'}
          style={{
            flex: 1,
            padding: '20px 24px',
            outline: 'none',
            fontSize: 15,
            lineHeight: 1.7,
            color: '#2c3437',
            overflowY: 'auto',
          }}
          {...props}
        />
      </Slate>
    </div>
  )
}

export default TextEditor
