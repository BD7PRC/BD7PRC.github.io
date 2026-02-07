export interface DXCCEntity {
  entityCode: number
  name: string
  continent: string
  prefix: string
  prefixRegex: string
}

interface DXCCSourceEntity {
  entityCode: number
  name: string
  continent: string[]
  prefix: string
  prefixRegex: string
  deleted: boolean
}

interface DXCCSourcePayload {
  dxcc: DXCCSourceEntity[]
}

const DXCC_SOURCE_URL = 'https://raw.githubusercontent.com/k0swe/dxcc-json/main/dxcc.json'
const DXCC_SOURCE_URLS = ['/dxcc.json', DXCC_SOURCE_URL]
const DXCC_CACHE_KEY = 'dxcc-source-cache-v2'
const DXCC_CACHE_VERSION = 2

let inMemoryCache: DXCCEntity[] | null = null

const normalizeEntities = (payload: DXCCSourcePayload): DXCCEntity[] => {
  return (payload.dxcc || [])
    .filter(entity => !entity.deleted && entity.prefixRegex)
    .map(entity => ({
      entityCode: entity.entityCode,
      name: entity.name,
      continent: entity.continent?.[0] || 'Unknown',
      prefix: entity.prefix,
      prefixRegex: entity.prefixRegex
    }))
}

const readCachedEntities = (): DXCCEntity[] | null => {
  if (typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(DXCC_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { version: number; data: DXCCEntity[] }
    if (parsed.version !== DXCC_CACHE_VERSION || !Array.isArray(parsed.data)) {
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

const writeCachedEntities = (data: DXCCEntity[]) => {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(
      DXCC_CACHE_KEY,
      JSON.stringify({ version: DXCC_CACHE_VERSION, data })
    )
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

export const loadDXCCEntities = async (): Promise<DXCCEntity[]> => {
  if (inMemoryCache && inMemoryCache.length > 0) {
    return inMemoryCache
  }

  const cached = readCachedEntities()
  if (cached && cached.length > 0) {
    inMemoryCache = cached
    return cached
  }

  let payload: DXCCSourcePayload | null = null
  let lastError: unknown

  for (const url of DXCC_SOURCE_URLS) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        lastError = new Error(`DXCC source load failed: ${response.status}`)
        continue
      }

      payload = (await response.json()) as DXCCSourcePayload
      break
    } catch (error) {
      lastError = error
    }
  }

  if (!payload) {
    throw lastError instanceof Error ? lastError : new Error('DXCC source load failed')
  }

  const data = normalizeEntities(payload)
  
  if (data.length === 0) {
    throw new Error('DXCC data is empty after normalization')
  }
  
  inMemoryCache = data
  writeCachedEntities(data)
  return data
}

export const matchDXCCEntity = (callsign: string, entities: DXCCEntity[]): DXCCEntity | null => {
  if (!callsign) return null
  const normalized = callsign.toUpperCase()

  for (const entity of entities) {
    const regex = new RegExp(entity.prefixRegex)
    if (regex.test(normalized)) {
      return entity
    }
  }

  return null
}
