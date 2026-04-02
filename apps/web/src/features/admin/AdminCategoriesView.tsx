import { Button } from '@/components/actions/Button'
import { Card } from '@/components/data/Card'

export function AdminCategoriesView() {
	return (
		<div className="page-stack">
			<div className="content-cluster" style={{ justifyContent: 'flex-end' }}>
				<Button>Add category</Button>
			</div>

			<section className="section-grid">
				<Card>
					<div className="section-title">Expense defaults</div>
				</Card>
				<Card>
					<div className="section-title">Income defaults</div>
				</Card>
			</section>
		</div>
	)
}
