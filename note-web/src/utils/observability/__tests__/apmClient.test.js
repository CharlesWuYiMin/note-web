import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('apmClient', () => {
  const createRumAdapter = () => ({
    init: vi.fn(),
    setUid: vi.fn(),
    setTag: vi.fn(),
    log: vi.fn(),
    setContext: vi.fn(),
  })

  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    delete window.__rum
  })

  afterEach(() => {
    delete window.__rum
  })

  it('initializes Huawei RUM adapter with sdk config and identity hooks', async () => {
    const rum = createRumAdapter()
    Object.defineProperty(window, '__rum', {
      configurable: true,
      value: rum,
    })

    const { initializeApm, setUser, getApmSnapshot } = await import('@/utils/observability/apmClient')

    initializeApm({
      enabled: true,
      appId: 'apm-app-id',
      serviceName: 'cloudnote-production',
      scriptUrl: '',
      captureApi: true,
      captureJsError: true,
      captureResource: true,
      captureRoute: true,
      capturePerformance: true,
      captureCustomEvent: true,
      sampleRate: 0.75,
    })

    expect(rum.init).toHaveBeenCalledWith(expect.objectContaining({
      appId: 'apm-app-id',
      serviceName: 'cloudnote-production',
      apiRepo: true,
      JsErrorClear: true,
      pushState: true,
      sampleRate: 0.75,
      traceType: 'apm',
    }))
    expect(rum.setUid).toHaveBeenCalledWith('')
    expect(rum.setTag).toHaveBeenCalledWith('')

    setUser({
      userId: 'u-1001',
      nickName: 'Alice',
    })

    expect(rum.setUid).toHaveBeenCalledWith('u-1001')
    expect(rum.setTag).toHaveBeenCalledWith('Alice')
    expect(getApmSnapshot()).toEqual(expect.objectContaining({
      enabled: true,
      route: '',
    }))
  })

  it('reports custom events through rum.log when capture is enabled', async () => {
    const rum = createRumAdapter()
    Object.defineProperty(window, '__rum', {
      configurable: true,
      value: rum,
    })

    const { initializeApm, dispatch } = await import('@/utils/observability/apmClient')

    initializeApm({
      enabled: true,
      appId: 'apm-app-id',
      captureCustomEvent: true,
      scriptUrl: '',
    })

    const result = dispatch('event', {
      eventName: 'share_panel_open',
      type: 'custom_event',
      context: { noteId: 'note-1' },
    })

    expect(result).toBe(true)
    expect(rum.log).toHaveBeenCalledWith(
      'share_panel_open',
      expect.objectContaining({
        eventName: 'share_panel_open',
        type: 'custom_event',
        context: expect.objectContaining({ noteId: 'note-1' }),
      })
    )
  })

  it('skips custom events when captureCustomEvent is disabled', async () => {
    const rum = createRumAdapter()
    Object.defineProperty(window, '__rum', {
      configurable: true,
      value: rum,
    })

    const { initializeApm, dispatch } = await import('@/utils/observability/apmClient')

    initializeApm({
      enabled: true,
      appId: 'apm-app-id',
      captureCustomEvent: false,
      scriptUrl: '',
    })

    const result = dispatch('event', {
      eventName: 'share_panel_open',
      type: 'custom_event',
    })

    expect(result).toBe(false)
    expect(rum.log).not.toHaveBeenCalled()
  })
})
