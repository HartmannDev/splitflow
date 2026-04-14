import type { paths } from '@/types/generated/openapi'

type JsonContent<T> = T extends { content: { 'application/json': infer Json } } ? Json : never
type Operation<Path extends keyof paths, Method extends keyof paths[Path]> = paths[Path][Method]

export type ApiPaths = paths

export type JsonRequestBody<Path extends keyof paths, Method extends keyof paths[Path]> =
	Operation<Path, Method> extends { requestBody: infer RequestBody } ? JsonContent<RequestBody> : never

export type JsonResponse<
	Path extends keyof paths,
	Method extends keyof paths[Path],
	Status extends PropertyKey,
> = Operation<Path, Method> extends { responses: infer Responses }
	? Status extends keyof Responses
		? JsonContent<Responses[Status]>
		: never
	: never

export type PathParams<Path extends keyof paths, Method extends keyof paths[Path]> =
	Operation<Path, Method> extends { parameters: { path: infer Params } } ? Params : never

export type QueryParams<Path extends keyof paths, Method extends keyof paths[Path]> =
	Operation<Path, Method> extends { parameters: { query: infer Params } } ? Params : never
