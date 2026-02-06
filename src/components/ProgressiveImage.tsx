import React, { useState, useEffect, useRef } from 'react'

interface ProgressiveImageProps {
  src: string
  alt: string
  className?: string
  aspectRatio?: number
  onClick?: () => void
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className = '',
  aspectRatio = 1,
  onClick
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isInView || !imgRef.current) return

    const img = imgRef.current
    
    if (img.complete) {
      setIsLoaded(true)
    } else {
      img.onload = () => setIsLoaded(true)
    }
  }, [isInView])

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-gray-200 ${className}`}
      style={{ aspectRatio }}
      onClick={onClick}
    >
      <div
        className={`absolute inset-0 bg-gray-300 animate-pulse transition-opacity duration-500 ${
          isLoaded ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {isInView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
          loading="lazy"
        />
      )}
    </div>
  )
}
