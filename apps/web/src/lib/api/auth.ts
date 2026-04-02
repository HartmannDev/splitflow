import { request } from '@/lib/api/request'
import type { AuthMessageResponse, AuthUser, LoginInput, SignupInput, SignupResponse } from '@/types/auth'

export function getCurrentUser() {
	return request<AuthUser | null>('/me')
}

export function login(input: LoginInput) {
	return request<AuthMessageResponse>('/login', {
		method: 'POST',
		body: input,
	})
}

export function logout() {
	return request<AuthMessageResponse>('/logout', {
		method: 'POST',
	})
}

export function signup(input: SignupInput) {
	return request<SignupResponse>('/signup', {
		method: 'POST',
		body: input,
	})
}
