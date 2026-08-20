import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth-context'
import { createOrganization, inviteMember } from '../../lib/services/organizations-service'
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Trash2, Building2 } from 'lucide-react'
import { clsx } from 'clsx'

interface TeamMemberInput {
  email: string
  role: 'admin' | 'broker'
}

export function OrganizationSetupPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [teamMembers, setTeamMembers] = useState<TeamMemberInput[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'broker'>('broker')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [orgId, setOrgId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!user) {
    navigate('/login')
    return null
  }

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function handleNameChange(value: string) {
    setName(value)
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value))
    }
  }

  function addTeamMember() {
    if (!newEmail.trim()) return
    setTeamMembers([...teamMembers, { email: newEmail.trim(), role: newRole }])
    setNewEmail('')
    setNewRole('broker')
  }

  function removeTeamMember(index: number) {
    setTeamMembers(teamMembers.filter((_, i) => i !== index))
  }

  async function handleCreateOrg() {
    setError('')
    setSubmitting(true)
    try {
      const org = await createOrganization(name, slug)
      setOrgId(org.id)
      setStep(3)
    } catch (err: any) {
      setError(err.message || 'Failed to create organization')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleInviteMembers() {
    if (!orgId || teamMembers.length === 0) {
      navigate('/')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      for (const member of teamMembers) {
        await inviteMember(orgId, member.email, member.role)
      }
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Failed to invite members')
      setSubmitting(false)
    }
  }

  const steps = [
    { num: 1, label: 'Company' },
    { num: 2, label: 'Team' },
    { num: 3, label: 'Done' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Setup Your Organization</h1>
          <p className="text-muted-foreground mt-2">Get started with PropPulse in just a few steps</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={clsx(
                  'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors',
                  step > s.num
                    ? 'bg-primary text-white'
                    : step === s.num
                      ? 'bg-primary text-white'
                      : 'bg-secondary text-muted-foreground border border-border'
                )}
              >
                {step > s.num ? <Check className="w-4 h-4" /> : s.num}
              </div>
              <span
                className={clsx(
                  'text-sm font-medium hidden sm:block',
                  step >= s.num ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={clsx(
                    'w-8 h-0.5',
                    step > s.num ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-sm text-red-500">
              {error}
            </div>
          )}

          {/* Step 1: Company Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Company Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Acme Real Estate"
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  URL Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="acme-real-estate"
                  className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used for your organization URL: {slug || '...'}.proppulse.com
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleCreateOrg}
                  disabled={!name.trim() || !slug.trim() || submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Invite Team */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Invite Team Members
                </label>
                <p className="text-xs text-muted-foreground mb-3">
                  Add team members to collaborate on your listings and posts.
                </p>

                {/* Add member form */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="flex-1 px-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTeamMember()
                      }
                    }}
                  />
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'admin' | 'broker')}
                    className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  >
                    <option value="broker">Broker</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={addTeamMember}
                    disabled={!newEmail.trim()}
                    className="flex items-center justify-center w-10 h-10 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Member list */}
                {teamMembers.length > 0 ? (
                  <div className="space-y-2">
                    {teamMembers.map((member, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-4 py-2.5 bg-secondary rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium shrink-0">
                            {member.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-foreground truncate">{member.email}</p>
                            <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeTeamMember(i)}
                          className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No team members added yet. You can skip this step.
                  </p>
                )}
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  {teamMembers.length > 0 ? 'Continue' : 'Skip'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/30 text-green-600 mb-4">
                  <Check className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Organization Created!</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>{name}</strong> is ready to go
                  {teamMembers.length > 0 && (
                    <> with {teamMembers.length} team member{teamMembers.length > 1 ? 's' : ''} invited</>
                  )}.
                </p>
              </div>

              {teamMembers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Team members to invite:</p>
                  {teamMembers.map((member, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-2 bg-secondary rounded-lg border border-border"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                        {member.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-foreground">{member.email}</p>
                        <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleInviteMembers}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending invites...
                    </>
                  ) : (
                    <>
                      Go to Dashboard
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}