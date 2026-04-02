import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import z from 'zod'

import { useLoginMutation, useSignupMutation } from '@/app/auth'
import { Button } from '@/components/actions/Button'
import { Card } from '@/components/data/Card'
import { Field } from '@/components/forms/Field'
import { Input } from '@/components/forms/Input'
import { ApiError } from '@/lib/api/request'
import styles from '@/features/auth/AuthCard.module.css'

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'verify-email'

type AuthCardProps = {
	title: string
	description: string
	submitLabel: string
	mode: AuthMode
	compact?: boolean
}

type AuthFormValues = {
	name: string
	lastname: string
	email: string
	password: string
	confirmPassword: string
}

const footerByMode: Record<AuthMode, { href: string; label: string }> = {
	login: { href: '/signup', label: 'Create account' },
	signup: { href: '/login', label: 'Already have an account?' },
	'forgot-password': { href: '/login', label: 'Back to login' },
	'reset-password': { href: '/login', label: 'Return to login' },
	'verify-email': { href: '/login', label: 'Open login' },
}

const loginSchema = z.object({
	email: z.email('Enter a valid email address'),
	password: z.string().min(1, 'Enter your password'),
})

const signupSchema = z
	.object({
		name: z.string().trim().min(1, 'Enter your first name'),
		lastname: z.string().trim().min(1, 'Enter your last name'),
		email: z.email('Enter a valid email address'),
		password: z
			.string()
			.min(8, 'Password must be at least 8 characters')
			.regex(/[A-Z]/, 'Password must include an uppercase letter')
			.regex(/[a-z]/, 'Password must include a lowercase letter')
			.regex(/[0-9]/, 'Password must include a number')
			.regex(/[^a-zA-Z0-9]/, 'Password must include a special character'),
		confirmPassword: z.string().min(1, 'Confirm your password'),
	})
	.refine((value) => value.password === value.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword'],
	})

const forgotPasswordSchema = z.object({
	email: z.email('Enter a valid email address'),
})

const resetPasswordSchema = z
	.object({
		password: signupSchema.shape.password,
		confirmPassword: signupSchema.shape.confirmPassword,
	})
	.refine((value) => value.password === value.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword'],
	})

const schemaByMode: Record<AuthMode, z.ZodTypeAny> = {
	login: loginSchema,
	signup: signupSchema,
	'forgot-password': forgotPasswordSchema,
	'reset-password': resetPasswordSchema,
	'verify-email': forgotPasswordSchema,
}

