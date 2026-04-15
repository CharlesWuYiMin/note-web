import { useTranslation } from 'react-i18next'

export function useLanguage() {
  const { t, i18n } = useTranslation()

  const changeLanguage = (language) => {
    i18n.changeLanguage(language)
    localStorage.setItem('language', language)
  }

  const getCurrentLanguage = () => {
    return i18n.language || 'zh-CN'
  }

  const isChinese = () => {
    return getCurrentLanguage() === 'zh-CN'
  }

  const isEnglish = () => {
    return getCurrentLanguage() === 'en-US'
  }

  return {
    t,
    currentLanguage: getCurrentLanguage(),
    isChinese: isChinese(),
    isEnglish: isEnglish(),
    changeLanguage,
  }
}

export default useLanguage