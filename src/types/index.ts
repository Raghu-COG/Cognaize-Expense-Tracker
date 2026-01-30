export type UserRole = 'employee' | 'consultant' | 'accountant' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ExpenseStatus = 'submitted' | 'processed' | 'paid'
export type Currency = 'INR' | 'USD' | 'JPY' | 'AED'
export type ExpenseType = 'travel' | 'food' | 'hotel' | 'software' | 'others'

export interface Expense {
  id: string
  user_id: string
  submission_date: string
  total_amount: number
  currency: Currency
  status: ExpenseStatus
  processed_at: string | null
  processed_by: string | null
  paid_at: string | null
  paid_by: string | null
  notes: string | null
  created_at: string
  // Joined fields
  user?: User
  expense_items?: ExpenseItem[]
  processed_by_user?: User
  paid_by_user?: User
}

export interface ExpenseItem {
  id: string
  expense_id: string
  date: string
  amount: number
  currency: Currency
  expense_type: ExpenseType
  description: string | null
  receipt_url: string | null
  created_at: string
}

export interface ExpenseItemInput {
  date: string
  amount: number
  expense_type: ExpenseType
  description: string
  receipt_file: File | null
}

export type InvoiceStatus = 'Submitted' | 'Processed' | 'Paid'

export interface Invoice {
  id: string
  user_id: string
  invoice_number: string
  amount: number
  month: string
  description: string
  file_url?: string
  status: InvoiceStatus
  created_at: string
}
