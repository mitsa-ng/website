'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
  wrapClassName?: string
  wrapStyle?: React.CSSProperties
}

export default function Img({ src, alt, className, style, wrapClassName, wrapStyle }: Props) {
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!src) { setLoaded(true); return }
    const img = new Image()
    imgRef.current = img
    img.onload = () => setLoaded(true)
    img.src = src
    if (img.complete) setLoaded(true)
    return () => { img.onload = null }
  }, [src])

  return (
    <div
      className={`${wrapClassName || ''}${!loaded ? ' img-shimmer' : ''}`}
      style={{ position: 'relative', overflow: 'hidden', ...wrapStyle }}
    >
      {loaded && (
        <img
          src={src}
          alt={alt}
          className={`${className || ''} img-fade-in`}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', ...style }}
        />
      )}
    </div>
  )
}
