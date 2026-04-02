import {
	CalendarRange,
	Home,
	Repeat,
	Sandwich,
	Tag,
	TramFront,
	Tv,
	Users,
	UtilityPole,
	Wallet,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'

import { Card } from '@/components/data/Card'
import { Table } from '@/components/data/Table'
import { Input } from '@/components/forms/Input'
import { Select } from '@/components/forms/Select'
import { formatCurrency } from '@/lib/formatters'
import styles from '@/features/transactions/TransactionsView.module.css'

const rows = [
	{
		id: 't1',
		date: 'Mar 28',
		description: 'Groceries',
		category: { label: 'Food', color: '#159270', icon: Sandwich },
		account: { label: 'Everyday', color: '#28B384', icon: Wallet },
		amount: -84.32,
		details: ['shared'],
		tags: [
			{ label: 'Family', color: 'rgba(40, 179, 132, 0.14)', foreground: '#159270' },
			{ label: 'Weekly', color: 'rgba(253, 157, 2, 0.16)', foreground: '#A65C00' },
		],
	},
	{
		id: 't2',
		date: 'Mar 27',
		description: 'Streaming subscription',
		category: { label: 'Leisure', color: '#F77902', icon: Tv },
		account: { label: 'Everyday', color: '#28B384', icon: Wallet },
		amount: -15.99,
		details: ['recurring'],
		tags: [{ label: 'Personal', color: 'rgba(93, 190, 161, 0.16)', foreground: '#1D7A60' }],
	},
	{
		id: 't3',
		date: 'Mar 26',
		description: 'Train pass top-up',
		category: { label: 'Transport', color: '#FD9D02', icon: TramFront },
		account: { label: 'Travel', color: '#5DBEA1', icon: Wallet },
		amount: -42,
		details: ['shared', 'recurring'],
		tags: [{ label: 'Commute', color: 'rgba(21, 146, 112, 0.14)', foreground: '#0F6B53' }],
	},
	{
		id: 't4',
		date: 'Mar 25',
		description: 'Rent',
		category: { label: 'Housing', color: '#28B384', icon: Home },
		account: { label: 'Main account', color: '#159270', icon: Wallet },
		amount: -1480,
		details: [],
		tags: [{ label: 'Monthly', color: 'rgba(247, 121, 2, 0.14)', foreground: '#B25D00' }],
	},
	{
		id: 't5',
		date: 'Mar 24',
		description: 'Water bill',
		category: { label: 'Utilities', color: '#5DBEA1', icon: UtilityPole },
		account: { label: 'Main account', color: '#159270', icon: Wallet },
		amount: -82.5,
		details: [],
		tags: [{ label: 'Home', color: 'rgba(40, 179, 132, 0.1)', foreground: '#17785C' }],
	},
]

const periodOptions = [
	{ value: 'today', label: 'Today' },
	{ value: 'yesterday', label: 'Yesterday' },
	{ value: 'week', label: 'This week' },
	{ value: 'last7days', label: 'Last 7 days' },
	{ value: 'month', label: 'This month' },
	{ value: 'lastMonth', label: 'Last month' },
	{ value: 'quarter', label: 'This quarter' },
	{ value: 'year', label: 'This year' },
	{ value: 'custom', label: 'Custom date range' },
]

function detailIcon(type: string) {
	if (type === 'shared') {
		return <Users size={14} />
	}

	return <Repeat size={14} />
}

function detailColor(type: string) {
	if (type === 'shared') {
		return {
			background: 'rgba(40, 179, 132, 0.14)',
			color: '#159270',
		}
	}

	return {
		background: 'rgba(253, 157, 2, 0.16)',
		color: '#C56A00',
	}
}

function TransactionIconBadge({
	color,
	children,
}: {
	color: string
	children: ReactNode
}) {
	return (
		<div
			className={styles.iconBadge}
			style={{
				background: `${color}22`,
				color,
			}}
		>
			{children}
		</div>
	)
}

function TransactionDetails({ details }: { details: string[] }) {
	if (!details.length) {
		return <span className={styles.mutedValue}>-</span>
	}

	return (
		<div className="content-cluster">
			{details.map((detail) => (
				<div
					key={detail}
					className={styles.iconBadge}
					style={{
						background: detailColor(detail).background,
						color: detailColor(detail).color,
					}}
				>
					{detailIcon(detail)}
				</div>
			))}
		</div>
	)
}

function TransactionTags({
	tags,
}: {
	tags: { label: string; color: string; foreground: string }[]
}) {
	return (
		<div className="content-cluster">
			{tags.map((tag) => (
				<span
					className={styles.tagPill}
					key={tag.label}
					style={{
						background: tag.color,
						color: tag.foreground,
					}}
				>
					{tag.label}
				</span>
			))}
		</div>
	)
}

function TransactionEntity({
	icon,
	label,
	color,
}: {
	icon: ReactNode
	label: string
	color: string
}) {
	return (
		<div className={styles.entityChip}>
			<TransactionIconBadge color={color}>{icon}</TransactionIconBadge>
			<span>{label}</span>
		</div>
	)
}

export function TransactionsView() {
	const [period, setPeriod] = useState('month')
	const [openTagsRowId, setOpenTagsRowId] = useState<string | null>(null)

	return (
		<div className="page-stack">
			<div className="filter-toolbar">
				<Select
					aria-label="Select transactions period"
					onChange={(event) => setPeriod(event.target.value)}
					style={{ minWidth: '154px', width: '154px' }}
					value={period}
				>
					{periodOptions.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</Select>

				<Input
					aria-label="Search transactions"
					placeholder="Search description or notes"
					style={{ minWidth: '240px', width: '240px' }}
					type="search"
				/>
				<Select aria-label="Filter by category" defaultValue="" style={{ minWidth: '150px', width: '150px' }}>
					<option value="">All categories</option>
					<option value="food">Food</option>
					<option value="transport">Transport</option>
					<option value="housing">Housing</option>
					<option value="utilities">Utilities</option>
				</Select>
				<Select aria-label="Filter by account" defaultValue="" style={{ minWidth: '148px', width: '148px' }}>
					<option value="">All accounts</option>
					<option value="everyday">Everyday</option>
					<option value="travel">Travel</option>
					<option value="main">Main account</option>
				</Select>
				<Select aria-label="Filter by tags" defaultValue="" style={{ minWidth: '132px', width: '132px' }}>
					<option value="">All tags</option>
					<option value="family">Family</option>
					<option value="personal">Personal</option>
					<option value="monthly">Monthly</option>
				</Select>

				{period === 'custom' ? (
					<>
						<Input aria-label="Start date" style={{ minWidth: '152px', width: '152px' }} type="date" />
						<Input aria-label="End date" style={{ minWidth: '152px', width: '152px' }} type="date" />
					</>
				) : null}
			</div>

			<Card>
				<div className={styles.desktopTable}>
					<Table>
						<thead>
							<tr className="data-table">
								<th>Date</th>
								<th>Description</th>
								<th>Category</th>
								<th>Account</th>
								<th>Details</th>
								<th>Tags</th>
								<th style={{ textAlign: 'right' }}>Amount</th>
							</tr>
						</thead>
						<tbody className="data-table">
							{rows.map((row) => {
								const CategoryIcon = row.category.icon
								const AccountIcon = row.account.icon

								return (
									<tr key={row.id}>
										<td>{row.date}</td>
										<td>
											<div className="list-row-title">{row.description}</div>
										</td>
										<td>
											<div className="content-cluster" style={{ alignItems: 'center', gap: '8px' }}>
												<TransactionIconBadge color={row.category.color}>
													<CategoryIcon size={15} />
												</TransactionIconBadge>
												<span>{row.category.label}</span>
											</div>
										</td>
										<td>
											<div className="content-cluster" style={{ alignItems: 'center', gap: '8px' }}>
												<TransactionIconBadge color={row.account.color}>
													<AccountIcon size={15} />
												</TransactionIconBadge>
												<span>{row.account.label}</span>
											</div>
										</td>
										<td>
											<TransactionDetails details={row.details} />
										</td>
										<td>
											<TransactionTags tags={row.tags} />
										</td>
										<td className={row.amount < 0 ? 'amount-negative' : 'amount-positive'} style={{ textAlign: 'right' }}>
											{formatCurrency(row.amount)}
										</td>
									</tr>
								)
							})}
						</tbody>
					</Table>
				</div>

				<div className={styles.mobileCards}>
					{rows.map((row) => {
						const CategoryIcon = row.category.icon
						const AccountIcon = row.account.icon
						const hasTags = row.tags.length > 0

						return (
							<div className={styles.mobileCard} key={row.id}>
								<div className={styles.mobileCardHeader}>
									<div className={styles.mobileCardDate}>
										<CalendarRange size={14} />
										<span>{row.date}</span>
									</div>
									<div className={row.amount < 0 ? 'amount-negative' : 'amount-positive'}>{formatCurrency(row.amount)}</div>
								</div>

								<div className={styles.mobileCardBody}>
									<div className={styles.mobileTitleBlock}>
										<div className={styles.mobileTitleRow}>
											<div className="list-row-title">{row.description}</div>
											<div className={styles.mobileStateIcons}>
												{row.details.map((detail) => (
													<div
														key={detail}
														className={styles.iconBadge}
														style={{
															background: detailColor(detail).background,
															color: detailColor(detail).color,
														}}
													>
														{detailIcon(detail)}
													</div>
												))}
												{hasTags ? (
													<button
														aria-expanded={openTagsRowId === row.id}
														aria-label={`Toggle tags for ${row.description}`}
														className={styles.mobileStateButton}
														onClick={() => setOpenTagsRowId((current) => (current === row.id ? null : row.id))}
														type="button"
													>
														<Tag size={14} />
													</button>
												) : null}
											</div>
										</div>
										<div className={styles.mobileEntityRow}>
											<TransactionEntity color={row.category.color} icon={<CategoryIcon size={15} />} label={row.category.label} />
											<TransactionEntity color={row.account.color} icon={<AccountIcon size={15} />} label={row.account.label} />
										</div>
									</div>

									{openTagsRowId === row.id && hasTags ? (
										<div className={styles.mobileTagsPanel}>
											<TransactionTags tags={row.tags} />
										</div>
									) : null}
								</div>
							</div>
						)
					})}
				</div>
			</Card>
		</div>
	)
}
