import React from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Grid3X3, LayoutGrid } from 'lucide-react'
import { FilterType, ViewMode } from '../types'

interface FilterBarProps {
  filter: FilterType
  letterFilter: string
  searchQuery: string
  viewMode: ViewMode
  onFilterChange: (filter: FilterType) => void
  onLetterFilterChange: (letter: string) => void
  onSearchChange: (query: string) => void
  onViewModeChange: (mode: ViewMode) => void
  totalCount: number
  filteredCount: number
}

const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))

export const FilterBar: React.FC<FilterBarProps> = ({
  filter,
  letterFilter,
  searchQuery,
  viewMode,
  onFilterChange,
  onLetterFilterChange,
  onSearchChange,
  onViewModeChange,
  totalCount,
  filteredCount
}) => {
  const { t } = useTranslation()

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-2 w-full">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('search.placeholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-pretty"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-sm text-gray-500">{t('filter.view')}:</span>
          <button
            onClick={() => onViewModeChange('masonry')}
            aria-label={t('filter.view') + ': Masonry'}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'masonry'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Masonry"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            aria-label={t('filter.view') + ': Grid'}
            className={`p-2 rounded-lg transition-all ${
              viewMode === 'grid'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Grid"
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500">{t('filter.type')}:</span>
        {[
          { key: 'all', label: t('filter.all') },
          { key: '6m', label: t('filter.6m') },
          { key: 'SAT', label: t('filter.sat') }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onFilterChange(key as FilterType)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
              filter === key
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <span className="text-sm text-gray-500">{t('filter.letter')}:</span>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          <button
            onClick={() => onLetterFilterChange('all')}
            className={`px-2 py-1 rounded text-sm transition-all shrink-0 ${
              letterFilter === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('filter.all')}
          </button>
          {LETTERS.map(letter => (
            <button
              key={letter}
              onClick={() => onLetterFilterChange(letter)}
              className={`w-8 h-8 rounded text-sm transition-all shrink-0 ${
                letterFilter === letter
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      <div className="text-sm text-gray-500 border-t pt-3 tabular-nums">
        {t('stats.showing')} {filteredCount} / {totalCount} {t('stats.total')}
      </div>
    </div>
  )
}
