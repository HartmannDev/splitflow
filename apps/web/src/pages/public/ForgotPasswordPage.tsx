import { AuthCard } from '@/features/auth/AuthCard'

export function ForgotPasswordPage() {
	return <AuthCard title="Reset access" description="Start the password recovery flow and let the backend own the actual reset rules." submitLabel="Send reset link" mode="forgot-password" />
}
