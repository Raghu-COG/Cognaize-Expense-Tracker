"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '@/types'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  login: (email: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('cognaize_user')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Re-validate user from DB on load
        supabase
          .from('users')
          .select('*')
          .eq('id', parsed.id)
          .eq('is_active', true)
          .single()
          .then(({ data }) => {
            if (data) {
              setUser(data as User)
              localStorage.setItem('cognaize_user', JSON.stringify(data))
            } else {
              localStorage.removeItem('cognaize_user')
            }
            setLoading(false)
          })
      } catch {
        localStorage.removeItem('cognaize_user')
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const normalizedEmail = email.toLowerCase().trim()

    if (!normalizedEmail.endsWith('@cognaizesys.com')) {
      return { success: false, error: 'Please use your @cognaizesys.com email address.' }
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single()

    if (error || !data) {
      return { success: false, error: 'Email not registered. Please contact admin.' }
    }

    const foundUser = data as User

    if (!foundUser.is_active) {
      return { success: false, error: 'Your account has been deactivated. Please contact admin.' }
    }

    setUser(foundUser)
    localStorage.setItem('cognaize_user', JSON.stringify(foundUser))
    return { success: true }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('cognaize_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
