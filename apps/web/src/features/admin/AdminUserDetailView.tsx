import { Button } from '@/components/actions/Button'
import { Card } from '@/components/data/Card'

type AdminUserDetailViewProps = {
	userId: string
}

export function AdminUserDetailView({ userId }: AdminUserDetailViewProps) {
	return (
		<div className="page-stack">
			<div className="content-cluster" style={{ justifyContent: 'flex-end' }}>
				<Button variant="secondary">Reset password</Button>
				<Button variant="accent">Deactivate</Button>
			</div>

			<section className="section-grid">
				<Card>
					<div className="section-title">Identity</div>
				</Card>
				<Card>
					<div className="section-title">Lifecycle</div>
				</Card>
			</section>
		</div>
	)
}
