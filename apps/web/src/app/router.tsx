import { createBrowserRouter, Outlet } from 'react-router-dom'

import { AdminRoute, ProtectedRoute, PublicOnlyGuard } from '@/app/route-guards'
import { AdminLayout } from '@/layouts/AdminLayout'
import { PublicLayout } from '@/layouts/PublicLayout'
import { UserLayout } from '@/layouts/UserLayout'
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage'
import { AdminOverviewPage } from '@/pages/admin/AdminOverviewPage'
import { AdminUserDetailPage } from '@/pages/admin/AdminUserDetailPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AccountsPage } from '@/pages/app/AccountsPage'
import { CategoriesPage } from '@/pages/app/CategoriesPage'
import { DashboardPage } from '@/pages/app/DashboardPage'
import { NotificationsPage } from '@/pages/app/NotificationsPage'
import { ReportsPage } from '@/pages/app/ReportsPage'
import { SettingsPage } from '@/pages/app/SettingsPage'
import { TagsPage } from '@/pages/app/TagsPage'
import { TransactionCreatePage } from '@/pages/app/TransactionCreatePage'
import { TransactionsPage } from '@/pages/app/TransactionsPage'
import { ForgotPasswordPage } from '@/pages/public/ForgotPasswordPage'
import { LandingPage } from '@/pages/public/LandingPage'
import { LoginPage } from '@/pages/public/LoginPage'
import { ResetPasswordPage } from '@/pages/public/ResetPasswordPage'
import { SignupPage } from '@/pages/public/SignupPage'
import { VerifyEmailPage } from '@/pages/public/VerifyEmailPage'

function PublicGuardOutlet() {
	return (
		<PublicOnlyGuard>
			<Outlet />
		</PublicOnlyGuard>
	)
}

function ProtectedOutlet() {
	return (
		<ProtectedRoute>
			<Outlet />
		</ProtectedRoute>
	)
}

function AdminOutlet() {
	return (
		<AdminRoute>
			<Outlet />
		</AdminRoute>
	)
}

export const appRouter = createBrowserRouter([
	{
		element: <PublicLayout />,
		children: [
			{ index: true, element: <LandingPage /> },
			{
				element: <PublicGuardOutlet />,
				children: [
					{ path: '/login', element: <LoginPage /> },
					{ path: '/signup', element: <SignupPage /> },
					{ path: '/forgot-password', element: <ForgotPasswordPage /> },
					{ path: '/reset-password', element: <ResetPasswordPage /> },
					{ path: '/verify-email', element: <VerifyEmailPage /> },
				],
			},
		],
	},
	{
		path: '/app',
		element: <ProtectedOutlet />,
		children: [
			{
				element: <UserLayout />,
				children: [
					{ index: true, element: <DashboardPage /> },
					{ path: 'transactions', element: <TransactionsPage /> },
					{ path: 'transactions/new', element: <TransactionCreatePage /> },
					{ path: 'reports', element: <ReportsPage /> },
					{ path: 'accounts', element: <AccountsPage /> },
					{ path: 'categories', element: <CategoriesPage /> },
					{ path: 'tags', element: <TagsPage /> },
					{ path: 'notifications', element: <NotificationsPage /> },
					{ path: 'settings', element: <SettingsPage /> },
				],
			},
		],
	},
	{
		path: '/admin',
		element: <AdminOutlet />,
		children: [
			{
				element: <AdminLayout />,
				children: [
					{ index: true, element: <AdminOverviewPage /> },
					{ path: 'users', element: <AdminUsersPage /> },
					{ path: 'users/:id', element: <AdminUserDetailPage /> },
					{ path: 'categories', element: <AdminCategoriesPage /> },
				],
			},
		],
	},
])
