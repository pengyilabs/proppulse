import { useState, useEffect, useCallback } from 'react'
import { X, Sparkles, Loader2 } from 'lucide-react'
import { useOrgStore } from '../stores/org-store'
import type { Template } from '../../lib/services/templates-service'
import {
  getTemplatesForListing,
  generateTemplate,
  saveTemplate,
} from '../../lib/services/templates-service'
import { TemplatePreview } from './template-preview'

interface TemplatePickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (template: Template) => void
  listingId: string
  orgId?: string
}

export function TemplatePicker({ isOpen, onClose, onSelect, listingId, orgId: propOrgId }: TemplatePickerProps) {
  const { currentOrg } = useOrgStore()
  const orgId = propOrgId || currentOrg?.id || ''

  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadTemplates = useCallback(async () => {
    if (!listingId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getTemplatesForListing(listingId)
      setTemplates(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load templates'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [listingId])

  useEffect(() => {
    if (isOpen) {
      loadTemplates()
    }
  }, [isOpen, loadTemplates])

  const handleGenerate = async () => {
    if (!listingId || !orgId) return
    setGenerating(true)
    setError(null)
    try {
      // Generate 3 templates
      const results = await Promise.all([
        generateTemplate(listingId, orgId),
        generateTemplate(listingId, orgId),
        generateTemplate(listingId, orgId),
      ])

      // Save each generated template
      const saved: Template[] = []
      for (const result of results) {
        const template = await saveTemplate({
          org_id: orgId,
          listing_id: listingId,
          name: result.name,
          design_data: result.design_data,
          preview_url: null,
        })
        saved.push(template)
      }

      setTemplates((prev) => [...saved, ...prev])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate templates'
      setError(message)
    } finally {
      setGenerating(false)
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
            <h2 className="text-lg font-semibold text-foreground">Choose a Template</h2>
            <p className="text-sm text-muted-foreground">
              Select a design template for your post, or generate new ones with AI.
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
              ? `${templates.length} template${templates.length !== 1 ? 's' : ''} available`
              : 'No templates yet'}
          </span>
          <button
            onClick={handleGenerate}
            disabled={generating || !listingId || !orgId}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Templates
              </>
            )}
          </button>
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

          {/* Generating state */}
          {generating && templates.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <Loader2 className="w-6 h-6 animate-spin text-primary absolute -bottom-1 -right-1" />
              </div>
              <p className="text-sm text-muted-foreground">AI is designing your templates...</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !generating && templates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Sparkles className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No templates for this listing yet.</p>
              <p className="text-xs text-muted-foreground/60">
                Click "Generate Templates" to create AI-powered designs.
              </p>
            </div>
          )}

          {/* Template grid */}
          {templates.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <TemplatePreview
                  key={template.id}
                  template={template}
                  onClick={() => handleSelect(template)}
                  selected={selectedId === template.id}
                />
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
              Use Selected Template
            </button>
          )}
        </div>
      </div>
    </div>
  )
}