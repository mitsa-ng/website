'use client'

import { Suspense } from 'react'
import Splash from '../components/Splash'
import StatusBar from '../components/StatusBar'
import NavDesktop from '../components/NavDesktop'
import TabBar from '../components/TabBar'
import Drawer from '../components/Drawer'
import Toast from '../components/Toast'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Splash />
      <StatusBar />
      <NavDesktop />
      {children}
      <Drawer />
      <Toast />
      <TabBar />
    </>
  )
}
