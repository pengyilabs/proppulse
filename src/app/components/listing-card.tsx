import { Bed, Bath, Ruler, MapPin, Home, PlusCircle } from 'lucide-react'
import type { Listing } from '../../lib/services/listings-service'

interface ListingCardProps {
  listing: Listing
  onClick?: (listing: Listing) => void
  showCreatePost?: boolean
  onCreatePost?: (listing: Listing) => void
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  house: 'House',
  apartment: 'Apartment',
  condo: 'Condo',
  commercial: 'Commercial',
  land: 'Land',
}

function formatPrice(price: number | null): string {
  if (price == null) return 'Contact for price'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price)
}

export function ListingCard({ listing, onClick, showCreatePost, onCreatePost }: ListingCardProps) {
  const primaryImage = listing.images?.[0]

  return (
    <div
      onClick={() => onClick?.(listing)}
      className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
    >
      <div className="aspect-[16/10] bg-secondary relative overflow-hidden">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        {listing.property_type && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/90 text-white">
            {PROPERTY_TYPE_LABELS[listing.property_type] || listing.property_type}
          </span>
        )}
        {listing.status !== 'active' && (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium bg-accent/90 text-white capitalize">
            {listing.status}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-foreground truncate">{listing.title}</h3>
        <p className="text-lg font-bold text-primary mt-1">{formatPrice(listing.price)}</p>
        {listing.location && (
          <div className="flex items-center gap-1 mt-1.5 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{listing.location}</span>
          </div>
        )}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
          {listing.bedrooms != null && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Bed className="w-4 h-4" />
              <span>{listing.bedrooms}</span>
            </div>
          )}
          {listing.bathrooms != null && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Bath className="w-4 h-4" />
              <span>{listing.bathrooms}</span>
            </div>
          )}
          {listing.square_footage != null && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Ruler className="w-4 h-4" />
              <span>{listing.square_footage.toLocaleString()} sqft</span>
            </div>
          )}
        </div>
        {showCreatePost && onCreatePost && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCreatePost(listing)
            }}
            className="mt-3 flex items-center justify-center gap-1.5 w-full px-3 py-2 bg-primary/10 text-primary text-xs font-medium rounded-lg hover:bg-primary/20 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Create Post
          </button>
        )}
      </div>
    </div>
  )
}