import React from 'react'
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { UploadProgress } from '../types'

interface ImageUploaderProps {
  isDragging: boolean
  uploads: UploadProgress[]
  fileInputRef: React.RefObject<HTMLInputElement>
  onDragEnter: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onOpenFileDialog: () => void
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  isDragging,
  uploads,
  fileInputRef,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileSelect,
  onOpenFileDialog
}) => {
  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'compressing':
      case 'uploading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
    }
  }

  const getStatusText = (status: UploadProgress['status']) => {
    switch (status) {
      case 'pending':
        return '等待处理'
      case 'compressing':
        return '压缩中...'
      case 'uploading':
        return '上传中...'
      case 'completed':
        return '完成'
      case 'error':
        return '失败'
    }
  }

  return (
    <div className="w-full">
      <div
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={onOpenFileDialog}
        className={`
          relative border-3 border-dashed rounded-2xl p-8 text-center cursor-pointer
          transition-all duration-300 ease-in-out
          ${isDragging 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : 'border-gray-300 bg-white hover:border-primary/50 hover:bg-gray-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onFileSelect}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center
            transition-all duration-300
            ${isDragging ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}
          `}>
            <Upload className="w-8 h-8" />
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragging ? '释放以上传图片' : '拖放图片到这里'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              或点击选择文件，支持批量上传
            </p>
          </div>
          
          <p className="text-xs text-gray-400">
            支持 JPG、PNG 格式，自动压缩优化
          </p>
        </div>
      </div>

      {uploads.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploads.map((upload, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg animate-fade-in"
            >
              {getStatusIcon(upload.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {upload.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {getStatusText(upload.status)}
                  {upload.error && ` - ${upload.error}`}
                </p>
              </div>
              {upload.status !== 'completed' && upload.status !== 'error' && (
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
