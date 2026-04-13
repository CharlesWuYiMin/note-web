import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatRelativeTime,
  formatDateTime,
  isToday,
  isYesterday,
} from '@/utils/dateUtils'

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('should format Date object to YYYY-MM-DD string', () => {
      const date = new Date(2026, 3, 9) // April 9, 2026
      const result = formatDate(date)
      
      expect(result).toBe('2026-04-09')
    })

    it('should format ISO string to YYYY-MM-DD', () => {
      const result = formatDate('2026-04-09T12:00:00.000Z')
      
      expect(result).toBe('2026-04-09')
    })

    it('should handle invalid input gracefully', () => {
      expect(formatDate(null)).toBe('')
      expect(formatDate(undefined)).toBe('')
      expect(formatDate('invalid')).toBe('')
    })
  })

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 3, 9, 12, 0, 0)) // April 9, 2026 12:00:00
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return "刚刚" for less than 1 minute ago', () => {
      const result = formatRelativeTime(new Date(2026, 3, 9, 11, 59, 30))
      expect(result).toBe('刚刚')
    })

    it('should return "X分钟前" for minutes ago', () => {
      const result = formatRelativeTime(new Date(2026, 3, 9, 11, 55, 0))
      expect(result).toBe('5分钟前')
    })

    it('should return "X小时前" for hours ago', () => {
      const result = formatRelativeTime(new Date(2026, 3, 9, 8, 0, 0))
      expect(result).toBe('4小时前')
    })

    it('should return "昨天" for yesterday', () => {
      const result = formatRelativeTime(new Date(2026, 3, 8, 12, 0, 0))
      expect(result).toBe('昨天')
    })
  })

  describe('formatDateTime', () => {
    it('should format to YYYY-MM-DD HH:mm:ss by default', () => {
      const date = new Date(2026, 3, 9, 14, 30, 45)
      const result = formatDateTime(date)
      
      expect(result).toBe('2026-04-09 14:30:45')
    })

    it('should support custom format', () => {
      const date = new Date(2026, 3, 9, 14, 30, 45)
      const result = formatDateTime(date, 'YYYY/MM/DD HH:mm')
      
      expect(result).toBe('2026/04/09 14:30')
    })
  })

  describe('isToday', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 3, 9))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return true for today\'s date', () => {
      expect(isToday(new Date(2026, 3, 9))).toBe(true)
    })

    it('should return false for other dates', () => {
      expect(isToday(new Date(2026, 3, 8))).toBe(false)
    })
  })

  describe('isYesterday', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 3, 9))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return true for yesterday', () => {
      expect(isYesterday(new Date(2026, 3, 8))).toBe(true)
    })

    it('should return false for today', () => {
      expect(isYesterday(new Date(2026, 3, 9))).toBe(false)
    })
  })
})
