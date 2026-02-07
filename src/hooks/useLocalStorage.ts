import { useState, useCallback } from 'react'
import { QSLCard } from '../types'

const STORAGE_KEY = 'qsl-gallery-cards'

export function useLocalStorage() {
  const [cards, setCards] = useState<QSLCard[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const saveCards = useCallback((newCards: QSLCard[]) => {
    setCards(newCards)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newCards))
    }
  }, [])

  const addCard = useCallback((card: QSLCard) => {
    setCards(prev => {
      const newCards = [card, ...prev]
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newCards))
      }
      return newCards
    })
  }, [])

  const removeCard = useCallback((id: string) => {
    setCards(prev => {
      const newCards = prev.filter(c => c.id !== id)
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newCards))
      }
      return newCards
    })
  }, [])

  const exportData = useCallback(() => {
    const dataStr = JSON.stringify(cards, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `qsl-cards-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [cards])

  const importData = useCallback((file: File): Promise<QSLCard[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string)
          if (Array.isArray(imported)) {
            saveCards(imported)
            resolve(imported)
          } else {
            reject(new Error('Invalid data format'))
          }
        } catch {
          reject(new Error('Failed to parse JSON'))
        }
      }
      reader.onerror = () => reject(new Error('File read failed'))
      reader.readAsText(file)
    })
  }, [saveCards])

  const clearAll = useCallback(() => {
    setCards([])
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  return {
    cards,
    saveCards,
    addCard,
    removeCard,
    exportData,
    importData,
    clearAll
  }
}
