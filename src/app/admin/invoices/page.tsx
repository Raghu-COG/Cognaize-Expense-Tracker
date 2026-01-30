"use client"

import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { FileText } from 'lucide-react'

export default function AdminInvoicesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Invoices</h1>
          <p className="text-gray-500 mt-1">Full control over all invoice submissions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invoice Submissions</CardTitle>
            <CardDescription>Manage all invoice submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-400">
              <FileText className="mx-auto h-12 w-12 mb-4" />
              <p>No invoice submissions yet</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
