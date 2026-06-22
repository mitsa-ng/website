import type { Metadata, Viewport } from "next"
import "./globals.css"
import { AppProvider } from "./AppContext"

export const metadata: Metadata = {
  title: "Nati's Web",
  description: "Nati's Portfolio & Blog",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  )
}
