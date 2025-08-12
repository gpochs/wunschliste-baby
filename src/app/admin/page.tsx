'use client'

import { useState } from 'react'
import LoginForm from '@/components/LoginForm'
import AdminPanel from '@/components/AdminPanel'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
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
