import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search,
  Sparkles,
  Loader2,
  Calendar,
  Clock,
  Send,
  Check,
  ArrowLeft,
  Building2,
  FileText,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react'
import { clsx } from 'clsx'
import { supabase } from '../../lib/supabase'
import { useOrgStore } from '../stores/org-store'
import { useAuth } from '../../lib/auth-context'
import { getListings, getListing } from '../../lib/services/listings-service'
import type { Listing } from '../../lib/services/listings-service'
import type { Template } from '../../lib/services/templates-service'
import type { GeneratedContent } from '../../lib/services/content-generation-service'
import { generateCaption, generatePosterImage } from '../../lib/services/content-generation-service'
import { ListingCard } from '../components/listing-card'
import { TemplatePicker } from '../components/template-picker'
import { ContentPreview } from '../components/content-preview'

type Step = 'listing' | 'design' | 'review'

export function CreatePostPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedListingId = searchParams.get('listingId')
  const { currentOrg, members } = useOrgStore()
  const { user } = useAuth()

  const [step, setStep] = useState<Step>('listing')
  const [listings, setListings] = useState<Listing[]>([])
  const [listingsLoading, setListingsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)

  // Content state
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  // Schedule state
  const [scheduledDate, setScheduledDate] = useState<string>('')
  const [scheduledTime, setScheduledTime] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const isAdmin = user
    ? members.some((m) => m.user_id === user.id && m.role === 'admin')
    : false

  const loadListings = useCallback(async () => {
    if (!currentOrg) return
    setListingsLoading(true)
    try {
      const data = await getListings(currentOrg.id)
      setListings(data)
    } catch {
      // silently fail
    } finally {
      setListingsLoading(false)
    }
  }, [currentOrg])

  useEffect(() => {
    loadListings()
  }, [loadListings])

  // Pre-select listing from URL
  useEffect(() => {
    if (!preselectedListingId || !currentOrg) return

    let cancelled = false

    async function preloadListing() {
      try {
        const listing = await getListing(preselectedListingId!)
        if (cancelled) return
        setSelectedListing(listing)
        setStep('design')
        setTemplatePickerOpen(true)
      } catch {
        // listing not found
      }
    }

    preloadListing()

    return () => {
      cancelled = true
    }
  }, [preselectedListingId, currentOrg])

  const filteredListings = listings.filter((l) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      l.title.toLowerCase().includes(q) ||
      (l.location && l.location.toLowerCase().includes(q)) ||
      (l.property_type && l.property_type.toLowerCase().includes(q))
    )
  })

  const handleSelectListing = (listing: Listing) => {
    setSelectedListing(listing)
    setSelectedTemplate(null)
    setGeneratedContent(null)
    setStep('design')
    setTemplatePickerOpen(true)
  }

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template)
    setTemplatePickerOpen(false)
  }

  const handleConfirmTemplate = () => {
    if (!selectedTemplate) return
    setTemplatePickerOpen(false)
    handleGenerate()
  }

  // Generate both image and caption
  const handleGenerate = async () => {
    if (!selectedListing || !currentOrg || !user) return

    setGenerating(true)
    setGenerationError(null)

    try {
      const platform = currentOrg.default_platform as 'facebook' | 'wechat'
      const language = currentOrg.default_language

      // Generate both in parallel
      const [captionResult, imageResult] = await Promise.all([
        generateCaption({
          listingId: selectedListing.id,
          platform,
          language,
        }),
        generatePosterImage({
          listingId: selectedListing.id,
          platform,
          language,
        }),
      ])

      setGeneratedContent({
        caption: captionResult.caption,
        hashtags: captionResult.hashtags,
        imageUrl: imageResult.imageUrl,
        imagePrompt: imageResult.imagePrompt,
        imageVariants: [{
          url: imageResult.imageUrl,
          prompt: imageResult.imagePrompt,
          createdAt: new Date().toISOString(),
        }],
      })

      setStep('review')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate content'
      setGenerationError(message)
    } finally {
      setGenerating(false)
    }
  }

  // Regenerate only the image
  const handleRegenerateImage = async () => {
    if (!selectedListing || !currentOrg || !generatedContent) return

    setGeneratingImage(true)
    setGenerationError(null)

    try {
      const platform = currentOrg.default_platform as 'facebook' | 'wechat'
      const language = currentOrg.default_language

      const imageResult = await generatePosterImage({
        listingId: selectedListing.id,
        platform,
        language,
      })

      const newVariant = {
        url: imageResult.imageUrl,
        prompt: imageResult.imagePrompt,
        createdAt: new Date().toISOString(),
      }

      setGeneratedContent({
        ...generatedContent,
        imageUrl: imageResult.imageUrl,
        imagePrompt: imageResult.imagePrompt,
        imageVariants: [...(generatedContent.imageVariants || []), newVariant],
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to regenerate image'
      setGenerationError(message)
    } finally {
      setGeneratingImage(false)
    }
  }

  // Regenerate only the caption
  const handleRegenerateCaption = async () => {
    if (!selectedListing || !currentOrg || !generatedContent) return

    setGeneratingCaption(true)
    setGenerationError(null)

    try {
      const platform = currentOrg.default_platform as 'facebook' | 'wechat'
      const language = currentOrg.default_language

      const captionResult = await generateCaption({
        listingId: selectedListing.id,
        platform,
        language,
      })

      setGeneratedContent({
        ...generatedContent,
        caption: captionResult.caption,
        hashtags: captionResult.hashtags,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to regenerate caption'
      setGenerationError(message)
    } finally {
      setGeneratingCaption(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedListing || !selectedTemplate || !generatedContent || !currentOrg || !user) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      let scheduledAt: string | null = null
      if (scheduledDate) {
        const timeStr = scheduledTime || '09:00'
        scheduledAt = new Date(`${scheduledDate}T${timeStr}:00`).toISOString()
      }

      const postStatus = isAdmin ? 'approved' : 'pending_approval'
      const now = new Date().toISOString()

      const { error } = await supabase.from('posts').insert({
        org_id: currentOrg.id,
        broker_id: user.id,
        listing_id: selectedListing.id,
        template_id: selectedTemplate.id,
        content: {
          caption: generatedContent.caption,
          hashtags: generatedContent.hashtags,
          imageUrl: generatedContent.imageUrl,
          imagePrompt: generatedContent.imagePrompt,
          imageVariants: generatedContent.imageVariants,
        },
        status: postStatus,
        scheduled_date: scheduledAt,
        platform: currentOrg.default_platform,
        language: currentOrg.default_language,
        ...(isAdmin ? { approved_by: user.id, approved_at: now } : {}),
      })

      if (error) throw new Error(error.message)

      setSubmitSuccess(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create post'
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Post Created!</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Your post has been {isAdmin ? 'approved and scheduled' : 'submitted for approval'}.
        </p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => navigate('/posts')}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            View Posts
          </button>
          <button
            onClick={() => {
              setStep('listing')
              setSelectedListing(null)
              setSelectedTemplate(null)
              setGeneratedContent(null)
              setSubmitSuccess(false)
              setScheduledDate('')
              setScheduledTime('')
            }}
            className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            Create Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Create Post</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a listing, choose a design, and generate a social media post.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {([
          { key: 'listing' as Step, label: 'Select Listing', icon: Building2 },
          { key: 'design' as Step, label: 'Choose Design', icon: FileText },
          { key: 'review' as Step, label: 'Generate & Review', icon: Sparkles },
        ]).map((s, i) => {
          const stepOrder = ['listing', 'design', 'review']
          const currentIdx = stepOrder.indexOf(step)
          const stepIdx = stepOrder.indexOf(s.key)
          const isActive = stepIdx === currentIdx
          const isCompleted = stepIdx < currentIdx

          return (
            <div key={s.key} className="flex items-center gap-2 shrink-0">
              {i > 0 && <div className="w-8 h-px bg-border" />}
              <div className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isActive && 'bg-primary/10 text-primary',
                isCompleted && 'text-green-600',
                !isActive && !isCompleted && 'text-muted-foreground'
              )}>
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <s.icon className="w-4 h-4" />
                )}
                {s.label}
              </div>
            </div>
          )
        })}
      </div>

      {/* Step 1: Select Listing */}
      {step === 'listing' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search listings by title, location, or type..."
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {listingsLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {!listingsLoading && filteredListings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Building2 className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No listings match your search.' : 'No listings yet.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => navigate('/listings')}
                  className="text-sm text-primary hover:underline"
                >
                  Create a listing first
                </button>
              )}
            </div>
          )}

          {!listingsLoading && filteredListings.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onClick={handleSelectListing}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Design */}
      {step === 'design' && selectedListing && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setStep('listing')
                setSelectedTemplate(null)
              }}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-sm text-muted-foreground">Creating post for</p>
              <p className="text-lg font-semibold text-foreground">{selectedListing.title}</p>
            </div>
          </div>

          {selectedTemplate ? (
            <div className="space-y-4">
              {/* Selected design preview */}
              <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl">
                <div className="w-16 h-20 rounded-lg overflow-hidden bg-secondary shrink-0">
                  <img
                    src={selectedTemplate.image_url}
                    alt={selectedTemplate.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {selectedTemplate.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Design selected. Click generate to create your post.
                  </p>
                </div>
                <button
                  onClick={() => setTemplatePickerOpen(true)}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                >
                  Change
                </button>
              </div>

              {/* Generate button */}
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  AI will generate a poster image and a social media caption based on the listing and selected design.
                </p>
                <button
                  onClick={handleConfirmTemplate}
                  disabled={generating}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Post
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <FileText className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No design selected yet.</p>
              <button
                onClick={() => setTemplatePickerOpen(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Choose a Design
              </button>
            </div>
          )}

          <TemplatePicker
            isOpen={templatePickerOpen}
            onClose={() => setTemplatePickerOpen(false)}
            onSelect={handleSelectTemplate}
            orgId={currentOrg?.id}
          />
        </div>
      )}

      {/* Step 3: Review & Schedule */}
      {step === 'review' && selectedListing && selectedTemplate && generatedContent && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setStep('design')
                setGeneratedContent(null)
              }}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-lg font-semibold text-foreground">Review & Schedule</p>
              <p className="text-sm text-muted-foreground">
                Review your AI-generated content and choose when to publish.
              </p>
            </div>
          </div>

          {/* Error */}
          {generationError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <p className="font-medium">Generation error</p>
              <p className="mt-1">{generationError}</p>
            </div>
          )}

          {/* Content Preview with regenerate buttons */}
          <ContentPreview
            content={generatedContent}
            listing={selectedListing}
            onEdit={(updated) => setGeneratedContent(updated)}
            onRegenerateImage={handleRegenerateImage}
            onRegenerateCaption={handleRegenerateCaption}
            regeneratingImage={generatingImage}
            regeneratingCaption={generatingCaption}
            platform={currentOrg?.default_platform || 'facebook'}
            language={currentOrg?.default_language || 'en'}
          />

          {/* Schedule */}
          <div className="p-4 bg-card border border-border rounded-xl space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Publishing Options</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />
                  Schedule Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <Clock className="w-3.5 h-3.5 inline mr-1" />
                  Schedule Time
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>Platform: <span className="font-medium capitalize">{currentOrg?.default_platform || 'Facebook'}</span></p>
              <p>Language: <span className="font-medium capitalize">{currentOrg?.default_language === 'en' ? 'English' : currentOrg?.default_language === 'fr' ? 'French' : 'Chinese'}</span></p>
            </div>
          </div>

          {/* Submit error */}
          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {submitError}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit for Approval
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Loading state for initial generation */}
      {generating && step === 'design' && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <Loader2 className="w-6 h-6 animate-spin text-primary absolute -bottom-1 -right-1" />
          </div>
          <p className="text-sm font-medium text-foreground">Generating your post...</p>
          <p className="text-xs text-muted-foreground">
            Creating AI poster image and social media caption...
          </p>
        </div>
      )}
    </div>
  )
}