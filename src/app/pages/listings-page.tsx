import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, X, Upload, Loader2 } from 'lucide-react'
import { useOrgStore } from '../stores/org-store'
import { useAuth } from '../../lib/auth-context'
import {
  getListings,
  createListing,
  updateListing,
  deleteListing,
  uploadListingImage,
  type Listing,
  type CreateListingData,
} from '../../lib/services/listings-service'
import { ListingCard } from '../components/listing-card'

const PROPERTY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'condo', label: 'Condo' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'land', label: 'Land' },
]

const PROPERTY_TYPE_OPTIONS = PROPERTY_TYPES.filter((t) => t.value !== '')

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'sold', label: 'Sold' },
  { value: 'inactive', label: 'Inactive' },
]

const EMPTY_FORM: CreateListingData & { images?: string[] } = {
  title: '',
  description: '',
  price: null,
  location: '',
  property_type: '',
  bedrooms: null,
  bathrooms: null,
  square_footage: null,
  images: [],
  status: 'active',
}

function formatPrice(price: number | null): string {
  if (price == null) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price)
}

export function ListingsPage() {
  const navigate = useNavigate()
  const { currentOrg, members } = useOrgStore()
  const { user } = useAuth()

  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateListingData & { images?: string[] }>({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isAdmin = user
    ? members.some((m) => m.user_id === user.id && m.role === 'admin')
    : false

  const loadListings = useCallback(async () => {
    if (!currentOrg) return
    try {
      setLoading(true)
      setError(null)
      const data = await getListings(currentOrg.id)
      setListings(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load listings')
      toast.error('Failed to load listings')
    } finally {
      setLoading(false)
    }
  }, [currentOrg])

  useEffect(() => {
    loadListings()
  }, [loadListings])

  const filteredListings = listings.filter((l) => {
    if (filterType && l.property_type !== filterType) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchesTitle = l.title.toLowerCase().includes(q)
      const matchesLocation = l.location?.toLowerCase().includes(q) ?? false
      if (!matchesTitle && !matchesLocation) return false
    }
    return true
  })

  const openAddModal = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setModalOpen(true)
  }

  const openEditModal = (listing: Listing) => {
    setEditingId(listing.id)
    setForm({
      title: listing.title,
      description: listing.description,
      price: listing.price,
      location: listing.location,
      property_type: listing.property_type,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      square_footage: listing.square_footage,
      images: listing.images ?? [],
      status: listing.status,
      custom_fields: listing.custom_fields,
      language_variants: listing.language_variants,
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !currentOrg) return

    setUploadingImages(true)
    try {
      const urls = await Promise.all(
        Array.from(files).map((file) => uploadListingImage(file, currentOrg.id))
      )
      setForm((prev) => ({
        ...prev,
        images: [...(prev.images ?? []), ...urls],
      }))
      toast.success(`${urls.length} image(s) uploaded`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload images')
    } finally {
      setUploadingImages(false)
      e.target.value = ''
    }
  }

  const removeImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index),
    }))
  }

  const handleSave = async () => {
    if (!currentOrg) return
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateListing(editingId, form)
        toast.success('Listing updated')
      } else {
        await createListing(currentOrg.id, form)
        toast.success('Listing created')
      }
      closeModal()
      await loadListings()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save listing')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteListing(deleteId)
      toast.success('Listing deleted')
      setDeleteId(null)
      await loadListings()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete listing')
    } finally {
      setDeleting(false)
    }
  }

  const handleCreatePost = (listing: Listing) => {
    navigate(`/create?listingId=${listing.id}`)
  }

  if (!currentOrg) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Select an organization to view listings.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Listings</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? 'Manage your property listings' : 'Browse available properties'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Listing
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          {PROPERTY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={loadListings}
            className="text-sm text-primary font-medium mt-2 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {/* Admin View - Table */}
      {!loading && isAdmin && (
        <>
          {filteredListings.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No listings yet.</p>
              <button
                onClick={openAddModal}
                className="text-sm text-primary font-medium mt-2 hover:underline"
              >
                Add your first listing
              </button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Listing
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Type
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Price
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Location
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Created
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredListings.map((listing) => (
                      <tr key={listing.id} className="hover:bg-secondary/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden shrink-0">
                              {listing.images?.[0] ? (
                                <img
                                  src={listing.images[0]}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                  N/A
                                </div>
                              )}
                            </div>
                            <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                              {listing.title}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground capitalize">
                          {listing.property_type || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground font-medium">
                          {formatPrice(listing.price)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[150px]">
                          {listing.location || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                              listing.status === 'active'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : listing.status === 'sold'
                                ? 'bg-accent/10 text-accent'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                          >
                            {listing.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(listing.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(listing)}
                              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(listing.id)}
                              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Broker View - Grid */}
      {!loading && !isAdmin && (
        <>
          {filteredListings.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No listings found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  showCreatePost
                  onCreatePost={handleCreatePost}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
          <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-foreground">
                {editingId ? 'Edit Listing' : 'Add Listing'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="e.g. Modern Downtown Loft"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  placeholder="Describe the property..."
                />
              </div>

              {/* Price & Property Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Price (USD)
                  </label>
                  <input
                    type="number"
                    value={form.price ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        price: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="e.g. 500000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Property Type
                  </label>
                  <select
                    value={form.property_type ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, property_type: e.target.value }))}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select type</option>
                    {PROPERTY_TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  value={form.location ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="e.g. 123 Main St, New York, NY"
                />
              </div>

              {/* Bedrooms, Bathrooms, Square Footage */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Bedrooms
                  </label>
                  <input
                    type="number"
                    value={form.bedrooms ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        bedrooms: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Bathrooms
                  </label>
                  <input
                    type="number"
                    value={form.bathrooms ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        bathrooms: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Sq. Footage
                  </label>
                  <input
                    type="number"
                    value={form.square_footage ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        square_footage: e.target.value ? Number(e.target.value) : null,
                      }))
                    }
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Status (only on edit) */}
              {editingId && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Status
                  </label>
                  <select
                    value={form.status ?? 'active'}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        status: e.target.value as 'active' | 'sold' | 'inactive',
                      }))
                    }
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Images
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(form.images ?? []).map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-secondary">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors bg-secondary">
                    {uploadingImages ? (
                      <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-muted-foreground" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImages}
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => !deleting && setDeleteId(null)} />
          <div className="relative bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground">Delete Listing</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Are you sure you want to delete this listing? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}