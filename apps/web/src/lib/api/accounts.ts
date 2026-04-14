import { apiRequest } from '@/lib/api/request'
import type { JsonRequestBody, JsonResponse, QueryParams } from '@/types/api'

export type AccountsQuery = QueryParams<'/accounts', 'get'>
export type Account = JsonResponse<'/accounts', 'get', '200'>[number]
export type CreateAccountInput = JsonRequestBody<'/accounts', 'post'>
export type CreateAccountResponse = JsonResponse<'/accounts', 'post', '201'>
export type UpdateAccountInput = JsonRequestBody<'/accounts/{id}', 'patch'>
export type DeleteAccountResponse = JsonResponse<'/accounts/{id}', 'delete', '200'>

export function getAccounts(query?: AccountsQuery) {
	return apiRequest('/accounts', 'get', { query })
}

export function createAccount(input: CreateAccountInput) {
	return apiRequest('/accounts', 'post', { body: input }) as Promise<CreateAccountResponse>
}

export function updateAccount(id: string, input: UpdateAccountInput) {
	return apiRequest('/accounts/{id}', 'patch', {
		params: { id },
		body: input,
	}) as Promise<Account>
}

export function deleteAccount(id: string) {
	return apiRequest('/accounts/{id}', 'delete', {
		params: { id },
	}) as Promise<DeleteAccountResponse>
}
