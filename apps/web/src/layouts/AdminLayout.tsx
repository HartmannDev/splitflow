import { startTransition } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import { useCurrentUserQuery, useLogoutMutation } from '@/app/auth'
import { Button } from '@/components/actions/Button'
import { BrandMark } from '@/components/brand/BrandMark'
import { ThemeToggle } from '@/components/feedback/ThemeToggle'
import { AppNav } from '@/components/navigation/AppNav'
import { adminNavigation } from '@/lib/navigation'
import styles from '@/layouts/AdminLayout.module.css'

export function AdminLayout() {
	const navigate = useNavigate()
	const location = useLocation()
	const { data: user } = useCurrentUserQuery()
	const logoutMutation = useLogoutMutation()

	const pageTitle =
		location.pathname === '/admin'
			? 'Overview'
			: location.pathname.startsWith('/admin/users/')
				? 'User Detail'
				: location.pathname.startsWith('/admin/users')
					? 'Users'
					: location.pathname.startsWith('/admin/categories')
						? 'Categories'
						: 'Admin'

	const handleLogout = async () => {
		await logoutMutation.mutateAsync()
		startTransition(() => navigate('/login', { replace: true }))
	}

	return (
		<div className={styles.shell}>
			<aside className={styles.sidebar}>
				<BrandMark inverse subtitle="Operational control surface" />
				<AppNav inverse items={adminNavigation} />
				<div className={styles.footerCard}>
					<div className={styles.footerTitle}>{user ? `${user.name} ${user.lastname}` : 'Admin workspace'}</div>
					<div className={styles.footerMeta}>
						{user ? user.email : 'Lifecycle controls and platform configuration'}
					</div>
				</div>
			</aside>
			<div className={styles.workspace}>
				<header className={styles.header}>
					<div className={styles.headerCopy}>
						<div className={styles.headerTitle}>{pageTitle}</div>
					</div>
					<div className="content-cluster">
						<ThemeToggle />
						<Button disabled={logoutMutation.isPending} onClick={() => void handleLogout()} variant="secondary">
							Log out
						</Button>
					</div>
				</header>
				<main className={styles.main}>
					<Outlet />
				</main>
			</div>
		</div>
	)
}
