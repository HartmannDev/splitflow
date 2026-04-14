import { apiRequest } from '@/lib/api/request'

import type { JsonRequestBody, JsonResponse, QueryParams } from '@/types/api'

export type NotificationsQuery = QueryParams<'/notifications', 'get'>
export type Notification = JsonResponse<'/notifications', 'get', '200'>[number]
export type UpdateNotificationInput = JsonRequestBody<'/notifications/{id}', 'patch'>

export function getNotifications(query?: NotificationsQuery) {
	return apiRequest('/notifications', 'get', { query })
}

export function updateNotification(id: string, input: UpdateNotificationInput) {
	return apiRequest('/notifications/{id}', 'patch', {
		params: { id },
		body: input,
	}) as Promise<Notification>
}
