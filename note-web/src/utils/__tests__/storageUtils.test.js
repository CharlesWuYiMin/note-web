import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  setItem,
  getItem,
  removeItem,
  clearAll,
  hasItem,
} from '@/utils/storageUtils'

describe('storageUtils', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('setItem', () => {
    it('should store string value', () => {
      setItem('key1', 'value1')
      
      expect(localStorage.getItem('key1')).toBe('"value1"')
    })

    it('should store object value as JSON', () => {
      const obj = { name: 'test', count: 123 }
      setItem('objKey', obj)
      
      expect(JSON.parse(localStorage.getItem('objKey'))).toEqual(obj)
    })
  })

  describe('getItem', () => {
    it('should retrieve stored value', () => {
      localStorage.setItem('key1', JSON.stringify('value1'))
      
      expect(getItem('key1')).toBe('value1')
    })

    it('should parse JSON for objects', () => {
      const obj = { name: 'test' }
      localStorage.setItem('objKey', JSON.stringify(obj))
      
      expect(getItem('objKey')).toEqual(obj)
    })

    it('should return null for non-existent key', () => {
      expect(getItem('nonexistent')).toBeNull()
    })

    it('should return defaultValue when provided and key not found', () => {
      expect(getItem('missing', 'default')).toBe('default')
    })
  })

  describe('removeItem', () => {
    it('should remove item from storage', () => {
      localStorage.setItem('key1', '"value1"')
      
      removeItem('key1')
      
      expect(localStorage.getItem('key1')).toBeNull()
    })
  })

  describe('clearAll', () => {
    it('should clear all items from storage', () => {
      localStorage.setItem('key1', '"value1"')
      localStorage.setItem('key2', '"value2"')
      
      clearAll()
      
      expect(localStorage.length).toBe(0)
    })
  })

  describe('hasItem', () => {
    it('should return true if key exists', () => {
      localStorage.setItem('key1', '"value1"')
      
      expect(hasItem('key1')).toBe(true)
    })

    it('should return false if key does not exist', () => {
      expect(hasItem('nonexistent')).toBe(false)
    })
  })
})
