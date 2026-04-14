import { apiRequest } from '@/lib/api/request'

import type { AuthMessageResponse, AuthUser, LoginInput, SignupInput, SignupResponse } from '@/types/auth'

export function getCurrentUser() {
	return apiRequest('/me', 'get') as Promise<AuthUser | null>
}

export function login(input: LoginInput) {
	return apiRequest('/login', 'post', {
		body: input,
	}) as Promise<AuthMessageResponse>
}

export function logout() {
	return apiRequest('/logout', 'post') as Promise<AuthMessageResponse>
}

export function signup(input: SignupInput) {
	return apiRequest('/signup', 'post', {
		body: input,
	}) as Promise<SignupResponse>
}
