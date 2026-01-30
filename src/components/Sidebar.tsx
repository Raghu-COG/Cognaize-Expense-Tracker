"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import {
  Receipt,
  FileText,
  Users,
  LogOut,
  LayoutDashboard,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  if (!user) return null

  const employeeNav: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'My Expenses', href: '/expenses', icon: <Receipt size={20} /> },
    { label: 'My Invoices', href: '/invoices', icon: <FileText size={20} /> },
  ]

  const accountantNav: NavItem[] = [
    { label: 'Dashboard', href: '/accountant', icon: <LayoutDashboard size={20} /> },
    { label: 'All Expenses', href: '/accountant/expenses', icon: <Receipt size={20} /> },
    { label: 'All Invoices', href: '/accountant/invoices', icon: <FileText size={20} /> },
  ]

  const adminNav: NavItem[] = [
    { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={20} /> },
    { label: 'Manage Users', href: '/admin/users', icon: <Users size={20} /> },
    { label: 'All Expenses', href: '/admin/expenses', icon: <Receipt size={20} /> },
    { label: 'All Invoices', href: '/admin/invoices', icon: <FileText size={20} /> },
  ]

  let navItems: NavItem[] = []
  if (user.role === 'admin') {
    navItems = adminNav
  } else if (user.role === 'accountant') {
    navItems = accountantNav
  } else {
    navItems = employeeNav
  }

  return (
    <aside className="w-64 min-h-screen bg-cognaize-purple text-white flex flex-col">
      <div className="p-4 border-b border-cognaize-purple-light">
        <div className="flex items-center gap-3">
          <img
            src="/cognaize-logo.png"
            alt="Cognaize"
            className="w-10 h-10 rounded bg-white p-1"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          <div>
            <h1 className="font-bold text-lg">Cognaize</h1>
            <p className="text-xs text-purple-200">Expense Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-cognaize-purple-dark text-white"
                : "text-purple-100 hover:bg-cognaize-purple-light hover:text-white"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-cognaize-purple-light">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium truncate">{user.name}</p>
          <p className="text-xs text-purple-200 truncate">{user.email}</p>
          <span className="inline-block mt-1 text-xs bg-cognaize-purple-dark px-2 py-0.5 rounded capitalize">
            {user.role}
          </span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-purple-100 hover:bg-cognaize-purple-light hover:text-white w-full transition-colors"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </aside>
  )
}
