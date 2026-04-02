import { AuthCard } from '@/features/auth/AuthCard'

export function LoginPage() {
	return <AuthCard compact title="Welcome back" description="Sign in with your existing SplitFlow session credentials." submitLabel="Log in" mode="login" />
}
