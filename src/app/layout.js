import './globals.css'

export const metadata = {
  title: 'Admin Dashboard',
  description: 'User management system',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
