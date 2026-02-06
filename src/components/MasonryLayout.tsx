import React from 'react'
import { useTranslation } from 'react-i18next'
import { QSLCard } from '../types'
import { ProgressiveImage } from './ProgressiveImage'

interface MasonryLayoutProps {
  cards: QSLCard[]
  onCardClick: (card: QSLCard) => void
  columnCount?: number
}

export const MasonryLayout: React.FC<MasonryLayoutProps> = ({
  cards,
  onCardClick,
  columnCount = 4
}) => {
  const { t } = useTranslation()

  const distributeCards = () => {
    const columns: QSLCard[][] = Array.from({ length: columnCount }, () => [])
    const columnHeights = Array(columnCount).fill(0)

    cards.forEach(card => {
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights))
      columns[shortestColumnIndex].push(card)
      const aspectRatio = card.aspectRatio || 1
      columnHeights[shortestColumnIndex] += 1 / aspectRatio
    })

    return columns
  }

  const columns = distributeCards()

  const getTypeLabel = (type: QSLCard['type']) => {
    switch (type) {
      case '6m': return { text: t('filter.6m'), className: 'bg-green-100 text-green-800' }
      case 'SAT': return { text: t('filter.sat'), className: 'bg-purple-100 text-purple-800' }
      default: return { text: t('filter.normal'), className: 'bg-gray-100 text-gray-800' }
    }
  }

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
    >
      {columns.map((column, colIndex) => (
        <div key={colIndex} className="flex flex-col gap-4">
          {column.map((card, index) => {
            const typeInfo = getTypeLabel(card.type)
            return (
              <div
                key={card.id}
                className="group relative overflow-hidden rounded-xl bg-white shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => onCardClick(card)}
              >
                <ProgressiveImage
                  src={card.frontImage}
                  alt={card.callsign}
                  aspectRatio={card.aspectRatio || 1}
                  className="w-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-lg">{card.callsign}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${typeInfo.className}`}>
                      {typeInfo.text}
                    </span>
                  </div>
                  {card.dxcc && (
                    <p className="text-sm text-gray-500 mt-1">{card.dxcc}</p>
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
