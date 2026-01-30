"use client"

import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Receipt } from 'lucide-react'

export default function AdminExpensesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Expenses</h1>
          <p className="text-gray-500 mt-1">Full control over all expense submissions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expense Submissions</CardTitle>
            <CardDescription>Manage all expense submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-400">
              <Receipt className="mx-auto h-12 w-12 mb-4" />
              <p>No expense submissions yet</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
