import { apiRequest } from '@/lib/api/request'

import type { JsonRequestBody, JsonResponse, QueryParams } from '@/types/api'

export type ContactsQuery = QueryParams<'/contacts', 'get'>
export type Contact = JsonResponse<'/contacts', 'get', '200'>[number]
export type CreateContactInput = JsonRequestBody<'/contacts', 'post'>
export type CreateContactResponse = JsonResponse<'/contacts', 'post', '201'>
export type UpdateContactInput = JsonRequestBody<'/contacts/{id}', 'patch'>
export type DeleteContactResponse = JsonResponse<'/contacts/{id}', 'delete', '200'>

export function getContacts(query?: ContactsQuery) {
	return apiRequest('/contacts', 'get', { query })
}

export function createContact(input: CreateContactInput) {
	return apiRequest('/contacts', 'post', { body: input }) as Promise<CreateContactResponse>
}

export function updateContact(id: string, input: UpdateContactInput) {
	return apiRequest('/contacts/{id}', 'patch', {
		params: { id },
		body: input,
	}) as Promise<Contact>
}

export function deleteContact(id: string) {
	return apiRequest('/contacts/{id}', 'delete', {
		params: { id },
	}) as Promise<DeleteContactResponse>
}
