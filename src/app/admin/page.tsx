'use client'

import { useState } from 'react'
import LoginForm from '@/components/LoginForm'
import AdminPanel from '@/components/AdminPanel'
import { useRouter } from 'next/navigation'

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

  return (
    <>
      {isAuthenticated ? (
        <AdminPanel onLogout={handleLogout} />
      ) : (
        <LoginForm onLogin={handleLogin} />
      )}
    </>
  )
}
