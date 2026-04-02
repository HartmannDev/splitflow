import type { PropsWithChildren } from 'react'

import styles from '@/components/forms/Field.module.css'

type FieldProps = PropsWithChildren<{
	label: string
	hint?: string
	error?: string
	htmlFor?: string
}>

export function Field({ children, error, hint, htmlFor, label }: FieldProps) {
	return (
		<label className={styles.field} htmlFor={htmlFor}>
			<span className={styles.label}>{label}</span>
			{children}
			{error ? <span className={styles.error}>{error}</span> : hint ? <span className={styles.hint}>{hint}</span> : null}
		</label>
	)
}
