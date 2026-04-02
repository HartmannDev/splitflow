import { useParams } from 'react-router-dom'

import { AdminUserDetailView } from '@/features/admin/AdminUserDetailView'

export function AdminUserDetailPage() {
	const { id = 'unknown' } = useParams()

	return <AdminUserDetailView userId={id} />
}
