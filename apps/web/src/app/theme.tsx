import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

export type ThemeMode = 'light' | 'dark'

type ThemeContextValue = {
	theme: ThemeMode
	isDark: boolean
	setTheme: (theme: ThemeMode) => void
	toggleTheme: () => void
}

const THEME_STORAGE_KEY = 'splitflow.theme'

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getPreferredTheme(): ThemeMode {
	if (typeof window === 'undefined') {
		return 'light'
	}

	const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
	if (stored === 'light' || stored === 'dark') {
		return stored
	}

	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: PropsWithChildren) {
	const [theme, setThemeState] = useState<ThemeMode>(() => getPreferredTheme())

	useEffect(() => {
		document.documentElement.dataset.theme = theme
		document.documentElement.style.colorScheme = theme
		window.localStorage.setItem(THEME_STORAGE_KEY, theme)
	}, [theme])

	const value = useMemo<ThemeContextValue>(
		() => ({
			theme,
			isDark: theme === 'dark',
			setTheme: setThemeState,
			toggleTheme: () => setThemeState((current) => (current === 'dark' ? 'light' : 'dark')),
		}),
		[theme],
	)

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
	const context = useContext(ThemeContext)

	if (!context) {
		throw new Error('useTheme must be used within ThemeProvider')
	}

	return context
}
