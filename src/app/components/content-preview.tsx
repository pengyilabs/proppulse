import { useState } from 'react'
import { X, Image, Hash, Globe, ThumbsUp, MessageCircle, Share2, Eye, RefreshCw, Sparkles, Check } from 'lucide-react'
import { clsx } from 'clsx'
import type { GeneratedContent } from '../../lib/services/content-generation-service'
import type { Listing } from '../../lib/services/listings-service'

interface ContentPreviewProps {
  content: GeneratedContent
  listing: Listing
  onEdit: (content: GeneratedContent) => void
  onRegenerateImage?: () => Promise<void>
  onRegenerateCaption?: () => Promise<void>
  platform: string
  language: string
  regeneratingImage?: boolean
  regeneratingCaption?: boolean
}

function FacebookMockup({ content, listing }: { content: GeneratedContent; listing: Listing }) {
  const displayImage = content.imageUrl || listing.images?.[0]

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm max-w-md mx-auto">
      <div className="flex items-center gap-3 p-3">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
          PP
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">PropPulse Real Estate</p>
          <p className="text-xs text-gray-500">Just now · 🌐</p>
        </div>
      </div>
      <div className="px-3 pb-2">
        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
          {content.caption}
        </p>
      </div>
      {displayImage && (
        <div className="aspect-[16/10] bg-gray-100">
          <img
            src={displayImage}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <div className="flex items-center gap-1">
            <ThumbsUp className="w-3.5 h-3.5 text-blue-500" />
            <span>0</span>
          </div>
          <div className="flex items-center gap-2">
            <span>0 comments</span>
            <span>0 shares</span>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-1 flex items-center gap-1">
          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md hover:bg-gray-100 text-xs text-gray-600 font-medium transition-colors">
            <ThumbsUp className="w-4 h-4" />
            Like
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md hover:bg-gray-100 text-xs text-gray-600 font-medium transition-colors">
            <MessageCircle className="w-4 h-4" />
            Comment
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md hover:bg-gray-100 text-xs text-gray-600 font-medium transition-colors">
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>
    </div>
  )
}

function WeChatMockup({ content, listing }: { content: GeneratedContent; listing: Listing }) {
  const displayImage = content.imageUrl || listing.images?.[0]

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm max-w-md mx-auto">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Official Account</p>
        <p className="text-sm font-semibold text-gray-900 mt-1">PropPulse Real Estate</p>
      </div>
      <div className="p-4">
        <h2 className="text-base font-bold text-gray-900 mb-2 leading-snug">
          {listing.title}
        </h2>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <span>PropPulse</span>
          <span>·</span>
          <span>Just now</span>
        </div>
        {displayImage && (
          <div className="aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden mb-3">
            <img
              src={displayImage}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {content.caption}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            <span>0 reads</span>
          </div>
          <div className="flex items-center gap-1">
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>0 likes</span>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-200 px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-gray-400">Read more</span>
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4 text-gray-400" />
          <Share2 className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  )
}

export function ContentPreview({
  content,
  listing,
  onEdit,
  onRegenerateImage,
  onRegenerateCaption,
  platform,
  language,
  regeneratingImage,
  regeneratingCaption,
}: ContentPreviewProps) {
  const [caption, setCaption] = useState(content.caption)
  const [activeTab, setActiveTab] = useState<'caption' | 'image'>('caption')
  const [selectedVariant, setSelectedVariant] = useState(0)

  const variants = content.imageVariants || []
  const allImages = [
    ...(content.imageUrl ? [{ url: content.imageUrl, prompt: content.imagePrompt || '', createdAt: content.imageUrl }] : []),
    ...variants,
  ]

  const currentImage = allImages[selectedVariant]

  const handleCaptionChange = (value: string) => {
    setCaption(value)
    onEdit({ ...content, caption: value })
  }

  const handleRemoveHashtag = (index: number) => {
    const newHashtags = content.hashtags.filter((_, i) => i !== index)
    onEdit({ ...content, hashtags: newHashtags })
  }

  const handleAddHashtag = (tag: string) => {
    const cleaned = tag.startsWith('#') ? tag : `#${tag}`
    if (!content.hashtags.includes(cleaned)) {
      onEdit({ ...content, hashtags: [...content.hashtags, cleaned] })
    }
  }

  const [newTag, setNewTag] = useState('')

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="flex border-b border-border">
        {[
          { key: 'caption' as const, label: 'Caption & Hashtags' },
          { key: 'image' as const, label: 'Poster Image' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Caption Tab */}
      {activeTab === 'caption' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-foreground">
                  Caption
                </label>
                {onRegenerateCaption && (
                  <button
                    onClick={onRegenerateCaption}
                    disabled={regeneratingCaption}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {regeneratingCaption ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    Regenerate
                  </button>
                )}
              </div>
              <textarea
                value={caption}
                onChange={(e) => handleCaptionChange(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
                placeholder="Edit your caption here..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <Hash className="w-3.5 h-3.5 inline mr-1" />
                Hashtags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {content.hashtags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveHashtag(i)}
                      className="hover:text-primary/70 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTag.trim()) {
                      handleAddHashtag(newTag.trim())
                      setNewTag('')
                    }
                  }}
                  placeholder="Add hashtag..."
                  className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  onClick={() => {
                    if (newTag.trim()) {
                      handleAddHashtag(newTag.trim())
                      setNewTag('')
                    }
                  }}
                  disabled={!newTag.trim()}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                <Globe className="w-3.5 h-3.5 inline mr-1" />
                Language
              </label>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/30 capitalize">
                {language === 'en' ? 'English' : language === 'fr' ? 'French' : 'Chinese'}
              </span>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {platform === 'wechat' ? 'WeChat Article Preview' : 'Facebook Post Preview'}
            </label>
            {platform === 'wechat' ? (
              <WeChatMockup content={{ ...content, caption }} listing={listing} />
            ) : (
              <FacebookMockup content={{ ...content, caption }} listing={listing} />
            )}
          </div>
        </div>
      )}

      {/* Image Tab */}
      {activeTab === 'image' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image display */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-foreground">
                <Image className="w-3.5 h-3.5 inline mr-1" />
                Generated Poster
              </label>
              {onRegenerateImage && (
                <button
                  onClick={onRegenerateImage}
                  disabled={regeneratingImage}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  {regeneratingImage ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  Regenerate
                </button>
              )}
            </div>

            {currentImage ? (
              <div className="rounded-xl overflow-hidden border border-border bg-secondary">
                <img
                  src={currentImage.url}
                  alt="AI-generated poster"
                  className="w-full object-contain max-h-[500px]"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-secondary/50 rounded-xl border border-border">
                <Image className="w-12 h-12 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No image generated yet.</p>
              </div>
            )}

            {/* Image prompt */}
            {currentImage?.prompt && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Generation Prompt
                </label>
                <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
                  {currentImage.prompt}
                </p>
              </div>
            )}
          </div>

          {/* Image variants gallery */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
              Image Variants ({allImages.length})
            </label>
            {allImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-secondary/50 rounded-xl border border-border">
                <Image className="w-12 h-12 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No variants yet.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Regenerate the image to create new variants.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {allImages.map((variant, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedVariant(i)}
                    className={clsx(
                      'relative rounded-xl overflow-hidden border-2 transition-all aspect-[4/5]',
                      selectedVariant === i
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <img
                      src={variant.url}
                      alt={`Variant ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {selectedVariant === i && (
                      <div className="absolute top-2 left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-xs text-white font-medium">Variant {i + 1}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}