import type { Profile, Link } from "@/types"
import { BackgroundRenderer } from "./background-renderer"
import { ProfileSection } from "./profile-section"
import { LinksSection } from "./links-section"

interface BioPageProps {
  profile: Profile
  links: Link[]
}

export function BioPage({ profile, links }: BioPageProps) {
  const backgroundConfig = profile.homepage_background || {
    type: "video" as const,
    video: {
      webm: profile.background_video?.webm || null,
      mp4: profile.background_video?.mp4 || null,
      ogv: profile.background_video?.ogv || null,
      poster: profile.background_video?.poster || null,
      fit: "cover" as const,
      position: "center" as const,
      opacity: 1,
      blur: 0,
      muted: true,
      loop: true,
      autoplay: true,
    },
    overlay: {
      enabled: true,
      color: "#000000",
      opacity: 0.3,
    },
  }

  return (
    <BackgroundRenderer config={backgroundConfig}>
      {/* Admin button removed — login is now accessible via an easter-egg (8 background clicks). */}

      {/* Bio Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <ProfileSection profile={profile} />
          <LinksSection links={links} />

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-white/60 text-xs">
              {profile.footer_text || `© ${new Date().getFullYear()} ${profile.business_name}`}
            </p>
          </div>
        </div>
      </div>
    </BackgroundRenderer>
  )
}
