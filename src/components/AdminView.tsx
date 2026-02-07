import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Toaster, toast } from 'sonner'
import { ArrowLeft, ArrowUp, ArrowDown, CheckCircle, XCircle, Loader2, Github, X, Plus, ImageIcon, ScanText, Sparkles, Trash2 } from 'lucide-react'
import { AppMode } from '../types'
import { useOCR } from '../hooks/useOCR'

interface QSLUploadItem {
  id: string
  callsign: string
  type: 'normal' | '6m' | 'SAT'
  frontImage: File | null
  backImage: File | null
  frontPreview: string | null
  backPreview: string | null
  status: 'pending' | 'uploading' | 'completed' | 'error'
  progress: number
  error?: string
  ocrDetectedSide?: 'front' | 'back' | 'unknown'
}

interface AdminViewProps {
  onModeChange: (mode: AppMode) => void
}

export const AdminView: React.FC<AdminViewProps> = ({ onModeChange }) => {
  const { t } = useTranslation()
  const [token, setToken] = useState(localStorage.getItem('github_token') || '')
  const [showTokenInput, setShowTokenInput] = useState(!localStorage.getItem('github_token'))
  const [siliconflowKey, setSiliconflowKey] = useState(localStorage.getItem('siliconflow_key') || '')
  const [showKeyInput, setShowKeyInput] = useState(!localStorage.getItem('siliconflow_key'))
  const [deleteMode, setDeleteMode] = useState(localStorage.getItem('delete_mode') === 'true')
  const [items, setItems] = useState<QSLUploadItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isOCRDragging, setIsOCRDragging] = useState(false)
  const frontInputRef = useRef<HTMLInputElement>(null)
  const backInputRef = useRef<HTMLInputElement>(null)
  const ocrInputRef = useRef<HTMLInputElement>(null)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [uploadType, setUploadType] = useState<'front' | 'back'>('front')
  const [dragOverItem, setDragOverItem] = useState<{ itemId: string; side: 'front' | 'back' } | null>(null)

  const { recognizeCard, isLoading: isOCRLoading } = useOCR({
    apiKey: siliconflowKey
  })

  const config = {
    owner: 'BD7PRC',
    repo: 'BD7PRC.github.io',
    path: 'qsl',
    branch: 'main'
  }

  const saveToken = () => {
    if (token) {
      localStorage.setItem('github_token', token)
      setShowTokenInput(false)
      toast.success('GitHub Token saved')
    }
  }

  const clearToken = () => {
    localStorage.removeItem('github_token')
    setToken('')
    setShowTokenInput(true)
    toast.success('GitHub Token cleared')
  }

  const saveSiliconflowKey = () => {
    if (siliconflowKey) {
      localStorage.setItem('siliconflow_key', siliconflowKey)
      setShowKeyInput(false)
      toast.success('SiliconFlow API Key saved')
    }
  }

  const clearSiliconflowKey = () => {
    localStorage.removeItem('siliconflow_key')
    setSiliconflowKey('')
    setShowKeyInput(true)
    toast.success('SiliconFlow API Key cleared')
  }

  const toggleDeleteMode = () => {
    const newMode = !deleteMode
    setDeleteMode(newMode)
    localStorage.setItem('delete_mode', String(newMode))
    toast.success(newMode ? '删除模式已开启' : '删除模式已关闭')
  }

  const generateFileName = (callsign: string, type: 'normal' | '6m' | 'SAT', isBack: boolean) => {
    const ext = '.jpg'
    let baseName = callsign.toUpperCase()
    if (type === '6m') baseName += '_6m'
    if (type === 'SAT') baseName += '_SAT'
    if (isBack) baseName += '_B'
    return baseName + ext
  }

  const createEmptyItem = (callsign: string, type: 'normal' | '6m' | 'SAT'): QSLUploadItem => ({
    id: Math.random().toString(36).substr(2, 9),
    callsign,
    type,
    frontImage: null,
    backImage: null,
    frontPreview: null,
    backPreview: null,
    status: 'pending',
    progress: 0
  })

  const upsertItemWithImage = (
    callsign: string,
    type: 'normal' | '6m' | 'SAT',
    side: 'front' | 'back' | 'unknown',
    image: File,
    preview: string,
    ocrDetectedSide?: 'front' | 'back' | 'unknown'
  ) => {
    setItems(prev => {
      const existingIndex = prev.findIndex(item =>
        item.callsign === callsign &&
        item.type === type &&
        item.status === 'pending'
      )

      if (existingIndex >= 0) {
        const existing = prev[existingIndex]
        const detected = ocrDetectedSide || side
        
        const updated = assignImageToSide(existing, side, image, preview, detected)
        const next = [...prev]
        next[existingIndex] = updated
        return next
      }

      const newItem = createEmptyItem(callsign, type)
      const detected = ocrDetectedSide || side
      const newItemWithImage = assignImageToSide(newItem, side, image, preview, detected)
      
      return [...prev, newItemWithImage]
    })
  }

  const assignImageToSide = (
    item: QSLUploadItem,
    side: 'front' | 'back' | 'unknown',
    image: File,
    preview: string,
    detectedSide: 'front' | 'back' | 'unknown'
  ): QSLUploadItem => {
    if (side === 'front') {
      return { ...item, frontImage: image, frontPreview: preview, ocrDetectedSide: detectedSide }
    }
    
    if (side === 'back') {
      return { ...item, backImage: image, backPreview: preview, ocrDetectedSide: detectedSide }
    }
    
    const frontIsEmpty = !item.frontImage
    const backIsEmpty = !item.backImage
    
    if (frontIsEmpty) {
      return { ...item, frontImage: image, frontPreview: preview, ocrDetectedSide: 'unknown' }
    }
    
    if (backIsEmpty) {
      return { ...item, backImage: image, backPreview: preview, ocrDetectedSide: 'unknown' }
    }

    return { ...item, frontImage: image, frontPreview: preview, ocrDetectedSide: 'unknown' }
  }

  const swapImages = (itemId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      return {
        ...item,
        frontImage: item.backImage,
        frontPreview: item.backPreview,
        backImage: item.frontImage,
        backPreview: item.frontPreview,
        ocrDetectedSide: 'front'
      }
    }))
    toast.success('已交换正反面')
  }

  const moveItem = (itemId: string, direction: 'up' | 'down') => {
    setItems(prev => {
      const index = prev.findIndex(item => item.id === itemId)
      if (index === -1) return prev

      const newItems = [...prev]
      const item = newItems[index]

      if (direction === 'up' && index > 0) {
        newItems[index] = newItems[index - 1]
        newItems[index - 1] = item
      } else if (direction === 'down' && index < newItems.length - 1) {
        newItems[index] = newItems[index + 1]
        newItems[index + 1] = item
      }

      return newItems
    })
  }

  const addItemWithImage = (image: File, preview: string) => {
    const newItem = createEmptyItem('', 'normal')
    const newItemWithImage = { ...newItem, frontImage: image, frontPreview: preview }
    setItems(prev => [...prev, newItemWithImage])
  }

  const getTypeLabel = (type: 'normal' | '6m' | 'SAT') => {
    switch (type) {
      case '6m': return t('filter.6m')
      case 'SAT': return t('filter.sat')
      default: return t('filter.normal')
    }
  }

  const handleOCRDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsOCRDragging(false)

    if (!siliconflowKey) {
      toast.error(t('admin.ocrConfig'))
      return
    }

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length === 0) return

    for (const file of files) {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const preview = event.target?.result as string
        const result = await recognizeCard(file)

        if (result.success && result.callsign) {
          upsertItemWithImage(result.callsign, result.type, result.side, file, preview, result.side)
          const sideText = result.side === 'front' ? t('admin.front') : result.side === 'back' ? t('admin.back') : '待确认'
          const typeText = getTypeLabel(result.type)
          toast.success(`${result.callsign} (${typeText}) - ${sideText}`)
        } else {
          toast.error(`${file.name}: ${t('noResults')}`)
          addItemWithImage(file, preview)
        }
      }
      reader.readAsDataURL(file)
    }
  }, [siliconflowKey, recognizeCard, t])

  const handleOCRFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'))
    if (files.length === 0) return

    if (!siliconflowKey) {
      toast.error(t('admin.ocrConfig'))
      e.target.value = ''
      return
    }

    for (const file of files) {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const preview = event.target?.result as string
        const result = await recognizeCard(file)

        if (result.success && result.callsign) {
          upsertItemWithImage(result.callsign, result.type, result.side, file, preview, result.side)
          const sideText = result.side === 'front' ? t('admin.front') : result.side === 'back' ? t('admin.back') : '待确认'
          const typeText = getTypeLabel(result.type)
          toast.success(`${result.callsign} (${typeText}) - ${sideText}`)
        } else {
          toast.error(`${file.name}: ${t('noResults')}`)
          addItemWithImage(file, preview)
        }
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const addNewItem = () => {
    const newItem: QSLUploadItem = {
      id: Math.random().toString(36).substr(2, 9),
      callsign: '',
      type: 'normal',
      frontImage: null,
      backImage: null,
      frontPreview: null,
      backPreview: null,
      status: 'pending',
      progress: 0
    }
    setItems(prev => [...prev, newItem])
  }

  const updateItem = (id: string, updates: Partial<QSLUploadItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const handleFileSelect = (itemId: string, type: 'front' | 'back', file: File | null) => {
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const preview = e.target?.result as string
      if (type === 'front') {
        updateItem(itemId, { frontImage: file, frontPreview: preview })
      } else {
        updateItem(itemId, { backImage: file, backPreview: preview })
      }
    }
    reader.readAsDataURL(file)
  }

  const handleItemDragEnter = (e: React.DragEvent, itemId: string, side: 'front' | 'back') => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverItem({ itemId, side })
  }

  const handleItemDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverItem(null)
  }

  const handleItemDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleItemDrop = (e: React.DragEvent, itemId: string, side: 'front' | 'back') => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverItem(null)

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length === 0) return

    const file = files[0]
    handleFileSelect(itemId, side, file)
  }

  const triggerFileInput = (itemId: string, type: 'front' | 'back') => {
    setActiveItemId(itemId)
    setUploadType(type)
    if (type === 'front') {
      frontInputRef.current?.click()
    } else {
      backInputRef.current?.click()
    }
  }

  const handleGlobalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeItemId) return

    handleFileSelect(activeItemId, uploadType, file)
    e.target.value = ''
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const uploadToGitHub = async (fileName: string, base64Content: string) => {
    const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}/${fileName}`

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Upload ${fileName}`,
        content: base64Content,
        branch: config.branch
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || `Upload failed: ${response.status}`)
    }

    return response.json()
  }

  const uploadItem = async (item: QSLUploadItem) => {
    if (!item.callsign || !item.frontImage) {
      updateItem(item.id, {
        status: 'error',
        error: 'Missing callsign or front image'
      })
      return
    }

    updateItem(item.id, { status: 'uploading', progress: 10 })

    try {
      const frontFileName = generateFileName(item.callsign, item.type, false)
      const frontBase64 = await fileToBase64(item.frontImage)
      await uploadToGitHub(frontFileName, frontBase64)

      updateItem(item.id, { progress: 50 })

      if (item.backImage) {
        const backFileName = generateFileName(item.callsign, item.type, true)
        const backBase64 = await fileToBase64(item.backImage)
        await uploadToGitHub(backFileName, backBase64)
      }

      updateItem(item.id, { status: 'completed', progress: 100 })
      toast.success(`${item.callsign} uploaded`)

      setTimeout(() => {
        setItems(prev => prev.filter(i => i.id !== item.id))
      }, 2000)

    } catch (error) {
      updateItem(item.id, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      })
      toast.error(`${item.callsign} upload failed`)
    }
  }

  const uploadAll = async () => {
    const pendingItems = items.filter(i => i.status === 'pending' && i.callsign && i.frontImage)
    if (pendingItems.length === 0) {
      toast.error(t('admin.noCardsAdded'))
      return
    }

    setIsUploading(true)
    for (const item of pendingItems) {
      await uploadItem(item)
    }
    setIsUploading(false)
  }

  const getStatusIcon = (status: QSLUploadItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'uploading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white py-4 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onModeChange('display')}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              {t('admin.backToDisplay')}
            </button>
            <h1 className="text-xl font-bold">{t('admin.title')}</h1>
            <div className="w-24"></div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Github className="w-6 h-6 text-gray-700" />
              <h2 className="text-lg font-semibold">{t('admin.githubConfig')}</h2>
            </div>

            {showTokenInput ? (
              <div className="space-y-3">
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={t('admin.tokenPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
                <button
                  onClick={saveToken}
                  disabled={!token}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {t('admin.save')}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">{t('admin.configured')}</span>
                </div>
                <button
                  onClick={clearToken}
                  className="text-sm text-gray-500 hover:text-red-500 transition-colors"
                >
                  {t('admin.clear')}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <h2 className="text-lg font-semibold">{t('admin.ocrConfig')}</h2>
            </div>

            {showKeyInput ? (
              <div className="space-y-3">
                <input
                  type="password"
                  value={siliconflowKey}
                  onChange={(e) => setSiliconflowKey(e.target.value)}
                  placeholder={t('admin.apiKeyPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
                <p className="text-sm text-gray-500">
                  <a href="https://cloud.siliconflow.cn/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {t('admin.getApiKey')}
                  </a>
                </p>
                <button
                  onClick={saveSiliconflowKey}
                  disabled={!siliconflowKey}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {t('admin.save')}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">{t('admin.configured')}</span>
                </div>
                <button
                  onClick={clearSiliconflowKey}
                  className="text-sm text-gray-500 hover:text-red-500 transition-colors"
                >
                  {t('admin.clear')}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-red-100">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
              <h2 className="text-lg font-semibold">删除模式</h2>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${deleteMode ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></span>
                <span className={`font-medium ${deleteMode ? 'text-red-600' : 'text-gray-600'}`}>
                  {deleteMode ? '已开启' : '已关闭'}
                </span>
              </div>
              <button
                onClick={toggleDeleteMode}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  deleteMode
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {deleteMode ? '关闭删除模式' : '开启删除模式'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              开启后，在首页点击卡片即可删除（需要 GitHub Token）
            </p>
          </div>
        </div>

        <div
          onDragEnter={(e) => { e.preventDefault(); setIsOCRDragging(true) }}
          onDragLeave={(e) => { e.preventDefault(); setIsOCRDragging(false) }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleOCRDrop}
          onClick={() => ocrInputRef.current?.click()}
          className={`relative border-3 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 mb-6 ${
            isOCRDragging
              ? 'border-purple-500 bg-purple-50 scale-[1.02]'
              : 'border-purple-300 bg-gradient-to-br from-purple-50 to-white hover:border-purple-400 hover:shadow-lg'
          }`}
        >
          <input
            ref={ocrInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleOCRFileSelect}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              isOCRDragging ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-600'
            }`}>
              <ScanText className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {isOCRDragging ? t('admin.ocrDragHint') : t('admin.ocrDragHint')}
              </h3>
              <p className="text-gray-600 mt-2">
                {t('admin.ocrDescription')}
              </p>
            </div>

            {isOCRLoading && (
              <div className="flex items-center gap-2 text-purple-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('loading')}</span>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
              <span>JPG, PNG</span>
              <span>•</span>
              <span>{t('admin.instructions.item1')}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <button
            onClick={addNewItem}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors shadow-md"
          >
            <Plus className="w-5 h-5" />
            {t('admin.addManually')}
          </button>
        </div>

        <input
          ref={frontInputRef}
          type="file"
          accept="image/*"
          onChange={handleGlobalFileChange}
          className="hidden"
        />
        <input
          ref={backInputRef}
          type="file"
          accept="image/*"
          onChange={handleGlobalFileChange}
          className="hidden"
        />

        {items.length > 0 && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('admin.addCard')} ({items.length})</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setItems([])}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 transition-colors"
                >
                  {t('admin.clearList')}
                </button>
                <button
                  onClick={uploadAll}
                  disabled={isUploading}
                  className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isUploading ? t('admin.uploading') : t('admin.uploadAll')}
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl shadow-sm p-6 border-2 ${
                    item.status === 'completed' ? 'border-green-200 bg-green-50' :
                    item.status === 'error' ? 'border-red-200 bg-red-50' :
                    item.status === 'uploading' ? 'border-blue-200 bg-blue-50' :
                    'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="pt-1">
                      {getStatusIcon(item.status)}
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.callsign')}</label>
                          <input
                            type="text"
                            value={item.callsign}
                            onChange={(e) => updateItem(item.id, { callsign: e.target.value.toUpperCase() })}
                            placeholder="BD7PRC"
                            disabled={item.status !== 'pending'}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 disabled:bg-gray-100 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.type')}</label>
                          <select
                            value={item.type}
                            onChange={(e) => updateItem(item.id, { type: e.target.value as 'normal' | '6m' | 'SAT' })}
                            disabled={item.status !== 'pending'}
                            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 disabled:bg-gray-100"
                          >
                            <option value="normal">{t('admin.normal')}</option>
                            <option value="6m">{t('filter.6m')}</option>
                            <option value="SAT">{t('filter.sat')}</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('admin.front')} <span className="text-red-500">*</span>
                          </label>
                          {item.frontPreview ? (
                            <div className="relative aspect-video rounded-lg overflow-hidden border">
                              <img
                                src={item.frontPreview}
                                alt={t('admin.front')}
                                className="w-full h-full object-cover"
                              />
                              {item.status === 'pending' && (
                                <button
                                  onClick={() => updateItem(item.id, { frontImage: null, frontPreview: null })}
                                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1">
                                {generateFileName(item.callsign || 'CALLSIGN', item.type, false)}
                              </div>
                            </div>
                          ) : (
                            <div
                              onDragEnter={(e) => handleItemDragEnter(e, item.id, 'front')}
                              onDragLeave={handleItemDragLeave}
                              onDragOver={handleItemDragOver}
                              onDrop={(e) => handleItemDrop(e, item.id, 'front')}
                              onClick={() => triggerFileInput(item.id, 'front')}
                              className={`w-full aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 ${
                                dragOverItem?.itemId === item.id && dragOverItem?.side === 'front'
                                  ? 'border-primary bg-primary/10 scale-[1.02]'
                                  : 'border-gray-300 hover:border-primary hover:bg-primary/5'
                              } ${item.status !== 'pending' ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                              <ImageIcon className={`w-8 h-8 ${dragOverItem?.itemId === item.id && dragOverItem?.side === 'front' ? 'text-primary' : 'text-gray-400'}`} />
                              <span className={`text-sm ${dragOverItem?.itemId === item.id && dragOverItem?.side === 'front' ? 'text-primary font-medium' : 'text-gray-500'}`}>
                                {dragOverItem?.itemId === item.id && dragOverItem?.side === 'front' ? '拖放到此处' : t('admin.uploadFront')}
                              </span>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('admin.back')} <span className="text-gray-400">({t('admin.optional')})</span>
                          </label>
                          {item.backPreview ? (
                            <div className="relative aspect-video rounded-lg overflow-hidden border">
                              <img
                                src={item.backPreview}
                                alt={t('admin.back')}
                                className="w-full h-full object-cover"
                              />
                              {item.status === 'pending' && (
                                <button
                                  onClick={() => updateItem(item.id, { backImage: null, backPreview: null })}
                                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1">
                                {generateFileName(item.callsign || 'CALLSIGN', item.type, true)}
                              </div>
                            </div>
                          ) : (
                            <div
                              onDragEnter={(e) => handleItemDragEnter(e, item.id, 'back')}
                              onDragLeave={handleItemDragLeave}
                              onDragOver={handleItemDragOver}
                              onDrop={(e) => handleItemDrop(e, item.id, 'back')}
                              onClick={() => triggerFileInput(item.id, 'back')}
                              className={`w-full aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 ${
                                dragOverItem?.itemId === item.id && dragOverItem?.side === 'back'
                                  ? 'border-primary bg-primary/10 scale-[1.02]'
                                  : 'border-gray-300 hover:border-primary hover:bg-primary/5'
                              } ${item.status !== 'pending' ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                              <ImageIcon className={`w-8 h-8 ${dragOverItem?.itemId === item.id && dragOverItem?.side === 'back' ? 'text-primary' : 'text-gray-400'}`} />
                              <span className={`text-sm ${dragOverItem?.itemId === item.id && dragOverItem?.side === 'back' ? 'text-primary font-medium' : 'text-gray-500'}`}>
                                {dragOverItem?.itemId === item.id && dragOverItem?.side === 'back' ? '拖放到此处' : t('admin.uploadBack')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {item.ocrDetectedSide === 'unknown' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-sm text-yellow-700 mb-2">OCR未能确定正反面，请手动调整</p>
                          <div className="flex gap-2">
                            {item.frontPreview && item.backPreview && (
                              <button
                                onClick={() => swapImages(item.id)}
                                disabled={item.status !== 'pending'}
                                className="px-3 py-1.5 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg transition-colors disabled:opacity-50"
                              >
                                交换正反面
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {item.error && (
                        <p className="text-sm text-red-600">{item.error}</p>
                      )}

                      {item.status === 'uploading' && (
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {item.status === 'pending' && (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveItem(item.id, 'up')}
                          className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                          aria-label="Move up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveItem(item.id, 'down')}
                          className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                          aria-label="Move down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          aria-label="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div className="text-center py-12 bg-gray-100 rounded-xl">
            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">{t('admin.noCardsAdded')}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => ocrInputRef.current?.click()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                {t('admin.ocrAuto')}
              </button>
              <button
                onClick={addNewItem}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {t('admin.addManually')}
              </button>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-6">
          <h3 className="font-semibold text-blue-900 mb-2">{t('admin.instructions.title')}</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• {t('admin.instructions.item1')}</li>
            <li>• {t('admin.instructions.item2')}</li>
            <li>• {t('admin.instructions.item3')}</li>
            <li>• {t('admin.instructions.item4')}</li>
            <li className="ml-4">- {t('admin.instructions.frontName')}</li>
            <li className="ml-4">- {t('admin.instructions.backName')}</li>
            <li>• {t('admin.instructions.item5')}</li>
          </ul>
        </div>
      </main>

      <Toaster position="top-center" richColors />
    </div>
  )
}
