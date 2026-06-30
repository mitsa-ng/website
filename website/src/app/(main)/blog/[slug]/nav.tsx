'use client'

import { useRouter } from 'next/navigation'

export default function BlogNav() {
  const router = useRouter()

  return (
      <div className="blog-page-header">
      <button onClick={() => router.push('/?tab=blog')} aria-label="Back">
        <svg viewBox="0 0 24 24"><path d="M19 12H5m7-7l-7 7 7 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
      </button>
      <span>Article</span>
    </div>
  )
}
