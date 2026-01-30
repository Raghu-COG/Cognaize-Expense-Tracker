"use client"

import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Receipt } from 'lucide-react'

export default function ExpensesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Expenses</h1>
            <p className="text-gray-500 mt-1">Submit and track your expenses</p>
          </div>
          <Button>
            <Receipt className="mr-2 h-4 w-4" />
            New Expense
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expenses</CardTitle>
            <CardDescription>Your submitted expenses will appear here</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-400">
              <Receipt className="mx-auto h-12 w-12 mb-4" />
              <p>No expenses submitted yet</p>
              <p className="text-sm mt-1">Click &quot;New Expense&quot; to submit your first expense</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
