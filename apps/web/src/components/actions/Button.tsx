import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

import styles from '@/components/actions/Button.module.css'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent'

type ButtonProps = PropsWithChildren<
	ButtonHTMLAttributes<HTMLButtonElement> & {
		variant?: ButtonVariant
		element?: 'button' | 'span'
	}
>

export function Button({ children, className, element = 'button', variant = 'primary', type = 'button', ...props }: ButtonProps) {
	const classes = [styles.button, styles[variant], className].filter(Boolean).join(' ')

	if (element === 'span') {
		return <span className={classes}>{children}</span>
	}

	return (
		<button {...props} className={classes} type={type}>
			{children}
		</button>
	)
}
