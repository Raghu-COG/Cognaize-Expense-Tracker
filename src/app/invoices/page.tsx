"use client"

import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'

export default function InvoicesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Invoices</h1>
            <p className="text-gray-500 mt-1">Submit and track your consulting invoices</p>
          </div>
          <Button>
            <FileText className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invoices</CardTitle>
            <CardDescription>Your submitted invoices will appear here</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-400">
              <FileText className="mx-auto h-12 w-12 mb-4" />
              <p>No invoices submitted yet</p>
              <p className="text-sm mt-1">Click &quot;New Invoice&quot; to submit your first invoice</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
