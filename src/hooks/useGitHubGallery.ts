import { useState, useEffect, useCallback } from 'react'
import { GitHubFile, QSLCard, GitHubConfig } from '../types'

const DEFAULT_CONFIG: GitHubConfig = {
  owner: 'BD7PRC',
  repo: 'BD7PRC.github.io',
  path: 'qsl',
  branch: 'main'
}

const getImageDimensions = (url: string): Promise<{ width: number; height: number; aspectRatio: number }> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height
      })
    }
    img.onerror = () => {
      resolve({ width: 0, height: 0, aspectRatio: 1 })
    }
    img.src = url
  })
}

export function useGitHubGallery(config: GitHubConfig = DEFAULT_CONFIG) {
  const [cards, setCards] = useState<QSLCard[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const proxyUrls = [
    'https://v6.gh-proxy.org/',
    'https://gh-proxy.org/',
    'https://hk.gh-proxy.org/',
    'https://cdn.gh-proxy.org/',
    'https://edgeone.gh-proxy.org/'
  ]
  const [currentProxy, setCurrentProxy] = useState(proxyUrls[0])

  const buildProxyUrl = useCallback((url: string) => {
    if (!url.includes('raw.githubusercontent.com')) return url
    const cleanUrl = url.replace(/https:\/\/[^\/]*gh-proxy\.org\//, '')
    return currentProxy + cleanUrl
  }, [currentProxy])

  const parseFileName = useCallback((fileName: string) => {
    const baseName = fileName.replace(/\.(jpg|jpeg|png)$/i, '')
    const isBack = baseName.toLowerCase().endsWith('_b')
    let callsign = isBack ? baseName.slice(0, -2) : baseName

    let type: QSLCard['type'] = 'normal'
    if (callsign.toLowerCase().endsWith('_6m')) {
      type = '6m'
      callsign = callsign.slice(0, -3)
    } else if (callsign.toLowerCase().endsWith('_sat')) {
      type = 'SAT'
      callsign = callsign.slice(0, -4)
    }

    return { callsign, type, isBack }
  }, [])

  const loadCards = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const cacheKey = `github_qsl_${config.owner}_${config.repo}`
      const cacheTimeKey = `${cacheKey}_time`
      const cached = localStorage.getItem(cacheKey)
      const cachedTime = localStorage.getItem(cacheTimeKey)

      if (cached && cachedTime) {
        const age = Date.now() - parseInt(cachedTime)
        if (age < 10 * 60 * 1000) {
          setCards(JSON.parse(cached))
          setLastUpdate(new Date(parseInt(cachedTime)))
          setLoading(false)
          return
        }
      }

      const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}`
      const response = await fetch(apiUrl)

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const files: GitHubFile[] = await response.json()

      const imageFiles = files.filter(f =>
        f.type === 'file' &&
        /\.(jpg|jpeg|png)$/i.test(f.name)
      )

      const frontFiles = imageFiles.filter(f =>
        !f.name.toLowerCase().includes('_b.')
      )

      const cardPromises = frontFiles.map(async (file) => {
        const { callsign, type } = parseFileName(file.name)
        const baseName = file.name.replace(/\.(jpg|jpeg|png)$/i, '')

        const backFile = imageFiles.find(f =>
          f.name.toLowerCase() === `${baseName}_b${file.name.match(/\.(jpg|jpeg|png)$/i)?.[0] || '.jpg'}`.toLowerCase()
        )

        const imageUrl = buildProxyUrl(file.download_url)
        const dimensions = await getImageDimensions(imageUrl)

        const card: QSLCard = {
          id: file.sha,
          callsign,
          frontImage: imageUrl,
          backImage: backFile ? buildProxyUrl(backFile.download_url) : undefined,
          type,
          createdAt: new Date().getTime(),
          width: dimensions.width,
          height: dimensions.height,
          aspectRatio: dimensions.aspectRatio
        }

        return card
      })

      const loadedCards = await Promise.all(cardPromises)
      const sortedCards = loadedCards.sort((a, b) => a.callsign.localeCompare(b.callsign))

      setCards(sortedCards)
      setLastUpdate(new Date())

      localStorage.setItem(cacheKey, JSON.stringify(sortedCards))
      localStorage.setItem(cacheTimeKey, Date.now().toString())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [config, buildProxyUrl, parseFileName])

  useEffect(() => {
    loadCards()
    const interval = setInterval(loadCards, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadCards])

  return {
    cards,
    loading,
    error,
    lastUpdate,
    currentProxy,
    proxyUrls,
    setCurrentProxy,
    refresh: loadCards
  }
}
