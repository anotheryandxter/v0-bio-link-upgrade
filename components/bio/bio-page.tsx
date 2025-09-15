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
      {/* Admin Button - floating in top right */}
      <div className="fixed top-4 right-4 z-20">
        <a
          href="/login"
          className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-all duration-200 text-sm opacity-0"
        >
          <i className="fas fa-cog" />
          Admin
        </a>
      </div>

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
