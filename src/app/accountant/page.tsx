"use client"

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Receipt, FileText, Clock, DollarSign, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface PendingStats {
  expAwaitingProcessing: { count: number; total: number }
  expAwaitingPayment: { count: number; total: number }
  invAwaitingProcessing: { count: number; total: number }
  invAwaitingPayment: { count: number; total: number }
}

interface MonthlyStats {
  processedThisMonth: number
  paidThisMonth: number
  byType: Record<string, number>
}

export default function AccountantDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingStats>({
    expAwaitingProcessing: { count: 0, total: 0 },
    expAwaitingPayment: { count: 0, total: 0 },
    invAwaitingProcessing: { count: 0, total: 0 },
    invAwaitingPayment: { count: 0, total: 0 },
  })
  const [monthly, setMonthly] = useState<MonthlyStats>({
    processedThisMonth: 0,
    paidThisMonth: 0,
    byType: {},
  })

  useEffect(() => {
    async function fetchData() {
      setError(null)
      try {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        const [
          expSubmitted,
          expProcessed,
          invSubmitted,
          invProcessed,
          expProcessedMonth,
          expPaidMonth,
          expWithItems,
        ] = await Promise.all([
          supabase.from('expenses').select('total_amount').eq('status', 'submitted'),
          supabase.from('expenses').select('total_amount').eq('status', 'processed'),
          supabase.from('invoices').select('amount').eq('status', 'submitted'),
          supabase.from('invoices').select('amount').eq('status', 'processed'),
          supabase.from('expenses').select('*', { count: 'exact', head: true })
            .eq('status', 'processed').gte('processed_at', startOfMonth),
          supabase.from('expenses').select('*', { count: 'exact', head: true })
            .eq('status', 'paid').gte('paid_at', startOfMonth),
          supabase.from('expenses').select('*, expense_items(*)').gte('submission_date', startOfMonth),
        ])

        if (expSubmitted.error || expProcessed.error || invSubmitted.error || invProcessed.error) {
          setError('Failed to load dashboard data.')
          setLoading(false)
          return
        }

        const sumArr = (arr: { total_amount?: number; amount?: number }[], key: 'total_amount' | 'amount') =>
          arr.reduce((s, r) => s + Number(r[key] || 0), 0)

        setPending({
          expAwaitingProcessing: { count: expSubmitted.data?.length || 0, total: sumArr(expSubmitted.data || [], 'total_amount') },
          expAwaitingPayment: { count: expProcessed.data?.length || 0, total: sumArr(expProcessed.data || [], 'total_amount') },
          invAwaitingProcessing: { count: invSubmitted.data?.length || 0, total: sumArr(invSubmitted.data || [], 'amount') },
          invAwaitingPayment: { count: invProcessed.data?.length || 0, total: sumArr(invProcessed.data || [], 'amount') },
        })

        // Breakdown by expense type this month
        const typeBreakdown: Record<string, number> = {}
        if (expWithItems.data) {
          for (const exp of expWithItems.data) {
            for (const item of (exp.expense_items || [])) {
              const t = item.expense_type || 'others'
              typeBreakdown[t] = (typeBreakdown[t] || 0) + Number(item.amount || 0)
            }
          }
        }

        setMonthly({
          processedThisMonth: expProcessedMonth.count || 0,
          paidThisMonth: expPaidMonth.count || 0,
          byType: typeBreakdown,
        })
      } catch {
        setError('Failed to load dashboard data.')
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const TYPE_COLORS: Record<string, string> = {
    travel: 'bg-blue-500',
    food: 'bg-green-500',
    hotel: 'bg-purple-500',
    software: 'bg-orange-500',
    others: 'bg-gray-500',
  }

  const totalByType = Object.values(monthly.byType).reduce((s, v) => s + v, 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accountant Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of pending items and monthly activity</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            {/* Pending Items */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Pending Items</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-l-4 border-l-yellow-400">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Expenses Awaiting Processing</CardTitle>
                    <Receipt className="h-5 w-5 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{pending.expAwaitingProcessing.count}</div>
                    <p className="text-sm text-gray-500 mt-1">Total: {pending.expAwaitingProcessing.total.toFixed(2)}</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-400">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Expenses Awaiting Payment</CardTitle>
                    <DollarSign className="h-5 w-5 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{pending.expAwaitingPayment.count}</div>
                    <p className="text-sm text-gray-500 mt-1">Total: {pending.expAwaitingPayment.total.toFixed(2)}</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-400">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Invoices Awaiting Processing</CardTitle>
                    <FileText className="h-5 w-5 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{pending.invAwaitingProcessing.count}</div>
                    <p className="text-sm text-gray-500 mt-1">Total: {pending.invAwaitingProcessing.total.toFixed(2)}</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-400">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Invoices Awaiting Payment</CardTitle>
                    <DollarSign className="h-5 w-5 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{pending.invAwaitingPayment.count}</div>
                    <p className="text-sm text-gray-500 mt-1">Total: {pending.invAwaitingPayment.total.toFixed(2)}</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Monthly Summary */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Monthly Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <Clock className="h-5 w-5 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{monthly.paidThisMonth}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Breakdown by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {totalByType === 0 ? (
                      <p className="text-sm text-gray-400">No expenses this month</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(monthly.byType).map(([type, amount]) => (
                          <div key={type} className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${TYPE_COLORS[type] || 'bg-gray-400'}`} />
                            <span className="text-sm capitalize flex-1">{type}</span>
                            <span className="text-sm font-medium">{amount.toFixed(2)}</span>
                            <span className="text-xs text-gray-400">
                              ({((amount / totalByType) * 100).toFixed(0)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
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
