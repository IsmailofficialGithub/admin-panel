'use client'

import { useEffect, useState } from 'react'
import { UserRow } from './UserRow'
import { EditRoleModal } from './EditRoleModal'
import { DeleteUserModal } from './DeleteUserModal'
import { useUsers } from '@/lib/hooks/useUsers'
import { ResetPasswordModal } from './ResetPasswordModal'

export function UserTable({isrefresh,setIsrefresh}) {
  const { users, loading, refetch } = useUsers()
  const [editUser, setEditUser] = useState(null)
  const [deleteUser, setDeleteUser] = useState(null)
  const [resetPasswordUser, setResetPasswordUser] = useState(null)
  useEffect(() => {
      refetch();
      setIsrefresh(false);
    }, [isrefresh]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading users...</div>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user,index) => (
              <UserRow
                key={index}
                user={user}
                onEditRole={setEditUser}
                onDelete={setDeleteUser}
                onResetPassword={setResetPasswordUser}
              />
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No users found. Create your first user!
          </div>
        )}
      </div>

      <EditRoleModal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        user={editUser}
        onSuccess={refetch}
      />

      <DeleteUserModal
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        user={deleteUser}
        onSuccess={refetch}
      />
      <ResetPasswordModal
        isOpen={!!resetPasswordUser}
        onClose={() => setResetPasswordUser(null)}
        user={resetPasswordUser}
        onSuccess={refetch}
      />
    </>
  )
}
