import { EyeOff, Home, Pencil, Sandwich, TramFront, Tv, UtilityPole } from 'lucide-react'

import { Button } from '@/components/actions/Button'
import { Card } from '@/components/data/Card'
import { Table } from '@/components/data/Table'
import { Input } from '@/components/forms/Input'
import { Select } from '@/components/forms/Select'

const categories = [
	{ id: 'c1', name: 'Housing', type: 'expense', color: '#28B384', icon: Home },
	{ id: 'c2', name: 'Food', type: 'expense', color: '#159270', icon: Sandwich },
	{ id: 'c3', name: 'Transport', type: 'expense', color: '#FD9D02', icon: TramFront },
	{ id: 'c4', name: 'Leisure', type: 'expense', color: '#F77902', icon: Tv },
	{ id: 'c5', name: 'Utilities', type: 'expense', color: '#5DBEA1', icon: UtilityPole },
	{ id: 'c6', name: 'Salary', type: 'income', color: '#28B384', icon: Home },
]

export function CategoriesView() {
	return (
		<div className="page-stack">
			<div className="filter-toolbar">
				<Input aria-label="Search categories" placeholder="Search categories" style={{ minWidth: '240px', width: '240px' }} type="search" />
				<Select aria-label="Filter by type" defaultValue="" style={{ minWidth: '150px', width: '150px' }}>
					<option value="">All types</option>
					<option value="expense">Expense</option>
					<option value="income">Income</option>
				</Select>
				<Select aria-label="Filter by status" defaultValue="" style={{ minWidth: '150px', width: '150px' }}>
					<option value="">All status</option>
					<option value="active">Active</option>
					<option value="excluded">Excluded</option>
				</Select>
				<div style={{ marginLeft: 'auto' }}>
					<Button>Add category</Button>
				</div>
			</div>

			<Card>
				<Table>
					<thead>
						<tr className="data-table">
							<th>Name</th>
							<th>Type</th>
							<th style={{ textAlign: 'right' }}>Options</th>
						</tr>
					</thead>
					<tbody className="data-table">
						{categories.map((category) => {
							const Icon = category.icon

							return (
								<tr key={category.id}>
									<td>
										<div className="content-cluster" style={{ alignItems: 'center', gap: '8px' }}>
											<div
												style={{
													display: 'inline-flex',
													alignItems: 'center',
													justifyContent: 'center',
													width: '28px',
													height: '28px',
													borderRadius: '10px',
													background: `${category.color}22`,
													color: category.color,
												}}
											>
												<Icon size={15} />
											</div>
											<span className="list-row-title">{category.name}</span>
										</div>
									</td>
									<td>
										<span
											className="pill"
											style={{
												background: category.type === 'expense' ? 'rgba(253, 157, 2, 0.16)' : 'rgba(40, 179, 132, 0.14)',
												color: category.type === 'expense' ? '#A65C00' : '#159270',
											}}
										>
											{category.type}
										</span>
									</td>
									<td style={{ textAlign: 'right' }}>
										<div className="content-cluster" style={{ justifyContent: 'flex-end' }}>
											<button
												aria-label={`Update ${category.name}`}
												style={{
													display: 'inline-flex',
													alignItems: 'center',
													justifyContent: 'center',
													width: '28px',
													height: '28px',
													borderRadius: '10px',
													border: '1px solid var(--color-border)',
													background: 'var(--color-surface-elevated)',
													color: 'var(--color-ink)',
												}}
												type="button"
											>
												<Pencil size={14} />
											</button>
											<button
												aria-label={`Exclude ${category.name}`}
												style={{
													display: 'inline-flex',
													alignItems: 'center',
													justifyContent: 'center',
													width: '28px',
													height: '28px',
													borderRadius: '10px',
													border: '1px solid var(--color-border)',
													background: 'rgba(253, 157, 2, 0.12)',
													color: '#A65C00',
												}}
												type="button"
											>
												<EyeOff size={14} />
											</button>
										</div>
									</td>
								</tr>
							)
						})}
					</tbody>
				</Table>
			</Card>
		</div>
	)
}
