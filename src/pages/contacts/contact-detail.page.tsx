import { Navigate, useParams } from 'react-router-dom'

import { ContactDetail } from '@/features/contacts/components/contact-detail'
import { ROUTE_PATHS } from '@/routes/route-paths'

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()

  if (!id) return <Navigate to={ROUTE_PATHS.CONTACTS} replace />

  return <ContactDetail id={id} />
}
