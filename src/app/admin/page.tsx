'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminPanel from '@/components/AdminPanel'
import LoginForm from '@/components/LoginForm'
import { AdminSession } from '@/lib/types'

export default function AdminPage() {
  const [session, setSession] = useState<AdminSession>({
    isAuthenticated: false,
    password: ''
  })
  const router = useRouter()

  useEffect(() => {
    // Check if already authenticated
    const isAuth = sessionStorage.getItem('admin_authenticated')
    if (isAuth === 'true') {
      setSession({ isAuthenticated: true, password: '' })
    }
  }, [])

  const handleLogin = (password: string) => {
    if (password === 'baby25') {
      setSession({ isAuthenticated: true, password })
      sessionStorage.setItem('admin_authenticated', 'true')
    } else {
      alert('Falsches Passwort!')
    }
  }

  const handleLogout = () => {
    setSession({ isAuthenticated: false, password: '' })
    sessionStorage.removeItem('admin_authenticated')
    router.push('/admin')
  }

  if (!session.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">🔐 Admin-Bereich</h1>
            <p className="text-gray-600">Bitte geben Sie das Passwort ein</p>
          </div>
          <LoginForm onLogin={handleLogin} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50">
      <AdminPanel onLogout={handleLogout} />
    </div>
  )
}
