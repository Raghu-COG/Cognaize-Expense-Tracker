"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '@/types'

interface AuthContextType {
  user: User | null
  login: (email: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock users for development (will be replaced with Supabase)
const MOCK_USERS: User[] = [
  { id: '1', email: 'admin@cognaizesys.com', name: 'Admin User', role: 'admin', created_at: new Date().toISOString() },
  { id: '2', email: 'accountant@cognaizesys.com', name: 'Accountant User', role: 'accountant', created_at: new Date().toISOString() },
  { id: '3', email: 'employee@cognaizesys.com', name: 'Employee User', role: 'employee', created_at: new Date().toISOString() },
  { id: '4', email: 'consultant@cognaizesys.com', name: 'Consultant User', role: 'consultant', created_at: new Date().toISOString() },
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('cognaize_user')
    if (stored) {
      setUser(JSON.parse(stored))
    }
    setLoading(false)
  }, [])

  const login = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const normalizedEmail = email.toLowerCase().trim()

    if (!normalizedEmail.endsWith('@cognaizesys.com')) {
      return { success: false, error: 'Please use your @cognaizesys.com email address.' }
    }

    // TODO: Replace with Supabase query
    const foundUser = MOCK_USERS.find(u => u.email === normalizedEmail)

    if (!foundUser) {
      return { success: false, error: 'Email not registered. Please contact admin.' }
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
