import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiDelete, type Post } from '../lib/api'
import { useLocale } from '../lib/LocaleContext'

export default function Posts() {
  const { t } = useLocale()
  const [posts, setPosts] = useState<Post[] | null>(null)
  const nav = useNavigate()

  useEffect(() => {
    apiGet<Post[]>('/api/posts?drafts=true').then(setPosts).catch(() => setPosts([]))
  }, [])

  const handleDelete = async (slug: string) => {
    if (!confirm(t.posts.confirmDelete)) return
    await apiDelete(`/api/posts/${slug}`)
    setPosts(p => (p || []).filter(x => x.slug !== slug))
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <h2 className="page-title">{t.posts.title}</h2>
        <button className="btn btn-primary" onClick={() => nav('/posts/new')}>{t.posts.newPost}</button>
      </div>
      <table className="data-table">
        <thead>
          <tr><th>{t.posts.titleCol}</th><th>{t.posts.slug}</th><th>{t.posts.status}</th><th>{t.posts.date}</th><th></th></tr>
        </thead>
        <tbody>
          {posts === null && [1,2,3].map(i => (
            <tr key={i}><td colSpan={5}>
              <div className="skeleton-table-row">
                <div className="skeleton skeleton-table-cell" />
                <div className="skeleton skeleton-table-cell-sm" />
                <div className="skeleton skeleton-table-cell-sm" />
                <div className="skeleton skeleton-table-cell-sm" />
                <div className="skeleton skeleton-table-cell-sm" />
              </div>
            </td></tr>
          ))}
          {posts?.map(p => (
            <tr key={p.id}>
              <td>{p.titleEn || p.titleZh}</td>
              <td className="cell-mono">{p.slug}</td>
              <td>{p.draft ? <span className="badge badge-draft">{t.posts.draft}</span> : <span className="badge badge-pub">{t.posts.published}</span>}</td>
              <td className="cell-muted">{p.publishedAt?.slice(0, 10) || '-'}</td>
              <td className="cell-actions">
                <button className="btn btn-sm" onClick={() => nav(`/posts/${p.slug}`)}>{t.posts.edit}</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.slug)}>{t.posts.delete}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
