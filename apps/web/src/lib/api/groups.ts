import { apiRequest } from '@/lib/api/request'

import type { JsonRequestBody, JsonResponse, QueryParams } from '@/types/api'

export type GroupsQuery = QueryParams<'/groups', 'get'>
export type Group = JsonResponse<'/groups', 'get', '200'>[number]
export type GroupMember = JsonResponse<'/groups/{id}/members', 'get', '200'>[number]
export type CreateGroupInput = JsonRequestBody<'/groups', 'post'>
export type CreateGroupResponse = JsonResponse<'/groups', 'post', '201'>
export type UpdateGroupInput = JsonRequestBody<'/groups/{id}', 'patch'>
export type CreateGroupVersionInput = JsonRequestBody<'/groups/{id}/version', 'post'>
export type AddGroupMemberInput = JsonRequestBody<'/groups/{id}/members', 'post'>
export type DeleteGroupResponse = JsonResponse<'/groups/{id}', 'delete', '200'>
export type RemoveGroupMemberResponse = JsonResponse<'/groups/{id}/members/{memberId}', 'delete', '201'>

export function getGroups(query?: GroupsQuery) {
	return apiRequest('/groups', 'get', { query })
}

export function getGroup(id: string) {
	return apiRequest('/groups/{id}', 'get', {
		params: { id },
	}) as Promise<Group>
}

export function getGroupMembers(id: string) {
	return apiRequest('/groups/{id}/members', 'get', {
		params: { id },
	}) as Promise<GroupMember[]>
}

export function createGroup(input: CreateGroupInput) {
	return apiRequest('/groups', 'post', { body: input }) as Promise<CreateGroupResponse>
}

export function updateGroup(id: string, input: UpdateGroupInput) {
	return apiRequest('/groups/{id}', 'patch', {
		params: { id },
		body: input,
	}) as Promise<Group>
}

export function createGroupVersion(id: string, input: CreateGroupVersionInput) {
	return apiRequest('/groups/{id}/version', 'post', {
		params: { id },
		body: input,
	}) as Promise<CreateGroupResponse>
}

export function addGroupMember(id: string, input: AddGroupMemberInput) {
	return apiRequest('/groups/{id}/members', 'post', {
		params: { id },
		body: input,
	}) as Promise<CreateGroupResponse>
}

export function removeGroupMember(id: string, memberId: string) {
	return apiRequest('/groups/{id}/members/{memberId}', 'delete', {
		params: { id, memberId },
	}) as Promise<RemoveGroupMemberResponse>
}

export function deleteGroup(id: string) {
	return apiRequest('/groups/{id}', 'delete', {
		params: { id },
	}) as Promise<DeleteGroupResponse>
}
