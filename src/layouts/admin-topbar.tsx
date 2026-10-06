import { Avatar, Button } from '@heroui/react'
import { LogOut } from 'lucide-react'

import { useAuth } from '@/features/auth/use-auth'

function getInitials(fullName: string): string {
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean)

  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
  }

  return (nameParts[0] ?? '').slice(0, 2).toUpperCase()
}

export function AdminTopbar() {
  const { logout, user } = useAuth()

  return (
    <header className="admin-topbar">
      <div className="admin-topbar__brand" aria-label="VNZ Admin">
        <img className="admin-topbar__logo" src="/logo-sidebar.png" alt="VNZ" />
      </div>

      {user && (
        <div className="admin-topbar__actions">
          <div className="admin-user-chip">
            <Avatar className="admin-user-chip__avatar" aria-label={user.fullName}>
              <Avatar.Fallback>{getInitials(user.fullName)}</Avatar.Fallback>
            </Avatar>
            <span className="admin-user-chip__details">
              <strong>{user.fullName}</strong>
              <span>{user.role}</span>
            </span>
          </div>
          <Button
            className="admin-topbar__logout"
            type="button"
            variant="outline"
            isIconOnly
            aria-label="Đăng xuất"
            onClick={() => void logout()}
          >
            <LogOut size={18} aria-hidden="true" />
          </Button>
        </div>
      )}
    </header>
  )
}
