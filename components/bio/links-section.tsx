import type { Link } from "@/types"
import { LinkButton } from "./link-button"

interface LinksSectionProps {
  links: Link[]
}

export function LinksSection({ links }: LinksSectionProps) {
  // Group links by category
  const mainLinks = links.filter((link) => link.category === "main")
  const locationLinks = links.filter((link) => link.category === "location")
  const socialLinks = links.filter((link) => link.category === "social")

  return (
    <div className="space-y-6">
      {/* Main Links */}
      {mainLinks.length > 0 && (
        <div>
          {mainLinks.map((link) => (
            <LinkButton key={link.id} link={link} />
          ))}
        </div>
      )}

      {/* Location Links */}
      {locationLinks.length > 0 && (
        <div>
          <h3 className="text-white/80 text-sm font-medium mb-3 text-center">Locations</h3>
          {locationLinks.map((link) => (
            <LinkButton key={link.id} link={link} />
          ))}
        </div>
      )}

      {/* Social Links */}
      {socialLinks.length > 0 && (
        <div>
          <h3 className="text-white/80 text-sm font-medium mb-3 text-center">Social Media</h3>
          {socialLinks.map((link) => (
            <LinkButton key={link.id} link={link} />
          ))}
        </div>
      )}
    </div>
  )
}
