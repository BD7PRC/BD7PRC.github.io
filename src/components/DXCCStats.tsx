import React from 'react'
import { Globe, Trophy, Hash } from 'lucide-react'
import { QSLCard } from '../types'
import { DXCCEntity, loadDXCCEntities } from '../data/dxccEntities'

interface DXCCStatsProps {
  cards: QSLCard[]
}

export const DXCCStats: React.FC<DXCCStatsProps> = ({ cards }) => {
  const [entities, setEntities] = React.useState<DXCCEntity[]>([])
  const [loadError, setLoadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let isActive = true

    loadDXCCEntities()
      .then(data => {
        if (isActive) {
          setEntities(data)
        }
      })
      .catch(error => {
        if (isActive) {
          setLoadError(error instanceof Error ? error.message : 'DXCC load failed')
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  const compiledEntities = React.useMemo(() => {
    return entities.map(entity => ({
      ...entity,
      regex: new RegExp(entity.prefixRegex)
    }))
  }, [entities])

  const stats = React.useMemo(() => {
    const dxccMap = new Map<string, { count: number; name: string; prefix: string }>()

    const findEntity = (callsign: string) => {
      const normalized = callsign.toUpperCase()
      for (const entity of compiledEntities) {
        if (entity.regex.test(normalized)) {
          return entity
        }
      }
      return null
    }

    cards.forEach(card => {
      const entity = findEntity(card.callsign)
      const key = entity ? String(entity.entityCode) : 'unknown'
      const prefix = entity?.prefix?.split(',')[0] || 'Unknown'
      const name = entity?.name || 'Unknown'

      if (dxccMap.has(key)) {
        dxccMap.get(key)!.count++
      } else {
        dxccMap.set(key, { count: 1, name, prefix })
      }
    })

    return Array.from(dxccMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
  }, [cards, compiledEntities])

  const totalDXCC = stats.length
  const totalCards = cards.length

  if (totalCards === 0) return null

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Globe className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 text-balance">DXCC 统计</h2>
          <p className="text-sm text-gray-500 text-pretty">DXCC Statistics</p>
        </div>
        <div className="flex items-center gap-4 sm:ml-auto">
          <div className="text-center">
            <div className="flex items-center gap-1 text-2xl font-bold text-blue-600">
              <Trophy className="w-5 h-5" />
              <span className="tabular-nums">{totalDXCC}</span>
            </div>
            <p className="text-xs text-gray-500">国家和地区</p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 text-2xl font-bold text-green-600">
              <Hash className="w-5 h-5" />
              <span className="tabular-nums">{totalCards}</span>
            </div>
            <p className="text-xs text-gray-500">总卡片数</p>
          </div>
        </div>
      </div>

      {loadError && (
        <p className="text-sm text-red-600 mb-4">DXCC 数据加载失败：{loadError}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {stats.slice(0, 12).map(([key, data]) => (
          <div 
            key={key}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-gray-700">{data.prefix}</span>
              <span className="text-xs text-gray-500 truncate max-w-[80px]">
                {data.name !== data.prefix ? data.name : ''}
              </span>
            </div>
            <span className="text-sm font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
              {data.count}
            </span>
          </div>
        ))}
      </div>

      {stats.length > 12 && (
        <p className="text-center text-sm text-gray-500 mt-4">
          + {stats.length - 12} 更多国家和地区
        </p>
      )}
    </div>
  )
}
