import { ArrowRight, ReceiptText, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/actions/Button'
import styles from '@/pages/public/LandingPage.module.css'

const features = [
	{
		title: 'Shared finance that stays understandable',
		copy: 'Track personal, shared, recurring, and transfer activity in one clear workspace without mixing everything together.',
		icon: Users,
	},
	{
		title: 'Daily actions before deep analysis',
		copy: 'Balances, categories, tags, and transactions stay quick to scan, so the app helps with decisions instead of adding friction.',
		icon: ReceiptText,
	},
	{
		title: 'Reliable controls for real households',
		copy: 'Notifications, review states, and admin tools make the product feel operational instead of just decorative.',
		icon: ShieldCheck,
	},
] as const

export function LandingPage() {
	return (
		<div className={styles.page}>
			<section className={`${styles.section} ${styles.heroSection}`}>
				<div className={styles.sectionInner}>
					<div className={styles.heroPanel}>
						<div className={styles.heroCopy}>
							<div className="pill pill-accent">Modern shared-finance workspace</div>
							<h1 className={styles.heroTitle}>Money workflows that feel calm, clear, and built for shared life.</h1>
							<p className={styles.heroDescription}>
								SplitFlow helps people manage expenses, income, transfers, categories, and shared spending in one product that feels practical every day,
								not overwhelming once a month.
							</p>
							<div className={styles.heroActions}>
								<Link to="/signup">
									<Button element="span">Create account</Button>
								</Link>
								<Link to="/login">
									<Button element="span" variant="secondary">
										Sign in
									</Button>
								</Link>
							</div>
						</div>
						<div className={styles.heroHighlights}>
							<div className={styles.heroHighlight}>
								<div className={styles.heroHighlightValue}>1 clear flow</div>
								<div className={styles.heroHighlightCopy}>See what happened, who is involved, and what still needs attention without jumping between tools.</div>
							</div>
							<div className={styles.heroHighlight}>
								<div className={styles.heroHighlightValue}>Shared by design</div>
								<div className={styles.heroHighlightCopy}>Groups, split logic, recurring activity, and clean records are part of the product from the start.</div>
							</div>
							<div className={styles.heroHighlight}>
								<div className={styles.heroHighlightValue}>Built for daily use</div>
								<div className={styles.heroHighlightCopy}>Fast actions, compact navigation, and familiar forms make routine finance feel lighter.</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className={`${styles.section} ${styles.featuresSection}`}>
				<div className={styles.sectionInner}>
					<div className={styles.sectionHeader}>
						<div className={styles.eyebrow}>Main features</div>
						<h2 className={styles.sectionTitle}>A product structure that keeps money work organized and human.</h2>
						<p className={styles.sectionCopy}>
							SplitFlow is designed around the actions people actually repeat: recording movement, understanding context, coordinating with others, and staying on top of what changed.
						</p>
					</div>
					<div className={styles.featureGrid}>
						{features.map((feature) => {
							const Icon = feature.icon

							return (
								<article className={styles.featureCard} key={feature.title}>
									<div className={styles.featureIcon}>
										<Icon size={20} />
									</div>
									<div className={styles.featureTitle}>{feature.title}</div>
									<div className={styles.featureCopy}>{feature.copy}</div>
								</article>
							)
						})}
					</div>
				</div>
			</section>

			<section className={`${styles.section} ${styles.contactsSection}`}>
				<div className={styles.sectionInner}>
					<footer className={styles.footerPanel}>
						<div className={styles.footerLead}>
							<div className={styles.eyebrow}>Contacts</div>
							<h2 className={styles.sectionTitle}>Ready to make shared money management feel lighter?</h2>
							<p className={styles.sectionCopy}>
								Start with a fresh workspace, invite people when you need collaboration, and keep the routine visible without making the product noisy.
							</p>
							<div className={styles.footerActions}>
								<Link to="/signup">
									<Button element="span">Get started</Button>
								</Link>
								<Link to="/login">
									<Button element="span" variant="secondary">
										Open workspace
										<ArrowRight size={16} />
									</Button>
								</Link>
							</div>
						</div>

						<div className={styles.contactsGrid}>
							<div className={styles.contactCard}>
								<div className={styles.contactLabel}>Product contact</div>
								<div className={styles.contactValue}>hello@splitflow.app</div>
							</div>
							<div className={styles.contactCard}>
								<div className={styles.contactLabel}>Support</div>
								<div className={styles.contactValue}>Fast help for setup, categories, and shared workflows</div>
							</div>
							<div className={styles.contactCard}>
								<div className={styles.contactLabel}>Availability</div>
								<div className={styles.contactValue}>Personal finances, couples, homes, trips, and small shared operations</div>
							</div>
						</div>
					</footer>
				</div>
			</section>
		</div>
	)
}
