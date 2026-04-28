import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function resolveManualChunk(id) {
  if (!id.includes('node_modules')) {
    return undefined
  }

  if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
    return 'vendor-react'
  }

  if (
    id.includes('/antd/')
    || id.includes('/@ant-design/')
    || id.includes('/rc-')
    || id.includes('/@rc-component/')
  ) {
    return 'vendor-antd'
  }

  if (id.includes('/@cloud/')) {
    return 'vendor-cloud-editors'
  }

  if (id.includes('/slate/') || id.includes('/slate-react/') || id.includes('/slate-history/')) {
    return 'vendor-slate'
  }

  if (
    id.includes('/echarts/')
    || id.includes('/zrender/')
    || id.includes('/fabric/')
    || id.includes('/howler/')
  ) {
    return 'vendor-media'
  }

  return 'vendor'
}

function normalizeBasePath(value, fallback = '/') {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) {
    return fallback
  }

  if (raw === '/') {
    return '/'
  }

  const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const enableSourceMap = env.VITE_ENABLE_SOURCEMAP === 'true'

  return {
    plugins: [react()],
    base: normalizeBasePath(env.VITE_APP_BASE_PATH || '/cloudnote/'),
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/v1': {
          target: 'http://127.0.0.1:5001',
          changeOrigin: true,
          ws: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        uuid: path.resolve(__dirname, './src/shims/uuid.js'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: enableSourceMap,
      rollupOptions: {
        output: {
          manualChunks: resolveManualChunk,
        },
      },
    },
  }
})
