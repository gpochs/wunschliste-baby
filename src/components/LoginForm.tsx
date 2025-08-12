'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock } from 'lucide-react'

interface LoginFormProps {
  onLogin: (password: string) => void
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return
    
    setLoading(true)
    // Simulate a small delay for better UX
    setTimeout(() => {
      onLogin(password)
      setLoading(false)
    }, 500)
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
          <Lock className="h-6 w-6 text-pink-600" />
        </div>
        <CardTitle className="text-xl">Zugang zum Admin-Bereich</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort eingeben"
              required
              autoFocus
            />
          </div>
          
          <Button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full bg-pink-500 hover:bg-pink-600"
          >
            {loading ? 'Wird geprüft...' : 'Anmelden'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
