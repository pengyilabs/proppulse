import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Organization, OrganizationMember } from '../../lib/services/organizations-service'
import { getOrganizations, getMembers } from '../../lib/services/organizations-service'

interface OrgStoreState {
  organizations: Organization[]
  currentOrg: Organization | null
  setCurrentOrg: (org: Organization) => void
  members: OrganizationMember[]
  loading: boolean
  error: string | null
}

const OrgStoreContext = createContext<OrgStoreState | null>(null)

export function OrgStoreProvider({ children }: { children: React.ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const orgs = await getOrganizations()
      setOrganizations(orgs)
      if (orgs.length > 0 && !currentOrg) {
        setCurrentOrg(orgs[0] ?? null)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMembers = useCallback(async () => {
    if (!currentOrg) return
    try {
      const memberList = await getMembers(currentOrg.id)
      setMembers(memberList)
    } catch {
      // silently fail - members will be empty
    }
  }, [currentOrg])

  useEffect(() => {
    loadOrganizations()
  }, [loadOrganizations])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const handleSetCurrentOrg = useCallback((org: Organization) => {
    setCurrentOrg(org)
  }, [])

  return (
    <OrgStoreContext.Provider
      value={{
        organizations,
        currentOrg,
        setCurrentOrg: handleSetCurrentOrg,
        members,
        loading,
        error,
      }}
    >
      {children}
    </OrgStoreContext.Provider>
  )
}

export function useOrgStore() {
  const ctx = useContext(OrgStoreContext)
  if (!ctx) throw new Error('useOrgStore must be used within OrgStoreProvider')
  return ctx
}