"use client"

interface VideoBackgroundProps {
  video: {
    webm: string | null
    mp4: string | null
    ogv: string | null
    poster: string | null
  } | null
}

export function VideoBackground({ video }: VideoBackgroundProps) {
  if (!video) return null

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden -z-10">
      <video autoPlay muted loop playsInline className="w-full h-full object-cover" poster={video.poster || undefined}>
        {video.webm && <source src={video.webm} type="video/webm" />}
        {video.mp4 && <source src={video.mp4} type="video/mp4" />}
        {video.ogv && <source src={video.ogv} type="video/ogg" />}
      </video>
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/30" />
    </div>
  )
}
