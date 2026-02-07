import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, ChevronLeft, ChevronRight, Images } from 'lucide-react'
import { QSLCard } from '../types'
import { ProgressiveImage } from './ProgressiveImage'

interface CardGroup {
  key: string
  callsign: string
  type: QSLCard['type']
  cards: QSLCard[]
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
  const [currentIndices, setCurrentIndices] = useState<Record<string, number>>({})

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
          totalCount: 0
        })
      }
      const group = groups.get(key)!
      group.cards.push(card)
    })
    
    groups.forEach(group => {
      group.cards.sort((a, b) => a.cardIndex - b.cardIndex)
      group.totalCount = group.cards.length
    })
    
    return Array.from(groups.values())
  }, [cards])

  const columns = useMemo(() => {
    const cols: CardGroup[][] = Array.from({ length: columnCount }, () => [])
    const columnHeights = Array(columnCount).fill(0)

    cardGroups.forEach(group => {
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights))
      cols[shortestColumnIndex].push(group)
      const firstCard = group.cards[0]
      const aspectRatio = firstCard?.aspectRatio || 1
      columnHeights[shortestColumnIndex] += 1 / aspectRatio
    })

    return cols
  }, [cardGroups, columnCount])

  const getTypeLabel = (type: QSLCard['type']) => {
    switch (type) {
      case '6m': return { text: t('filter.6m'), className: 'bg-green-100 text-green-800' }
      case 'SAT': return { text: t('filter.sat'), className: 'bg-purple-100 text-purple-800' }
      default: return { text: t('filter.normal'), className: 'bg-gray-100 text-gray-800' }
    }
  }

  const handlePrevCard = (e: React.MouseEvent, group: CardGroup) => {
    e.stopPropagation()
    const currentIdx = currentIndices[group.key] || 0
    if (currentIdx > 0) {
      setCurrentIndices(prev => ({ ...prev, [group.key]: currentIdx - 1 }))
    }
  }

  const handleNextCard = (e: React.MouseEvent, group: CardGroup) => {
    e.stopPropagation()
    const currentIdx = currentIndices[group.key] || 0
    if (currentIdx < group.totalCount - 1) {
      setCurrentIndices(prev => ({ ...prev, [group.key]: currentIdx + 1 }))
    }
  }

  const handleCardClick = (group: CardGroup) => {
    const currentIdx = currentIndices[group.key] || 0
    const card = group.cards[currentIdx]
    if (card) {
      onCardClick(card)
    }
  }

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
    >
      {columns.map((column, colIndex) => (
        <div key={colIndex} className="flex flex-col gap-4">
          {column.map((group) => {
            const typeInfo = getTypeLabel(group.type)
            const currentIdx = currentIndices[group.key] || 0
            const displayCard = group.cards[currentIdx]
            const hasMultipleCards = group.totalCount > 1
            
            if (!displayCard) return null
            
            const cardDisplayName = displayCard.displayCallsign || displayCard.callsign || 'Unknown'
            
            return (
              <div
                key={group.key}
                className={`group relative transition-all duration-300 ${
                  deleteMode ? 'cursor-pointer' : ''
                }`}
              >
                {/* Stacked cards background effect */}
                {hasMultipleCards && (
                  <>
                    <div className="absolute -top-2 left-2 right-2 h-full bg-blue-100 rounded-xl -z-10" />
                    <div className="absolute -top-1 left-1 right-1 h-full bg-blue-50 rounded-xl -z-10" />
                  </>
                )}
                
                <div 
                  className={`relative overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300 ${
                    deleteMode 
                      ? 'hover:shadow-red-500/50 hover:ring-2 hover:ring-red-500' 
                      : 'hover:shadow-xl hover:-translate-y-1'
                  } ${hasMultipleCards ? 'ring-2 ring-blue-300' : ''}`}
                  onClick={() => handleCardClick(group)}
                >
                  {hasMultipleCards && (
                    <div className="absolute top-2 right-2 z-20">
                      <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                        <Images className="w-3 h-3" />
                        <span>{currentIdx + 1}/{group.totalCount}</span>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <ProgressiveImage
                      src={displayCard.frontImage}
                      alt={cardDisplayName}
                      aspectRatio={displayCard.aspectRatio || 1}
                      className="w-full"
                    />
                    
                    {!deleteMode && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black-70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    )}
                    
                    {deleteMode && (
                      <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center">
                        <div className="bg-red-600 text-white p-4 rounded-full shadow-lg">
                          <Trash2 className="w-8 h-8" />
                        </div>
                      </div>
                    )}

                    {hasMultipleCards && !deleteMode && (
                      <>
                        <button
                          onClick={(e) => handlePrevCard(e, group)}
                          disabled={currentIdx === 0}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all disabled:opacity-0 opacity-0 group-hover:opacity-100 z-20"
                        >
                          <ChevronLeft className="w-5 h-5 text-gray-700" />
                        </button>
                        <button
                          onClick={(e) => handleNextCard(e, group)}
                          disabled={currentIdx === group.totalCount - 1}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all disabled:opacity-0 opacity-0 group-hover:opacity-100 z-20"
                        >
                          <ChevronRight className="w-5 h-5 text-gray-700" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`font-semibold text-lg ${deleteMode ? 'text-red-600' : 'text-gray-900'}`}>
                        {cardDisplayName}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${typeInfo.className}`}>
                        {typeInfo.text}
                      </span>
                    </div>
                    
                    {hasMultipleCards && (
                      <div className="flex items-center justify-center gap-2 mt-2">
                        {group.cards.map((card, idx) => (
                          <button
                            key={card.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              setCurrentIndices(prev => ({ ...prev, [group.key]: idx }))
                            }}
                            className={`h-2 rounded-full transition-all duration-200 ${
                              idx === currentIdx 
                                ? 'w-6 bg-blue-500' 
                                : 'w-2 bg-gray-300 hover:bg-gray-400'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
