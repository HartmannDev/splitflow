import { Link, Outlet } from 'react-router-dom'

import { Button } from '@/components/actions/Button'
import { BrandMark } from '@/components/brand/BrandMark'
import { ThemeToggle } from '@/components/feedback/ThemeToggle'
import styles from '@/layouts/PublicLayout.module.css'

export function PublicLayout() {
	return (
		<div className={styles.shell}>
			<header className={styles.header}>
				<div className={styles.headerLead}>
					<Link to="/">
						<BrandMark subtitle="Money clarity for shared lives" />
					</Link>
				</div>
				<div className={styles.toolbar}>
					<ThemeToggle iconOnly />
					<Link to="/signup">
						<Button className={styles.headerSecondaryAction} element="span" variant="ghost">
							Create account
						</Button>
					</Link>
					<Link to="/login">
						<Button element="span">Login</Button>
					</Link>
				</div>
			</header>
			<main className={styles.content}>
				<Outlet />
			</main>
		</div>
	)
}
