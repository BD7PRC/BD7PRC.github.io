import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, RotateCw, FlipHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { QSLCard } from '../types'

interface ImageModalProps {
  card: QSLCard | null
  isOpen: boolean
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

export const ImageModal: React.FC<ImageModalProps> = ({
  card,
  isOpen,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext
}) => {
  const { t } = useTranslation()
  const [rotation, setRotation] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [isFlipping, setIsFlipping] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setRotation(0)
      setShowBack(false)
    }
  }, [isOpen, card])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onPrev?.()
      if (e.key === 'ArrowRight' && hasNext) onNext?.()
      if (e.key === ' ') {
        e.preventDefault()
        handleFlip()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, onPrev, onNext, hasPrev, hasNext])

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const handleFlip = () => {
    if (isFlipping) return
    setIsFlipping(true)
    setTimeout(() => {
      setShowBack(prev => !prev)
      setIsFlipping(false)
    }, 400)
  }

  const getTypeLabel = (type: QSLCard['type']) => {
    switch (type) {
      case '6m': return t('filter.6m')
      case 'SAT': return t('filter.sat')
      default: return t('filter.normal')
    }
  }

  if (!isOpen || !card) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev?.() }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext?.() }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
        <div className="text-white">
          <h2 className="text-2xl font-bold">{card.callsign}</h2>
          <p className="text-sm opacity-80">
            {showBack ? t('modal.back') : t('modal.front')} · {getTypeLabel(card.type)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleFlip() }}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all"
            title={t('modal.flip')}
          >
            <FlipHorizontal className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleRotate() }}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all"
            title={t('modal.rotate')}
          >
            <RotateCw className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose() }}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all"
            title={t('modal.close')}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div 
        className="relative max-w-[90vw] max-h-[80vh] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="relative transition-all duration-500"
          style={{ 
            transform: `rotate(${rotation}deg) ${isFlipping ? 'scaleX(0)' : 'scaleX(1)'}`,
            transformStyle: 'preserve-3d'
          }}
        >
          <img
            src={showBack && card.backImage ? card.backImage : card.frontImage}
            alt={card.callsign}
            className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
          />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent text-white text-center">
        <p className="text-sm opacity-80">
          {t('modal.keyboard')}
        </p>
      </div>
    </div>
  )
}
