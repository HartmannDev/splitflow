import { MoonStar, SunMedium } from 'lucide-react'

import { useTheme } from '@/app/theme'
import styles from '@/components/feedback/ThemeToggle.module.css'

type ThemeToggleProps = {
	iconOnly?: boolean
}

export function ThemeToggle({ iconOnly = false }: ThemeToggleProps) {
	const { isDark, toggleTheme } = useTheme()
	const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

	return (
		<button
			aria-label={label}
			className={[styles.toggle, iconOnly ? styles.iconOnly : ''].filter(Boolean).join(' ')}
			onClick={toggleTheme}
			title={label}
			type="button"
		>
			{isDark ? <SunMedium size={18} /> : <MoonStar size={18} />}
			{iconOnly ? null : <span className={styles.label}>{isDark ? 'Light mode' : 'Dark mode'}</span>}
		</button>
	)
}
