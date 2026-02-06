import { useState, useCallback } from 'react'
import { toast } from 'sonner'

export interface OCRResult {
  callsign: string
  type: 'normal' | '6m' | 'SAT'
  side: 'front' | 'back'
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
      return { callsign: '', type: 'normal', side: 'front', success: false, error: '请先配置 API Key' }
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

      const promptText = `分析这张QSL卡片图片，提取以下信息并以JSON格式返回：
{
  "callsign": "识别的业余无线电呼号（如BA7MJC、BD7PRC）",
  "type": "卡片类型：如果是6米波段卡片返回'6m'，如果是卫星通信卡片返回'SAT'，否则返回'normal'",
  "side": "卡片正反面：如果图片包含表格、通信记录、大量文字内容返回'back'（背面），如果是图片、徽章、图案为主返回'front'（正面）"
}

判断正反面依据：
- 正面(front)：通常是图片、风景照、徽章、呼号大字体展示，没有表格
- 背面(back)：通常是文字面，有表格（如通信记录表格）、填写区域、大量文字信息

注意：
1. 呼号通常是字母+数字+字母的组合，如XX1XXX格式；如果出现多个呼号，返回最显著/最大的那个
2. 6米波段卡片通常有"6m"、"50MHz"、"Six Meters"等字样
3. 卫星通信卡片通常有"SAT"、"Satellite"、"卫星"、"OSCAR"等字样
4. callsign 输出请统一大写，不要包含多余文字
5. 只返回JSON，不要其他解释`

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
          side: 'front',
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
        side: 'front',
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

function parseSide(text: string): 'front' | 'back' {
  const lowerText = text.toLowerCase()
  const backHints = ['qso', 'rst', 'date', 'time', 'utc', 'band', 'mhz', 'mode', 'report', 'signal', 'name', 'qth']

  if (lowerText.includes('back') || lowerText.includes('背面')) {
    return 'back'
  }

  if (backHints.some(hint => lowerText.includes(hint))) {
    return 'back'
  }
   
  return 'front'
}
