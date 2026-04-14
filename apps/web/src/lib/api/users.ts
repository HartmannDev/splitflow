import { apiRequest } from '@/lib/api/request'

import type { JsonRequestBody, JsonResponse, QueryParams } from '@/types/api'

export type UsersQuery = QueryParams<'/users', 'get'>
export type ManagedUser = JsonResponse<'/users', 'get', '200'>[number]
export type CreateUserInput = JsonRequestBody<'/users', 'post'>
export type CreateUserResponse = JsonResponse<'/users', 'post', '201'>
export type UpdateManagedUserInput = JsonRequestBody<'/users/{id}', 'patch'>
export type UpdateOwnUserInput = JsonRequestBody<'/users/me', 'patch'>
export type DeleteUserResponse = JsonResponse<'/users/{id}', 'delete', '200'>

export function getUsers(query?: UsersQuery) {
	return apiRequest('/users', 'get', { query })
}

export function getUser(id: string) {
	return apiRequest('/users/{id}', 'get', {
		params: { id },
	}) as Promise<ManagedUser>
}

export function createUser(input: CreateUserInput) {
	return apiRequest('/users', 'post', {
		body: input,
	}) as Promise<CreateUserResponse>
}

export function updateManagedUser(id: string, input: UpdateManagedUserInput) {
	return apiRequest('/users/{id}', 'patch', {
		params: { id },
		body: input,
	}) as Promise<ManagedUser>
}

export function updateOwnUser(input: UpdateOwnUserInput) {
	return apiRequest('/users/me', 'patch', {
		body: input,
	}) as Promise<ManagedUser>
}

export function deleteUser(id: string) {
	return apiRequest('/users/{id}', 'delete', {
		params: { id },
	}) as Promise<DeleteUserResponse>
}
