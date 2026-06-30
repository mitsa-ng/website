const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://nati.dev'

export function websiteJsonLd(overrides?: { name?: string; description?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: overrides?.name || "Nati's Web",
    url: BASE,
    description: overrides?.description || "Nati's personal portfolio & blog — full-stack developer, UI designer, and creative problem solver.",
  }
}

export function personJsonLd(overrides?: { name?: string; image?: string; url?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: overrides?.name || 'Nati',
    image: overrides?.image || undefined,
    url: overrides?.url || BASE,
  }
}

export function articleJsonLd({
  title,
  description,
  url,
  publishedAt,
  authorName,
  image,
}: {
  title: string
  description: string
  url: string
  publishedAt: string
  authorName?: string
  image?: string | null
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url,
    datePublished: publishedAt,
    image: image || undefined,
    author: {
      '@type': 'Person',
      name: authorName || 'Nati',
    },
  }
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}
