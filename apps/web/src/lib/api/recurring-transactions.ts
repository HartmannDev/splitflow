import { apiRequest } from '@/lib/api/request'

import type { JsonRequestBody, JsonResponse, QueryParams } from '@/types/api'

export type RecurringTransactionsQuery = QueryParams<'/recurring-transactions', 'get'>
export type RecurringTransaction = JsonResponse<'/recurring-transactions', 'get', '200'>[number]
export type CreateRecurringTransactionInput = JsonRequestBody<'/recurring-transactions', 'post'>
export type CreateRecurringTransactionResponse = JsonResponse<'/recurring-transactions', 'post', '201'>
export type UpdateRecurringTransactionInput = JsonRequestBody<'/recurring-transactions/{id}', 'patch'>
export type GenerateDueRecurringTransactionsInput = JsonRequestBody<'/recurring-transactions/generate-due', 'post'>
export type GenerateDueRecurringTransactionsResponse = JsonResponse<
	'/recurring-transactions/generate-due',
	'post',
	'200'
>
export type DeleteRecurringTransactionResponse = JsonResponse<'/recurring-transactions/{id}', 'delete', '200'>

export function getRecurringTransactions(query?: RecurringTransactionsQuery) {
	return apiRequest('/recurring-transactions', 'get', { query })
}

export function getRecurringTransaction(id: string) {
	return apiRequest('/recurring-transactions/{id}', 'get', {
		params: { id },
	}) as Promise<RecurringTransaction>
}

export function createRecurringTransaction(input: CreateRecurringTransactionInput) {
	return apiRequest('/recurring-transactions', 'post', {
		body: input,
	}) as Promise<CreateRecurringTransactionResponse>
}

export function updateRecurringTransaction(id: string, input: UpdateRecurringTransactionInput) {
	return apiRequest('/recurring-transactions/{id}', 'patch', {
		params: { id },
		body: input,
	}) as Promise<RecurringTransaction>
}

export function generateDueRecurringTransactions(input: GenerateDueRecurringTransactionsInput) {
	return apiRequest('/recurring-transactions/generate-due', 'post', {
		body: input,
	}) as Promise<GenerateDueRecurringTransactionsResponse>
}

export function deleteRecurringTransaction(id: string) {
	return apiRequest('/recurring-transactions/{id}', 'delete', {
		params: { id },
	}) as Promise<DeleteRecurringTransactionResponse>
}