export function AuthCard({ compact = false, description, mode, submitLabel, title }: AuthCardProps) {
	const footer = footerByMode[mode]
	const navigate = useNavigate()
	const location = useLocation()
	const loginMutation = useLoginMutation()
	const signupMutation = useSignupMutation()
	const isLoginMode = mode === 'login'
	const isSignupMode = mode === 'signup'
	const {
		formState: { errors },
		handleSubmit,
		register,
	} = useForm<AuthFormValues>({
		resolver: zodResolver(schemaByMode[mode]),
		defaultValues: {
			name: '',
			lastname: '',
			email: '',
			password: '',
			confirmPassword: '',
		},
	})

	const fromPath =
		location.state && typeof location.state === 'object' && 'from' in location.state && typeof location.state.from === 'string'
			? location.state.from
			: '/app'

	const formError =
		loginMutation.error instanceof ApiError
			? loginMutation.error.message
			: signupMutation.error instanceof ApiError
				? signupMutation.error.message
				: 'Unable to complete this action right now.'

	const onSubmit = handleSubmit(async (values) => {
		if (mode === 'login') {
			await loginMutation.mutateAsync({
				email: values.email,
				password: values.password,
			})
			navigate(fromPath, { replace: true })
			return
		}

		if (mode !== 'signup') {
			return
		}

		await signupMutation.mutateAsync({
			name: values.name,
			lastname: values.lastname,
			email: values.email,
			password: values.password,
		})
		navigate('/login', { replace: true })
	})

	return (
		<div className={[styles.shell, compact ? styles.shellCompact : ''].filter(Boolean).join(' ')}>
			{compact ? null : (
				<section className={styles.hero}>
					<div className={styles.heroCopy}>
						<div className={styles.heroEyebrow}>SplitFlow access</div>
						<h1 className={styles.heroTitle}>Stay on top of shared spending with less friction.</h1>
						<p className={styles.heroBody}>
							The experience is designed around quick review, clearer balances, and fewer surprises in the transaction flow.
						</p>
					</div>
					<div className={styles.heroList}>
						<div className={styles.heroListItem}>
							<div className={styles.heroListIcon}>
								<ShieldCheck size={18} />
							</div>
							<div>Session-based access tied directly to backend business rules</div>
						</div>
						<div className={styles.heroListItem}>
							<div className={styles.heroListIcon}>
								<CheckCircle2 size={18} />
							</div>
							<div>One unified app for dashboard, transactions, notifications, and admin</div>
						</div>
						<div className={styles.heroListItem}>
							<div className={styles.heroListIcon}>
								<Sparkles size={18} />
							</div>
							<div>Modern product UI built for focus, hierarchy, and daily use</div>
						</div>
					</div>
				</section>
			)}

			<Card className={[styles.card, compact ? styles.cardCompact : ''].filter(Boolean).join(' ')}>
				<div className={styles.stack}>
					<h2 className={styles.title}>{title}</h2>
					<p className={styles.body}>{description}</p>
				</div>

				<form className={styles.form} onSubmit={onSubmit}>
					{isSignupMode ? (
						<div className={styles.nameGrid}>
							<Field error={errors.name?.message} htmlFor={`${mode}-name`} label="First name">
								<Input autoComplete="given-name" id={`${mode}-name`} placeholder="Mateus" type="text" {...register('name')} />
							</Field>
							<Field error={errors.lastname?.message} htmlFor={`${mode}-lastname`} label="Last name">
								<Input autoComplete="family-name" id={`${mode}-lastname`} placeholder="Silva" type="text" {...register('lastname')} />
							</Field>
						</div>
					) : null}

					{mode === 'reset-password' ? null : (
						<Field error={errors.email?.message} htmlFor={`${mode}-email`} label="Email">
							<Input
								autoComplete="email"
								id={`${mode}-email`}
								placeholder="you@example.com"
								type="email"
								{...register('email')}
							/>
						</Field>
					)}

					{mode === 'forgot-password' || mode === 'verify-email' ? null : (
						<Field error={errors.password?.message} htmlFor={`${mode}-password`} label="Password">
							<Input autoComplete={isSignupMode || mode === 'reset-password' ? 'new-password' : 'current-password'} id={`${mode}-password`} type="password" {...register('password')} />
						</Field>
					)}

					{isSignupMode || mode === 'reset-password' ? (
						<Field error={errors.confirmPassword?.message} htmlFor={`${mode}-confirm-password`} label="Confirm password">
							<Input
								autoComplete="new-password"
								id={`${mode}-confirm-password`}
								type="password"
								{...register('confirmPassword')}
							/>
						</Field>
					) : null}

					{isLoginMode ? (
						<>
							{loginMutation.isError ? <div className={styles.error}>{formError}</div> : null}
							<Button disabled={loginMutation.isPending} type="submit">
								{loginMutation.isPending ? <LoaderCircle size={16} /> : null}
								{submitLabel}
							</Button>
							<div className={styles.meta}>
								This uses the backend session cookie and current-user bootstrap to unlock protected routes.
							</div>
						</>
					) : isSignupMode ? (
						<>
							{signupMutation.isError ? <div className={styles.error}>{formError}</div> : null}
							<div className={styles.meta}>We’ll create your account and send a verification email before first login.</div>
							<Button disabled={signupMutation.isPending} type="submit">
								{signupMutation.isPending ? <LoaderCircle size={16} /> : null}
								{submitLabel}
							</Button>
						</>
					) : (
						<>
							<div className={styles.meta}>This route is still scaffolded and ready for backend wiring.</div>
							<Button disabled type="submit">
								{submitLabel}
							</Button>
						</>
					)}
				</form>

				<div className={styles.footer}>
					<span>{isLoginMode ? 'Need account recovery?' : 'Need a different auth route?'}</span>
					<Link to={footer.href}>{footer.label}</Link>
				</div>
			</Card>
		</div>
	)
}
