import { ChevronDown, FilePlus2, Tag } from 'lucide-react'
import type { ComponentType } from 'react'
import { useEffect, useRef, useState } from 'react'

import styles from '@/components/forms/Picker.module.css'

export type PickerOption = {
	value: string
	label: string
	icon?: ComponentType<{ size?: number }>
	color?: string
	meta?: string
}

type PickerProps = {
	ariaLabel?: string
	buttonClassName?: string
	className?: string
	createLabel?: string
	menuPlacement?: 'bottom' | 'top'
	onChange: (value: string) => void
	options: PickerOption[]
	placeholder: string
	value: string
}

function useClickOutside<T extends HTMLElement>(onClose: () => void) {
	const ref = useRef<T | null>(null)

	useEffect(() => {
		function handlePointerDown(event: MouseEvent) {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				onClose()
			}
		}

		document.addEventListener('mousedown', handlePointerDown)
		return () => document.removeEventListener('mousedown', handlePointerDown)
	}, [onClose])

	return ref
}

function PickerOptionLead({ option }: { option: PickerOption }) {
	const Icon = option.icon

	if (!Icon && !option.color) {
		return <span className={styles.optionLabel}>{option.label}</span>
	}

	return (
		<div className={styles.optionLead}>
			<div
				className={styles.optionBadge}
				style={{
					background: option.color ? `${option.color}22` : 'rgba(16, 33, 29, 0.08)',
					color: option.color ?? 'var(--color-ink)',
				}}
			>
				{Icon ? <Icon size={15} /> : <Tag size={13} />}
			</div>
			<div className={styles.optionText}>
				<div className={styles.optionLabel}>{option.label}</div>
				{option.meta ? <div className={styles.optionMeta}>{option.meta}</div> : null}
			</div>
		</div>
	)
}

export function Picker({
	ariaLabel,
	buttonClassName,
	className,
	createLabel,
	menuPlacement = 'bottom',
	onChange,
	options,
	placeholder,
	value,
}: PickerProps) {
	const [open, setOpen] = useState(false)
	const selected = options.find((option) => option.value === value)
	const rootRef = useClickOutside<HTMLDivElement>(() => setOpen(false))

	return (
		<div className={[styles.picker, className].filter(Boolean).join(' ')} ref={rootRef}>
			<button
				aria-expanded={open}
				aria-label={ariaLabel}
				className={[styles.pickerButton, buttonClassName].filter(Boolean).join(' ')}
				onClick={() => setOpen((current) => !current)}
				type="button"
			>
				{selected ? <PickerOptionLead option={selected} /> : <span className={styles.placeholder}>{placeholder}</span>}
				<ChevronDown className={styles.pickerChevron} size={16} />
			</button>

			{open ? (
				<div className={[styles.pickerMenu, menuPlacement === 'top' ? styles.menuTop : styles.menuBottom].join(' ')}>
					<div className={styles.pickerList}>
						{options.map((option) => (
							<button
								className={[styles.pickerItem, value === option.value ? styles.pickerItemActive : ''].filter(Boolean).join(' ')}
								key={option.value}
								onClick={() => {
									onChange(option.value)
									setOpen(false)
								}}
								type="button"
							>
								<PickerOptionLead option={option} />
							</button>
						))}
					</div>
					{createLabel ? (
						<button className={styles.createItemButton} type="button">
							<FilePlus2 size={15} />
							<span>{createLabel}</span>
						</button>
					) : null}
				</div>
			) : null}
		</div>
	)
}
