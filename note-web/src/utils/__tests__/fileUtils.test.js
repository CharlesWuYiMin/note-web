import { describe, it, expect, vi } from 'vitest'
import {
  formatFileSize,
  getFileExtension,
  isImageFile,
  isValidFileType,
} from '@/utils/fileUtils'

describe('fileUtils', () => {
  describe('formatFileSize', () => {
    it('should format bytes to human readable string', () => {
      expect(formatFileSize(0)).toBe('0 B')
      expect(formatFileSize(1024)).toBe('1.00 KB')
      expect(formatFileSize(1048576)).toBe('1.00 MB')
      expect(formatFileSize(1073741824)).toBe('1.00 GB')
    })

    it('should handle decimal values correctly', () => {
      expect(formatFileSize(1536)).toBe('1.50 KB')
      expect(formatFileSize(1572864)).toBe('1.50 MB')
    })
  })

  describe('getFileExtension', () => {
    it('should extract file extension from filename', () => {
      expect(getFileExtension('document.pdf')).toBe('.pdf')
      expect(getFileExtension('image.PNG')).toBe('.png')
      expect(getFileExtension('archive.tar.gz')).toBe('.gz')
    })

    it('should return empty string for files without extension', () => {
      expect(getFileExtension('README')).toBe('')
      expect(getFileExtension('.hidden')).toBe('')
    })
  })

  describe('isImageFile', () => {
    it('should identify image files by extension', () => {
      expect(isImageFile('photo.jpg')).toBe(true)
      expect(isImageFile('image.png')).toBe(true)
      expect(isImageFile('graphic.gif')).toBe(true)
      expect(isImageFile('document.pdf')).toBe(false)
    })
  })

  describe('isValidFileType', () => {
    it('should validate file type against allowed types', () => {
      const allowedTypes = ['.jpg', '.png', '.pdf']
      
      expect(isValidFileType('photo.jpg', allowedTypes)).toBe(true)
      expect(isValidFileType('doc.txt', allowedTypes)).toBe(false)
    })

    it('should allow all types when allowedTypes is empty', () => {
      expect(isValidFileType('any.file', [])).toBe(true)
    })
  })
})
