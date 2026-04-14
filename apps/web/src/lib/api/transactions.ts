import { apiRequest } from '@/lib/api/request'

import type { JsonRequestBody, JsonResponse, QueryParams } from '@/types/api'

export type TransactionsQuery = QueryParams<'/transactions', 'get'>
export type Transaction = JsonResponse<'/transactions', 'get', '200'>[number]
export type CreateTransactionInput = JsonRequestBody<'/transactions', 'post'>
export type CreateTransactionResponse = JsonResponse<'/transactions', 'post', '201'>
export type CreateTransferInput = JsonRequestBody<'/transactions/transfers', 'post'>
export type CreateTransferResponse = JsonResponse<'/transactions/transfers', 'post', '201'>
export type UpdateTransactionInput = JsonRequestBody<'/transactions/{id}', 'patch'>
export type DeleteTransactionResponse = JsonResponse<'/transactions/{id}', 'delete', '200'>

export function getTransactions(query?: TransactionsQuery) {
	return apiRequest('/transactions', 'get', { query })
}

export function getTransaction(id: string) {
	return apiRequest('/transactions/{id}', 'get', {
		params: { id },
	}) as Promise<Transaction>
}

export function createTransaction(input: CreateTransactionInput) {
	return apiRequest('/transactions', 'post', {
		body: input,
	}) as Promise<CreateTransactionResponse>
}

export function createTransfer(input: CreateTransferInput) {
	return apiRequest('/transactions/transfers', 'post', {
		body: input,
	}) as Promise<CreateTransferResponse>
}

export function updateTransaction(id: string, input: UpdateTransactionInput) {
	return apiRequest('/transactions/{id}', 'patch', {
		params: { id },
		body: input,
	}) as Promise<Transaction>
}

export function deleteTransaction(id: string) {
	return apiRequest('/transactions/{id}', 'delete', {
		params: { id },
	}) as Promise<DeleteTransactionResponse>
}
