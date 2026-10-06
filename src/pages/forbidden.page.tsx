import { Button, Card } from '@heroui/react'
import { ShieldAlert } from 'lucide-react'

import { useAuth } from '@/features/auth/use-auth'

export function ForbiddenPage() {
  const { logout } = useAuth()

  async function handleLogout() {
    await logout()
  }

  return (
    <main className="forbidden-page">
      <Card className="forbidden-page__card" aria-labelledby="forbidden-heading">
        <span className="forbidden-page__icon" aria-hidden="true">
          <ShieldAlert size={24} strokeWidth={1.8} />
        </span>
        <h1 id="forbidden-heading">Không có quyền truy cập</h1>
        <p>Bạn không có quyền truy cập khu vực quản trị.</p>
        <Button type="button" variant="primary" onClick={() => void handleLogout()}>
          Đăng xuất
        </Button>
      </Card>
    </main>
  )
}
