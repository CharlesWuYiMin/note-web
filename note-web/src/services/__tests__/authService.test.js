import { beforeEach, describe, expect, it, vi } from 'vitest'

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}))

vi.mock('@/utils/request', () => ({
  default: {
    post: postMock,
  },
}))

import authService from '@/services/authService'

describe('authService editor jwt requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authService.editorJwtRequestCache.clear()
  })

  it('deduplicates in-flight requests for the same document', async () => {
    let resolveRequest
    const pendingRequest = new Promise((resolve) => {
      resolveRequest = resolve
    })
    postMock.mockReturnValueOnce(pendingRequest)

    const firstRequest = authService.requestEditorAccessToken({ documentId: 'doc-1' })
    const secondRequest = authService.requestEditorAccessToken({ documentId: 'doc-1' })

    expect(postMock).toHaveBeenCalledTimes(1)

    resolveRequest({ data: { token: 'jwt-token-1' } })

    await expect(firstRequest).resolves.toBe('jwt-token-1')
    await expect(secondRequest).resolves.toBe('jwt-token-1')
  })

  it('issues a new request after the previous one settles', async () => {
    postMock.mockResolvedValueOnce({ data: { token: 'jwt-token-a' } })

    await expect(authService.requestEditorAccessToken({ documentId: 'doc-2' })).resolves.toBe('jwt-token-a')

    postMock.mockResolvedValueOnce({ data: { token: 'jwt-token-b' } })

    await expect(authService.requestEditorAccessToken({ documentId: 'doc-2' })).resolves.toBe('jwt-token-b')
    expect(postMock).toHaveBeenCalledTimes(2)
  })
})
