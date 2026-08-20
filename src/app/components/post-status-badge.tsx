import { clsx } from 'clsx'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  pending_approval: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700' },
  scheduled: { label: 'Scheduled', color: 'bg-purple-100 text-purple-700' },
  published: { label: 'Published', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
}

interface PostStatusBadgeProps {
  status: string
}

export function PostStatusBadge({ status }: PostStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status.replace(/_/g, ' '),
    color: 'bg-gray-100 text-gray-700',
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.color
      )}
    >
      {config.label}
    </span>
  )
}