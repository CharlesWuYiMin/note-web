import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('getAppConfig', () => {
  it('falls back to development values while applying production overrides', async () => {
    vi.stubEnv('VITE_APP_ENV', 'production')

    const { getAppConfig } = await import('@/utils/config')
    const config = getAppConfig()

    expect(config.app.env).toBe('production')
    expect(config.api.baseUrl).toBe('/v1/note')
    expect(config.observability.apm.serviceName).toBe('cloudnote-production')
    expect(config.observability.apm.enabled).toBe(true)
  })

  it('returns development observability config by default', async () => {
    const { getAppConfig } = await import('@/utils/config')
    const config = getAppConfig()

    expect(config.app.env).toBe('development')
    expect(config.observability.apm.enabled).toBe(false)
    expect(config.observability.logging.level).toBe('debug')
  })
})
