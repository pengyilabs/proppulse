import { useState, useEffect, useCallback } from 'react'
import { Check, X, Loader2, Calendar, Globe, Inbox } from 'lucide-react'
import { clsx } from 'clsx'
import { getPendingApprovals, approvePost, rejectPost } from '../../lib/services/posts-service'
import type { PostWithRelations } from '../../lib/services/posts-service'
import { useAuth } from '../../lib/auth-context'
import { PostStatusBadge } from './post-status-badge'

interface ApprovalQueueProps {
  orgId: string
}

export function ApprovalQueue({ orgId }: ApprovalQueueProps) {
  const { user } = useAuth()
  const [posts, setPosts] = useState<PostWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getPendingApprovals(orgId)
      setPosts(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load approvals'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const handleApprove = async (postId: string) => {
    if (!user) return
    try {
      setProcessingId(postId)
      await approvePost(postId, user.id)
      setPosts((prev) => prev.filter((p) => p.id !== postId))
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
      setPosts((prev) => prev.filter((p) => p.id !== postId))
      setRejectingId(null)
      setFeedback('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reject post'
      setError(message)
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not scheduled'
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        <p className="font-medium">Failed to load approvals</p>
        <p className="mt-1">{error}</p>
        <button
          onClick={loadPosts}
          className="mt-2 px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <Inbox className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No posts pending approval.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => {
        const listingTitle = post.listings?.title || 'Unknown Listing'
        const isProcessing = processingId === post.id
        const isRejecting = rejectingId === post.id

        return (
          <div
            key={post.id}
            className="p-4 bg-card border border-border rounded-xl space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {listingTitle}
                </p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {post.broker_email || post.broker_id.substring(0, 8)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Globe className="w-3 h-3" />
                    {platformLabel(post.platform)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {formatDate(post.scheduled_date)}
                  </span>
                  <PostStatusBadge status={post.status} />
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleApprove(post.id)}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing && !isRejecting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Approve
                </button>
                <button
                  onClick={() => {
                    setRejectingId(post.id)
                    setFeedback('')
                  }}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            </div>

            {isRejecting && (
              <div className="space-y-2 pt-2 border-t border-border">
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
          </div>
        )
      })}
    </div>
  )
}