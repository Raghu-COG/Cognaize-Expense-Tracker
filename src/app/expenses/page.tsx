"use client"

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Receipt, Plus, Trash2, Upload, X, Eye } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Expense, ExpenseItem, ExpenseItemInput, Currency, ExpenseType } from '@/types'

const CURRENCIES: Currency[] = ['INR', 'USD', 'JPY', 'AED']
const EXPENSE_TYPES: { value: ExpenseType; label: string }[] = [
  { value: 'travel', label: 'Travel' },
  { value: 'food', label: 'Food' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'software', label: 'Software' },
  { value: 'others', label: 'Others' },
]

const STATUS_BADGE: Record<string, string> = {
  submitted: 'bg-yellow-100 text-yellow-800',
  processed: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
}

function emptyItem(): ExpenseItemInput {
  return { date: '', amount: 0, expense_type: 'food', description: '', receipt_file: null }
}

export default function ExpensesPage() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState<Expense | null>(null)
  const [currency, setCurrency] = useState<Currency>('INR')
  const [items, setItems] = useState<ExpenseItemInput[]>([emptyItem()])
  const [submitting, setSubmitting] = useState(false)

  const fetchExpenses = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('expenses')
      .select('*, expense_items(*)')
      .eq('user_id', user.id)
      .order('submission_date', { ascending: false })
    setExpenses((data as Expense[]) || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  const handleViewDetail = async (expense: Expense) => {
    // Fetch items with signed URLs
    const { data: expenseItems } = await supabase
      .from('expense_items')
      .select('*')
      .eq('expense_id', expense.id)
      .order('date', { ascending: true })

    const itemsWithUrls = await Promise.all(
      (expenseItems || []).map(async (item: ExpenseItem) => {
        if (item.receipt_url) {
          const { data } = await supabase.storage
            .from('receipts')
            .createSignedUrl(item.receipt_url, 3600)
          return { ...item, receipt_url: data?.signedUrl || item.receipt_url }
        }
        return item
      })
    )

    setShowDetail({ ...expense, expense_items: itemsWithUrls })
  }

  const updateItem = (index: number, field: keyof ExpenseItemInput, value: ExpenseItemInput[keyof ExpenseItemInput]) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const removeItem = (index: number) => {
    if (items.length > 1) setItems(prev => prev.filter((_, i) => i !== index))
  }

  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  const handleSubmit = async () => {
    if (!user) return
    // Validate
    for (const item of items) {
      if (!item.date || !item.amount || item.amount <= 0) {
        alert('Please fill in date and amount for all line items.')
        return
      }
    }

    if (!confirm(`Submit expense with ${items.length} item(s) totaling ${currency} ${total.toFixed(2)}?`)) return

    setSubmitting(true)
    try {
      // Create expense
      const { data: expense, error: expError } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          total_amount: total,
          currency,
          status: 'submitted',
        })
        .select()
        .single()

      if (expError || !expense) throw expError

      // Upload receipts and create items
      for (const item of items) {
        let receiptPath: string | null = null
        if (item.receipt_file) {
          const ext = item.receipt_file.name.split('.').pop()
          const path = `${user.id}/${expense.id}/${crypto.randomUUID()}.${ext}`
          const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(path, item.receipt_file)
          if (!uploadError) receiptPath = path
        }

        await supabase.from('expense_items').insert({
          expense_id: expense.id,
          date: item.date,
          amount: item.amount,
          currency,
          expense_type: item.expense_type,
          description: item.description || null,
          receipt_url: receiptPath,
        })
      }

      setShowForm(false)
      setItems([emptyItem()])
      setCurrency('INR')
      await fetchExpenses()
    } catch (err) {
      console.error(err)
      alert('Failed to submit expense. Please try again.')
    }
    setSubmitting(false)
  }

  // Detail view modal
  if (showDetail) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Expense Details</h1>
              <p className="text-gray-500 mt-1">
                Submitted {new Date(showDetail.submission_date).toLocaleDateString()}
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
            <CardContent>
              {showDetail.notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
                  <span className="font-medium">Accountant Notes:</span> {showDetail.notes}
                </div>
              )}
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
              <h1 className="text-2xl font-bold text-gray-900">Submit New Expense</h1>
              <p className="text-gray-500 mt-1">Add line items for your expense submission</p>
            </div>
            <Button variant="outline" onClick={() => { setShowForm(false); setItems([emptyItem()]) }}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div>
                  <Label>Currency</Label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label>Date *</Label>
                      <Input type="date" value={item.date}
                        onChange={(e) => updateItem(index, 'date', e.target.value)} />
                    </div>
                    <div>
                      <Label>Amount ({currency}) *</Label>
                      <Input type="number" min="0" step="0.01" value={item.amount || ''}
                        onChange={(e) => updateItem(index, 'amount', parseFloat(e.target.value) || 0)} />
                    </div>
                    <div>
                      <Label>Type *</Label>
                      <select value={item.expense_type}
                        onChange={(e) => updateItem(index, 'expense_type', e.target.value as ExpenseType)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                        {EXPENSE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Optional" />
                    </div>
                  </div>
                  <div>
                    <Label>Receipt (jpg, png, pdf - max 5MB)</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50">
                        <Upload size={14} />
                        {item.receipt_file ? item.receipt_file.name : 'Choose file'}
                        <input type="file" className="hidden"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null
                            if (file && file.size > 5 * 1024 * 1024) {
                              alert('File size must be under 5MB')
                              return
                            }
                            updateItem(index, 'receipt_file', file)
                          }} />
                      </label>
                      {item.receipt_file && (
                        <button onClick={() => updateItem(index, 'receipt_file', null)}
                          className="text-red-500 text-sm hover:underline">Remove</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={() => setItems(prev => [...prev, emptyItem()])} className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Add Another Item
              </Button>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-lg font-bold">
                  Total: {currency} {total.toFixed(2)}
                </div>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Expense'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  // Expense list
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Expenses</h1>
            <p className="text-gray-500 mt-1">Submit and track your expenses</p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Receipt className="mr-2 h-4 w-4" />
            Submit New Expense
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Receipt className="mx-auto h-12 w-12 mb-4" />
                <p>No expenses submitted yet</p>
                <p className="text-sm mt-1">Click &quot;Submit New Expense&quot; to get started</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 bg-gray-50">
                    <th className="px-4 py-3">Date Submitted</th>
                    <th className="px-4 py-3">Total Amount</th>
                    <th className="px-4 py-3"># Items</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => (
                    <tr key={exp.id}
                      onClick={() => handleViewDetail(exp)}
                      className="border-b hover:bg-gray-50 cursor-pointer">
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
