import React, { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Calendar } from 'lucide-react'
import { MasonryLayout } from './MasonryLayout'
import { ImageModal } from './ImageModal'
import { FilterBar } from './FilterBar'
import { LanguageSwitcher } from './LanguageSwitcher'
import { DXCCStats } from './DXCCStats'
import { useGitHubGallery } from '../hooks/useGitHubGallery'
import { QSLCard, FilterType, ViewMode } from '../types'

export const DisplayView: React.FC = () => {
  const { t } = useTranslation()
  const {
    cards,
    loading,
    error,
    lastUpdate,
    currentProxy,
    proxyUrls,
    setCurrentProxy,
    refresh
  } = useGitHubGallery()

  const [filter, setFilter] = useState<FilterType>('all')
  const [letterFilter, setLetterFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('masonry')
  const [selectedCard, setSelectedCard] = useState<QSLCard | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showProxyMenu, setShowProxyMenu] = useState(false)
  const [columnCount, setColumnCount] = useState(2)

  useEffect(() => {
    const getColumnCount = (width: number, mode: ViewMode) => {
      if (width < 640) return mode === 'masonry' ? 2 : 2
      if (width < 1024) return mode === 'masonry' ? 3 : 4
      return mode === 'masonry' ? 4 : 6
    }

    const updateColumns = () => {
      setColumnCount(getColumnCount(window.innerWidth, viewMode))
    }

    updateColumns()
    window.addEventListener('resize', updateColumns)
    return () => window.removeEventListener('resize', updateColumns)
  }, [viewMode])

  const filteredCards = useMemo(() => {
    let result = [...cards]

    if (filter !== 'all') {
      result = result.filter(card => card.type === filter)
    }

    if (letterFilter !== 'all') {
      result = result.filter(card =>
        card.callsign.charAt(0).toUpperCase() === letterFilter
      )
    }

    if (searchQuery) {
      const query = searchQuery.toUpperCase()
      result = result.filter(card =>
        card.callsign.toUpperCase().includes(query)
      )
    }

    return result
  }, [cards, filter, letterFilter, searchQuery])

  const handleCardClick = (card: QSLCard) => {
    setSelectedCard(card)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => setSelectedCard(null), 300)
  }

  const currentCardIndex = selectedCard
    ? filteredCards.findIndex(c => c.id === selectedCard.id)
    : -1

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="bg-primary text-white py-4 sm:py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-balance">
                {t('title')}
              </h1>
              <p className="text-sm mt-2 opacity-90 text-pretty">
                {t('subtitle')}
              </p>
            </div>
            <div className="self-center sm:self-auto">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        <FilterBar
          filter={filter}
          letterFilter={letterFilter}
          searchQuery={searchQuery}
          viewMode={viewMode}
          onFilterChange={setFilter}
          onLetterFilterChange={setLetterFilter}
          onSearchChange={setSearchQuery}
          onViewModeChange={setViewMode}
          totalCount={cards.length}
          filteredCount={filteredCards.length}
        />

        <DXCCStats cards={cards} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {lastUpdate && (
              <div className="flex items-center gap-2 text-sm text-gray-500 tabular-nums">
                <Calendar className="w-4 h-4" />
                <span>{t('stats.lastUpdate')}: {lastUpdate.toLocaleString()}</span>
              </div>
            )}
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {t('refresh')}
            </button>
          </div>

          <div className="relative w-full sm:w-auto">
            <button
              onClick={() => setShowProxyMenu(!showProxyMenu)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-1.5 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg transition-colors"
            >
              {t('proxy')}: {currentProxy.replace('https://', '').replace('/', '')}
            </button>
            {showProxyMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 text-sm font-medium text-gray-700 border-b">
                  {t('selectProxy')}
                </div>
                {proxyUrls.map(proxy => (
                  <button
                    key={proxy}
                    onClick={() => {
                      setCurrentProxy(proxy)
                      setShowProxyMenu(false)
                      refresh()
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                      currentProxy === proxy ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                  >
                    {proxy.replace('https://', '').replace('/', '')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">{t('noResults')}</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={refresh}
              className="mt-2 text-sm underline hover:no-underline"
            >
              {t('refresh')}
            </button>
          </div>
        )}

        {loading && cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500">{t('loading')}</p>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-4">
              <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {cards.length === 0 ? t('noCards') : t('noResults')}
            </h3>
            <p className="text-gray-500">
              {cards.length === 0 ? '' : t('adjustFilter')}
            </p>
          </div>
        ) : (
          <MasonryLayout
            cards={filteredCards}
            onCardClick={handleCardClick}
            columnCount={columnCount}
          />
        )}
      </main>

      <footer className="bg-gray-900 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm opacity-80">
            {t('footer.copyright')}
            <a href="#admin" className="ml-2 text-gray-600 hover:text-gray-400 text-xs">{t('footer.admin')}</a>
          </p>
        </div>
      </footer>

      <ImageModal
        card={selectedCard}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onPrev={currentCardIndex > 0 ? () => setSelectedCard(filteredCards[currentCardIndex - 1]) : undefined}
        onNext={currentCardIndex < filteredCards.length - 1 ? () => setSelectedCard(filteredCards[currentCardIndex + 1]) : undefined}
        hasPrev={currentCardIndex > 0}
        hasNext={currentCardIndex < filteredCards.length - 1}
      />
    </div>
  )
}
