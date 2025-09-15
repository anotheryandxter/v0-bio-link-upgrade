import type { Profile } from "@/types"
import Image from "next/image"

interface ProfileSectionProps {
  profile: Profile
}

export function ProfileSection({ profile }: ProfileSectionProps) {
  return (
    <div className="text-center mb-8">
      {/* Avatar */}
      <div className="mb-4">
        <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-white/20 backdrop-blur-sm">
          <Image
            src={profile.avatar || "/placeholder.svg?height=96&width=96"}
            alt={profile.business_name}
            width={96}
            height={96}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Business Name */}
      <h1 className="text-2xl font-bold text-white mb-2 text-balance">{profile.business_name}</h1>

      {/* Location */}
      <p className="text-white/80 text-sm flex items-center justify-center gap-1">
        <i className="fas fa-map-marker-alt" />
        {profile.location}
      </p>
    </div>
  )
}
