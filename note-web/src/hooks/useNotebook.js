import useNotebookStore from '@/store/useNotebookStore'

export function useNotebook() {
  const {
    notebooks,
    currentNotebook,
    isLoading,
    error,
    fetchNotebooks,
    setCurrentNotebook,
    createNotebook,
    updateNotebook,
    deleteNotebook,
    clearError,
  } = useNotebookStore()

  const getDefaultNotebook = () => {
    return notebooks.find((nb) => nb.isDefault) || notebooks[0] || null
  }

  return {
    notebooks,
    currentNotebook,
    isLoading,
    error,
    getDefaultNotebook,
    fetchNotebooks,
    setCurrentNotebook,
    createNotebook,
    updateNotebook,
    deleteNotebook,
    clearError,
  }
}

export default useNotebook