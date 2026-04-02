import {
	ArrowLeftRight,
	CalendarDays,
	ChevronDown,
	DollarSign,
	FilePlus2,
	FileText,
	FolderOpen,
	Home,
	NotebookPen,
	Repeat,
	Sandwich,
	Tag,
	TramFront,
	Users,
	Wallet,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/actions/Button'
import { Card } from '@/components/data/Card'
import { Input } from '@/components/forms/Input'
import { Textarea } from '@/components/forms/Textarea'
import styles from '@/features/transactions/TransactionCreateView.module.css'

type TransactionMode = 'expense' | 'income' | 'transfer'
type DateShortcut = 'today' | 'yesterday' | 'other'
type RecurringMode = 'subscription' | 'installment'
type SplitMode = 'equal' | 'fixed'

type PickerOption = {
	value: string
	label: string
	icon?: typeof Wallet
	color?: string
	meta?: string
}

const modeMeta: Record<TransactionMode, { label: string }> = {
	expense: { label: 'expense' },
	income: { label: 'income' },
	transfer: { label: 'transfer' },
}

const accountOptions: PickerOption[] = [
	{ value: 'main', label: 'Main account', icon: Wallet, color: '#159270', meta: 'AUD' },
	{ value: 'everyday', label: 'Everyday', icon: Wallet, color: '#28B384', meta: 'AUD' },
	{ value: 'travel', label: 'Travel', icon: Wallet, color: '#5DBEA1', meta: 'USD' },
]

const categoryOptions: PickerOption[] = [
	{ value: 'housing', label: 'Housing', icon: Home, color: '#28B384' },
	{ value: 'food', label: 'Food', icon: Sandwich, color: '#159270' },
	{ value: 'transport', label: 'Transport', icon: TramFront, color: '#FD9D02' },
]

const groupOptions: PickerOption[] = [
	{ value: 'home', label: 'Home', meta: '3 members' },
	{ value: 'travel', label: 'Travel', meta: '3 members' },
	{ value: 'work', label: 'Work lunches', meta: '3 members' },
]

const tagOptions: PickerOption[] = [
	{ value: 'family', label: 'Family', color: '#28B384' },
	{ value: 'weekly', label: 'Weekly', color: '#FD9D02' },
	{ value: 'shared', label: 'Shared', color: '#159270' },
	{ value: 'personal', label: 'Personal', color: '#5DBEA1' },
]

const frequencyOptions: PickerOption[] = [
	{ value: 'daily', label: 'Daily' },
	{ value: 'weekly', label: 'Weekly' },
	{ value: 'fortnightly', label: 'Fortnightly' },
	{ value: 'monthly', label: 'Monthly' },
	{ value: 'quarterly', label: 'Quarterly' },
	{ value: 'yearly', label: 'Yearly' },
]

type PickerFieldProps = {
	placeholder: string
	options: PickerOption[]
	value: string
	onChange: (value: string) => void
	createLabel?: string
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

	return (
		<div className={styles.optionLead}>
			{option.color || Icon ? (
				<div
					className={styles.optionBadge}
					style={{
						background: option.color ? `${option.color}22` : 'rgba(16, 33, 29, 0.08)',
						color: option.color ?? 'var(--color-ink)',
					}}
				>
					{Icon ? <Icon size={15} /> : <Tag size={13} />}
				</div>
			) : null}
			<div className={styles.optionText}>
				<div className={styles.optionLabel}>{option.label}</div>
				{option.meta ? <div className={styles.optionMeta}>{option.meta}</div> : null}
			</div>
		</div>
	)
}

function PickerField({ createLabel, onChange, options, placeholder, value }: PickerFieldProps) {
	const [open, setOpen] = useState(false)
	const selected = options.find((option) => option.value === value)
	const rootRef = useClickOutside<HTMLDivElement>(() => setOpen(false))

	return (
		<div className={styles.picker} ref={rootRef}>
			<button
				aria-expanded={open}
				className={styles.pickerButton}
				onClick={() => setOpen((current) => !current)}
				type="button"
			>
				{selected ? <PickerOptionLead option={selected} /> : <span className={styles.placeholder}>{placeholder}</span>}
				<ChevronDown className={styles.pickerChevron} size={16} />
			</button>

			{open ? (
				<div className={styles.pickerMenu}>
					<div className={styles.pickerList}>
						{options.map((option) => (
							<button
								className={styles.pickerItem}
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

type MultiPickerFieldProps = {
	placeholder: string
	options: PickerOption[]
	values: string[]
	onToggle: (value: string) => void
	createLabel: string
}

function MultiPickerField({ createLabel, onToggle, options, placeholder, values }: MultiPickerFieldProps) {
	const [open, setOpen] = useState(false)
	const rootRef = useClickOutside<HTMLDivElement>(() => setOpen(false))
	const selected = options.filter((option) => values.includes(option.value))

	return (
		<div className={styles.picker} ref={rootRef}>
			<button
				aria-expanded={open}
				className={styles.pickerButton}
				onClick={() => setOpen((current) => !current)}
				type="button"
			>
				{selected.length ? (
					<div className={styles.selectedTags}>
						{selected.map((option) => (
							<span
								className={styles.selectedTag}
								key={option.value}
								style={{
									background: option.color ? `${option.color}18` : 'rgba(16, 33, 29, 0.08)',
									color: option.color ?? 'var(--color-ink)',
								}}
							>
								{option.label}
							</span>
						))}
					</div>
				) : (
					<span className={styles.placeholder}>{placeholder}</span>
				)}
				<ChevronDown className={styles.pickerChevron} size={16} />
			</button>

			{open ? (
				<div className={styles.pickerMenu}>
					<div className={styles.pickerList}>
						{options.map((option) => (
							<button
								className={[styles.pickerItem, values.includes(option.value) ? styles.pickerItemActive : ''].filter(Boolean).join(' ')}
								key={option.value}
								onClick={() => onToggle(option.value)}
								type="button"
							>
								<PickerOptionLead option={option} />
							</button>
						))}
					</div>
					<button className={styles.createItemButton} type="button">
						<FilePlus2 size={15} />
						<span>{createLabel}</span>
					</button>
				</div>
			) : null}
		</div>
	)
}

type FormRowProps = {
	icon: ReactNode
	label?: string
	children: ReactNode
	hint?: string
	centeredHeader?: ReactNode
}

function FormRow({ centeredHeader, children, hint, icon, label }: FormRowProps) {
	return (
		<div className={styles.formRow}>
			<div className={styles.rowIcon}>{icon}</div>
			<div className={styles.rowField}>
				{centeredHeader ? centeredHeader : label ? <label className={styles.rowLabel}>{label}</label> : null}
				{children}
				{hint ? <div className={styles.rowHint}>{hint}</div> : null}
			</div>
		</div>
	)
}

export function TransactionCreateView() {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const [dateShortcut, setDateShortcut] = useState<DateShortcut>('today')
	const [status, setStatus] = useState<'pending' | 'cleared'>('pending')
	const [recurringEnabled, setRecurringEnabled] = useState(false)
	const [sharedEnabled, setSharedEnabled] = useState(false)
	const [recurringMode, setRecurringMode] = useState<RecurringMode>('subscription')
	const [recurringFrequency, setRecurringFrequency] = useState('')
	const [splitMode, setSplitMode] = useState<SplitMode>('equal')
	const [account, setAccount] = useState('')
	const [toAccount, setToAccount] = useState('')
	const [category, setCategory] = useState('')
	const [group, setGroup] = useState('')
	const [tags, setTags] = useState<string[]>([])

	const modeParam = searchParams.get('type')
	const mode: TransactionMode =
		modeParam === 'income' || modeParam === 'transfer' || modeParam === 'expense' ? modeParam : 'expense'
	const meta = modeMeta[mode]

	const groupMembers =
		group === 'home'
			? ['Ana', 'Luca', 'Mia']
			: group === 'travel'
				? ['Noah', 'Sofia', 'Ethan']
				: group === 'work'
					? ['Priya', 'Leo', 'Nina']
					: []

	const toggleTag = (value: string) => {
		setTags((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]))
	}

	const amountRow = (
		<FormRow icon={<DollarSign size={18} />}>
			<div className={styles.splitFields}>
				<Input inputMode="decimal" placeholder="0.00" type="text" />
				<button
					aria-pressed={status === 'cleared'}
					className={[styles.statusToggle, status === 'cleared' ? styles.statusToggleActive : ''].filter(Boolean).join(' ')}
					onClick={() => setStatus((current) => (current === 'pending' ? 'cleared' : 'pending'))}
					type="button"
				>
					<span className={styles.statusDot} />
					<span>{status === 'pending' ? 'Pending' : 'Cleared'}</span>
				</button>
			</div>
		</FormRow>
	)

	const dateRow = (
		<FormRow icon={<CalendarDays size={18} />}>
			<div className={styles.dateRow}>
				<div className={styles.dateShortcutRow}>
					{(['today', 'yesterday', 'other'] as DateShortcut[]).map((option) => (
						<button
							aria-pressed={dateShortcut === option}
							className={[styles.dateShortcutButton, dateShortcut === option ? styles.dateShortcutButtonActive : ''].filter(Boolean).join(' ')}
							key={option}
							onClick={() => setDateShortcut(option)}
							type="button"
						>
							{option === 'today' ? 'Today' : option === 'yesterday' ? 'Yesterday' : 'Other'}
						</button>
					))}
				</div>
				{dateShortcut === 'other' ? <Input type="date" /> : null}
			</div>
		</FormRow>
	)

	const descriptionRow = (
		<FormRow icon={<FileText size={18} />}>
			<Input placeholder="Description" type="text" />
		</FormRow>
	)

	if (mode === 'transfer') {
		return (
			<div className="page-stack">
				<Card className={styles.formCard}>
					<div className={styles.formList}>
						{amountRow}
						{dateRow}
						{descriptionRow}

						<FormRow icon={<Wallet size={18} />}>
							<PickerField
								createLabel="New account"
								onChange={setAccount}
								options={accountOptions}
								placeholder="From account"
								value={account}
							/>
						</FormRow>

						<FormRow icon={<ArrowLeftRight size={18} />}>
							<PickerField
								createLabel="New account"
								onChange={setToAccount}
								options={accountOptions.filter((option) => option.value !== account)}
								placeholder="To account"
								value={toAccount}
							/>
						</FormRow>

						<FormRow icon={<NotebookPen size={18} />}>
							<Textarea placeholder="Notes" rows={4} />
						</FormRow>
					</div>
				</Card>

				<div className={styles.footerActions}>
					<Button onClick={() => navigate('/app/transactions')} variant="secondary">
						Cancel
					</Button>
					<Button variant="primary">Save {meta.label}</Button>
				</div>
			</div>
		)
	}

	return (
		<div className="page-stack">
			<Card className={styles.formCard}>
				<div className={styles.formList}>
					{amountRow}
					{dateRow}
					{descriptionRow}

					<FormRow icon={<Wallet size={18} />}>
						<PickerField
							createLabel="New account"
							onChange={setAccount}
							options={accountOptions}
							placeholder="Account"
							value={account}
						/>
					</FormRow>

					<FormRow icon={<FolderOpen size={18} />}>
						<PickerField
							createLabel="New category"
							onChange={setCategory}
							options={categoryOptions}
							placeholder="Category"
							value={category}
						/>
					</FormRow>

					<FormRow icon={<Tag size={18} />}>
						<MultiPickerField
							createLabel="New tag"
							onToggle={toggleTag}
							options={tagOptions}
							placeholder="Tags"
							values={tags}
						/>
					</FormRow>

					<FormRow icon={<NotebookPen size={18} />}>
						<Textarea placeholder="Notes" rows={4} />
					</FormRow>

					<FormRow
						centeredHeader={
							<div className={styles.centeredHeader}>
								<div className={styles.centeredHeaderLabel}>Recurring</div>
								<button
									aria-pressed={recurringEnabled}
									className={[styles.toggleButton, recurringEnabled ? styles.toggleButtonActive : ''].filter(Boolean).join(' ')}
									onClick={() => setRecurringEnabled((current) => !current)}
									type="button"
								>
									<span className={styles.toggleTrack}>
										<span className={styles.toggleThumb} />
									</span>
									<span>{recurringEnabled ? 'Enabled' : 'Off'}</span>
								</button>
							</div>
						}
						icon={<Repeat size={18} />}
					>
						{recurringEnabled ? (
							<div className={styles.recurringDetails}>
								<div className={styles.inlineFieldGroup}>
									<div className={styles.inlineFieldLabel}>Recurring type</div>
									<div className={styles.choiceRow}>
										{(['subscription', 'installment'] as RecurringMode[]).map((option) => (
											<button
												aria-pressed={recurringMode === option}
												className={[styles.choiceButton, recurringMode === option ? styles.choiceButtonActive : '']
													.filter(Boolean)
													.join(' ')}
												key={option}
												onClick={() => setRecurringMode(option)}
												type="button"
											>
												{option === 'subscription' ? 'Subscription' : 'Installment'}
											</button>
										))}
									</div>
								</div>
								<div className={styles.stackFields}>
									<PickerField
										onChange={setRecurringFrequency}
										options={frequencyOptions}
										placeholder="Frequency"
										value={recurringFrequency}
									/>
									{recurringMode === 'installment' ? <Input min="1" placeholder="Occurrences" type="number" /> : null}
								</div>
							</div>
						) : null}
					</FormRow>

					<FormRow
						centeredHeader={
							<div className={styles.centeredHeader}>
								<div className={styles.centeredHeaderLabel}>Shared</div>
								<button
									aria-pressed={sharedEnabled}
									className={[styles.toggleButton, sharedEnabled ? styles.toggleButtonActive : ''].filter(Boolean).join(' ')}
									onClick={() => setSharedEnabled((current) => !current)}
									type="button"
								>
									<span className={styles.toggleTrack}>
										<span className={styles.toggleThumb} />
									</span>
									<span>{sharedEnabled ? 'Enabled' : 'Off'}</span>
								</button>
							</div>
						}
						icon={<Users size={18} />}
					>
						{sharedEnabled ? (
							<div className={styles.inlineDetails}>
								<div className={styles.sharedTopRow}>
									<PickerField
										createLabel="New group"
										onChange={setGroup}
										options={groupOptions}
										placeholder="Group"
										value={group}
									/>
									<div className={styles.choiceRow}>
										{(['equal', 'fixed'] as SplitMode[]).map((option) => (
											<button
												aria-pressed={splitMode === option}
												className={[styles.choiceButton, splitMode === option ? styles.choiceButtonActive : '']
													.filter(Boolean)
													.join(' ')}
												key={option}
												onClick={() => setSplitMode(option)}
												type="button"
											>
												{option === 'equal' ? 'Equal split' : 'Fixed split'}
											</button>
										))}
									</div>
								</div>
								{groupMembers.length && splitMode !== 'fixed' ? (
									<div className={styles.groupMembers}>
										{groupMembers.map((member) => (
											<div className={styles.memberChip} key={member}>
												<span className={styles.memberAvatar}>{member.charAt(0)}</span>
												<span>{member}</span>
											</div>
										))}
									</div>
								) : null}
								{splitMode === 'fixed' ? (
									<div className={styles.fixedSplitTable}>
										{groupMembers.map((member) => (
											<div className={styles.fixedSplitRow} key={member}>
												<div className={styles.memberChip}>
													<span className={styles.memberAvatar}>{member.charAt(0)}</span>
													<span>{member}</span>
												</div>
												<Input inputMode="decimal" placeholder="0.00" type="text" />
											</div>
										))}
									</div>
								) : null}
							</div>
						) : null}
					</FormRow>
				</div>
			</Card>

			<div className={styles.footerActions}>
				<Button onClick={() => navigate('/app/transactions')} variant="secondary">
					Cancel
				</Button>
				<Button variant="primary">Save {meta.label}</Button>
			</div>
		</div>
	)
}
