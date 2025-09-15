import type { Profile, Link } from "@/types"
import { VideoBackground } from "./video-background"
import { ProfileSection } from "./profile-section"
import { LinksSection } from "./links-section"

interface BioPageProps {
  profile: Profile
  links: Link[]
}

export function BioPage({ profile, links }: BioPageProps) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Video */}
      <VideoBackground video={profile.background_video} />

      {/* Admin Button - floating in top right */}
      <div className="fixed top-4 right-4 z-20">
        <a
          href="/login"
          className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-all duration-200 text-sm"
        >
          <i className="fas fa-cog" />
          Admin
        </a>
      </div>

      {/* Bio Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
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
    </div>
  )
}
