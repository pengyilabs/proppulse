import { useEffect, useState } from 'react'
import { CheckCircle, Circle, Link, Unlink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useOrgStore } from '../stores/org-store'
import type { SocialAccount } from '../../lib/services/social-accounts-service'
import {
  getSocialAccounts,
  connectAccount,
  disconnectAccount,
} from '../../lib/services/social-accounts-service'
import { FacebookAdapter } from '../../lib/services/facebook-adapter'
import { WeChatAdapter } from '../../lib/services/wechat-adapter'
import { platformRegistry } from '../../lib/services/platform-adapter'

interface PlatformFormState {
  visible: boolean
  platform: string
  fields: { label: string; key: string; placeholder: string }[]
  formValues: Record<string, string>
}

const PLATFORM_CONFIG: Record<string, {
  name: string
  color: string
  fields: { label: string; key: string; placeholder: string }[]
}> = {
  facebook: {
    name: 'Facebook',
    color: 'bg-blue-600',
    fields: [
      { label: 'Page ID', key: 'page_id', placeholder: 'Enter your Facebook Page ID' },
      { label: 'Access Token', key: 'access_token', placeholder: 'Enter your Page Access Token' },
    ],
  },
  wechat: {
    name: 'WeChat',
    color: 'bg-green-600',
    fields: [
      { label: 'App ID', key: 'app_id', placeholder: 'Enter your WeChat App ID' },
      { label: 'App Secret', key: 'app_secret', placeholder: 'Enter your WeChat App Secret' },
    ],
  },
}

export function SettingsPage() {
  const { currentOrg, loading: orgLoading } = useOrgStore()
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [formState, setFormState] = useState<PlatformFormState>({
    visible: false,
    platform: '',
    fields: [],
    formValues: {},
  })

  useEffect(() => {
    if (currentOrg) {
      loadAccounts()
    }
  }, [currentOrg])

  async function loadAccounts() {
    if (!currentOrg) return
    try {
      setLoading(true)
      const data = await getSocialAccounts(currentOrg.id)
      setAccounts(data)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  function getAccountForPlatform(platform: string): SocialAccount | undefined {
    return accounts.find((a) => a.platform === platform)
  }

  function openConnectForm(platform: string) {
    const config = PLATFORM_CONFIG[platform]
    if (!config) return
    const formValues: Record<string, string> = {}
    config.fields.forEach((f) => {
      formValues[f.key] = ''
    })
    setFormState({
      visible: true,
      platform,
      fields: config.fields,
      formValues,
    })
  }

  function cancelConnect() {
    setFormState({ visible: false, platform: '', fields: [], formValues: {} })
  }

  async function handleConnect(platform: string) {
    if (!currentOrg) return
    try {
      setConnecting(platform)

      const credentials: Record<string, unknown> = {
        ...formState.formValues,
        page_name: PLATFORM_CONFIG[platform]?.name ?? platform,
      }

      await connectAccount(currentOrg.id, platform, credentials)

      // Register the adapter in the platform registry
      const adapter =
        platform === 'facebook'
          ? new FacebookAdapter(currentOrg.id)
          : new WeChatAdapter(currentOrg.id)
      platformRegistry.registerAdapter(platform, adapter)

      await adapter.connect()

      cancelConnect()
      await loadAccounts()
      toast.success(`${PLATFORM_CONFIG[platform]?.name ?? platform} connected successfully`)
    } catch (err: any) {
      toast.error(err.message || `Failed to connect ${platform}`)
    } finally {
      setConnecting(null)
    }
  }

  async function handleDisconnect(account: SocialAccount) {
    if (!currentOrg) return
    try {
      setConnecting(account.platform)

      const adapter =
        account.platform === 'facebook'
          ? new FacebookAdapter(currentOrg.id)
          : new WeChatAdapter(currentOrg.id)
      await adapter.connect()
      await adapter.disconnect()

      await disconnectAccount(account.id)
      await loadAccounts()
      toast.success(`${PLATFORM_CONFIG[account.platform]?.name ?? account.platform} disconnected`)
    } catch (err: any) {
      toast.error(err.message || `Failed to disconnect ${account.platform}`)
    } finally {
      setConnecting(null)
    }
  }

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your organization and platform connections.</p>
      </div>

      {/* Connected Platforms */}
      <section className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Connected Platforms</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Connect your social media accounts to publish content directly from PropPulse.
        </p>

        <div className="space-y-4">
          {Object.entries(PLATFORM_CONFIG).map(([platform, config]) => {
            const account = getAccountForPlatform(platform)
            const isConnected = !!account
            const isBusy = connecting === platform

            return (
              <div
                key={platform}
                className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${config.color}`} />
                  <div>
                    <p className="font-medium text-foreground">{config.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {isConnected ? `Connected as ${account.page_name || account.page_id}` : 'Not connected'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                  {isConnected ? (
                    <button
                      onClick={() => handleDisconnect(account)}
                      disabled={isBusy}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Unlink className="w-4 h-4" />
                      )}
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => openConnectForm(platform)}
                      disabled={isBusy}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Link className="w-4 h-4" />
                      )}
                      Connect
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Connect Form */}
        {formState.visible && (
          <div className="mt-6 p-4 rounded-lg bg-secondary/30 border border-border">
            <h3 className="text-sm font-semibold mb-3">Enter Credentials</h3>
            <div className="space-y-3">
              {formState.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {field.label}
                  </label>
                  <input
                    type={field.key.includes('secret') || field.key.includes('token') ? 'password' : 'text'}
                    value={formState.formValues[field.key] ?? ''}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        formValues: { ...prev.formValues, [field.key]: e.target.value },
                      }))
                    }
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={cancelConnect}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConnect(formState.platform)}
                disabled={!!connecting}
                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {connecting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </span>
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Organization Settings */}
      <section className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Organization Settings</h2>
        {currentOrg ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Organization Name
              </label>
              <p className="text-foreground">{currentOrg.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Brand Preferences
              </label>
              {currentOrg.brand_preferences &&
              Object.keys(currentOrg.brand_preferences).length > 0 ? (
                <div className="space-y-1">
                  {Object.entries(currentOrg.brand_preferences).map(([key, value]) => (
                    <p key={key} className="text-sm text-foreground">
                      <span className="text-muted-foreground capitalize">{key}:</span>{' '}
                      {typeof value === 'string' ? value : JSON.stringify(value)}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No brand preferences configured.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No organization selected. Please set up an organization first.
          </p>
        )}
      </section>
    </div>
  )
}