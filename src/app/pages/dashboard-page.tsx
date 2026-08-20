import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Building2,
  Clock,
  Users,
  PlusCircle,
  Eye,
  Sparkles,
  Loader2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { useOrgStore } from '../stores/org-store'
import { useAuth } from '../../lib/auth-context'
import { getListings } from '../../lib/services/listings-service'
import { getPosts, getPendingApprovals, getBrokerPosts } from '../../lib/services/posts-service'
import type { PostWithRelations } from '../../lib/services/posts-service'
import { QuickActionCard } from '../components/quick-action-card'
import { ApprovalQueue } from '../components/approval-queue'
import { PostStatusBadge } from '../components/post-status-badge'

interface Stats {
  totalMembers: number
  activeListings: number
  totalPosts: number
  pendingApprovals: number
  postsThisMonth: number
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { currentOrg, members } = useOrgStore()
  const { user } = useAuth()

  const [stats, setStats] = useState<Stats>({
    totalMembers: 0, activeListings: 0, totalPosts: 0, pendingApprovals: 0, postsThisMonth: 0,
  })
  const [recentPosts, setRecentPosts] = useState<PostWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = user
    ? members.some((m) => m.user_id === user.id && m.role === 'admin')
    : false

  const loadStats = useCallback(async () => {
    if (!currentOrg || !user) return
    setLoading(true)
    setError(null)

    try {
      let posts: PostWithRelations[] = []

      if (isAdmin) {
        const [listings, allPosts, pending] = await Promise.all([
          getListings(currentOrg.id),
          getPosts(currentOrg.id),
          getPendingApprovals(currentOrg.id),
        ])
        posts = allPosts
        setStats({
          totalMembers: members.length,
          activeListings: listings.filter((l) => l.status === 'active').length,
          totalPosts: allPosts.length,
          pendingApprovals: pending.length,
          postsThisMonth: allPosts.filter((p) => {
            const d = new Date(p.created_at)
            const now = new Date()
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
          }).length,
        })
      } else {
        const [listings, brokerPosts] = await Promise.all([
          getListings(currentOrg.id),
          getBrokerPosts(currentOrg.id, user.id),
        ])
        posts = brokerPosts
        setStats({
          totalMembers: 0,
          activeListings: listings.filter((l) => l.status === 'active').length,
          totalPosts: brokerPosts.length,
          pendingApprovals: brokerPosts.filter((p) => p.status === 'pending_approval').length,
          postsThisMonth: brokerPosts.filter((p) => {
            const d = new Date(p.created_at)
            const now = new Date()
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
          }).length,
        })
      }

      setRecentPosts(posts.slice(0, 5))
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [currentOrg, user, isAdmin, members.length])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <p className="text-sm text-red-500">{error}</p>
        <button onClick={loadStats} className="text-sm text-primary hover:underline">Retry</button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin ? `${currentOrg.name} — Organization Overview` : 'Your publishing overview and quick actions.'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isAdmin && (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalMembers}</p>
                <p className="text-xs text-muted-foreground">Total Members</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.activeListings}</p>
              <p className="text-xs text-muted-foreground">Active Listings</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{isAdmin ? stats.totalPosts : stats.postsThisMonth}</p>
              <p className="text-xs text-muted-foreground">{isAdmin ? 'Total Posts' : 'Posts This Month'}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3">
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

      {/* Admin-specific sections */}
      {isAdmin && (
        <>
          {/* Approval Queue */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Approval Queue</h2>
              <button onClick={() => navigate('/posts?tab=pending')} className="text-xs text-primary hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <ApprovalQueue orgId={currentOrg.id} />
          </div>

          {/* Recent Posts */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Recent Posts</h2>
              <button onClick={() => navigate('/posts')} className="text-xs text-primary hover:underline flex items-center gap-1">
                View All Posts <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {recentPosts.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No posts yet. Create your first post!</p>
                <button onClick={() => navigate('/create')} className="mt-3 text-sm text-primary hover:underline">Create Post</button>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Listing</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Platform</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPosts.map((post) => (
                      <tr key={post.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => navigate('/posts')}>
                        <td className="px-4 py-3 text-sm text-foreground">{post.listings?.title || '—'}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{post.platform}</td>
                        <td className="px-4 py-3"><PostStatusBadge status={post.status} /></td>
                        <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{new Date(post.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Quick Actions (both admin and broker) */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Quick Actions</h2>
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
          {isAdmin && (
            <QuickActionCard
              icon={Users}
              title="Manage Settings"
              description="Configure organization settings and platform connections"
              onClick={() => navigate('/settings')}
              color="accent"
            />
          )}
          <QuickActionCard
            icon={Sparkles}
            title={isAdmin ? 'View Posts' : 'Create from Listing'}
            description={isAdmin ? 'Review and manage all posts' : 'Quickly create a post from an available listing'}
            onClick={() => isAdmin ? navigate('/posts') : navigate('/listings')}
            color="amber"
          />
        </div>
      </div>
    </div>
  )
}