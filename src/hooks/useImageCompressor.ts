import { useCallback } from 'react'

interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  type?: 'image/jpeg' | 'image/webp' | 'image/png'
}

interface CompressedImage {
  blob: Blob
  dataUrl: string
  width: number
  height: number
  originalSize: number
  compressedSize: number
}

export function useImageCompressor() {
  const compressImage = useCallback(async (
    file: File,
    options: CompressOptions = {}
  ): Promise<CompressedImage> => {
    const {
      maxWidth = 1920,
      maxHeight = 1920,
      quality = 0.85,
      type = 'image/jpeg'
    } = options

    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      
      img.onload = () => {
        URL.revokeObjectURL(url)
        
        let { width, height } = img
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.floor(width * ratio)
          height = Math.floor(height * ratio)
        }
        
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas context not available'))
          return
        }
        
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Compression failed'))
              return
            }
            
            const reader = new FileReader()
            reader.onloadend = () => {
              resolve({
                blob,
                dataUrl: reader.result as string,
                width,
                height,
                originalSize: file.size,
                compressedSize: blob.size
              })
            }
            reader.readAsDataURL(blob)
          },
          type,
          quality
        )
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Image load failed'))
      }
      
      img.src = url
    })
  }, [])

  const getAspectRatio = useCallback((file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(img.width / img.height)
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Image load failed'))
      }
      
      img.src = url
    })
  }, [])

  return { compressImage, getAspectRatio }
}
