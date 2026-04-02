import { useMutation, useQuery } from '@tanstack/react-query'

import { queryClient } from '@/app/query-client'
import { getCurrentUser, login, logout, signup } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/request'
import type { LoginInput, SignupInput } from '@/types/auth'

export const authQueryKey = ['auth', 'me'] as const

export function useCurrentUserQuery() {
	return useQuery({
		queryKey: authQueryKey,
		queryFn: async () => {
			try {
				return await getCurrentUser()
			} catch (error) {
				if (error instanceof ApiError && error.status === 401) {
					return null
				}

				throw error
			}
		},
		staleTime: 60_000,
	})
}

export function useLoginMutation() {
	return useMutation({
		mutationFn: (input: LoginInput) => login(input),
		onSuccess: async () => {
			await queryClient.fetchQuery({
				queryKey: authQueryKey,
				queryFn: getCurrentUser,
			})
		},
	})
}

export function useLogoutMutation() {
	return useMutation({
		mutationFn: logout,
		onSettled: async () => {
			await queryClient.setQueryData(authQueryKey, null)
			await queryClient.invalidateQueries({ queryKey: authQueryKey })
		},
	})
}

export function useSignupMutation() {
	return useMutation({
		mutationFn: (input: SignupInput) => signup(input),
	})
}
