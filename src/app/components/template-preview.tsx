import type { Template } from '../../lib/services/templates-service'

interface TemplatePreviewProps {
  template: Template
  onClick?: () => void
  selected?: boolean
}

export function TemplatePreview({ template, onClick, selected }: TemplatePreviewProps) {
  return (
    <div
      onClick={onClick}
      className={`
        relative cursor-pointer rounded-xl overflow-hidden bg-secondary border-2 transition-all
        ${selected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-transparent hover:border-primary/50'
        }
      `}
    >
      <div className="aspect-[4/5]">
        <img
          src={template.image_url}
          alt={template.name}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Label */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
        <p className="text-sm font-medium text-white truncate">
          {template.name}
        </p>
      </div>

      {/* Name badge */}
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium bg-black/40 text-white backdrop-blur-sm">
        {template.name}
      </div>
    </div>
  )
}