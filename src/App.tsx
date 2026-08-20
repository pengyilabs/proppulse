import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './lib/auth-context'
import { OrgStoreProvider } from './app/stores/org-store'
import { LoginPage } from './app/pages/login-page'
import { DashboardPage } from './app/pages/dashboard-page'
import { ListingsPage } from './app/pages/listings-page'
import { PostsPage } from './app/pages/posts-page'
import { CreatePostPage } from './app/pages/create-post-page'
import { SettingsPage } from './app/pages/settings-page'
import { OrganizationSetupPage } from './app/pages/organization-setup'
import { Layout } from './app/components/layout'

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup" element={<OrganizationSetupPage />} />
        <Route
          element={
            <OrgStoreProvider>
              <Layout />
            </OrgStoreProvider>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/listings" element={<ListingsPage />} />
          <Route path="/posts" element={<PostsPage />} />
          <Route path="/create" element={<CreatePostPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <Toaster position="bottom-right" theme="dark" />
    </AuthProvider>
  )
}