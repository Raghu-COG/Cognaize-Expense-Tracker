"use client"

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, Plus, X, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { User, UserRole } from '@/types'

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'employee', label: 'Employee' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'admin', label: 'Admin' },
]

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState<UserRole>('employee')
  const [formActive, setFormActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) {
      console.error('Failed to fetch users:', error.message)
      setLoading(false)
      return
    }
    setUsers((data as User[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const openAddForm = () => {
    setEditUser(null)
    setFormName('')
    setFormEmail('')
    setFormRole('employee')
    setFormActive(true)
    setFormError('')
    setShowForm(true)
  }

  const openEditForm = (u: User) => {
    setEditUser(u)
    setFormName(u.name)
    setFormEmail(u.email)
    setFormRole(u.role)
    setFormActive(u.is_active)
    setFormError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    setFormError('')
    if (!formName.trim()) { setFormError('Name is required'); return }
    setSubmitting(true)

    if (editUser) {
      // Prevent deactivating main admin
      if (editUser.email === 'admin@cognaizesys.com' && !formActive) {
        setFormError('Cannot deactivate the primary admin account.')
        setSubmitting(false)
        return
      }

      const { error } = await supabase
        .from('users')
        .update({ name: formName.trim(), role: formRole, is_active: formActive })
        .eq('id', editUser.id)

      if (error) { setFormError(error.message); setSubmitting(false); return }
    } else {
      const email = formEmail.toLowerCase().trim()
      if (!email.endsWith('@cognaizesys.com')) {
        setFormError('Email must end with @cognaizesys.com')
        setSubmitting(false)
        return
      }

      const { error } = await supabase
        .from('users')
        .insert({ email, name: formName.trim(), role: formRole, is_active: true })

      if (error) {
        if (error.code === '23505') setFormError('This email is already registered.')
        else setFormError(error.message)
        setSubmitting(false)
        return
      }
    }

    setShowForm(false)
    setSubmitting(false)
    await fetchUsers()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
            <p className="text-gray-500 mt-1">Add, edit, or deactivate portal users</p>
          </div>
          <Button onClick={openAddForm}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        {/* Add/Edit modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{editUser ? 'Edit User' : 'Add User'}</CardTitle>
                  <button onClick={() => setShowForm(false)}><X size={20} /></button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Full name" />
                </div>
                {!editUser && (
                  <div>
                    <Label>Email *</Label>
                    <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="user@cognaizesys.com" type="email" />
                  </div>
                )}
                {editUser && (
                  <div>
                    <Label>Email</Label>
                    <Input value={formEmail} disabled className="bg-gray-100" />
                  </div>
                )}
                <div>
                  <Label>Role *</Label>
                  <select value={formRole} onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                {editUser && (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="active" checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)} />
                    <Label htmlFor="active">Active</Label>
                  </div>
                )}
                {formError && <p className="text-sm text-red-500">{formError}</p>}
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={submitting}>
                    {submitting ? 'Saving...' : editUser ? 'Update' : 'Add User'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="mx-auto h-12 w-12 mb-4" />
                <p>No users found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 bg-gray-50">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3 capitalize">{u.role}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => openEditForm(u)}
                          className="text-cognaize-purple hover:underline inline-flex items-center gap-1 text-sm">
                          <Pencil size={14} /> Edit
                        </button>
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
