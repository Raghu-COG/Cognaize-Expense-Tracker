"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Receipt, FileText, Clock, DollarSign, TrendingUp, UserCheck, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalExpenses: 0,
    totalInvoices: 0,
  })
  const [pending, setPending] = useState({
    expAwaitingProcessing: 0,
    expAwaitingPayment: 0,
    invAwaitingProcessing: 0,
    invAwaitingPayment: 0,
  })
  const [monthly, setMonthly] = useState({
    processedThisMonth: 0,
    paidThisMonth: 0,
  })

  useEffect(() => {
    async function fetchData() {
      setError(null)
      try {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        const [
          allUsers, activeUsersQ,
          allExpenses, allInvoices,
          expSubmitted, expProcessed,
          invSubmitted, invProcessed,
          expProcessedMonth, expPaidMonth,
        ] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('expenses').select('*', { count: 'exact', head: true }),
          supabase.from('invoices').select('*', { count: 'exact', head: true }),
          supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
          supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('status', 'processed'),
          supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
          supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'processed'),
          supabase.from('expenses').select('*', { count: 'exact', head: true })
            .eq('status', 'processed').gte('processed_at', startOfMonth),
          supabase.from('expenses').select('*', { count: 'exact', head: true })
            .eq('status', 'paid').gte('paid_at', startOfMonth),
        ])

        const hasError = [allUsers, activeUsersQ, allExpenses, allInvoices].some(r => r.error)
        if (hasError) {
          setError('Failed to load some dashboard data.')
        }

        setStats({
          totalUsers: allUsers.count || 0,
          activeUsers: activeUsersQ.count || 0,
          totalExpenses: allExpenses.count || 0,
          totalInvoices: allInvoices.count || 0,
        })

        setPending({
          expAwaitingProcessing: expSubmitted.count || 0,
          expAwaitingPayment: expProcessed.count || 0,
          invAwaitingProcessing: invSubmitted.count || 0,
          invAwaitingPayment: invProcessed.count || 0,
        })

        setMonthly({
          processedThisMonth: expProcessedMonth.count || 0,
          paidThisMonth: expPaidMonth.count || 0,
        })
      } catch {
        setError('Failed to load dashboard data.')
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Full overview of portal activity</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* User Stats + Quick Link */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Users</CardTitle>
                  <Users className="h-5 w-5 text-cognaize-purple" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalUsers}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Active Users</CardTitle>
                  <UserCheck className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.activeUsers}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Expenses</CardTitle>
                  <Receipt className="h-5 w-5 text-cognaize-purple" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalExpenses}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Invoices</CardTitle>
                  <FileText className="h-5 w-5 text-cognaize-purple" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalInvoices}</div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Link */}
            <div>
              <Link href="/admin/users">
                <Button variant="outline" className="gap-2">
                  <Users className="h-4 w-4" /> Manage Users <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Pending Items */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Pending Items</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-yellow-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Expenses: Processing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{pending.expAwaitingProcessing}</div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Expenses: Payment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{pending.expAwaitingPayment}</div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-yellow-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Invoices: Processing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{pending.invAwaitingProcessing}</div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-400">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">Invoices: Payment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{pending.invAwaitingPayment}</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Monthly Summary */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Monthly Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Processed This Month</CardTitle>
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{monthly.processedThisMonth}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Paid This Month</CardTitle>
                    <DollarSign className="h-5 w-5 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{monthly.paidThisMonth}</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
