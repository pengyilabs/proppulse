import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { InsightsCard } from './insights-card'
import { getInsightsForPost } from '../../lib/services/insights-service'

interface InsightsPanelProps {
  postId: string
  platform: string
}

export function InsightsPanel({ postId, platform }: InsightsPanelProps) {
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)

  const loadTimestamp = useCallback(async () => {
    try {
      const data = await getInsightsForPost(postId)
      if (data) {
        setFetchedAt(data.fetched_at)
      }
    } catch {
      // Timestamp fetch is non-critical; errors are handled by InsightsCard
    }
  }, [postId])

  useEffect(() => {
    loadTimestamp()
  }, [loadTimestamp])

  return (
    <div className="p-4">
      <InsightsCard postId={postId} platform={platform} />
    </div>
  )
}