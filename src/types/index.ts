export type UserRole = 'employee' | 'consultant' | 'accountant' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  created_at: string
}

export type ExpenseStatus = 'Submitted' | 'Processed' | 'Paid'

export interface Expense {
  id: string
  user_id: string
  description: string
  amount: number
  category: string
  date: string
  receipt_url?: string
  status: ExpenseStatus
  created_at: string
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
