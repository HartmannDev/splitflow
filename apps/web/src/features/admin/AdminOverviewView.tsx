import { Card } from '@/components/data/Card'

export function AdminOverviewView() {
	return (
		<div className="page-stack">
			<section className="metric-grid">
				<div className="metric-card">
					<div className="metric-label">Pending verification</div>
					<div className="metric-value">12</div>
					<div className="metric-meta">Users who still need activation follow-up</div>
				</div>
				<div className="metric-card">
					<div className="metric-label">Inactive users</div>
					<div className="metric-value">4</div>
					<div className="metric-meta">Accounts currently outside the active pool</div>
				</div>
				<div className="metric-card">
					<div className="metric-label">Category changes</div>
					<div className="metric-value">3</div>
					<div className="metric-meta">Configuration updates in review</div>
				</div>
			</section>

			<section className="section-grid">
				<Card>
					<div className="section-title">Users needing attention</div>
					<p className="section-copy">Unverified, inactive, and recently created users can be surfaced here with fast admin actions.</p>
				</Card>
				<Card>
					<div className="section-title">Configuration status</div>
					<p className="section-copy">Category defaults and other setup tasks can grow here without becoming visually noisy.</p>
				</Card>
			</section>
		</div>
	)
}
