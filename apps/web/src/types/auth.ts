export type UserRole = 'user' | 'admin'

export type AuthUser = {
	id: string
	role: UserRole
	name: string
	lastname: string
	email: string
	isActive: boolean
	emailVerifiedAt: string | null
	createdAt: string
	updatedAt: string
	deletedAt: string | null
}

export type LoginInput = {
	email: string
	password: string
}

export type SignupInput = {
	name: string
	lastname: string
	email: string
	password: string
}

export type AuthMessageResponse = {
	message: string
}

export type SignupResponse = AuthMessageResponse & {
	userID: string
}
