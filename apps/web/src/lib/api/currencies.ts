import { apiRequest } from '@/lib/api/request'

import type { JsonRequestBody, JsonResponse, QueryParams } from '@/types/api'

export type CurrenciesQuery = QueryParams<'/currencies', 'get'>
export type Currency = JsonResponse<'/currencies', 'get', '200'>[number]
export type CreateCurrencyInput = JsonRequestBody<'/currencies', 'post'>
export type CreateCurrencyResponse = JsonResponse<'/currencies', 'post', '201'>
export type UpdateCurrencyInput = JsonRequestBody<'/currencies/{code}', 'patch'>
export type DeleteCurrencyResponse = JsonResponse<'/currencies/{code}', 'delete', '200'>

export function getCurrencies(query?: CurrenciesQuery) {
	return apiRequest('/currencies', 'get', { query })
}

export function createCurrency(input: CreateCurrencyInput) {
	return apiRequest('/currencies', 'post', { body: input }) as Promise<CreateCurrencyResponse>
}

export function updateCurrency(code: string, input: UpdateCurrencyInput) {
	return apiRequest('/currencies/{code}', 'patch', {
		params: { code },
		body: input,
	}) as Promise<Currency>
}

export function deleteCurrency(code: string) {
	return apiRequest('/currencies/{code}', 'delete', {
		params: { code },
	}) as Promise<DeleteCurrencyResponse>
}
