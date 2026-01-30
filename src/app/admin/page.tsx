"use client"

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Users, Receipt, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AdminDashboardPage() {
  const [userCount, setUserCount] = useState(0)
  const [expenseCount, setExpenseCount] = useState(0)
  const [invoiceCount, setInvoiceCount] = useState(0)

  useEffect(() => {
    async function fetchCounts() {
      const [users, expenses, invoices] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('expenses').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('*', { count: 'exact', head: true }),
      ])
      if (users.error) console.error('Failed to fetch user count:', users.error.message)
      if (expenses.error) console.error('Failed to fetch expense count:', expenses.error.message)
      if (invoices.error) console.error('Failed to fetch invoice count:', invoices.error.message)
      setUserCount(users.count || 0)
      setExpenseCount(expenses.count || 0)
      setInvoiceCount(invoices.count || 0)
    }
    fetchCounts()
  }, [])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of all portal activity</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Users</CardTitle>
              <Users className="h-5 w-5 text-cognaize-purple" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{userCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Expenses</CardTitle>
              <Receipt className="h-5 w-5 text-cognaize-purple" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{expenseCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Invoices</CardTitle>
              <FileText className="h-5 w-5 text-cognaize-purple" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{invoiceCount}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
