import type { MouseEvent, PropsWithChildren } from 'react'

import styles from '@/components/overlays/Modal.module.css'

type ModalProps = PropsWithChildren<{
	open?: boolean
	onClose?: () => void
}>

export function Modal({ children, onClose, open = false }: ModalProps) {
	if (!open) {
		return null
	}

	const handleBackdropClick = () => {
		onClose?.()
	}

	const handlePanelClick = (event: MouseEvent<HTMLDivElement>) => {
		event.stopPropagation()
	}

	return (
		<div className={styles.backdrop} onClick={handleBackdropClick} role="presentation">
			<div
				aria-modal="true"
				className={styles.panel}
				onClick={handlePanelClick}
				role="dialog"
			>
				{children}
			</div>
		</div>
	)
}
