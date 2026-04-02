import { Button } from '@/components/actions/Button'
import { Card } from '@/components/data/Card'
import { Table } from '@/components/data/Table'

const users = [
	{ id: 'u1', name: 'Alex Harper', email: 'alex@example.com', role: 'user', status: 'active', verified: 'verified' },
	{ id: 'u2', name: 'Jordan Lee', email: 'jordan@example.com', role: 'admin', status: 'active', verified: 'verified' },
	{ id: 'u3', name: 'Sam Rivera', email: 'sam@example.com', role: 'user', status: 'inactive', verified: 'pending' },
]

export function AdminUsersView() {
	return (
		<div className="page-stack">
			<div className="content-cluster" style={{ justifyContent: 'flex-end' }}>
				<Button>Create user</Button>
			</div>

			<div className="filter-toolbar">
				<Button variant="secondary">Search</Button>
				<Button variant="secondary">Role</Button>
				<Button variant="secondary">Status</Button>
				<Button variant="secondary">Verification</Button>
			</div>

			<Card>
				<Table>
					<thead>
						<tr className="data-table">
							<th>Name</th>
							<th>Email</th>
							<th>Role</th>
							<th>Status</th>
							<th>Verification</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody className="data-table">
						{users.map((user) => (
							<tr key={user.id}>
								<td className="list-row-title">{user.name}</td>
								<td>{user.email}</td>
								<td>{user.role}</td>
								<td>
									<span className={user.status === 'active' ? 'pill pill-primary' : 'pill pill-muted'}>{user.status}</span>
								</td>
								<td>
									<span className={user.verified === 'verified' ? 'pill pill-primary' : 'pill pill-accent'}>{user.verified}</span>
								</td>
								<td>
									<Button variant="ghost">Open</Button>
								</td>
							</tr>
						))}
					</tbody>
				</Table>
			</Card>
		</div>
	)
}
