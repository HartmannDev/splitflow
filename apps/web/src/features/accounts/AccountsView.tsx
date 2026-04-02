import { Building2, PiggyBank, Wallet } from 'lucide-react'

import { Button } from '@/components/actions/Button'
import { Card } from '@/components/data/Card'
import { formatCurrency } from '@/lib/formatters'

const accounts = [
	{ id: '1', name: 'Everyday', currency: 'USD', balance: 4820.25, color: '#28B384', icon: Wallet, note: 'Main spending' },
	{ id: '2', name: 'Savings', currency: 'USD', balance: 7650.03, color: '#159270', icon: PiggyBank, note: 'Reserve' },
	{ id: '3', name: 'Business', currency: 'USD', balance: 370.11, color: '#FD9D02', icon: Building2, note: 'Operations' },
]

export function AccountsView() {
	return (
		<div className="page-stack">
			<div className="content-cluster" style={{ justifyContent: 'flex-end' }}>
				<Button>Add account</Button>
			</div>

			<section className="metric-grid">
				{accounts.map((account) => {
					const Icon = account.icon

					return (
						<Card key={account.id}>
							<div className="section-heading">
								<div className="content-cluster" style={{ alignItems: 'center' }}>
									<div
										style={{
											display: 'grid',
											placeItems: 'center',
											width: '54px',
											height: '54px',
											borderRadius: '18px',
											background: `${account.color}20`,
											color: account.color,
										}}
									>
										<Icon size={22} />
									</div>
									<div>
										<div className="section-title">{account.name}</div>
										<div className="section-copy">
											{account.note} | {account.currency}
										</div>
									</div>
								</div>
								<div className="pill pill-muted">Active</div>
							</div>
							<div className="metric-value">{formatCurrency(account.balance, account.currency)}</div>
							<Button variant="secondary">Manage account</Button>
						</Card>
					)
				})}
			</section>
		</div>
	)
}
