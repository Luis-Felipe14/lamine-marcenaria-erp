import { useEffect, useRef, useState, type CSSProperties, type SyntheticEvent } from 'react'
import { LOGIN_VIDEO } from './login-slides'

function readAspectRatio(width: number, height: number) {
  if (width > 0 && height > 0) return width / height
  return null
}

export function LoginSlideshow() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoFailed, setVideoFailed] = useState(false)
  const [aspectRatio, setAspectRatio] = useState<number | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || videoFailed) return
    void video.play().catch(() => {})
  }, [videoFailed])

  const onVideoMetadata = (event: SyntheticEvent<HTMLVideoElement>) => {
    const { videoWidth, videoHeight } = event.currentTarget
    setAspectRatio(readAspectRatio(videoWidth, videoHeight))
  }

  const onPosterLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget
    setAspectRatio(readAspectRatio(naturalWidth, naturalHeight))
  }

  const slideshowStyle = aspectRatio
    ? ({ '--login-video-aspect': String(aspectRatio) } as CSSProperties)
    : undefined

  return (
    <aside className="login-slideshow" style={slideshowStyle} aria-hidden="true">
      {videoFailed ? (
        <img
          src={LOGIN_VIDEO.poster}
          alt=""
          className="login-slide active"
          draggable={false}
          onLoad={onPosterLoad}
        />
      ) : (
        <video
          ref={videoRef}
          className="login-slide login-slide-video active"
          src={LOGIN_VIDEO.src}
          poster={LOGIN_VIDEO.poster}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          onLoadedMetadata={onVideoMetadata}
          onError={() => setVideoFailed(true)}
        />
      )}
      <div className="login-slide-fade" />
      <div className="login-slide-overlay" />
    </aside>
  )
}
