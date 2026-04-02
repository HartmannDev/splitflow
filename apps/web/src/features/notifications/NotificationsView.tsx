import { Button } from '@/components/actions/Button'
import { Card } from '@/components/data/Card'

const notifications = [
	{
		id: 'n1',
		title: 'Shared expense needs review',
		message: 'Jordan updated the March utilities split and the group may need to re-approve it.',
		time: '5 min ago',
		tone: 'Action required',
	},
	{
		id: 'n2',
		title: 'Recurring charge posted',
		message: 'Your streaming subscription rolled over successfully.',
		time: '2 hr ago',
		tone: 'Update',
	},
]

export function NotificationsView() {
	return (
		<div className="page-stack">
			<div className="content-cluster" style={{ justifyContent: 'flex-end' }}>
				<Button variant="secondary">Show archived</Button>
			</div>

			<div className="stack-list">
				{notifications.map((notification) => (
					<Card key={notification.id}>
						<div className="section-heading">
							<div>
								<div className="section-title">{notification.title}</div>
								<div className="section-copy">{notification.message}</div>
							</div>
							<div className={notification.tone === 'Action required' ? 'pill pill-accent' : 'pill pill-muted'}>{notification.tone}</div>
						</div>
						<div className="content-cluster" style={{ justifyContent: 'space-between' }}>
							<div className="section-note">{notification.time}</div>
							<div className="content-cluster">
								<Button>Review</Button>
								<Button variant="secondary">Mark as read</Button>
							</div>
						</div>
					</Card>
				))}
			</div>
		</div>
	)
}
