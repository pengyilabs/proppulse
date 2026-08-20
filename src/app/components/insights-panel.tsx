import { InsightsCard } from './insights-card'

interface InsightsPanelProps {
  postId: string
  platform: string
}

export function InsightsPanel({ postId, platform }: InsightsPanelProps) {
  return (
    <div className="p-4">
      <InsightsCard postId={postId} platform={platform} />
    </div>
  )
}