import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Building2,
  Clock,
  PlusCircle,
  Eye,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { useOrgStore } from '../stores/org-store'
import { useAuth } from '../../lib/auth-context'
import { getListings } from '../../lib/services/listings-service'
import { getBrokerPosts } from '../../lib/services/posts-service'
import type { PostWithRelations } from '../../lib/services/posts-service'
import { QuickActionCard } from '../components/quick-action-card'

interface BrokerStats {
  postsThisMonth: number
  availableListings: number
  pendingApprovals: number
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { currentOrg, members } = useOrgStore()
  const { user } = useAuth()

  const [stats, setStats] = useState<BrokerStats>({ postsThisMonth: 0, availableListings: 0, pendingApprovals: 0 })
  const [loading, setLoading] = useState(true)

  const isBroker = user
    ? members.some((m) => m.user_id === user.id && m.role === 'broker')
    : false

  const loadStats = useCallback(async () => {
    if (!currentOrg || !user) return
    setLoading(true)

    try {
      const [listings, posts] = await Promise.all([
        getListings(currentOrg.id),
        getBrokerPosts(currentOrg.id, user.id),
      ])

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const postsThisMonth = posts.filter(
        (p: PostWithRelations) => new Date(p.created_at) >= startOfMonth
      ).length

      const availableListings = listings.filter((l) => l.status === 'active').length
      const pendingApprovals = posts.filter((p: PostWithRelations) => p.status === 'pending_approval').length

      setStats({ postsThisMonth, availableListings, pendingApprovals })
    } catch {
      // silently fail — stats will remain at 0
    } finally {
      setLoading(false)
    }
  }, [currentOrg, user])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  if (!currentOrg) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Select an organization to view the dashboard.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isBroker ? 'Your publishing overview and quick actions.' : 'Your publishing overview will appear here.'}
        </p>
      </div>

      {/* Broker-specific stats */}
      {isBroker && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.postsThisMonth}</p>
                      <p className="text-xs text-muted-foreground">Posts This Month</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.availableListings}</p>
                      <p className="text-xs text-muted-foreground">Available Listings</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.pendingApprovals}</p>
                      <p className="text-xs text-muted-foreground">Pending Approvals</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
                  Quick Actions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <QuickActionCard
                    icon={PlusCircle}
                    title="Create a Post"
                    description="Create a new social media post from a listing"
                    onClick={() => navigate('/create')}
                    color="primary"
                  />
                  <QuickActionCard
                    icon={Eye}
                    title="Browse Listings"
                    description="View available properties to create posts from"
                    onClick={() => navigate('/listings')}
                    color="green"
                  />
                  <QuickActionCard
                    icon={FileText}
                    title="View My Posts"
                    description="Review and track your submitted posts"
                    onClick={() => navigate('/posts')}
                    color="accent"
                  />
                  <QuickActionCard
                    icon={Sparkles}
                    title="Create from Listing"
                    description="Quickly create a post from an available listing"
                    onClick={() => navigate('/listings')}
                    color="amber"
                  />
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Non-broker fallback */}
      {!isBroker && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Sparkles className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Welcome to PropPulse. Your publishing overview will appear here.
          </p>
        </div>
      )}
    </div>
  )
}