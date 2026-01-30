"use client"

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Receipt, X, Eye, Check, ArrowUpDown } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Expense, ExpenseItem } from '@/types'

const STATUS_BADGE: Record<string, string> = {
  submitted: 'bg-yellow-100 text-yellow-800',
  processed: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
}

export default function AccountantExpensesPage() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showDetail, setShowDetail] = useState<Expense | null>(null)
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [currencyFilter, setCurrencyFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<'date' | 'amount' | 'status'>('date')
  const [sortAsc, setSortAsc] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchExpenses = useCallback(async () => {
    setFetchError(null)
    let query = supabase
      .from('expenses')
      .select('*, user:users!expenses_user_id_fkey(*), expense_items(*)')
      .order('submission_date', { ascending: false })

    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    if (currencyFilter !== 'all') query = query.eq('currency', currencyFilter)

    const { data, error } = await query
    if (error) {
      console.error('Failed to fetch expenses:', error.message)
      setFetchError(`Failed to load expenses: ${error.message}. Check your Supabase connection.`)
      setLoading(false)
      return
    }
    let results = (data as Expense[]) || []

    if (employeeFilter) {
      results = results.filter(e =>
        e.user?.name?.toLowerCase().includes(employeeFilter.toLowerCase()) ||
        e.user?.email?.toLowerCase().includes(employeeFilter.toLowerCase())
      )
    }

    // Sort
    results.sort((a, b) => {
      let cmp = 0
      if (sortField === 'date') cmp = new Date(a.submission_date).getTime() - new Date(b.submission_date).getTime()
      else if (sortField === 'amount') cmp = Number(a.total_amount) - Number(b.total_amount)
      else cmp = a.status.localeCompare(b.status)
      return sortAsc ? cmp : -cmp
    })

    setExpenses(results)
    setLoading(false)
  }, [statusFilter, currencyFilter, employeeFilter, sortField, sortAsc])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  const handleViewDetail = async (expense: Expense) => {
    const { data: items } = await supabase
      .from('expense_items')
      .select('*')
      .eq('expense_id', expense.id)
      .order('date', { ascending: true })

    const itemsWithUrls = await Promise.all(
      (items || []).map(async (item: ExpenseItem) => {
        if (item.receipt_url) {
          const { data } = await supabase.storage
            .from('receipts')
            .createSignedUrl(item.receipt_url, 3600)
          return { ...item, receipt_url: data?.signedUrl || item.receipt_url }
        }
        return item
      })
    )

    // Fetch processed_by / paid_by user names
    let processedByUser = null
    let paidByUser = null
    if (expense.processed_by) {
      const { data } = await supabase.from('users').select('*').eq('id', expense.processed_by).single()
      processedByUser = data
    }
    if (expense.paid_by) {
      const { data } = await supabase.from('users').select('*').eq('id', expense.paid_by).single()
      paidByUser = data
    }

    setShowDetail({ ...expense, expense_items: itemsWithUrls, processed_by_user: processedByUser, paid_by_user: paidByUser })
    setNotes(expense.notes || '')
  }

  const handleMarkProcessed = async () => {
    if (!showDetail || !user) return
    setProcessing(true)
    await supabase
      .from('expenses')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
        processed_by: user.id,
        notes: notes || null,
      })
      .eq('id', showDetail.id)
    setShowDetail(null)
    setProcessing(false)
    await fetchExpenses()
  }

  const handleMarkPaid = async () => {
    if (!showDetail || !user) return
    setProcessing(true)
    await supabase
      .from('expenses')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        paid_by: user.id,
        notes: notes || null,
      })
      .eq('id', showDetail.id)
    setShowDetail(null)
    setProcessing(false)
    await fetchExpenses()
  }

  const toggleSort = (field: 'date' | 'amount' | 'status') => {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(false) }
  }

  // Detail view
  if (showDetail) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Expense Details</h1>
              <p className="text-gray-500 mt-1">
                Submitted by {showDetail.user?.name || 'Unknown'} on {new Date(showDetail.submission_date).toLocaleDateString()}
              </p>
            </div>
            <Button variant="outline" onClick={() => setShowDetail(null)}>
              <X className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {showDetail.currency} {Number(showDetail.total_amount).toFixed(2)}
                </CardTitle>
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[showDetail.status]}`}>
                  {showDetail.status}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-right">Amount</th>
                    <th className="pb-2">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {showDetail.expense_items?.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="py-2 capitalize">{item.expense_type}</td>
                      <td className="py-2">{item.description || '-'}</td>
                      <td className="py-2 text-right">{Number(item.amount).toFixed(2)}</td>
                      <td className="py-2">
                        {item.receipt_url ? (
                          <a href={item.receipt_url} target="_blank" rel="noopener noreferrer"
                            className="text-cognaize-purple hover:underline inline-flex items-center gap-1">
                            <Eye size={14} /> View
                          </a>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Processing info */}
              {showDetail.processed_at && (
                <div className="text-sm text-gray-500">
                  Processed by {showDetail.processed_by_user?.name || 'Unknown'} on {new Date(showDetail.processed_at).toLocaleString()}
                </div>
              )}
              {showDetail.paid_at && (
                <div className="text-sm text-gray-500">
                  Paid by {showDetail.paid_by_user?.name || 'Unknown'} on {new Date(showDetail.paid_at).toLocaleString()}
                </div>
              )}

              {/* Notes */}
              <div>
                <Label>Notes (optional)</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Add notes for this expense..."
                  disabled={showDetail.status === 'paid'}
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                {showDetail.status === 'submitted' && (
                  <Button onClick={handleMarkProcessed} disabled={processing}>
                    <Check className="mr-2 h-4 w-4" />
                    {processing ? 'Processing...' : 'Mark as Processed'}
                  </Button>
                )}
                {showDetail.status === 'processed' && (
                  <Button onClick={handleMarkPaid} disabled={processing}>
                    <Check className="mr-2 h-4 w-4" />
                    {processing ? 'Processing...' : 'Mark as Paid'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Expenses</h1>
          <p className="text-gray-500 mt-1">Review and process expense submissions</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div>
            <Label className="text-xs">Status</Label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 block w-36 rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="all">All</option>
              <option value="submitted">Submitted</option>
              <option value="processed">Processed</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Employee</Label>
            <Input value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}
              placeholder="Search name..." className="mt-1 w-48" />
          </div>
          <div>
            <Label className="text-xs">Currency</Label>
            <select value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)}
              className="mt-1 block w-28 rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="all">All</option>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="JPY">JPY</option>
              <option value="AED">AED</option>
            </select>
          </div>
        </div>

        {fetchError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800 font-medium">Supabase Connection Error</p>
            <p className="text-sm text-red-600 mt-1">{fetchError}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => { setLoading(true); fetchExpenses() }}>
              Retry
            </Button>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Receipt className="mx-auto h-12 w-12 mb-4" />
                <p>No expense submissions found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 bg-gray-50">
                    <th className="px-4 py-3">Submitted By</th>
                    <th className="px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('date')}>
                      <span className="inline-flex items-center gap-1">Date <ArrowUpDown size={12} /></span>
                    </th>
                    <th className="px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                      <span className="inline-flex items-center gap-1">Total Amount <ArrowUpDown size={12} /></span>
                    </th>
                    <th className="px-4 py-3"># Items</th>
                    <th className="px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('status')}>
                      <span className="inline-flex items-center gap-1">Status <ArrowUpDown size={12} /></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => (
                    <tr key={exp.id}
                      onClick={() => handleViewDetail(exp)}
                      className="border-b hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3">{exp.user?.name || 'Unknown'}</td>
                      <td className="px-4 py-3">{new Date(exp.submission_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{exp.currency} {Number(exp.total_amount).toFixed(2)}</td>
                      <td className="px-4 py-3">{exp.expense_items?.length || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[exp.status]}`}>
                          {exp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
