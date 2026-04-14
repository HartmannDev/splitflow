import type { JsonRequestBody, JsonResponse } from '@/types/api'

export type LoginInput = JsonRequestBody<'/login', 'post'>
export type SignupInput = JsonRequestBody<'/signup', 'post'>
export type AuthMessageResponse = JsonResponse<'/login', 'post', '200'>
export type SignupResponse = JsonResponse<'/signup', 'post', '201'>
export type AuthUser = JsonResponse<'/me', 'get', '200'>
export type UserRole = AuthUser['role']
