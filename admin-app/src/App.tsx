import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getApiKey, verifyApiKey, clearCredentials, addProfile, getProfiles } from './lib/api'
import { LocaleProvider, useLocale } from './lib/LocaleContext'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Posts from './pages/Posts'
import PostEditor from './pages/PostEditor'
import Projects from './pages/Projects'
import Services from './pages/Services'
import Contacts from './pages/Contacts'
import ContactEdit from './pages/ContactEdit'
import Settings from './pages/Settings'
import Login from './pages/Login'

function AppInner() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const { t } = useLocale()

  useEffect(() => {
    ;(async () => {
      try {
        const key = await getApiKey()
        if (!key) { setAuthenticated(false); return }
        const ok = await verifyApiKey(key)
        setAuthenticated(ok)
      } catch {
        setAuthenticated(false)
      }
    })()
  }, [])

  const handleLogout = () => {
    clearCredentials()
    setAuthenticated(false)
  }

  const handleLogin = () => {
    setAuthenticated(true)
  }

  if (authenticated === null) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>{t.verifying}</p>
      </div>
    )
  }

  if (!authenticated) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="app-layout">
      <Sidebar onLogout={handleLogout} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/posts" element={<Posts />} />
          <Route path="/posts/new" element={<PostEditor />} />
          <Route path="/posts/:slug" element={<PostEditor />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/services" element={<Services />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/contacts/:id/edit" element={<ContactEdit />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <LocaleProvider>
      <AppInner />
    </LocaleProvider>
  )
}
