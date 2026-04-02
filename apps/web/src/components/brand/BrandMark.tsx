import logoUrl from '../../../../../assets/logo.jpg'

import styles from '@/components/brand/BrandMark.module.css'

type BrandMarkProps = {
	subtitle?: string
	inverse?: boolean
	logoOnly?: boolean
}

export function BrandMark({ inverse = false, logoOnly = false, subtitle = 'Shared money, cleaner flow' }: BrandMarkProps) {
	const classes = [styles.brand, inverse ? styles.inverse : ''].filter(Boolean).join(' ')

	return (
		<div className={classes}>
			<div className={styles.logoWrap}>
				<img alt="SplitFlow logo" className={styles.logo} src={logoUrl} />
			</div>
			{logoOnly ? null : (
				<div className={styles.text}>
					<div className={styles.title}>SplitFlow</div>
					<div className={styles.subtitle}>{subtitle}</div>
				</div>
			)}
		</div>
	)
}
