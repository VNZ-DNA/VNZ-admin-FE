import { createBrowserRouter } from 'react-router-dom'

import { AdminLayout } from '@/layouts/admin-layout'
import { AuthLayout } from '@/layouts/auth-layout'
import { AdminRoute } from '@/features/auth/components/admin-route'
import { ApplicantDetailPage } from '@/pages/applicants/applicant-detail.page'
import { InterviewInvitationPage } from '@/pages/applicants/interview-invitation.page'
import { ApplicantListPage } from '@/pages/applicants/applicant-list.page'
import { CareerCreatePage } from '@/pages/careers/career-create.page'
import { CareerDetailPage } from '@/pages/careers/career-detail.page'
import { CareerEditPage } from '@/pages/careers/career-edit.page'
import { CareerListPage } from '@/pages/careers/career-list.page'
import { ContactDetailPage } from '@/pages/contacts/contact-detail.page'
import { ContactListPage } from '@/pages/contacts/contact-list.page'
import { ContactReplyPage } from '@/pages/contacts/contact-reply.page'
import { DashboardPage } from '@/pages/dashboard.page'
import { ForbiddenPage } from '@/pages/forbidden.page'
import { LoginPage } from '@/pages/login.page'
import { MemberCreatePage } from '@/pages/members/member-create.page'
import { MemberDetailPage } from '@/pages/members/member-detail.page'
import { MemberEditPage } from '@/pages/members/member-edit.page'
import { MemberListPage } from '@/pages/members/member-list.page'
import { NewsCreatePage } from '@/pages/news/news-create.page'
import { NewsDetailPage } from '@/pages/news/news-detail.page'
import { NewsEditPage } from '@/pages/news/news-edit.page'
import { NewsListPage } from '@/pages/news/news-list.page'
import { NotFoundPage } from '@/pages/not-found.page'
import { PartnerCreatePage } from '@/pages/partners/partner-create.page'
import { PartnerDetailPage } from '@/pages/partners/partner-detail.page'
import { PartnerEditPage } from '@/pages/partners/partner-edit.page'
import { PartnerListPage } from '@/pages/partners/partner-list.page'
import { ProductCreatePage } from '@/pages/products/product-create.page'
import { ProductDetailPage } from '@/pages/products/product-detail.page'
import { ProductEditPage } from '@/pages/products/product-edit.page'
import { ProductListPage } from '@/pages/products/product-list.page'
import { ROUTE_PATHS } from '@/routes/route-paths'

export const router = createBrowserRouter([
  { element: <AuthLayout />, children: [{ path: ROUTE_PATHS.LOGIN, element: <LoginPage /> }] },
  { path: ROUTE_PATHS.FORBIDDEN, element: <ForbiddenPage /> },
  {
    element: <AdminRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: ROUTE_PATHS.DASHBOARD, element: <DashboardPage /> },
          { path: ROUTE_PATHS.NEWS, element: <NewsListPage /> },
          { path: ROUTE_PATHS.NEWS_CREATE, element: <NewsCreatePage /> },
          { path: ROUTE_PATHS.NEWS_EDIT, element: <NewsEditPage /> },
          { path: ROUTE_PATHS.NEWS_DETAIL, element: <NewsDetailPage /> },
          { path: ROUTE_PATHS.CAREERS, element: <CareerListPage /> },
          { path: ROUTE_PATHS.CAREER_CREATE, element: <CareerCreatePage /> },
          { path: ROUTE_PATHS.CAREER_EDIT, element: <CareerEditPage /> },
          { path: ROUTE_PATHS.CAREER_DETAIL, element: <CareerDetailPage /> },
          { path: ROUTE_PATHS.APPLICANTS, element: <ApplicantListPage /> },
          { path: ROUTE_PATHS.APPLICANT_INTERVIEW_INVITATION, element: <InterviewInvitationPage /> },
          { path: ROUTE_PATHS.APPLICANT_DETAIL, element: <ApplicantDetailPage /> },
          { path: ROUTE_PATHS.MEMBERS, element: <MemberListPage /> },
          { path: ROUTE_PATHS.MEMBER_CREATE, element: <MemberCreatePage /> },
          { path: ROUTE_PATHS.MEMBER_EDIT, element: <MemberEditPage /> },
          { path: ROUTE_PATHS.MEMBER_DETAIL, element: <MemberDetailPage /> },
          { path: ROUTE_PATHS.CONTACTS, element: <ContactListPage /> },
          { path: ROUTE_PATHS.CONTACT_REPLY, element: <ContactReplyPage /> },
          { path: ROUTE_PATHS.CONTACT_DETAIL, element: <ContactDetailPage /> },
          { path: ROUTE_PATHS.PRODUCTS, element: <ProductListPage /> },
          { path: ROUTE_PATHS.PRODUCT_CREATE, element: <ProductCreatePage /> },
          { path: ROUTE_PATHS.PRODUCT_EDIT, element: <ProductEditPage /> },
          { path: ROUTE_PATHS.PRODUCT_DETAIL, element: <ProductDetailPage /> },
          { path: ROUTE_PATHS.PARTNERS, element: <PartnerListPage /> },
          { path: ROUTE_PATHS.PARTNER_CREATE, element: <PartnerCreatePage /> },
          { path: ROUTE_PATHS.PARTNER_EDIT, element: <PartnerEditPage /> },
          { path: ROUTE_PATHS.PARTNER_DETAIL, element: <PartnerDetailPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
