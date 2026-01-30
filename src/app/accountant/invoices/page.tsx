"use client"

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileText, X, Eye, Download, Check, ArrowUpDown, Trash2, Pencil, Save } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Invoice, Currency } from '@/types'
import { toast } from 'sonner'

const CURRENCIES: Currency[] = ['INR', 'USD', 'JPY', 'AED']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const STATUS_BADGE: Record<string, string> = {
  submitted: 'bg-yellow-100 text-yellow-800',
  processed: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
}

export default function AccountantInvoicesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showDetail, setShowDetail] = useState<Invoice | null>(null)
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Admin edit state
  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState({ amount: '', period_month: 1, period_year: 2025 })

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [consultantFilter, setConsultantFilter] = useState('')
  const [currencyFilter, setCurrencyFilter] = useState<string>('all')
  const [periodMonthFilter, setPeriodMonthFilter] = useState<string>('all')
  const [periodYearFilter, setPeriodYearFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<'date' | 'amount' | 'period'>('date')
  const [sortAsc, setSortAsc] = useState(false)

  const fetchInvoices = useCallback(async () => {
    setFetchError(null)
    let query = supabase
      .from('invoices')
      .select('*, user:users!invoices_user_id_fkey(*)')
      .order('submission_date', { ascending: false })

    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    if (currencyFilter !== 'all') query = query.eq('currency', currencyFilter)
    if (periodMonthFilter !== 'all') query = query.eq('period_month', parseInt(periodMonthFilter))
    if (periodYearFilter !== 'all') query = query.eq('period_year', parseInt(periodYearFilter))

    const { data, error } = await query
    if (error) {
      console.error('Failed to fetch invoices:', error.message)
      setFetchError(`Failed to load invoices: ${error.message}. Check your Supabase connection.`)
      setLoading(false)
      return
    }
    let results = (data as Invoice[]) || []

    if (consultantFilter) {
      results = results.filter(inv =>
        inv.consultant_name?.toLowerCase().includes(consultantFilter.toLowerCase()) ||
        inv.user?.name?.toLowerCase().includes(consultantFilter.toLowerCase())
      )
    }

    results.sort((a, b) => {
      let cmp = 0
      if (sortField === 'date') cmp = new Date(a.submission_date).getTime() - new Date(b.submission_date).getTime()
      else if (sortField === 'amount') cmp = Number(a.amount) - Number(b.amount)
      else cmp = (a.period_year * 12 + a.period_month) - (b.period_year * 12 + b.period_month)
      return sortAsc ? cmp : -cmp
    })

    setInvoices(results)
    setLoading(false)
  }, [statusFilter, currencyFilter, consultantFilter, periodMonthFilter, periodYearFilter, sortField, sortAsc])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const availableYears = [...new Set(invoices.map(inv => inv.period_year))].sort((a, b) => b - a)

  const handleViewDetail = async (invoice: Invoice) => {
    let signedUrl = invoice.invoice_url
    if (invoice.invoice_url) {
      const { data } = await supabase.storage
        .from('invoices')
        .createSignedUrl(invoice.invoice_url, 3600)
      if (data?.signedUrl) signedUrl = data.signedUrl
    }

    let processedByUser = null
    let paidByUser = null
    if (invoice.processed_by) {
      const { data } = await supabase.from('users').select('*').eq('id', invoice.processed_by).single()
      processedByUser = data
    }
    if (invoice.paid_by) {
      const { data } = await supabase.from('users').select('*').eq('id', invoice.paid_by).single()
      paidByUser = data
    }

    setShowDetail({
      ...invoice,
      invoice_url: signedUrl,
      processed_by_user: processedByUser,
      paid_by_user: paidByUser,
    })
    setNotes(invoice.notes || '')
    setEditing(false)
  }

  const handleStatusChange = async (newStatus: 'submitted' | 'processed' | 'paid') => {
    if (!showDetail || !user) return
    setProcessing(true)

    const update: Record<string, unknown> = {
      status: newStatus,
      notes: notes || null,
    }

    if (newStatus === 'processed') {
      update.processed_at = new Date().toISOString()
      update.processed_by = user.id
    } else if (newStatus === 'paid') {
      update.paid_at = new Date().toISOString()
      update.paid_by = user.id
    } else if (newStatus === 'submitted') {
      update.processed_at = null
      update.processed_by = null
      update.paid_at = null
      update.paid_by = null
    }

    const { error } = await supabase.from('invoices').update(update).eq('id', showDetail.id)
    if (error) {
      toast.error('Failed to update status')
    } else {
      toast.success(`Invoice marked as ${newStatus}`)
    }

    setShowDetail(null)
    setProcessing(false)
    await fetchInvoices()
  }

  const handleDeleteInvoice = async () => {
    if (!showDetail) return
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return

    setProcessing(true)
    const { error } = await supabase.from('invoices').delete().eq('id', showDetail.id)
    if (error) {
      toast.error('Failed to delete invoice')
    } else {
      toast.success('Invoice deleted successfully')
    }
    setShowDetail(null)
    setProcessing(false)
    await fetchInvoices()
  }

  const startEditing = () => {
    if (!showDetail) return
    setEditing(true)
    setEditValues({
      amount: String(showDetail.amount),
      period_month: showDetail.period_month,
      period_year: showDetail.period_year,
    })
  }

  const handleSaveEdit = async () => {
    if (!showDetail) return
    const newAmount = parseFloat(editValues.amount)
    if (isNaN(newAmount) || newAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const { error } = await supabase.from('invoices').update({
      amount: newAmount,
      period_month: editValues.period_month,
      period_year: editValues.period_year,
    }).eq('id', showDetail.id)

    if (error) {
      toast.error('Failed to update invoice')
      return
    }

    toast.success('Invoice updated')
    setEditing(false)
    handleViewDetail({ ...showDetail, amount: newAmount, period_month: editValues.period_month, period_year: editValues.period_year })
    fetchInvoices()
  }

  const toggleSort = (field: 'date' | 'amount' | 'period') => {
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
              <h1 className="text-2xl font-bold text-gray-900">Invoice Details</h1>
              <p className="text-gray-500 mt-1">
                Submitted by {showDetail.consultant_name} on {new Date(showDetail.submission_date).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              {isAdmin && !editing && (
                <>
                  <Button variant="outline" onClick={startEditing}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteInvoice} disabled={processing}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => setShowDetail(null)}>
                <X className="mr-2 h-4 w-4" /> Back
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {showDetail.currency} {Number(showDetail.amount).toFixed(2)}
                </CardTitle>
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[showDetail.status]}`}>
                  {showDetail.status}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Consultant Name</span>
                  <p className="font-medium">{showDetail.consultant_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Period</span>
                  {editing ? (
                    <div className="flex gap-2 mt-1">
                      <select value={editValues.period_month}
                        onChange={(e) => setEditValues({ ...editValues, period_month: parseInt(e.target.value) })}
                        className="border rounded px-2 py-1 text-sm">
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                      <Input value={editValues.period_year} type="number"
                        onChange={(e) => setEditValues({ ...editValues, period_year: parseInt(e.target.value) })}
                        className="h-8 w-20 text-sm" />
                    </div>
                  ) : (
                    <p className="font-medium">{MONTHS[showDetail.period_month - 1]} {showDetail.period_year}</p>
                  )}
                </div>
                <div>
                  <span className="text-gray-500">Amount</span>
                  {editing ? (
                    <Input value={editValues.amount} type="number" step="0.01"
                      onChange={(e) => setEditValues({ ...editValues, amount: e.target.value })}
                      className="h-8 w-32 text-sm mt-1" />
                  ) : (
                    <p className="font-medium">{showDetail.currency} {Number(showDetail.amount).toFixed(2)}</p>
                  )}
                </div>
                <div>
                  <span className="text-gray-500">Submitted</span>
                  <p className="font-medium">{new Date(showDetail.submission_date).toLocaleDateString()}</p>
                </div>
              </div>

              {editing && (
                <div className="flex gap-2">
                  <Button onClick={handleSaveEdit}>
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              )}

              {showDetail.invoice_url && (
                <div className="flex gap-3">
                  <a href={showDetail.invoice_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline">
                      <Eye className="mr-2 h-4 w-4" /> View PDF
                    </Button>
                  </a>
                  <a href={showDetail.invoice_url} download>
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                  </a>
                </div>
              )}

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

              <div>
                <Label>Notes (optional)</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Add notes for this invoice..."
                  disabled={!isAdmin && showDetail.status === 'paid'}
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                {isAdmin ? (
                  <>
                    {showDetail.status !== 'submitted' && (
                      <Button variant="outline" onClick={() => handleStatusChange('submitted')} disabled={processing}>
                        Revert to Submitted
                      </Button>
                    )}
                    {showDetail.status !== 'processed' && (
                      <Button onClick={() => handleStatusChange('processed')} disabled={processing}>
                        <Check className="mr-2 h-4 w-4" />
                        {showDetail.status === 'paid' ? 'Revert to Processed' : 'Mark as Processed'}
                      </Button>
                    )}
                    {showDetail.status !== 'paid' && (
                      <Button onClick={() => handleStatusChange('paid')} disabled={processing}>
                        <Check className="mr-2 h-4 w-4" /> Mark as Paid
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    {showDetail.status === 'submitted' && (
                      <Button onClick={() => handleStatusChange('processed')} disabled={processing}>
                        <Check className="mr-2 h-4 w-4" />
                        {processing ? 'Processing...' : 'Mark as Processed'}
                      </Button>
                    )}
                    {showDetail.status === 'processed' && (
                      <Button onClick={() => handleStatusChange('paid')} disabled={processing}>
                        <Check className="mr-2 h-4 w-4" />
                        {processing ? 'Processing...' : 'Mark as Paid'}
                      </Button>
                    )}
                  </>
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
          <h1 className="text-2xl font-bold text-gray-900">All Invoices</h1>
          <p className="text-gray-500 mt-1">Review and process invoice submissions</p>
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
            <Label className="text-xs">Consultant</Label>
            <Input value={consultantFilter} onChange={(e) => setConsultantFilter(e.target.value)}
              placeholder="Search name..." className="mt-1 w-48" />
          </div>
          <div>
            <Label className="text-xs">Currency</Label>
            <select value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)}
              className="mt-1 block w-28 rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="all">All</option>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Month</Label>
            <select value={periodMonthFilter} onChange={(e) => setPeriodMonthFilter(e.target.value)}
              className="mt-1 block w-36 rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="all">All</option>
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Year</Label>
            <select value={periodYearFilter} onChange={(e) => setPeriodYearFilter(e.target.value)}
              className="mt-1 block w-28 rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="all">All</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {fetchError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800 font-medium">Supabase Connection Error</p>
            <p className="text-sm text-red-600 mt-1">{fetchError}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => { setLoading(true); fetchInvoices() }}>
              Retry
            </Button>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cognaize-purple"></div>
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FileText className="mx-auto h-12 w-12 mb-4" />
                <p className="font-medium">No invoice submissions found</p>
                <p className="text-sm mt-1">Invoices will appear here once consultants submit them</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500 bg-gray-50">
                      <th className="px-4 py-3">Consultant Name</th>
                      <th className="px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('period')}>
                        <span className="inline-flex items-center gap-1">Period <ArrowUpDown size={12} /></span>
                      </th>
                      <th className="px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                        <span className="inline-flex items-center gap-1">Amount <ArrowUpDown size={12} /></span>
                      </th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('date')}>
                        <span className="inline-flex items-center gap-1">Submitted <ArrowUpDown size={12} /></span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}
                        onClick={() => handleViewDetail(inv)}
                        className="border-b hover:bg-gray-50 cursor-pointer">
                        <td className="px-4 py-3">{inv.consultant_name}</td>
                        <td className="px-4 py-3">{MONTHS[inv.period_month - 1]} {inv.period_year}</td>
                        <td className="px-4 py-3">{inv.currency} {Number(inv.amount).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[inv.status]}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">{new Date(inv.submission_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
