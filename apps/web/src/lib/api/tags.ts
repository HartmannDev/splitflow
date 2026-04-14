import { apiRequest } from '@/lib/api/request'

import type { JsonRequestBody, JsonResponse, QueryParams } from '@/types/api'

export type TagsQuery = QueryParams<'/tags', 'get'>
export type Tag = JsonResponse<'/tags', 'get', '200'>[number]
export type CreateTagInput = JsonRequestBody<'/tags', 'post'>
export type CreateTagResponse = JsonResponse<'/tags', 'post', '201'>
export type UpdateTagInput = JsonRequestBody<'/tags/{id}', 'patch'>
export type DeleteTagResponse = JsonResponse<'/tags/{id}', 'delete', '200'>

export function getTags(query?: TagsQuery) {
	return apiRequest('/tags', 'get', { query })
}

export function createTag(input: CreateTagInput) {
	return apiRequest('/tags', 'post', { body: input }) as Promise<CreateTagResponse>
}

export function updateTag(id: string, input: UpdateTagInput) {
	return apiRequest('/tags/{id}', 'patch', {
		params: { id },
		body: input,
	}) as Promise<Tag>
}

export function deleteTag(id: string) {
	return apiRequest('/tags/{id}', 'delete', {
		params: { id },
	}) as Promise<DeleteTagResponse>
}
