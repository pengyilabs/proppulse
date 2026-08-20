import { useState, useEffect, useCallback } from 'react'
import { X, Upload, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useOrgStore } from '../stores/org-store'
import { useAuth } from '../../lib/auth-context'
import type { Template } from '../../lib/services/templates-service'
import { getOrgTemplates, uploadTemplate, deleteTemplate } from '../../lib/services/templates-service'

interface TemplatePickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (template: Template) => void
  orgId?: string
}

export function TemplatePicker({ isOpen, onClose, onSelect, orgId: propOrgId }: TemplatePickerProps) {
  const { currentOrg, members } = useOrgStore()
  const { user } = useAuth()
  const orgId = propOrgId || currentOrg?.id || ''

  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = user
    ? members.some((m) => m.user_id === user.id && m.role === 'admin')
    : false

  const loadTemplates = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getOrgTemplates(orgId)
      setTemplates(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load templates'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    if (isOpen) {
      loadTemplates()
    }
  }, [isOpen, loadTemplates])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !orgId) return

    setUploading(true)
    setError(null)
    try {
      const name = file.name.replace(/\.[^/.]+$/, '') // Remove extension
      const template = await uploadTemplate(file, orgId, name)
      setTemplates((prev) => [template, ...prev])
      toast.success('Template uploaded')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload template'
      setError(message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate(id)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      if (selectedId === id) setSelectedId(null)
      toast.success('Template deleted')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete template'
      toast.error(message)
    }
  }

  const handleSelect = (template: Template) => {
    setSelectedId(template.id)
    onSelect(template)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Choose a Design</h2>
            <p className="text-sm text-muted-foreground">
              Select a sign design template for your post.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar */}
        <div className="px-6 py-3 border-b border-border shrink-0 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {templates.length > 0
              ? `${templates.length} design${templates.length !== 1 ? 's' : ''} available`
              : 'No designs yet'}
          </span>
          {isAdmin && (
            <label className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 cursor-pointer transition-colors">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Design
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Empty state */}
          {!loading && templates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Upload className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No designs uploaded yet.</p>
              {isAdmin && (
                <p className="text-xs text-muted-foreground/60">
                  Upload your company's sign designs to get started.
                </p>
              )}
            </div>
          )}

          {/* Template grid */}
          {templates.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleSelect(template)}
                  className={`
                    relative cursor-pointer rounded-xl overflow-hidden bg-secondary border-2 transition-all
                    ${selectedId === template.id
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-transparent hover:border-primary/50'
                    }
                  `}
                >
                  {/* Design image */}
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

                  {/* Delete button (admin only) */}
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(template.id)
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/40 text-white rounded-lg hover:bg-red-600/80 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Selected check */}
                  {selectedId === template.id && (
                    <div className="absolute top-2 left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            Cancel
          </button>
          {selectedId && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Use Selected Design
            </button>
          )}
        </div>
      </div>
    </div>
  )
}