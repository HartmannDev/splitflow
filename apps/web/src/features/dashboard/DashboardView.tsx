import { ArrowUpRight, Clock3, Home, Sandwich, TramFront, Tv, UtilityPole } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/actions/Button'
import { Card } from '@/components/data/Card'
import { EmptyState } from '@/components/feedback/EmptyState'
import { Picker } from '@/components/forms/Picker'
import { formatCurrency } from '@/lib/formatters'
import styles from '@/features/dashboard/DashboardView.module.css'

const expenseByPeriod = {
	today: {
		summary: { balance: 12840.28, income: 240, expense: 100, net: 140 },
		categories: [
			{ label: 'Food', amount: 48, color: '#159270', icon: Sandwich },
			{ label: 'Transport', amount: 22, color: '#FD9D02', icon: TramFront },
			{ label: 'Leisure', amount: 16, color: '#F77902', icon: Tv },
			{ label: 'Utilities', amount: 8, color: '#5DBEA1', icon: UtilityPole },
			{ label: 'Housing', amount: 6, color: '#28B384', icon: Home },
		],
	},
	yesterday: {
		summary: { balance: 12796.14, income: 180, expense: 100, net: 80 },
		categories: [
			{ label: 'Food', amount: 36, color: '#159270', icon: Sandwich },
			{ label: 'Transport', amount: 18, color: '#FD9D02', icon: TramFront },
			{ label: 'Leisure', amount: 24, color: '#F77902', icon: Tv },
			{ label: 'Utilities', amount: 10, color: '#5DBEA1', icon: UtilityPole },
			{ label: 'Housing', amount: 12, color: '#28B384', icon: Home },
		],
	},
	week: {
		summary: { balance: 12812.44, income: 980, expense: 808, net: 172 },
		categories: [
			{ label: 'Housing', amount: 320, color: '#28B384', icon: Home },
			{ label: 'Food', amount: 210, color: '#159270', icon: Sandwich },
			{ label: 'Transport', amount: 128, color: '#FD9D02', icon: TramFront },
			{ label: 'Leisure', amount: 92, color: '#F77902', icon: Tv },
			{ label: 'Utilities', amount: 58, color: '#5DBEA1', icon: UtilityPole },
		],
	},
	last7days: {
		summary: { balance: 12798.82, income: 1040, expense: 886, net: 154 },
		categories: [
			{ label: 'Housing', amount: 340, color: '#28B384', icon: Home },
			{ label: 'Food', amount: 236, color: '#159270', icon: Sandwich },
			{ label: 'Transport', amount: 142, color: '#FD9D02', icon: TramFront },
			{ label: 'Leisure', amount: 104, color: '#F77902', icon: Tv },
			{ label: 'Utilities', amount: 64, color: '#5DBEA1', icon: UtilityPole },
		],
	},
	month: {
		summary: { balance: 12840.28, income: 6450, expense: 3925.12, net: 2524.88 },
		categories: [
			{ label: 'Housing', amount: 1420, color: '#28B384', icon: Home },
			{ label: 'Food', amount: 920, color: '#159270', icon: Sandwich },
			{ label: 'Transport', amount: 540, color: '#FD9D02', icon: TramFront },
			{ label: 'Leisure', amount: 420, color: '#F77902', icon: Tv },
			{ label: 'Utilities', amount: 300, color: '#5DBEA1', icon: UtilityPole },
		],
	},
	lastMonth: {
		summary: { balance: 12388.11, income: 6220, expense: 3446, net: 2774 },
		categories: [
			{ label: 'Housing', amount: 1380, color: '#28B384', icon: Home },
			{ label: 'Food', amount: 880, color: '#159270', icon: Sandwich },
			{ label: 'Transport', amount: 512, color: '#FD9D02', icon: TramFront },
			{ label: 'Leisure', amount: 390, color: '#F77902', icon: Tv },
			{ label: 'Utilities', amount: 284, color: '#5DBEA1', icon: UtilityPole },
		],
	},
	quarter: {
		summary: { balance: 13220.52, income: 18840, expense: 10610, net: 8230 },
		categories: [
			{ label: 'Housing', amount: 4260, color: '#28B384', icon: Home },
			{ label: 'Food', amount: 2710, color: '#159270', icon: Sandwich },
			{ label: 'Transport', amount: 1490, color: '#FD9D02', icon: TramFront },
			{ label: 'Leisure', amount: 1220, color: '#F77902', icon: Tv },
			{ label: 'Utilities', amount: 930, color: '#5DBEA1', icon: UtilityPole },
		],
	},
	year: {
		summary: { balance: 16882.4, income: 75200, expense: 42310, net: 32890 },
		categories: [
			{ label: 'Housing', amount: 17200, color: '#28B384', icon: Home },
			{ label: 'Food', amount: 10840, color: '#159270', icon: Sandwich },
			{ label: 'Transport', amount: 5980, color: '#FD9D02', icon: TramFront },
			{ label: 'Leisure', amount: 4730, color: '#F77902', icon: Tv },
			{ label: 'Utilities', amount: 3560, color: '#5DBEA1', icon: UtilityPole },
		],
	},
} as const

