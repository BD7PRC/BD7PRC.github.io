import { useState, useEffect } from 'react'
import { DisplayView } from './components/DisplayView'
import { AdminView } from './components/AdminView'
import { AppMode } from './types'

function App() {
  const [mode, setMode] = useState<AppMode>('display')

  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash
      if (hash === '#admin') {
        setMode('admin')
      } else {
        setMode('display')
      }
    }

    checkHash()

    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  useEffect(() => {
    if (mode === 'admin') {
      window.location.hash = 'admin'
    } else {
      window.location.hash = ''
    }
  }, [mode])

  return mode === 'display'
    ? <DisplayView />
    : <AdminView onModeChange={setMode} />
}

export default App
