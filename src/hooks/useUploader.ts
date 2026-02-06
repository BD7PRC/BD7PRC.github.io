import { useState, useCallback, useRef } from 'react'
import { UploadProgress, QSLCard } from '../types'
import { useImageCompressor } from './useImageCompressor'

interface UseUploaderOptions {
  onCardCreated?: (card: QSLCard) => void
}

export function useUploader(options: UseUploaderOptions = {}) {
  const { onCardCreated } = options
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { compressImage, getAspectRatio } = useImageCompressor()

  const processFile = useCallback(async (file: File) => {
    const uploadId = Math.random().toString(36).substr(2, 9)
    
    setUploads(prev => [...prev, {
      file,
      progress: 0,
      status: 'pending'
    }])

    try {
      setUploads(prev => 
        prev.map(u => u.file === file ? { ...u, status: 'compressing', progress: 20 } : u)
      )

      const [compressed, aspectRatio] = await Promise.all([
        compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.9 }),
        getAspectRatio(file)
      ])

      setUploads(prev => 
        prev.map(u => u.file === file ? { ...u, status: 'uploading', progress: 60 } : u)
      )

      const callsign = file.name.replace(/\.(jpg|jpeg|png)$/i, '').replace(/_B$/i, '')
      const type: QSLCard['type'] = file.name.toLowerCase().includes('_6m') 
        ? '6m' 
        : file.name.toLowerCase().includes('_sat')
        ? 'SAT'
        : 'normal'

      const card: QSLCard = {
        id: uploadId,
        callsign: callsign.replace(/_6m$|_sat$/i, ''),
        frontImage: compressed.dataUrl,
        type,
        createdAt: Date.now(),
        width: compressed.width,
        height: compressed.height,
        aspectRatio
      }

      setUploads(prev => 
        prev.map(u => u.file === file ? { ...u, status: 'completed', progress: 100, result: card } : u)
      )

      onCardCreated?.(card)

      setTimeout(() => {
        setUploads(prev => prev.filter(u => u.file !== file))
      }, 3000)

    } catch (error) {
      setUploads(prev => 
        prev.map(u => u.file === file 
          ? { ...u, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' } 
          : u
        )
      )
    }
  }, [compressImage, getAspectRatio, onCardCreated])

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        processFile(file)
      }
    })
  }, [processFile])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return {
    uploads,
    isDragging,
    fileInputRef,
    handleFiles,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    openFileDialog
  }
}
