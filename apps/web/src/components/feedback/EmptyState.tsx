import type { PropsWithChildren, ReactNode } from 'react'

import styles from '@/components/feedback/EmptyState.module.css'

type EmptyStateProps = PropsWithChildren<{
	title: string
	message: string
	action?: ReactNode
}>

export function EmptyState({ action, children, message, title }: EmptyStateProps) {
	return (
		<div className={styles.wrapper}>
			<div className={styles.title}>{title}</div>
			<p className={styles.message}>{message}</p>
			{children}
			{action}
		</div>
	)
}
