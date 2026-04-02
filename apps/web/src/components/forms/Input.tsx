import type { ForwardedRef, InputHTMLAttributes } from 'react'
import { forwardRef } from 'react'

import styles from '@/components/forms/Input.module.css'

export const Input = forwardRef(function Input(
	{ className, ...props }: InputHTMLAttributes<HTMLInputElement>,
	ref: ForwardedRef<HTMLInputElement>,
) {
	return <input {...props} className={[styles.input, className].filter(Boolean).join(' ')} ref={ref} />
})
