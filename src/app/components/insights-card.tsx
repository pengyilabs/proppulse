import { useState, useEffect, useCallback } from 'react'
import { Eye, ThumbsUp, MessageCircle, Share2, RefreshCw } from 'lucide-react'
import { getInsightsForPost, fetchInsights, type PostInsights } from '../../lib/services/insights-service'

interface InsightsCardProps {
  postId: string
  platform: string
}

export function InsightsCard({ postId, platform }: InsightsCardProps) {
  const [insights, setInsights] = useState<PostInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadInsights = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getInsightsForPost(postId)
      setInsights(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    loadInsights()
  }, [loadInsights])

  const handleRefresh = async () => {
    setRefreshing(true)
    setError(null)
    try {
      const data = await fetchInsights(postId, platform)
      setInsights(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh insights')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Retry
        </button>
      </div>
    )
  }

  if (!insights) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground mb-3">No insights data yet</p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Fetching...' : 'Fetch Insights'}
        </button>
      </div>
    )
  }

  const metrics = [
    { label: 'Views', value: insights.metrics.views, icon: Eye },
    { label: 'Likes', value: insights.metrics.likes, icon: ThumbsUp },
    { label: 'Comments', value: insights.metrics.comments, icon: MessageCircle },
    { label: 'Shares', value: insights.metrics.shares, icon: Share2 },
  ]

  function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toString()
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border"
          >
            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-semibold text-foreground">{formatNumber(value)}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-muted-foreground">
          Last fetched: {new Date(insights.fetched_at).toLocaleString()}
        </p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </div>
  )
}