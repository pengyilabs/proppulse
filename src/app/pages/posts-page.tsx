import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2,
  Calendar,
  Globe,
  Eye,
  Trash2,
  Check,
  X,
  Filter,
  XCircle,
  Hash,
  Image,
  Video,
  AlertCircle,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useOrgStore } from '../stores/org-store'
import { useAuth } from '../../lib/auth-context'
import {
  getPosts,
  getPendingApprovals,
  getBrokerPosts,
  approvePost,
  rejectPost,
  deletePost,
} from '../../lib/services/posts-service'
import type { PostWithRelations } from '../../lib/services/posts-service'
import { PostStatusBadge } from '../components/post-status-badge'

type TabKey = 'all' | 'pending' | 'mine'

export function PostsPage() {
  const navigate = useNavigate()
  const { currentOrg, members, loading: orgLoading } = useOrgStore()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [posts, setPosts] = useState<PostWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [selectedPost, setSelectedPost] = useState<PostWithRelations | null>(null)
  const [dateFilter, setDateFilter] = useState<string>('')
  const [showDateFilter, setShowDateFilter] = useState(false)

  const currentMember = members.find((m) => m.user_id === user?.id)
  const isAdmin = currentMember?.role === 'admin'

  const loadPosts = useCallback(async () => {
    if (!currentOrg) return
    try {
      setLoading(true)
      setError(null)

      let data: PostWithRelations[]
      switch (activeTab) {
        case 'pending':
          data = await getPendingApprovals(currentOrg.id)
          break
        case 'mine':
          if (!user) return
          data = await getBrokerPosts(currentOrg.id, user.id)
          break
        default:
          data = await getPosts(currentOrg.id)
      }
      setPosts(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load posts'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [currentOrg, activeTab, user])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const handleApprove = async (postId: string) => {
    if (!user) return
    try {
      setProcessingId(postId)
      await approvePost(postId, user.id)
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, status: 'approved' as const } : p))
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to approve post'
      setError(message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (postId: string) => {
    if (!user || !feedback.trim()) return
    try {
      setProcessingId(postId)
      await rejectPost(postId, user.id, feedback.trim())
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, status: 'rejected' as const, rejection_feedback: feedback.trim() }
            : p
        )
      )
      setRejectingId(null)
      setFeedback('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reject post'
      setError(message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (postId: string) => {
    try {
      setProcessingId(postId)
      await deletePost(postId)
      setPosts((prev) => prev.filter((p) => p.id !== postId))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete post'
      setError(message)
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const platformLabel = (platform: string) => {
    return platform === 'wechat' ? 'WeChat' : 'Facebook'
  }

  const languageLabel = (lang: string) => {
    const labels: Record<string, string> = { en: 'EN', fr: 'FR', zh: 'ZH' }
    return labels[lang] || lang.toUpperCase()
  }

  const filteredPosts = dateFilter
    ? posts.filter((p) => {
        if (!p.scheduled_date) return false
        const postDate = new Date(p.scheduled_date).toISOString().split('T')[0]
        return postDate === dateFilter
      })
    : posts

  const tabs: { key: TabKey; label: string; show: boolean }[] = [
    { key: 'all', label: 'All Posts', show: true },
    { key: 'pending', label: 'Pending Approval', show: isAdmin },
    { key: 'mine', label: 'My Posts', show: !isAdmin },
  ]

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Posts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage, approve, and track your social media posts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
              showDateFilter
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-background text-muted-foreground border-border hover:bg-secondary'
            )}
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button
            onClick={() => navigate('/create')}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Create Post
          </button>
        </div>
      </div>

      {/* Date Filter */}
      {showDateFilter && (
        <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
          <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Scheduled Date
          </label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs
          .filter((t) => t.show)
          .map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key)
                setSelectedPost(null)
              }}
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

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="p-1 hover:bg-red-100 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredPosts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center">
            <Eye className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">No posts found</p>
          <p className="text-xs text-muted-foreground/70">
            {activeTab === 'pending'
              ? 'All posts have been reviewed.'
              : activeTab === 'mine'
              ? 'You have not created any posts yet.'
              : 'Create your first post to get started.'}
          </p>
          {activeTab !== 'pending' && (
            <button
              onClick={() => navigate('/create')}
              className="mt-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Create Post
            </button>
          )}
        </div>
      )}

      {/* Posts List */}
      {!loading && !error && filteredPosts.length > 0 && (
        <div className="space-y-3">
          {filteredPosts.map((post) => {
            const listingTitle = post.listings?.title || 'Unknown Listing'
            const isProcessing = processingId === post.id
            const isRejecting = rejectingId === post.id
            const isDraft = post.status === 'draft'
            const canEdit = !isAdmin && isDraft && post.broker_id === user?.id

            return (
              <div
                key={post.id}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                {/* Row */}
                <div className="flex items-center gap-4 p-4">
                  {/* Listing Info */}
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() =>
                        setSelectedPost(selectedPost?.id === post.id ? null : post)
                      }
                      className="text-left w-full"
                    >
                      <p className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors">
                        {listingTitle}
                      </p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {post.broker_email || post.broker_id.substring(0, 8)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Globe className="w-3 h-3" />
                          {platformLabel(post.platform)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {languageLabel(post.language)}
                        </span>
                        <PostStatusBadge status={post.status} />
                      </div>
                    </button>
                  </div>

                  {/* Scheduled Date */}
                  <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(post.scheduled_date)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isAdmin && post.status === 'pending_approval' && (
                      <>
                        <button
                          onClick={() => handleApprove(post.id)}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isProcessing && !isRejecting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setRejectingId(post.id)
                            setFeedback(post.rejection_feedback || '')
                          }}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <X className="w-3 h-3" />
                          Reject
                        </button>
                      </>
                    )}

                    {canEdit && (
                      <button
                        onClick={() => navigate(`/create`)}
                        className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                    )}

                    {((!isAdmin && isDraft) || isAdmin) && (
                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Rejection Feedback Form */}
                {isRejecting && (
                  <div className="px-4 pb-4 space-y-2 border-t border-border pt-3 mx-4">
                    <label className="block text-xs font-medium text-foreground">
                      Rejection Feedback
                    </label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Provide feedback for the broker..."
                      rows={2}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReject(post.id)}
                        disabled={isProcessing || !feedback.trim()}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isProcessing ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Rejecting...
                          </span>
                        ) : (
                          'Confirm Reject'
                        )}
                      </button>
                      <button
                        onClick={() => setRejectingId(null)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Content Preview (expanded) */}
                {selectedPost?.id === post.id && (
                  <div className="border-t border-border px-4 py-4 bg-secondary/30 space-y-4">
                    {/* Caption */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        Caption
                      </label>
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {(post.content as Record<string, unknown>)?.caption as string ||
                          'No caption'}
                      </p>
                    </div>

                    {/* Hashtags */}
                    {Array.isArray(
                      (post.content as Record<string, unknown>)?.hashtags
                    ) && (
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                          <Hash className="w-3.5 h-3.5" />
                          Hashtags
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {(
                            (post.content as Record<string, unknown>).hashtags as string[]
                          ).map((tag, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Image Prompt */}
                    {((post.content as Record<string, unknown>)?.imagePrompt as string) && (
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                          <Image className="w-3.5 h-3.5" />
                          Image Prompt
                        </label>
                        <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
                          {(post.content as Record<string, unknown>).imagePrompt as string}
                        </p>
                      </div>
                    )}

                    {/* Video Prompt */}
                    {((post.content as Record<string, unknown>)?.videoPrompt as string) && (
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                          <Video className="w-3.5 h-3.5" />
                          Video Prompt
                        </label>
                        <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">
                          {(post.content as Record<string, unknown>).videoPrompt as string}
                        </p>
                      </div>
                    )}

                    {/* Rejection Feedback (if rejected) */}
                    {post.status === 'rejected' && post.rejection_feedback && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <label className="flex items-center gap-1.5 text-xs font-medium text-red-700 mb-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Rejection Feedback
                        </label>
                        <p className="text-sm text-red-700">{post.rejection_feedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}