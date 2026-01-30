"use client"

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Receipt, FileText, Clock, CheckCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const STATUS_BADGE: Record<string, string> = {
  submitted: 'bg-yellow-100 text-yellow-800',
  processed: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
}

interface RecentItem {
  id: string
  type: 'Expense' | 'Invoice'
  date: string
  amount: number
  currency: string
  status: string
}

export default function EmployeeDashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    expensesThisMonth: 0,
    pendingExpenses: 0,
    invoicesThisYear: 0,
    pendingInvoices: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentItem[]>([])

  useEffect(() => {
    if (!user) return
    async function fetchDashboard() {
      setError(null)
      try {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString()

        const [
          expThisMonth,
          pendingExp,
          invThisYear,
          pendingInv,
          recentExpenses,
          recentInvoices,
        ] = await Promise.all([
          supabase.from('expenses').select('*', { count: 'exact', head: true })
            .eq('user_id', user!.id).gte('submission_date', startOfMonth),
          supabase.from('expenses').select('*', { count: 'exact', head: true })
            .eq('user_id', user!.id).in('status', ['submitted', 'processed']),
          supabase.from('invoices').select('*', { count: 'exact', head: true })
            .eq('user_id', user!.id).gte('submission_date', startOfYear),
          supabase.from('invoices').select('*', { count: 'exact', head: true })
            .eq('user_id', user!.id).in('status', ['submitted', 'processed']),
          supabase.from('expenses').select('id, submission_date, total_amount, currency, status')
            .eq('user_id', user!.id).order('submission_date', { ascending: false }).limit(5),
          supabase.from('invoices').select('id, submission_date, amount, currency, status')
            .eq('user_id', user!.id).order('submission_date', { ascending: false }).limit(5),
        ])

        if (expThisMonth.error || pendingExp.error || invThisYear.error || pendingInv.error) {
          setError('Failed to load dashboard data. Please try again.')
          setLoading(false)
          return
        }

        setStats({
          expensesThisMonth: expThisMonth.count || 0,
          pendingExpenses: pendingExp.count || 0,
          invoicesThisYear: invThisYear.count || 0,
          pendingInvoices: pendingInv.count || 0,
        })

        const combined: RecentItem[] = [
          ...((recentExpenses.data || []).map(e => ({
            id: e.id,
            type: 'Expense' as const,
            date: e.submission_date,
            amount: Number(e.total_amount),
            currency: e.currency,
            status: e.status,
          }))),
          ...((recentInvoices.data || []).map(i => ({
            id: i.id,
            type: 'Invoice' as const,
            date: i.submission_date,
            amount: Number(i.amount),
            currency: i.currency,
            status: i.status,
          }))),
        ]
        combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setRecentActivity(combined.slice(0, 5))
      } catch {
        setError('Failed to load dashboard data.')
      }
      setLoading(false)
    }
    fetchDashboard()
  }, [user])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.name}</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Expenses This Month</CardTitle>
                  <Receipt className="h-5 w-5 text-cognaize-purple" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.expensesThisMonth}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Pending Expenses</CardTitle>
                  <Clock className="h-5 w-5 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.pendingExpenses}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Invoices This Year</CardTitle>
                  <FileText className="h-5 w-5 text-cognaize-purple" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.invoicesThisYear}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Pending Invoices</CardTitle>
                  <Clock className="h-5 w-5 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.pendingInvoices}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <CheckCircle className="mx-auto h-10 w-10 mb-3" />
                    <p>No submissions yet</p>
                    <p className="text-sm mt-1">Submit an expense or invoice to get started</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500 bg-gray-50">
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentActivity.map((item) => (
                        <tr key={`${item.type}-${item.id}`} className="border-b">
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5">
                              {item.type === 'Expense' ? <Receipt size={14} /> : <FileText size={14} />}
                              {item.type}
                            </span>
                          </td>
                          <td className="px-4 py-3">{new Date(item.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3">{item.currency} {item.amount.toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[item.status]}`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
