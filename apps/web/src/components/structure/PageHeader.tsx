import type { ReactNode } from 'react'

import styles from '@/components/structure/PageHeader.module.css'

type PageHeaderProps = {
	title: string
	description: string
	eyebrow?: string
	actions?: ReactNode
}

export function PageHeader({ actions, description, eyebrow, title }: PageHeaderProps) {
	return (
		<header className={styles.header}>
			<div className={styles.content}>
				{eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
				<h1 className={styles.title}>{title}</h1>
				<p className={styles.description}>{description}</p>
			</div>
			{actions ? <div className={styles.actions}>{actions}</div> : null}
		</header>
	)
}
