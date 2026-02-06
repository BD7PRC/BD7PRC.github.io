import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Check } from 'lucide-react'
import { languages } from '../i18n'

export const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0]

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('language', code)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors shadow-sm"
        title={t('language')}
      >
        <Globe className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">{currentLang.name}</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50">
            <div className="px-4 py-2 text-sm font-semibold text-gray-800 border-b border-gray-200">
              Language / 语言
            </div>
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between ${
                  i18n.language === lang.code 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{lang.name}</span>
                {i18n.language === lang.code && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
