import type { Metadata } from 'next'
import './globals.css'
import type { Viewport } from 'next'

export const metadata: Metadata = {
    title: 'CRS Talk',
    description: 'CRS Talk',
    appleWebApp: true,
}

export const viewport: Viewport = {
    themeColor: 'light',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    minimumScale: 1,
    userScalable: false,
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <body className={'body  overflow-hidden'}>{children}</body>
        </html>
    )
}
