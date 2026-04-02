import { NavLink } from 'react-router-dom'

import type { NavigationItem } from '@/lib/navigation'
import styles from '@/components/navigation/AppNav.module.css'

type AppNavProps = {
	items: NavigationItem[]
	inverse?: boolean
	onNavigate?: () => void
}

export function AppNav({ inverse = false, items, onNavigate }: AppNavProps) {
	return (
		<nav className={[styles.nav, inverse ? styles.inverse : ''].filter(Boolean).join(' ')}>
			{items.map((item) => {
				const Icon = item.icon

				return (
					<NavLink
						key={item.to}
						to={item.to}
						className={({ isActive }) => [styles.link, isActive ? styles.active : ''].filter(Boolean).join(' ')}
						end={item.to === '/app' || item.to === '/admin'}
						onClick={onNavigate}
					>
						<Icon className={styles.icon} />
						<span>{item.label}</span>
					</NavLink>
				)
			})}
		</nav>
	)
}
