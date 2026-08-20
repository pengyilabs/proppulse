import { Building2, MapPin, Bed, Bath, Maximize } from 'lucide-react'
import type { Template, ListingData } from '../../lib/services/templates-service'

interface TemplatePreviewProps {
  template: Template
  listing?: ListingData | null
  onClick?: () => void
  selected?: boolean
}

export function TemplatePreview({ template, listing, onClick, selected }: TemplatePreviewProps) {
  const design = template.design_data as Record<string, unknown>
  const colorScheme = (design.colorScheme as Record<string, string>) || {}
  const typography = (design.typography as Record<string, string>) || {}
  const textPlacement = (design.textPlacement as Record<string, string>) || {}
  const style = (design.style as Record<string, string | boolean>) || {}
  const cta = (design.callToAction as Record<string, string>) || {}

  const primaryColor = colorScheme.primary || '#2563eb'
  const secondaryColor = colorScheme.secondary || '#f8fafc'
  const accentColor = colorScheme.accent || '#f59e0b'
  const textColor = colorScheme.text || '#0f172a'
  const bgColor = colorScheme.background || '#ffffff'
  const overlayColor = (style.overlay && style.overlayColor) ? String(style.overlayColor) : null

  const borderRadius = style.borderRadius ? `${style.borderRadius}px` : '12px'
  const shadowMap: Record<string, string> = {
    none: 'none',
    small: '0 1px 3px rgba(0,0,0,0.1)',
    medium: '0 4px 12px rgba(0,0,0,0.1)',
    large: '0 8px 24px rgba(0,0,0,0.15)',
  }
  const shadow = shadowMap[String(style.shadow || 'medium')] || shadowMap.medium

  const titleFont = typography.titleFont || 'Inter, sans-serif'
  const bodyFont = typography.bodyFont || 'Inter, sans-serif'
  const titleSize = typography.titleSize || '24px'
  const bodySize = typography.bodySize || '14px'

  const titlePos = textPlacement.titlePosition || 'bottom'
  const titleAlign = textPlacement.titleAlignment || 'left'
  const pricePos = textPlacement.pricePosition || 'bottom'
  const priceAlign = textPlacement.priceAlignment || 'left'

  const imageTreatment = String(design.imageTreatment || 'full')

  const title = listing?.title || 'Property Title'
  const price = listing?.price != null
    ? `$${Number(listing.price).toLocaleString()}`
    : '$0'
  const location = listing?.location || ''
  const bedrooms = listing?.bedrooms
  const bathrooms = listing?.bathrooms
  const sqft = listing?.square_footage

  return (
    <div
      onClick={onClick}
      className={`
        relative cursor-pointer transition-all duration-200 rounded-xl overflow-hidden
        ${selected ? 'ring-2 ring-primary ring-offset-2' : 'hover:ring-2 hover:ring-primary/50 hover:ring-offset-2'}
      `}
      style={{ borderRadius, boxShadow: shadow }}
    >
      {/* Social media post mockup */}
      <div
        className="w-full aspect-[4/5] flex flex-col overflow-hidden"
        style={{ backgroundColor: bgColor }}
      >
        {/* Image area */}
        <div className="relative flex-1 min-h-0">
          {imageTreatment === 'side-by-side' ? (
            <div className="flex h-full">
              <div className="w-1/2 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Building2 className="w-12 h-12" style={{ color: primaryColor, opacity: 0.3 }} />
              </div>
              <div className="w-1/2 flex flex-col justify-center p-4">
                {titlePos === 'top' && (
                  <h3
                    className="font-semibold leading-tight mb-1"
                    style={{ fontFamily: titleFont, fontSize: titleSize, color: textColor, textAlign: titleAlign as 'left' | 'center' | 'right' }}
                  >
                    {title}
                  </h3>
                )}
                {pricePos === 'top' && (
                  <p
                    className="font-bold"
                    style={{ fontFamily: bodyFont, fontSize: `calc(${bodySize} + 4px)`, color: primaryColor, textAlign: priceAlign as 'left' | 'center' | 'right' }}
                  >
                    {price}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
              <Building2 className="w-16 h-16" style={{ color: primaryColor, opacity: 0.3 }} />
              {overlayColor && (
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: overlayColor }}
                />
              )}
            </div>
          )}

          {/* Overlay text on image */}
          {imageTreatment === 'full' && (titlePos === 'middle' || pricePos === 'middle') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              {titlePos === 'middle' && (
                <h3
                  className="font-semibold leading-tight mb-1"
                  style={{ fontFamily: titleFont, fontSize: titleSize, color: '#ffffff', textAlign: titleAlign as 'left' | 'center' | 'right' }}
                >
                  {title}
                </h3>
              )}
              {pricePos === 'middle' && (
                <p
                  className="font-bold"
                  style={{ fontFamily: bodyFont, fontSize: `calc(${bodySize} + 4px)`, color: '#ffffff', textAlign: priceAlign as 'left' | 'center' | 'right' }}
                >
                  {price}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Bottom info area */}
        <div className="p-3 space-y-1.5" style={{ backgroundColor: secondaryColor }}>
          {(titlePos === 'bottom' || imageTreatment === 'side-by-side') && (
            <h3
              className="font-semibold leading-tight"
              style={{ fontFamily: titleFont, fontSize: titleSize, color: textColor, textAlign: titleAlign as 'left' | 'center' | 'right' }}
            >
              {title}
            </h3>
          )}
          {(pricePos === 'bottom' || imageTreatment === 'side-by-side') && (
            <p
              className="font-bold"
              style={{ fontFamily: bodyFont, fontSize: `calc(${bodySize} + 4px)`, color: primaryColor, textAlign: priceAlign as 'left' | 'center' | 'right' }}
            >
              {price}
            </p>
          )}

          {/* Property details */}
          {location && (
            <div className="flex items-center gap-1" style={{ fontFamily: bodyFont, fontSize: bodySize, color: '#64748b' }}>
              <MapPin className="w-3 h-3" />
              <span className="truncate">{location}</span>
            </div>
          )}
          {(bedrooms != null || bathrooms != null || sqft != null) && (
            <div className="flex items-center gap-3" style={{ fontFamily: bodyFont, fontSize: bodySize, color: '#64748b' }}>
              {bedrooms != null && (
                <span className="flex items-center gap-1">
                  <Bed className="w-3 h-3" /> {bedrooms}
                </span>
              )}
              {bathrooms != null && (
                <span className="flex items-center gap-1">
                  <Bath className="w-3 h-3" /> {bathrooms}
                </span>
              )}
              {sqft != null && (
                <span className="flex items-center gap-1">
                  <Maximize className="w-3 h-3" /> {sqft.toLocaleString()} sqft
                </span>
              )}
            </div>
          )}

          {/* Call to Action */}
          {cta.text && (
            <div className="pt-1">
              <span
                className={`
                  inline-block px-3 py-1 text-xs font-medium
                  ${cta.style === 'pill' ? 'rounded-full' : cta.style === 'text-link' ? 'underline' : 'rounded-md'}
                `}
                style={{
                  backgroundColor: cta.style === 'text-link' ? 'transparent' : accentColor,
                  color: cta.style === 'text-link' ? accentColor : '#ffffff',
                  fontFamily: bodyFont,
                }}
              >
                {cta.text}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Template name badge */}
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium bg-black/40 text-white backdrop-blur-sm">
        {template.name || 'Template'}
      </div>
    </div>
  )
}