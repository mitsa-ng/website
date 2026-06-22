'use client'

import { useApp } from '../AppContext'

export default function Toast() {
  const { toast } = useApp()
  return <div className={`toast${toast ? ' show' : ''}`}>{toast?.message}</div>
}
