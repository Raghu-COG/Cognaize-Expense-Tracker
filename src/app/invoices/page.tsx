"use client"

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileText, Upload, X, Eye, Download } from 'lucide-react'
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

export default function InvoicesPage() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState<Invoice | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Form state
  const [consultantName, setConsultantName] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [currency, setCurrency] = useState<Currency>('INR')
  const [periodMonth, setPeriodMonth] = useState<number>(new Date().getMonth() + 1)
  const [periodYear, setPeriodYear] = useState<number>(new Date().getFullYear())
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchInvoices = useCallback(async () => {
    if (!user) return
    setFetchError(null)
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('submission_date', { ascending: false })
    if (error) {
      console.error('Failed to fetch invoices:', error.message)
      setFetchError(`Failed to load invoices: ${error.message}. Check your Supabase connection.`)
      setLoading(false)
      return
    }
    setInvoices((data as Invoice[]) || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  useEffect(() => {
    if (showForm && user) {
      setConsultantName(user.name || '')
    }
  }, [showForm, user])

  const resetForm = () => {
    setConsultantName(user?.name || '')
    setAmount(0)
    setCurrency('INR')
    setPeriodMonth(new Date().getMonth() + 1)
    setPeriodYear(new Date().getFullYear())
    setPdfFile(null)
  }

  const handleViewDetail = async (invoice: Invoice) => {
    // Generate signed URL for the PDF
    if (invoice.invoice_url) {
      const { data } = await supabase.storage
        .from('invoices')
        .createSignedUrl(invoice.invoice_url, 3600)
      setShowDetail({ ...invoice, invoice_url: data?.signedUrl || invoice.invoice_url })
    } else {
      setShowDetail(invoice)
    }
  }

  const handleSubmit = async () => {
    if (!user) return
    if (!consultantName.trim()) { toast.error('Please enter consultant name.'); return }
    if (!amount || amount <= 0) { toast.error('Please enter a valid amount.'); return }
    if (!pdfFile) { toast.error('Please upload an invoice PDF.'); return }

    if (!confirm(`Submit invoice for ${MONTHS[periodMonth - 1]} ${periodYear} - ${currency} ${amount.toFixed(2)}?`)) return

    setSubmitting(true)
    try {
      // Upload PDF
      const path = `${user.id}/${periodYear}/${periodMonth}/${pdfFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(path, pdfFile)
      if (uploadError) throw uploadError

      // Create invoice record
      const { error: insertError } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          consultant_name: consultantName.trim(),
          amount,
          currency,
          period_month: periodMonth,
          period_year: periodYear,
          invoice_url: path,
          status: 'submitted',
        })
      if (insertError) throw insertError

      setShowForm(false)
      resetForm()
      toast.success('Invoice submitted successfully')
      await fetchInvoices()
    } catch (err) {
      console.error(err)
      toast.error('Failed to submit invoice. Please try again.')
    }
    setSubmitting(false)
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
                {MONTHS[showDetail.period_month - 1]} {showDetail.period_year}
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
                  {showDetail.currency} {Number(showDetail.amount).toFixed(2)}
                </CardTitle>
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[showDetail.status]}`}>
                  {showDetail.status}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Consultant Name</span>
                  <p className="font-medium">{showDetail.consultant_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Period</span>
                  <p className="font-medium">{MONTHS[showDetail.period_month - 1]} {showDetail.period_year}</p>
                </div>
                <div>
                  <span className="text-gray-500">Amount</span>
                  <p className="font-medium">{showDetail.currency} {Number(showDetail.amount).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Submitted</span>
                  <p className="font-medium">{new Date(showDetail.submission_date).toLocaleDateString()}</p>
                </div>
              </div>

              {showDetail.notes && (
                <div className="p-3 bg-gray-50 rounded text-sm">
                  <span className="font-medium">Accountant Notes:</span> {showDetail.notes}
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
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  // Submission form
  if (showForm) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Submit New Invoice</h1>
              <p className="text-gray-500 mt-1">Upload your consulting invoice</p>
            </div>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm() }}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>Consultant Name *</Label>
                <Input value={consultantName}
                  onChange={(e) => setConsultantName(e.target.value)}
                  placeholder="Name as it appears on invoice" className="mt-1" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Amount *</Label>
                  <Input type="number" min="0" step="0.01" value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Invoice amount" className="mt-1" />
                </div>
                <div>
                  <Label>Currency *</Label>
                  <select value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Month *</Label>
                  <select value={periodMonth}
                    onChange={(e) => setPeriodMonth(parseInt(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                    {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Year *</Label>
                  <Input type="number" min="2020" max="2030" value={periodYear}
                    onChange={(e) => setPeriodYear(parseInt(e.target.value) || new Date().getFullYear())}
                    className="mt-1" />
                </div>
              </div>

              <div>
                <Label>Invoice PDF * (max 10MB)</Label>
                <div className="mt-1 flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50">
                    <Upload size={14} />
                    {pdfFile ? pdfFile.name : 'Choose PDF file'}
                    <input type="file" className="hidden"
                      accept=".pdf,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        if (file && file.size > 10 * 1024 * 1024) {
                          toast.error('File size must be under 10MB')
                          return
                        }
                        if (file && file.type !== 'application/pdf') {
                          toast.error('Only PDF files are allowed')
                          return
                        }
                        setPdfFile(file)
                      }} />
                  </label>
                  {pdfFile && (
                    <button onClick={() => setPdfFile(null)}
                      className="text-red-500 text-sm hover:underline">Remove</button>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Invoice'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  // Invoice list
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Invoices</h1>
            <p className="text-gray-500 mt-1">Submit and track your consulting invoices</p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <FileText className="mr-2 h-4 w-4" />
            Submit New Invoice
          </Button>
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
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FileText className="mx-auto h-12 w-12 mb-4" />
                <p>No invoices submitted yet</p>
                <p className="text-sm mt-1">Click &quot;Submit New Invoice&quot; to get started</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 bg-gray-50">
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}
                      onClick={() => handleViewDetail(inv)}
                      className="border-b hover:bg-gray-50 cursor-pointer">
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
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
