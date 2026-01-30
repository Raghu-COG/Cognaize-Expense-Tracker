"use client"

import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'

export default function AdminUsersPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
            <p className="text-gray-500 mt-1">Add, edit, or remove portal users</p>
          </div>
          <Button>
            <Users className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Users</CardTitle>
            <CardDescription>All registered portal users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-400">
              <Users className="mx-auto h-12 w-12 mb-4" />
              <p>User management will be available here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
