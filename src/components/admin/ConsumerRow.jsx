'use client'

import { Button } from '@/components/ui/Button'

export function ConsumerRow({ user, onDelete ,onResetPassword}) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <tr className="border-b hover:bg-gray-50" >
      <td className="px-6 py-4">
        <div className="text-sm font-medium text-gray-900">{user.full_name || 'N/A'}</div>
        <div className="text-sm text-gray-500">{user.email ||  "empty@empty.com"}</div>
        <div className="text-sm text-gray-500">{user.phone }</div>

      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {formatDate(user.created_at)}
      </td>
      <td className="px-6 py-4 text-right text-sm font-medium">
        <div className="flex gap-2 justify-end">
            <Button size="sm" variant="danger" onClick={() => onDelete(user.id)}>
              Delete
            </Button>
            <Button size="sm" variant="primary" onClick={() => onResetPassword(user)}>Reset Pass</Button>
        </div>
      </td>
    </tr>
  )
}