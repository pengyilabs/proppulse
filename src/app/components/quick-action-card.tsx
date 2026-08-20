import { ArrowRight } from 'lucide-react'
import { clsx } from 'clsx'

interface QuickActionCardProps {
  icon: React.ElementType
  title: string
  description: string
  onClick: () => void
  color?: string
}

export function QuickActionCard({ icon: Icon, title, description, onClick, color = 'primary' }: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'group flex items-center gap-4 w-full p-4 bg-card border border-border rounded-xl text-left',
        'hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.01] transition-all duration-200'
      )}
    >
      <div
        className={clsx(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          color === 'primary' && 'bg-primary/10 text-primary',
          color === 'accent' && 'bg-accent/10 text-accent',
          color === 'green' && 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
          color === 'amber' && 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
          color === 'red' && 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  )
}