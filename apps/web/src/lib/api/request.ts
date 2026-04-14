import { appConfig } from '@/lib/config'

import type { ApiMethod, ApiPath, PathParams, QueryParams, SuccessJsonResponse } from '@/types/api'

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

type QueryPrimitive = string | number | boolean
type QueryValue = QueryPrimitive | null | undefined | QueryPrimitive[]

type TypedRequestOptions<Path extends ApiPath, Method extends ApiMethod<Path>> = Omit<
	RequestInit,
	'body' | 'method'
> & {
	body?: unknown
	params?: PathParams<Path, Method>
	query?: QueryParams<Path, Method>
}

function interpolatePath(path: string, params?: Record<string, unknown>) {
	if (!params) {
		return path
	}

	return path.replace(/\{([^}]+)\}/g, (_match, key: string) => {
		const value = params[key]

		if (value === undefined || value === null) {
			throw new Error(`Missing required path parameter: ${key}`)
		}

		return encodeURIComponent(String(value))
	})
}

function appendQueryValue(searchParams: URLSearchParams, key: string, value: QueryValue) {
	if (value === undefined || value === null) {
		return
	}

	if (Array.isArray(value)) {
		for (const entry of value) {
			searchParams.append(key, String(entry))
		}
		return
	}

	searchParams.append(key, String(value))
}

function buildQueryString(query?: Record<string, QueryValue>) {
	if (!query) {
		return ''
	}

	const searchParams = new URLSearchParams()

	for (const [key, value] of Object.entries(query)) {
		appendQueryValue(searchParams, key, value)
	}

	const queryString = searchParams.toString()
	return queryString.length > 0 ? `?${queryString}` : ''
}

export function buildApiPath<Path extends ApiPath, Method extends ApiMethod<Path>>(
	path: Path,
	options: Pick<TypedRequestOptions<Path, Method>, 'params' | 'query'> = {},
) {
	const resolvedPath = interpolatePath(path, options.params as Record<string, unknown> | undefined)
	const queryString = buildQueryString(options.query as Record<string, QueryValue> | undefined)

	return `${resolvedPath}${queryString}`
}

export function apiRequest<Path extends ApiPath, Method extends ApiMethod<Path>>(
	path: Path,
	method: Method,
	options: TypedRequestOptions<Path, Method> = {},
) {
	const resolvedPath = buildApiPath<Path, Method>(path, {
		params: options.params,
		query: options.query,
	})

	return request<SuccessJsonResponse<Path, Method>>(resolvedPath, {
		...options,
		method: String(method).toUpperCase(),
		body: options.body,
	})
}