type PeriodKey = keyof typeof expenseByPeriod

const periodOptions: { value: PeriodKey; label: string }[] = [
	{ value: 'today', label: 'Today' },
	{ value: 'yesterday', label: 'Yesterday' },
	{ value: 'week', label: 'This week' },
	{ value: 'last7days', label: 'Last 7 days' },
	{ value: 'month', label: 'This month' },
	{ value: 'lastMonth', label: 'Last month' },
	{ value: 'quarter', label: 'This quarter' },
	{ value: 'year', label: 'This year' },
]

const recentTransactions = [
	{ description: 'Weekly groceries', amount: formatCurrency(-84.32), meta: 'Shared | Household' },
	{ description: 'Salary', amount: formatCurrency(3400), meta: 'Income | Main account' },
	{ description: 'Streaming subscription', amount: formatCurrency(-15.99), meta: 'Recurring | Personal' },
]

export function DashboardView() {
	const [period, setPeriod] = useState<PeriodKey>('month')
	const [activeCategory, setActiveCategory] = useState<string | null>(null)
	const selectedPeriod = expenseByPeriod[period]
	const summaryCards = [
		{ label: 'Total balance', value: formatCurrency(selectedPeriod.summary.balance) },
		{ label: 'Income', value: formatCurrency(selectedPeriod.summary.income) },
		{ label: 'Expense', value: formatCurrency(selectedPeriod.summary.expense) },
		{ label: 'Net result', value: formatCurrency(selectedPeriod.summary.net) },
	]

	const totalExpenses = useMemo(
		() => selectedPeriod.categories.reduce((sum, item) => sum + item.amount, 0),
		[selectedPeriod],
	)

	const arcs = useMemo(() => {
		let currentAngle = -90
		const radius = 88
		const innerRadius = 54

		const polarToCartesian = (angle: number, r: number) => {
			const radians = (angle * Math.PI) / 180
			return {
				x: 110 + r * Math.cos(radians),
				y: 110 + r * Math.sin(radians),
			}
		}

		return selectedPeriod.categories.map((item) => {
			const sweep = (item.amount / totalExpenses) * 360
			const startAngle = currentAngle
			const endAngle = currentAngle + sweep
			currentAngle = endAngle

			const outerStart = polarToCartesian(startAngle, radius)
			const outerEnd = polarToCartesian(endAngle, radius)
			const innerStart = polarToCartesian(endAngle, innerRadius)
			const innerEnd = polarToCartesian(startAngle, innerRadius)
			const largeArcFlag = sweep > 180 ? 1 : 0

			const path = [
				`M ${outerStart.x} ${outerStart.y}`,
				`A ${radius} ${radius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
				`L ${innerStart.x} ${innerStart.y}`,
				`A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerEnd.x} ${innerEnd.y}`,
				'Z',
			].join(' ')

			return {
				...item,
				path,
			}
		})
	}, [selectedPeriod, totalExpenses])

	return (
		<div className="page-stack">
			<section className="metric-grid">
				{summaryCards.map((card) => (
					<div className="metric-card" key={card.label}>
						<div className="metric-label">{card.label}</div>
						<div className="metric-value">{card.value}</div>
					</div>
				))}
			</section>

			<section className="split-grid">
				<div className="page-stack">
					<div className={`surface-section ${styles.chartCard}`}>
						<div className={styles.chartHeader}>
							<div className={`section-title ${styles.chartTitle}`}>Expenses by category</div>
							<Picker
								aria-label="Select dashboard period"
								buttonClassName={styles.chartSelect}
								className={styles.chartPicker}
								onChange={(value) => {
									setPeriod(value as PeriodKey)
									setActiveCategory(null)
								}}
								options={periodOptions}
								placeholder="Period"
								value={period}
							/>
						</div>

						<div className={styles.chartLayout}>
							<div className={styles.chartWrap}>
								<svg
									aria-label="Expenses by category pie chart"
									className={styles.chart}
									viewBox="0 0 220 220"
									onMouseLeave={() => setActiveCategory(null)}
								>
									{arcs.map((item) => (
										<path
											key={item.label}
											className={[
												styles.slice,
												activeCategory && activeCategory !== item.label ? styles.sliceMuted : '',
												activeCategory === item.label ? styles.sliceActive : '',
											]
												.filter(Boolean)
												.join(' ')}
											d={item.path}
											fill={item.color}
											onMouseEnter={() => setActiveCategory(item.label)}
										/>
									))}
								</svg>
								<div className={styles.chartTotals}>
									<div className={styles.chartTotalLabel}>Total</div>
									<div className={styles.chartTotalValue}>{formatCurrency(totalExpenses)}</div>
								</div>
							</div>

							<div className={styles.legend}>
								{selectedPeriod.categories.map((item) => {
									const percent = Math.round((item.amount / totalExpenses) * 100)
									const Icon = item.icon

									return (
										<div
											className={[
												styles.legendRow,
												activeCategory && activeCategory !== item.label ? styles.legendRowMuted : '',
												activeCategory === item.label ? styles.legendRowActive : '',
											]
												.filter(Boolean)
												.join(' ')}
											key={item.label}
											onMouseEnter={() => setActiveCategory(item.label)}
											onMouseLeave={() => setActiveCategory(null)}
										>
											<div className={styles.legendLead}>
												<div className={styles.swatch} style={{ background: item.color }} />
												<div className={styles.legendIcon}>
													<Icon size={16} />
												</div>
											</div>
											<div className={styles.legendLabel}>{item.label}</div>
											<div className={styles.legendMeta}>
												{formatCurrency(item.amount)} | {percent}%
											</div>
										</div>
									)
								})}
							</div>
						</div>
					</div>

					<div className="surface-section">
						<div className="section-heading">
							<div className="section-title">Recent transactions</div>
							<div className="pill pill-primary">
								<Clock3 size={14} />
								Last 10
							</div>
						</div>
						<div className="stack-list">
							{recentTransactions.map((item) => (
								<div className="list-row" key={item.description}>
									<div className="page-stack" style={{ gap: 'var(--space-1)' }}>
										<div className="list-row-title">{item.description}</div>
										<div className="list-row-meta">{item.meta}</div>
									</div>
									<div className={item.amount.startsWith('-') ? 'amount-negative' : 'amount-positive'}>{item.amount}</div>
								</div>
							))}
						</div>
					</div>
				</div>

				<Card>
					<div className="section-title">Needs attention</div>
					<EmptyState
						title="Nothing urgent at the moment"
						action={
							<Button variant="secondary">
								Open notifications
								<ArrowUpRight size={16} />
							</Button>
						}
					/>
				</Card>
			</section>
		</div>
	)
}
