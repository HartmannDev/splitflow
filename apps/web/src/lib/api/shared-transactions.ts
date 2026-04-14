import { apiRequest } from '@/lib/api/request'

import type { JsonRequestBody, JsonResponse, QueryParams } from '@/types/api'

export type SharedTransactionsQuery = QueryParams<'/shared-transactions', 'get'>
export type SharedTransaction = JsonResponse<'/shared-transactions', 'get', '200'>[number]
export type SharedTransactionDetail = JsonResponse<'/shared-transactions/{id}', 'get', '200'>
export type SharedTransactionParticipant = JsonResponse<'/shared-transactions/{id}/participants', 'get', '200'>[number]
export type CreateSharedTransactionInput = JsonRequestBody<'/shared-transactions', 'post'>
export type CreateSharedTransactionResponse = JsonResponse<'/shared-transactions', 'post', '201'>
export type UpdateSharedTransactionInput = JsonRequestBody<'/shared-transactions/{id}', 'patch'>
export type AcceptSharedTransactionInput = JsonRequestBody<
	'/shared-transactions/{id}/participants/{participantId}/accept',
	'post'
>
export type DeleteSharedTransactionResponse = JsonResponse<'/shared-transactions/{id}', 'delete', '200'>

export function getSharedTransactions(query?: SharedTransactionsQuery) {
	return apiRequest('/shared-transactions', 'get', { query })
}

export function getSharedTransaction(id: string) {
	return apiRequest('/shared-transactions/{id}', 'get', {
		params: { id },
	}) as Promise<SharedTransactionDetail>
}

export function getSharedTransactionParticipants(id: string) {
	return apiRequest('/shared-transactions/{id}/participants', 'get', {
		params: { id },
	}) as Promise<SharedTransactionParticipant[]>
}

export function createSharedTransaction(input: CreateSharedTransactionInput) {
	return apiRequest('/shared-transactions', 'post', {
		body: input,
	}) as Promise<CreateSharedTransactionResponse>
}

export function updateSharedTransaction(id: string, input: UpdateSharedTransactionInput) {
	return apiRequest('/shared-transactions/{id}', 'patch', {
		params: { id },
		body: input,
	}) as Promise<SharedTransaction>
}

export function acceptSharedTransaction(id: string, participantId: string, input: AcceptSharedTransactionInput) {
	return apiRequest('/shared-transactions/{id}/participants/{participantId}/accept', 'post', {
		params: { id, participantId },
		body: input,
	}) as Promise<SharedTransactionParticipant>
}

export function rejectSharedTransaction(id: string, participantId: string) {
	return apiRequest('/shared-transactions/{id}/participants/{participantId}/reject', 'post', {
		params: { id, participantId },
	}) as Promise<SharedTransactionParticipant>
}

export function markSharedTransactionPaid(id: string, participantId: string) {
	return apiRequest('/shared-transactions/{id}/participants/{participantId}/mark-paid', 'post', {
		params: { id, participantId },
	}) as Promise<SharedTransactionParticipant>
}

export function confirmSharedTransactionPaid(id: string, participantId: string) {
	return apiRequest('/shared-transactions/{id}/participants/{participantId}/confirm-paid', 'post', {
		params: { id, participantId },
	}) as Promise<SharedTransactionParticipant>
}

export function deleteSharedTransaction(id: string) {
	return apiRequest('/shared-transactions/{id}', 'delete', {
		params: { id },
	}) as Promise<DeleteSharedTransactionResponse>
}
