import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Muslim Prayer Times",
  description: "Prayer times, Qibla compass, and Islamic calendar",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3ba89f" },
    { media: "(prefers-color-scheme: dark)", color: "#2d8b7f" },
  ],
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#3ba89f" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#2d8b7f" media="(prefers-color-scheme: dark)" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
