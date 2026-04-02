import type { PropsWithChildren, TableHTMLAttributes } from 'react'

export function Table({ children, style, ...props }: PropsWithChildren<TableHTMLAttributes<HTMLTableElement>>) {
	return (
		<div style={{ overflowX: 'auto' }}>
			<table
				{...props}
				style={{
					width: '100%',
					borderCollapse: 'collapse',
					...style,
				}}
			>
				{children}
			</table>
		</div>
	)
}
