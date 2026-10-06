import { Card } from '@heroui/react'
import type { LucideIcon } from 'lucide-react'

type DashboardStatCardProps = {
  label: string
  value: number
  description: string
  icon: LucideIcon
}

export function DashboardStatCard({ label, value, description, icon: Icon }: DashboardStatCardProps) {
  return (
    <Card className="dashboard-stat-card">
      <span className="dashboard-stat-card__icon" aria-hidden="true">
        <Icon size={18} strokeWidth={1.9} />
      </span>
      <div className="dashboard-stat-card__content">
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{description}</span>
      </div>
    </Card>
  )
}
