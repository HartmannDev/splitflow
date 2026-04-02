import styles from '@/components/feedback/LoadingState.module.css'

type LoadingStateProps = {
	title: string
	message: string
}

export function LoadingState({ message, title }: LoadingStateProps) {
	return (
		<div className={styles.wrapper}>
			<div className={styles.bar} />
			<div className={styles.title}>{title}</div>
			<p className={styles.message}>{message}</p>
		</div>
	)
}
