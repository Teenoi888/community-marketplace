"use client"
import { useState } from "react"
import Image from "next/image"

interface ProductImageProps {
  src: string | undefined | null
  alt: string
  className?: string
}

export function ProductImage({ src, alt, className = "" }: ProductImageProps) {
  const [error, setError] = useState(false)

  if (!src || error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-4xl bg-gray-50">
        🛒
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={`object-cover ${className}`}
      onError={() => setError(true)}
    />
  )
}
