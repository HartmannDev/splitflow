import { EyeOff, Pencil, Tag } from 'lucide-react'

import { Button } from '@/components/actions/Button'
import { Card } from '@/components/data/Card'
import { Table } from '@/components/data/Table'
import { Input } from '@/components/forms/Input'
import { Select } from '@/components/forms/Select'

const tags = [
	{ id: 't1', name: 'Shared', color: '#28B384' },
	{ id: 't2', name: 'Recurring', color: '#159270' },
	{ id: 't3', name: 'Family', color: '#FD9D02' },
	{ id: 't4', name: 'Work', color: '#F77902' },
	{ id: 't5', name: 'Travel', color: '#5DBEA1' },
]

export function TagsView() {
	return (
		<div className="page-stack">
			<div className="filter-toolbar">
				<Input aria-label="Search tags" placeholder="Search tags" style={{ minWidth: '240px', width: '240px' }} type="search" />
				<Select aria-label="Filter by usage" defaultValue="" style={{ minWidth: '150px', width: '150px' }}>
					<option value="">All usage</option>
					<option value="frequent">Frequent</option>
					<option value="occasional">Occasional</option>
				</Select>
				<Select aria-label="Filter by status" defaultValue="" style={{ minWidth: '150px', width: '150px' }}>
					<option value="">All status</option>
					<option value="active">Active</option>
					<option value="excluded">Excluded</option>
				</Select>
				<div style={{ marginLeft: 'auto' }}>
					<Button>Add tag</Button>
				</div>
			</div>

			<Card>
				<Table>
					<thead>
						<tr className="data-table">
							<th>Name</th>
							<th style={{ textAlign: 'right' }}>Options</th>
						</tr>
					</thead>
					<tbody className="data-table">
						{tags.map((tag) => (
							<tr key={tag.id} style={{ height: '56px' }}>
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
												background: `${tag.color}22`,
												color: tag.color,
											}}
										>
											<Tag size={15} />
										</div>
										<span className="list-row-title">{tag.name}</span>
									</div>
								</td>
								<td style={{ textAlign: 'right' }}>
									<div className="content-cluster" style={{ justifyContent: 'flex-end' }}>
										<button
											aria-label={`Update ${tag.name}`}
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
											aria-label={`Exclude ${tag.name}`}
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
						))}
					</tbody>
				</Table>
			</Card>
		</div>
	)
}
