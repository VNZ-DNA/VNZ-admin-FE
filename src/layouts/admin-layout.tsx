import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import { AdminSidebar } from '@/layouts/admin-sidebar'
import { AdminTopbar } from '@/layouts/admin-topbar'

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'vnz-admin-sidebar-collapsed'

export function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true',
  )

  const handleSidebarCollapsedChange = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed)
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed))
  }

  return (
    <div className="admin-shell">
      <AdminTopbar />
      <div className="admin-shell__body">
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={handleSidebarCollapsedChange}
        />
        <div className="admin-shell__main">
          <main className="admin-shell__content">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
