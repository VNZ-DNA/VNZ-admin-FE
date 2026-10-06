import { Button, Card, Chip, Skeleton, Table } from '@heroui/react'
import { BriefcaseBusiness, Mail, Newspaper, UsersRound } from 'lucide-react'

import { DashboardStatCard } from '@/features/dashboard/components/dashboard-stat-card'
import { useDashboard } from '@/features/dashboard/hooks/use-dashboard'

const knownNewsStatusOrder = ['Đã đăng', 'Bản nháp', 'Đã đóng']

function getOrderedNewsStatuses(newsByStatus: Record<string, number>) {
  return Object.entries(newsByStatus).sort(([firstStatus], [secondStatus]) => {
    const firstIndex = knownNewsStatusOrder.indexOf(firstStatus)
    const secondIndex = knownNewsStatusOrder.indexOf(secondStatus)

    if (firstIndex === -1 && secondIndex === -1) {
      return firstStatus.localeCompare(secondStatus, 'vi')
    }

    if (firstIndex === -1) {
      return 1
    }

    if (secondIndex === -1) {
      return -1
    }

    return firstIndex - secondIndex
  })
}

function formatDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(date)
}

function getNewsStatusClassName(status: string): string {
  switch (status.trim().toLocaleLowerCase('vi-VN')) {
    case 'đã đăng':
      return 'dashboard-posts-table__status--published'
    case 'bản nháp':
      return 'dashboard-posts-table__status--draft'
    case 'đã đóng':
      return 'dashboard-posts-table__status--closed'
    default:
      return 'dashboard-posts-table__status--default'
  }
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-label="Đang tải dữ liệu tổng quan">
      <Skeleton className="dashboard-skeleton__title" />
      <div className="dashboard-skeleton__stats">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton className="dashboard-skeleton__card" key={index} />
        ))}
      </div>
      <div className="dashboard-skeleton__content">
        <Skeleton />
        <Skeleton />
      </div>
    </div>
  )
}

export function DashboardOverview() {
  const { data, error, isPending, refetch } = useDashboard()

  if (isPending) {
    return <DashboardSkeleton />
  }

  if (!data || error) {
    return (
      <section className="dashboard-error">
        <p>Không thể tải dữ liệu tổng quan.</p>
        <Button type="button" variant="primary" onClick={() => void refetch()}>
          Thử lại
        </Button>
      </section>
    )
  }

  const totalNews = data.totalNewsCount
  const orderedNewsStatuses = getOrderedNewsStatuses(data.newsByStatus)

  return (
    <div className="dashboard-overview">
      <div className="dashboard-overview__heading">
        <h1>Dashboard</h1>
        <p>Tổng quan hoạt động và dữ liệu quản trị.</p>
      </div>

      <section className="dashboard-stats" aria-label="Tổng quan số liệu">
        <DashboardStatCard
          label="Bài viết"
          value={totalNews}
          description="tổng bài viết"
          icon={Newspaper}
        />
        <DashboardStatCard
          label="Việc đang tuyển"
          value={data.openJobsCount}
          description="vị trí đang mở"
          icon={BriefcaseBusiness}
        />
        <DashboardStatCard
          label="Ứng viên chờ duyệt"
          value={data.pendingApplicationsCount}
          description="hồ sơ cần xem xét"
          icon={UsersRound}
        />
        <DashboardStatCard
          label="Liên hệ chưa xem"
          value={data.unreadContactsCount}
          description="yêu cầu mới"
          icon={Mail}
        />
      </section>

      <div className="dashboard-overview__grid">
        <Card className="dashboard-panel">
          <Card.Header>
            <Card.Title>Trạng thái bài viết</Card.Title>
          </Card.Header>
          <Card.Content>
          {orderedNewsStatuses.length > 0 ? (
            <div className="dashboard-status-list">
              {orderedNewsStatuses.map(([status, count]) => {
                const progress = totalNews > 0 ? (count / totalNews) * 100 : 0

                return (
                  <div className="dashboard-status" key={status}>
                    <div>
                      <span>{status}</span>
                      <strong>{count}</strong>
                    </div>
                    <span className="dashboard-status__track" aria-hidden="true">
                      <span style={{ width: `${progress}%` }} />
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="dashboard-panel__empty">Chưa có dữ liệu trạng thái bài viết.</p>
          )}
          </Card.Content>
        </Card>

        <Card className="dashboard-panel">
          <Card.Header>
            <Card.Title>Việc cần xử lý</Card.Title>
          </Card.Header>
          <Card.Content>
          {data.pendingTasks.length > 0 ? (
            <ul className="dashboard-task-list">
              {data.pendingTasks.map((task) => (
                <li key={`${task.type}-${task.label}`}>
                  <strong>{task.count}</strong>
                  <span>{task.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dashboard-panel__empty">Không có việc cần xử lý.</p>
          )}
          </Card.Content>
        </Card>
      </div>

      <Card className="dashboard-panel dashboard-panel--posts">
        <Card.Header>
          <Card.Title>Bài viết gần đây</Card.Title>
        </Card.Header>
        <Card.Content>
        {data.recentPosts.length > 0 ? (
          <Table className="dashboard-posts-table" variant="secondary">
            <Table.ScrollContainer className="dashboard-posts-table-wrapper">
              <Table.Content aria-label="Bài viết gần đây">
                <Table.Header>
                  <Table.Column isRowHeader>Bài viết</Table.Column>
                  <Table.Column>Tác giả</Table.Column>
                  <Table.Column>Trạng thái</Table.Column>
                  <Table.Column>Ngày tạo</Table.Column>
                </Table.Header>
                <Table.Body>
                {data.recentPosts.map((post) => (
                  <Table.Row id={post.id} key={post.id}>
                    <Table.Cell>{post.title}</Table.Cell>
                    <Table.Cell>{post.authorName}</Table.Cell>
                    <Table.Cell>
                      <Chip
                        className={`dashboard-posts-table__status ${getNewsStatusClassName(post.status)}`}
                        color="default"
                        size="sm"
                        variant="secondary"
                      >
                        {post.status}
                      </Chip>
                    </Table.Cell>
                    <Table.Cell>{formatDate(post.createdAtUtc)}</Table.Cell>
                  </Table.Row>
                ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        ) : (
          <p className="dashboard-panel__empty">Chưa có bài viết gần đây.</p>
        )}
        </Card.Content>
      </Card>
    </div>
  )
}
