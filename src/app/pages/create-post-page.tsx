import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search,
  ChevronRight,
  Sparkles,
  Loader2,
  Calendar,
  Globe,
  Send,
  Check,
  ArrowLeft,
  Building2,
  FileText,
  Clock,
} from 'lucide-react'
import { clsx } from 'clsx'
import { supabase } from '../../lib/supabase'
import { useOrgStore } from '../stores/org-store'
import { useAuth } from '../../lib/auth-context'
import { getListings, getListing } from '../../lib/services/listings-service'
import type { Listing } from '../../lib/services/listings-service'
import type { Template } from '../../lib/services/templates-service'
import type { GeneratedContent } from '../../lib/services/content-generation-service'
import { generateFullContent } from '../../lib/services/content-generation-service'
import { ListingCard } from '../components/listing-card'
import { TemplatePicker } from '../components/template-picker'
import { ContentPreview } from '../components/content-preview'

type Step = 'listing' | 'template' | 'generate' | 'schedule'

const STEPS: { key: Step; label: string; icon: typeof Building2 }[] = [
  { key: 'listing', label: 'Select Listing', icon: Building2 },
  { key: 'template', label: 'Choose Template', icon: FileText },
  { key: 'generate', label: 'AI Content', icon: Sparkles },
  { key: 'schedule', label: 'Schedule & Publish', icon: Calendar },
]

const PLATFORM_OPTIONS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'wechat', label: 'WeChat' },
]

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'zh', label: 'Chinese' },
]

