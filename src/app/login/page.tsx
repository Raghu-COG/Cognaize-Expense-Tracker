"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { testSupabaseConnection } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [connError, setConnError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { login, user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') router.push('/admin')
      else if (user.role === 'accountant') router.push('/accountant/expenses')
      else router.push('/expenses')
    }
  }, [user, loading, router])

  useEffect(() => {
    testSupabaseConnection().then(err => {
      if (err) setConnError(err)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const result = await login(email)
    if (!result.success) {
      setError(result.error || 'Login failed')
    }
    setIsLoading(false)
  }

  if (loading) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/cognaize-logo.png"
            alt="Cognaize Systems"
            className="mx-auto h-24 w-auto mb-4"
            onError={(e) => {
              const el = e.target as HTMLImageElement
              el.style.display = 'none'
            }}
          />
          <h1 className="text-2xl font-bold text-cognaize-dark">Cognaize Systems</h1>
          <p className="text-gray-500 mt-1">Expense & Invoice Portal</p>
        </div>

        {connError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 mb-4">
            <p className="text-sm text-red-800 font-medium">Supabase Connection Error</p>
            <p className="text-sm text-red-600 mt-1">{connError}</p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>
              Enter your Cognaize email to access the portal
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@cognaizesys.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          Internal use only. Contact admin@cognaizesys.com for access.
        </p>
      </div>
    </div>
  )
}
