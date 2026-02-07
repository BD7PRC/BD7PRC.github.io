import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, ChevronLeft, ChevronRight, Layers } from 'lucide-react'
import { QSLCard } from '../types'
import { ProgressiveImage } from './ProgressiveImage'

interface CardGroup {
  key: string
  callsign: string
  type: QSLCard['type']
  cards: QSLCard[]
  primaryCard: QSLCard
  totalCount: number
}

interface MasonryLayoutProps {
  cards: QSLCard[]
  onCardClick: (card: QSLCard) => void
  columnCount?: number
  deleteMode?: boolean
}

export const MasonryLayout: React.FC<MasonryLayoutProps> = ({
  cards,
  onCardClick,
  columnCount = 4,
  deleteMode = false
}) => {
  const { t } = useTranslation()
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<Record<string, number>>({})

  const cardGroups = useMemo(() => {
    const groups = new Map<string, CardGroup>()
    
    cards.forEach(card => {
      const key = `${card.callsign}_${card.type}`
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          callsign: card.callsign,
          type: card.type,
          cards: [],
          primaryCard: card,
          totalCount: 0
        })
      }
      const group = groups.get(key)!
      group.cards.push(card)
      group.totalCount = group.cards.length
      group.cards.sort((a, b) => a.cardIndex - b.cardIndex)
      group.primaryCard = group.cards[0]
    })
    
    return Array.from(groups.values())
  }, [cards])

  const distributeGroups = () => {
    const columns: CardGroup[][] = Array.from({ length: columnCount }, () => [])
    const columnHeights = Array(columnCount).fill(0)

    cardGroups.forEach(group => {
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights))
      columns[shortestColumnIndex].push(group)
      const aspectRatio = group.primaryCard.aspectRatio || 1
      columnHeights[shortestColumnIndex] += 1 / aspectRatio
    })

    return columns
  }

  const columns = distributeGroups()

  const getTypeLabel = (type: QSLCard['type']) => {
    switch (type) {
      case '6m': return { text: t('filter.6m'), className: 'bg-green-100 text-green-800' }
      case 'SAT': return { text: t('filter.sat'), className: 'bg-purple-100 text-purple-800' }
      default: return { text: t('filter.normal'), className: 'bg-gray-100 text-gray-800' }
    }
  }

  const handleGroupClick = (group: CardGroup) => {
    if (group.totalCount > 1) {
      setExpandedGroup(expandedGroup === group.key ? null : group.key)
    } else {
      onCardClick(group.primaryCard)
    }
  }

  const handleCardSelect = (group: CardGroup, card: QSLCard, index: number) => {
    setSelectedIndex({ ...selectedIndex, [group.key]: index })
    onCardClick(card)
  }

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
    >
      {columns.map((column, colIndex) => (
        <div key={colIndex} className="flex flex-col gap-4">
          {column.map((group, index) => {
            const typeInfo = getTypeLabel(group.type)
            const isExpanded = expandedGroup === group.key
            const currentIndex = selectedIndex[group.key] || 0
            const displayCard = isExpanded ? group.cards[currentIndex] : group.primaryCard
            
            return (
              <div
                key={group.key}
                className={`group relative overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300 cursor-pointer animate-slide-up ${
                  deleteMode ? 'hover:shadow-red-500/50 hover:ring-2 hover:ring-red-500' : 'hover:shadow-xl'
                } ${group.totalCount > 1 ? 'ring-2 ring-blue-100' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {group.totalCount > 1 && !isExpanded && (
                  <div className="absolute -top-2 -right-2 z-20">
                    <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {group.totalCount}
                    </div>
                  </div>
                )}

                <div className="relative" onClick={() => handleGroupClick(group)}>
                  <ProgressiveImage
                    src={displayCard.frontImage}
                    alt={displayCard.callsign}
                    aspectRatio={displayCard.aspectRatio || 1}
                    className="w-full"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t via-transparent to-transparent transition-opacity duration-300 ${
                    deleteMode ? 'from-red-900/60 opacity-100' : 'from-black-60 opacity-0 group-hover:opacity-100'
                  }`} />
                  {deleteMode && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-red-600 text-white p-4 rounded-full shadow-lg">
                        <Trash2 className="w-8 h-8" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 min-h-[80px]">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold text-lg ${deleteMode ? 'text-red-600' : 'text-gray-900'}`}>
                      {group.callsign}
                      {group.totalCount > 1 && (
                        <span className="text-sm text-blue-600 ml-1">
                          ({(selectedIndex[group.key] || 0) + 1}/{group.totalCount})
                        </span>
                      )}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${typeInfo.className}`}>
                      {typeInfo.text}
                    </span>
                  </div>
                  
                  {group.totalCount > 1 && (
                    <div className="flex items-center gap-1 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const newIndex = Math.max(0, currentIndex - 1)
                          setSelectedIndex({ ...selectedIndex, [group.key]: newIndex })
                        }}
                        disabled={currentIndex === 0}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="flex-1 flex gap-1 justify-center">
                        {group.cards.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCardSelect(group, group.cards[idx], idx)
                            }}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              idx === currentIndex ? 'bg-blue-500' : 'bg-gray-300 hover:bg-gray-400'
                            }`}
                          />
                        ))}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const newIndex = Math.min(group.totalCount - 1, currentIndex + 1)
                          setSelectedIndex({ ...selectedIndex, [group.key]: newIndex })
                        }}
                        disabled={currentIndex === group.totalCount - 1}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
