import { Button } from '@/components/actions/Button'
import { Card } from '@/components/data/Card'

const settings = [
	{ title: 'Main currency', copy: 'Used for dashboard totals and other balance-first surfaces.' },
	{ title: 'Default reporting period', copy: 'Current month is the initial default for dashboard and summary views.' },
	{ title: 'Timezone', copy: 'The browser environment remains the safe fallback until persisted settings land.' },
	{ title: 'Default transaction status', copy: 'Pending is the sensible default for faster entry and later review.' },
]

export function SettingsView() {
	return (
		<div className="page-stack">
			<div className="content-cluster" style={{ justifyContent: 'flex-end' }}>
				<Button>Save preferences</Button>
			</div>

			<section className="metric-grid">
				{settings.map((item) => (
					<Card key={item.title}>
						<div className="section-title">{item.title}</div>
						<p className="section-copy">{item.copy}</p>
					</Card>
				))}
			</section>
		</div>
	)
}
