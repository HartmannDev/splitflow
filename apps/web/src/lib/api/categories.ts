import { apiRequest } from '@/lib/api/request'

import type { JsonRequestBody, JsonResponse, QueryParams } from '@/types/api'

export type CategoriesQuery = QueryParams<'/categories', 'get'>
export type Category = JsonResponse<'/categories', 'get', '200'>[number]
export type CreateCategoryInput = JsonRequestBody<'/categories', 'post'>
export type CreateCategoryResponse = JsonResponse<'/categories', 'post', '201'>
export type UpdateCategoryInput = JsonRequestBody<'/categories/{id}', 'patch'>
export type DeleteCategoryResponse = JsonResponse<'/categories/{id}', 'delete', '200'>

export function getCategories(query?: CategoriesQuery) {
	return apiRequest('/categories', 'get', { query })
}

export function createCategory(input: CreateCategoryInput) {
	return apiRequest('/categories', 'post', { body: input }) as Promise<CreateCategoryResponse>
}

export function updateCategory(id: string, input: UpdateCategoryInput) {
	return apiRequest('/categories/{id}', 'patch', {
		params: { id },
		body: input,
	}) as Promise<Category>
}

export function deleteCategory(id: string) {
	return apiRequest('/categories/{id}', 'delete', {
		params: { id },
	}) as Promise<DeleteCategoryResponse>
}
