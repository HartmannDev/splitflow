import type { ForwardedRef, SelectHTMLAttributes } from 'react'
import { forwardRef } from 'react'

import styles from '@/components/forms/Input.module.css'

export const Select = forwardRef(function Select(
	{ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>,
	ref: ForwardedRef<HTMLSelectElement>,
) {
	return <select {...props} className={[styles.input, styles.select, className].filter(Boolean).join(' ')} ref={ref} />
})