export function CreatePostPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedListingId = searchParams.get('listingId')
  const { currentOrg } = useOrgStore()
  const { user } = useAuth()

  const [step, setStep] = useState<Step>('listing')
  const [listings, setListings] = useState<Listing[]>([])
  const [listingsLoading, setListingsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [platform, setPlatform] = useState<string>('facebook')
  const [language, setLanguage] = useState<string>('en')
  const [scheduledDate, setScheduledDate] = useState<string>('')
  const [scheduledTime, setScheduledTime] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const loadListings = useCallback(async () => {
    if (!currentOrg) return
    setListingsLoading(true)
    try {
      const data = await getListings(currentOrg.id)
      setListings(data)
    } catch {
      // silently fail — listings will be empty
    } finally {
      setListingsLoading(false)
    }
  }, [currentOrg])

  useEffect(() => {
    loadListings()
  }, [loadListings])

  // Pre-select listing from URL query param
  useEffect(() => {
    if (!preselectedListingId || !currentOrg) return

    let cancelled = false

    async function preloadListing() {
      try {
        const listing = await getListing(preselectedListingId!)
        if (cancelled) return
        setSelectedListing(listing)
        setStep('template')
        setTemplatePickerOpen(true)
      } catch {
        // listing not found — stay on listing selection step
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
    setStep('template')
    setTemplatePickerOpen(true)
  }

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template)
    setTemplatePickerOpen(false)
  }

  const handleConfirmTemplate = () => {
    if (!selectedTemplate) return
    setTemplatePickerOpen(false)
    setStep('generate')
  }

  const handleGenerate = async () => {
    if (!selectedListing || !selectedTemplate) return
    setGenerating(true)
    setGenerationError(null)
    setGenerationProgress(0)

    const progressInterval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 90) return prev
        return prev + Math.random() * 15 + 5
      })
    }, 600)

    try {
      const content = await generateFullContent({
        listingId: selectedListing.id,
        templateId: selectedTemplate.id,
        platform: platform as 'facebook' | 'wechat',
        language,
      })
      setGeneratedContent(content)
      setGenerationProgress(100)
      setStep('schedule')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate content'
      setGenerationError(message)
    } finally {
      clearInterval(progressInterval)
      setGenerating(false)
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

      const { error } = await supabase.from('posts').insert({
        org_id: currentOrg.id,
        broker_id: user.id,
        listing_id: selectedListing.id,
        template_id: selectedTemplate.id,
        content: {
          caption: generatedContent.caption,
          hashtags: generatedContent.hashtags,
          imagePrompt: generatedContent.imagePrompt,
          videoPrompt: generatedContent.videoPrompt,
        },
        status: 'pending_approval',
        scheduled_date: scheduledAt,
        platform,
        language,
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

  const currentStepIndex = STEPS.findIndex((s) => s.key === step)

  if (submitSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Post Created!</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Your post has been submitted for approval.
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
          Create a new social media post with AI-generated content.
        </p>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const isActive = i === currentStepIndex
          const isCompleted = i < currentStepIndex
          const isClickable = isCompleted && i < currentStepIndex

          return (
            <div key={s.key} className="flex items-center gap-2 shrink-0">
              {i > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground/40" />}
              <button
                onClick={() => {
                  if (isClickable) {
                    setStep(s.key)
                    if (s.key === 'template') {
                      setTemplatePickerOpen(true)
                    }
                  }
                }}
                disabled={!isClickable && !isActive}
                className={clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isActive && 'bg-primary/10 text-primary',
                  isCompleted && !isActive && 'text-foreground hover:bg-secondary cursor-pointer',
                  !isActive && !isCompleted && 'text-muted-foreground cursor-default'
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <s.icon className="w-4 h-4" />
                )}
                {s.label}
              </button>
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

      {/* Step 2: Select Template */}
      {step === 'template' && selectedListing && (
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
            <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {selectedTemplate.name || 'Selected Template'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Template selected. Click continue to proceed.
                </p>
              </div>
              <button
                onClick={() => setTemplatePickerOpen(true)}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              >
                Change
              </button>
              <button
                onClick={handleConfirmTemplate}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Continue
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <FileText className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No template selected yet.</p>
              <button
                onClick={() => setTemplatePickerOpen(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Choose a Template
              </button>
            </div>
          )}

          <TemplatePicker
            isOpen={templatePickerOpen}
            onClose={() => {
              if (!selectedTemplate) {
                setTemplatePickerOpen(false)
              } else {
                setTemplatePickerOpen(false)
              }
            }}
            onSelect={handleSelectTemplate}
            listingId={selectedListing.id}
            orgId={currentOrg?.id}
          />
        </div>
      )}

      {/* Step 3: AI Generation */}
      {step === 'generate' && selectedListing && selectedTemplate && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setStep('template')
                setTemplatePickerOpen(true)
              }}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-lg font-semibold text-foreground">Generate AI Content</p>
              <p className="text-sm text-muted-foreground">
                AI will create a caption, hashtags, and media prompts for your post.
              </p>
            </div>
          </div>

          {/* Platform & Language Selection */}
          {!generating && !generatedContent && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-card border border-border rounded-xl">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Globe className="w-3.5 h-3.5 inline mr-1" />
                  Platform
                </label>
                <div className="flex gap-2">
                  {PLATFORM_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPlatform(opt.value)}
                      className={clsx(
                        'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                        platform === opt.value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-background text-foreground border-border hover:bg-secondary'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Language
                </label>
                <div className="flex gap-2">
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setLanguage(opt.value)}
                      className={clsx(
                        'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                        language === opt.value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-background text-foreground border-border hover:bg-secondary'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Generate Button or Progress */}
          {!generating && !generatedContent && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                AI will generate a platform-optimized caption, relevant hashtags, and media prompts based on your listing and template.
              </p>
              <button
                onClick={handleGenerate}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Generate Content
              </button>
            </div>
          )}

          {generating && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <Loader2 className="w-6 h-6 animate-spin text-primary absolute -bottom-1 -right-1" />
              </div>
              <p className="text-sm font-medium text-foreground">Generating content...</p>
              <div className="w-64 bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(generationProgress, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {generationProgress < 30
                  ? 'Analyzing listing details...'
                  : generationProgress < 60
                  ? 'Crafting platform-optimized caption...'
                  : generationProgress < 90
                  ? 'Generating media prompts...'
                  : 'Finalizing...'}
              </p>
            </div>
          )}

          {generationError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <p className="font-medium">Generation failed</p>
              <p className="mt-1">{generationError}</p>
              <button
                onClick={handleGenerate}
                className="mt-3 px-4 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Schedule & Publish */}
      {step === 'schedule' && selectedListing && selectedTemplate && generatedContent && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setStep('generate')
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

          {/* Content Preview */}
          <ContentPreview
            content={generatedContent}
            listing={selectedListing}
            template={selectedTemplate}
            onEdit={(updated) => setGeneratedContent(updated)}
            platform={platform}
            language={language}
          />

          {/* Schedule & Platform */}
          <div className="p-4 bg-card border border-border rounded-xl space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Publishing Options</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <Globe className="w-3.5 h-3.5 inline mr-1" />
                  Platform
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {PLATFORM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
          </div>

          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {submitError}
            </div>
          )}

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
    </div>
  )
}