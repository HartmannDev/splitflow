import { appConfig } from '@/lib/config'

export type ApiErrorPayload = {
	message?: string
	code?: string
	details?: unknown
}

export class ApiError extends Error {
	status: number
	payload: ApiErrorPayload | null

	constructor(status: number, payload: ApiErrorPayload | null, fallbackMessage: string) {
		super(payload?.message ?? fallbackMessage)
		this.name = 'ApiError'
		this.status = status
		this.payload = payload
	}
}

type RequestOptions = Omit<RequestInit, 'body'> & {
	body?: unknown
}

export async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
	const headers = new Headers(init.headers)

	if (!headers.has('Accept')) {
		headers.set('Accept', 'application/json')
	}

	if (init.body !== undefined && !headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json')
	}

	const body =
		init.body !== undefined
			? headers.get('Content-Type') === 'application/json'
				? JSON.stringify(init.body)
				: (init.body as BodyInit)
			: undefined

	const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
		...init,
		body,
		headers,
		credentials: 'include',
	})

	if (response.status === 204) {
		return undefined as T
	}

	const contentType = response.headers.get('content-type') ?? ''
	const payload = contentType.includes('application/json') ? await response.json() : await response.text()

	if (!response.ok) {
		throw new ApiError(response.status, (payload as ApiErrorPayload | null) ?? null, 'Request failed')
	}

	return payload as T
}
