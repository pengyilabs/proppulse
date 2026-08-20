import { useState } from 'react'
import { X, Image, Video, Hash, Globe, ThumbsUp, MessageCircle, Share2, Eye } from 'lucide-react'
import { clsx } from 'clsx'
import type { GeneratedContent } from '../../lib/services/content-generation-service'
import type { Listing } from '../../lib/services/listings-service'
import type { Template } from '../../lib/services/templates-service'

interface ContentPreviewProps {
  content: GeneratedContent
  listing: Listing
  template: Template
  onEdit: (content: GeneratedContent) => void
  platform: string
  language: string
}

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'zh', label: 'Chinese' },
]

function FacebookMockup({ content, listing }: { content: GeneratedContent; listing: Listing }) {
  const primaryImage = listing.images?.[0]

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
          PP
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">PropPulse Real Estate</p>
          <p className="text-xs text-gray-500">Just now · 🌐</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pb-2">
        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
          {content.caption}
        </p>
      </div>

      {/* Image */}
      {primaryImage && (
        <div className="aspect-[16/10] bg-gray-100">
          <img
            src={primaryImage}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Engagement bar */}
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
  const primaryImage = listing.images?.[0]

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm max-w-md mx-auto">
      {/* WeChat article header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Official Account</p>
        <p className="text-sm font-semibold text-gray-900 mt-1">PropPulse Real Estate</p>
      </div>

      {/* Article content */}
      <div className="p-4">
        <h2 className="text-base font-bold text-gray-900 mb-2 leading-snug">
          {listing.title}
        </h2>

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <span>PropPulse</span>
          <span>·</span>
          <span>Just now</span>
        </div>

        {primaryImage && (
          <div className="aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden mb-3">
            <img
              src={primaryImage}
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

      {/* WeChat bottom bar */}
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
  template,
  onEdit,
  platform,
  language,
}: ContentPreviewProps) {
  const [caption, setCaption] = useState(content.caption)
  const [activeTab, setActiveTab] = useState<'caption' | 'image' | 'video'>('caption')

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
          { key: 'image' as const, label: 'Image Prompt' },
          { key: 'video' as const, label: 'Video Prompt' },
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

      {/* Tab Content */}
      {activeTab === 'caption' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Caption
              </label>
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
              <div className="flex gap-2">
                {LANGUAGE_OPTIONS.map((opt) => (
                  <span
                    key={opt.value}
                    className={clsx(
                      'px-3 py-1 rounded-full text-xs font-medium border',
                      language === opt.value
                        ? 'bg-primary/10 text-primary border-primary/30'
                        : 'bg-secondary text-muted-foreground border-border'
                    )}
                  >
                    {opt.label}
                  </span>
                ))}
              </div>
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

      {activeTab === 'image' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              <Image className="w-3.5 h-3.5 inline mr-1" />
              Image Generation Prompt
            </label>
            <div className="p-4 bg-secondary/50 border border-border rounded-lg">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {content.imagePrompt || 'No image prompt generated.'}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/60">
            This prompt is used by the AI image generator to create the post image. It is not editable here.
          </p>
        </div>
      )}

      {activeTab === 'video' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              <Video className="w-3.5 h-3.5 inline mr-1" />
              Video Generation Prompt
            </label>
            <div className="p-4 bg-secondary/50 border border-border rounded-lg">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {content.videoPrompt || 'No video prompt generated.'}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/60">
            This prompt is used by the AI video generator to create the post video. It is not editable here.
          </p>
        </div>
      )}
    </div>
  )
}