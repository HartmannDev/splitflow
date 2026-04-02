import type { LucideIcon } from 'lucide-react'
import {
	BadgePercent,
	Bell,
	CreditCard,
	FolderKanban,
	Home,
	LayoutDashboard,
	ReceiptText,
	Settings,
	Shield,
	Tags,
	Users,
} from 'lucide-react'

export type NavigationItem = {
	label: string
	to: string
	icon: LucideIcon
}

export const userNavigation: NavigationItem[] = [
	{ label: 'Dashboard', to: '/app', icon: Home },
	{ label: 'Transactions', to: '/app/transactions', icon: ReceiptText },
	{ label: 'Reports', to: '/app/reports', icon: BadgePercent },
	{ label: 'Accounts', to: '/app/accounts', icon: CreditCard },
	{ label: 'Categories', to: '/app/categories', icon: FolderKanban },
	{ label: 'Tags', to: '/app/tags', icon: Tags },
	{ label: 'Notifications', to: '/app/notifications', icon: Bell },
]

export const userBottomNavigation: NavigationItem[] = [{ label: 'Settings', to: '/app/settings', icon: Settings }]

export const adminNavigation: NavigationItem[] = [
	{ label: 'Overview', to: '/admin', icon: LayoutDashboard },
	{ label: 'Users', to: '/admin/users', icon: Users },
	{ label: 'Categories', to: '/admin/categories', icon: Shield },
]
