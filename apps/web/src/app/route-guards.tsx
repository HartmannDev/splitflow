import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { LoadingState } from '@/components/feedback/LoadingState'
import { useCurrentUserQuery } from '@/app/auth'

function FullPageLoading() {
	return (
		<div className="app-shell-loading">
			<LoadingState title="Loading your workspace" message="Checking your session and preparing the app." />
		</div>
	)
}

export function PublicOnlyGuard({ children }: PropsWithChildren) {
	const { data: user, isLoading } = useCurrentUserQuery()

	if (isLoading) {
		return <FullPageLoading />
	}

	if (user) {
		return <Navigate replace to="/app" />
	}

	return children
}

export function ProtectedRoute({ children }: PropsWithChildren) {
	const location = useLocation()
	const { data: user, isLoading } = useCurrentUserQuery()

	if (isLoading) {
		return <FullPageLoading />
	}

	if (!user) {
		return <Navigate replace to="/login" state={{ from: location.pathname }} />
	}

	return children
}

export function AdminRoute({ children }: PropsWithChildren) {
	const location = useLocation()
	const { data: user, isLoading } = useCurrentUserQuery()

	if (isLoading) {
		return <FullPageLoading />
	}

	if (!user) {
		return <Navigate replace to="/login" state={{ from: location.pathname }} />
	}

	if (user.role !== 'admin') {
		return <Navigate replace to="/app" />
	}

	return children
}
