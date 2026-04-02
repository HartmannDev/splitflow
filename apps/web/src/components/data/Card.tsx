import type { HTMLAttributes, PropsWithChildren } from 'react'

import styles from '@/components/data/Card.module.css'

type CardProps = PropsWithChildren<
	HTMLAttributes<HTMLElement> & {
		muted?: boolean
	}
>

export function Card({ children, className, muted = false, ...props }: CardProps) {
	const classes = [styles.card, muted ? styles.muted : '', className].filter(Boolean).join(' ')

	return (
		<section {...props} className={classes}>
			{children}
		</section>
	)
}
