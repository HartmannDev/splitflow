import type { CSSProperties, ForwardedRef, TextareaHTMLAttributes } from 'react'
import { forwardRef } from 'react'

import styles from '@/components/forms/Input.module.css'

export const Textarea = forwardRef(function Textarea(
	{ className, rows = 4, style, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>,
	ref: ForwardedRef<HTMLTextAreaElement>,
) {
	return (
		<textarea
			{...props}
			className={[styles.input, className].filter(Boolean).join(' ')}
			ref={ref}
			rows={rows}
			style={{ padding: 'var(--space-4)', ...(style as CSSProperties) }}
		/>
	)
})
