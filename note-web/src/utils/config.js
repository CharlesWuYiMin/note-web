import config from '../../config.json'

const env = import.meta.env.VITE_APP_ENV || 'development'
const envConfig = config[env]

export const getAppConfig = () => ({
  app: envConfig.app,
  api: envConfig.api,
  auth: envConfig.auth,
  editor: envConfig.editor,
})

export default getAppConfig