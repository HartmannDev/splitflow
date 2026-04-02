import { AuthCard } from '@/features/auth/AuthCard'

export function ResetPasswordPage() {
	return <AuthCard title="Choose a new password" description="This route is ready for token handling and final password submission." submitLabel="Update password" mode="reset-password" />
}
