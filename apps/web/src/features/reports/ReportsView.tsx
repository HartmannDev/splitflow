import { Card } from '@/components/data/Card'

export function ReportsView() {
	return (
		<div className="page-stack">
			<section className="metric-grid">
				<div className="metric-card">
					<div className="metric-label">Net trend</div>
					<div className="metric-value">+12.4%</div>
				</div>
				<div className="metric-card">
					<div className="metric-label">Top category</div>
					<div className="metric-value">Housing</div>
				</div>
			</section>
			<Card>
				<div className="section-title">Reports</div>
			</Card>
		</div>
	)
}
