import { articleJsonLd } from '@/lib/seo'

export default function JsonLdServer({
  title,
  description,
  url,
  publishedAt,
}: {
  title: string
  description: string
  url: string
  publishedAt: string
}) {
  const json = articleJsonLd({ title, description, url, publishedAt })
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  )
}
