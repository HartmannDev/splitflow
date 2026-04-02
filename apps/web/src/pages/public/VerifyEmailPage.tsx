import { AuthCard } from '@/features/auth/AuthCard'

export function VerifyEmailPage() {
	return <AuthCard title="Verify your email" description="Use this route for email verification messaging, resend actions, and blocked-session guidance." submitLabel="Resend verification" mode="verify-email" />
}
