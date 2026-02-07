import { useState, useCallback } from 'react'
import { toast } from 'sonner'

export interface OCRResult {
  callsign: string
  type: 'normal' | '6m' | 'SAT'
  side: 'front' | 'back' | 'unknown'
  success: boolean
  error?: string
}

interface UseOCROptions {
  apiKey: string
}

export function useOCR(options: UseOCROptions) {
  const { apiKey } = options
  const [isLoading, setIsLoading] = useState(false)

  const recognizeCard = useCallback(async (imageFile: File): Promise<OCRResult> => {
    if (!apiKey) {
      return { callsign: '', type: 'normal', side: 'unknown', success: false, error: '请先配置 API Key' }
    }

    setIsLoading(true)

    try {
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          const base64 = result.split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(imageFile)
      })

      const promptText = `Analyze this QSL card image and extract information.

QSL Card Structure:
- FRONT side: Usually contains photos, scenic views, emblems, badges, the callsign in large font, or decorative patterns. Visually rich with images.
- BACK side: Usually contains text, tables (QSO/contact records), form fields, RST reports, date/time fields, frequency/band information. More text-heavy with structured layout.

Task: Identify and return ONLY a JSON object:
{
  "callsign": "The amateur radio callsign (e.g., BA7MJC, BD7PRC, K1ABC)",
  "type": "Card type: '6m' if 6-meter band indicators found, 'SAT' if satellite communication indicators found, otherwise 'normal'",
  "side": "Card side: 'front' if image/photo/badge dominated, 'back' if table/QSO records/form fields/text-heavy, 'unknown' if cannot determine"
}

Key Indicators:
- 6m band: Look for "6m", "50MHz", "50 MHz", "Six Meters", "50.0"
- Satellite: Look for "SAT", "Satellite", "OSCAR", "ISS", "XW", "线性", "卫星"
- Front indicators: Large photos, landscapes, club badges, decorative designs, minimal text tables
- Back indicators: QSO tables, RST fields, Date/Time columns, Mode/Band listings, handwritten contact info

Rules:
1. Callsign format: [A-Z]{1,3}[0-9][A-Z]{1,4} (e.g., XX1XXX). Return the most prominent/largest one.
2. If multiple callsigns exist, return the station's own callsign (usually largest/most central).
3. Output callsign in UPPERCASE only.
4. If side is ambiguous or uncertain, return "unknown" instead of guessing.
5. Return ONLY the JSON object, no other text.`

      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'PaddlePaddle/PaddleOCR-VL-1.5',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: promptText
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 200,
          temperature: 0.1
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `API 错误: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content?.trim() || ''

      let parsed: { callsign?: string; type?: string; side?: string } = {}
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        }
      } catch {
        parsed = {}
      }

      const callsign = extractCallsign(parsed.callsign || content)
      const type = parseType(parsed.type || content)
      const side = parseSide(parsed.side || content)

      if (callsign) {
        return {
          callsign,
          type,
          side,
          success: true
        }
      } else {
        return {
          callsign: '',
          type: 'normal',
          side: 'unknown',
          success: false,
          error: '未识别到呼号'
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '识别失败'
      toast.error(`OCR 识别错误: ${errorMessage}`)
      return {
        callsign: '',
        type: 'normal',
        side: 'unknown',
        success: false,
        error: errorMessage
      }
    } finally {
      setIsLoading(false)
    }
  }, [apiKey])

  return {
    recognizeCard,
    isLoading
  }
}

function extractCallsign(text: string): string {
  const normalized = text.replace(/Ø/g, '0').replace(/\s+/g, ' ')
  const patterns = [
    /\b[A-Z]{1,3}[0-9][A-Z]{1,4}\b/i,
    /\b[A-Z]{1,3}[0-9][A-Z]{1,4}\/[A-Z0-9]{1,4}\b/i,
  ]

  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    if (match) {
      return match[0].toUpperCase().split('/')[0]
    }
  }

  return ''
}

function parseType(text: string): 'normal' | '6m' | 'SAT' {
  const upperText = text.toUpperCase()

  if (
    upperText.includes('6M') ||
    upperText.includes('6 M') ||
    upperText.includes('50MHZ') ||
    upperText.includes('50 MHZ') ||
    upperText.includes('SIX METER')
  ) {
    return '6m'
  }

  if (
    upperText.includes('SAT') ||
    upperText.includes('SATELLITE') ||
    upperText.includes('OSCAR') ||
    upperText.includes('ISS')
  ) {
    return 'SAT'
  }

  return 'normal'
}

function parseSide(text: string): 'front' | 'back' | 'unknown' {
  const lowerText = text.toLowerCase()
  
  if (lowerText.includes('unknown') || lowerText.includes('不确定')) {
    return 'unknown'
  }
  
  if (lowerText.includes('back') || lowerText.includes('背面')) {
    return 'back'
  }

  const backHints = ['qso', 'rst', 'date', 'time', 'utc', 'band', 'mhz', 'mode', 'report', 'signal', 'name', 'qth', 'table', 'contact', 'frequency']
  const frontHints = ['photo', 'image', 'picture', 'badge', 'emblem', 'logo', 'scenic', 'landscape']
  
  const hasBackIndicator = backHints.some(hint => lowerText.includes(hint))
  const hasFrontIndicator = frontHints.some(hint => lowerText.includes(hint))
  
  if (hasBackIndicator && !hasFrontIndicator) {
    return 'back'
  }
  
  if (hasFrontIndicator && !hasBackIndicator) {
    return 'front'
  }
    
  return 'unknown'
}
