import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth-context'
import { useEffect } from 'react'
import { LayoutDashboard, Building2, FileText, Settings, LogOut, PlusCircle } from 'lucide-react'
import { clsx } from 'clsx'

export function Layout() {
  const { user, signOut, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!user) return null

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/listings', icon: Building2, label: 'Listings' },
    { path: '/posts', icon: FileText, label: 'Posts' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-primary">PropPulse</h1>
          <p className="text-xs text-muted-foreground mt-1">AI-Powered Publishing</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={clsx(
                'flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                location.pathname === item.path
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <button
            onClick={() => navigate('/create')}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors mb-3"
          >
            <PlusCircle className="w-4 h-4" />
            Create Post
          </button>
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}