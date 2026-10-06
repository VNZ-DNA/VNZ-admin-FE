import { Button, Tooltip } from '@heroui/react'
import {
  FileSearchCorner,
  FileUser,
  Handshake,
  LayoutDashboard,
  Newspaper,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'

import { ROUTE_PATHS } from '@/routes/route-paths'

type AdminSidebarProps = {
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}

type NavigationIcon = LucideIcon | string

const navigationItems: ReadonlyArray<{
  label: string
  path: string
  icon: NavigationIcon
}> = [
  { label: 'Dashboard', path: ROUTE_PATHS.DASHBOARD, icon: LayoutDashboard },
  { label: 'Tin tức', path: ROUTE_PATHS.NEWS, icon: Newspaper },
  { label: 'Tuyển dụng', path: ROUTE_PATHS.CAREERS, icon: FileSearchCorner },
  { label: 'Ứng viên', path: ROUTE_PATHS.APPLICANTS, icon: FileUser },
  { label: 'Thành viên', path: ROUTE_PATHS.MEMBERS, icon: UsersRound },
  { label: 'Liên hệ', path: ROUTE_PATHS.CONTACTS, icon: Send },
  { label: 'Sản phẩm', path: ROUTE_PATHS.PRODUCTS, icon: Package },
  { label: 'Đối tác', path: ROUTE_PATHS.PARTNERS, icon: Handshake },
]

export function AdminSidebar({ collapsed, onCollapsedChange }: AdminSidebarProps) {
  const location = useLocation()
  const toggleLabel = collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'

  return (
    <aside
      className={`admin-sidebar ${collapsed ? 'admin-sidebar--collapsed' : ''}`}
      aria-label="Thanh điều hướng chính"
    >
      <nav className="admin-sidebar__nav" aria-label="Điều hướng quản trị">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isInterviewInvitation =
            item.path === ROUTE_PATHS.APPLICANTS &&
            location.pathname === ROUTE_PATHS.APPLICANT_INTERVIEW_INVITATION
          const isContactReply = item.path === ROUTE_PATHS.CONTACTS && /^\/contacts\/[^/]+\/reply$/.test(location.pathname)

          const navigationLink = (
            <NavLink
              key={item.path}
              className={({ isActive }) =>
                `admin-sidebar__nav-item ${isActive ? 'admin-sidebar__nav-item--active' : ''}`
              }
              to={item.path}
              end={item.path === ROUTE_PATHS.DASHBOARD}
              title={collapsed ? item.label : undefined}
            >
              <span className="admin-sidebar__nav-icon" aria-hidden="true">
                {typeof Icon === 'string' ? Icon : <Icon size={18} strokeWidth={1.8} />}
              </span>
              <span className="admin-sidebar__nav-label">{item.label}</span>
            </NavLink>
          )

          if (!collapsed) {
            return (
              <div className="admin-sidebar__nav-group" key={item.path}>
                {navigationLink}
                {isInterviewInvitation && (
                  <NavLink
                    className={({ isActive }) =>
                      `admin-sidebar__nav-subitem ${isActive ? 'admin-sidebar__nav-subitem--active' : ''}`
                    }
                    to={ROUTE_PATHS.APPLICANT_INTERVIEW_INVITATION}
                    state={location.state}
                  >
                    Gửi thư mời
                  </NavLink>
                )}
                {isContactReply && (
                  <NavLink
                    className={({ isActive }) =>
                      `admin-sidebar__nav-subitem ${isActive ? 'admin-sidebar__nav-subitem--active' : ''}`
                    }
                    to={location.pathname}
                    state={location.state}
                  >
                    Phản hồi email
                  </NavLink>
                )}
              </div>
            )
          }

          return (
            <Tooltip key={item.path}>
              <Tooltip.Trigger className="admin-sidebar__tooltip-trigger">
                {navigationLink}
              </Tooltip.Trigger>
              <Tooltip.Content placement="right">{item.label}</Tooltip.Content>
            </Tooltip>
          )
        })}
      </nav>

      <footer className="admin-sidebar__footer">
        <Button
          className="admin-sidebar__toggle"
          type="button"
          variant="ghost"
          isIconOnly
          aria-label={toggleLabel}
          onClick={() => onCollapsedChange(!collapsed)}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} strokeWidth={2} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={16} strokeWidth={2} aria-hidden="true" />
          )}
        </Button>
      </footer>
    </aside>
  )
}
