'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LoginForm from '@/components/LoginForm'
import AdminPanel from '@/components/AdminPanel'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    router.push('/')
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />
  }

  return <AdminPanel onLogout={handleLogout} />
}
