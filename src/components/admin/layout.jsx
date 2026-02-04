import { Header } from '@/components/layout/Header'

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main>{children}</main>
    </div>
  )
}