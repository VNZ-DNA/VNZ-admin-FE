const STATUS_LABELS: Record<string, string> = {
  Draft: 'Bản nháp',
  Published: 'Đã đăng',
  Closed: 'Đã đóng',
}

const CATEGORY_LABELS: Record<string, string> = {
  PRODUCT: 'Sản phẩm',
  RECRUITMENT: 'Tuyển dụng',
  PERSPECTIVE: 'Góc nhìn',
}

export function getNewsStatusLabel(status: string): string {
  return Object.hasOwn(STATUS_LABELS, status) ? STATUS_LABELS[status] : status
}

export function getNewsCategoryLabel(code: string): string {
  return Object.hasOwn(CATEGORY_LABELS, code) ? CATEGORY_LABELS[code] : code
}
