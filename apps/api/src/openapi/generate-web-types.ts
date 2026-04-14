import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildOpenApiDocument } from './build-document.ts'

type JsonSchema = {
	$ref?: string
	type?: string | string[]
	properties?: Record<string, JsonSchema>
	required?: string[]
	items?: JsonSchema
	enum?: Array<string | number | boolean | null>
	oneOf?: JsonSchema[]
	anyOf?: JsonSchema[]
	allOf?: JsonSchema[]
	nullable?: boolean
	additionalProperties?: boolean | JsonSchema
	const?: string | number | boolean | null
}

type OpenApiMediaType = {
	schema?: JsonSchema
}

type OpenApiRequestBody = {
	required?: boolean
	content?: Record<string, OpenApiMediaType>
}

type OpenApiResponse = {
	content?: Record<string, OpenApiMediaType>
}

type OpenApiParameter = {
	name: string
	in: 'path' | 'query' | 'header' | 'cookie'
	required?: boolean
	schema?: JsonSchema
}

type OpenApiOperation = {
	parameters?: OpenApiParameter[]
	requestBody?: OpenApiRequestBody
	responses?: Record<string, OpenApiResponse>
}

type OpenApiDocument = Awaited<ReturnType<typeof buildOpenApiDocument>>

const METHOD_ORDER = ['get', 'post', 'patch', 'put', 'delete'] as const

function escapePropertyKey(value: string) {
	if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value)) {
		return value
	}

	return JSON.stringify(value)
}

function toTypeLiteral(value: string | number | boolean | null) {
	return value === null ? 'null' : JSON.stringify(value)
}

function withNullable(type: string, schema: JsonSchema) {
	if (schema.nullable) {
		return `${type} | null`
	}

	return type
}

function convertSchema(schema: JsonSchema | undefined, document: OpenApiDocument): string {
	if (!schema) {
		return 'unknown'
	}

	if (schema.$ref) {
		const match = schema.$ref.match(/^#\/components\/schemas\/(.+)$/)
		if (match) {
			return `components["schemas"][${JSON.stringify(match[1])}]`
		}

		return 'unknown'
	}

	if (schema.const !== undefined) {
		return toTypeLiteral(schema.const)
	}

	if (schema.enum && schema.enum.length > 0) {
		return withNullable(schema.enum.map(toTypeLiteral).join(' | '), schema)
	}

	if (schema.oneOf && schema.oneOf.length > 0) {
		return withNullable(schema.oneOf.map((entry) => convertSchema(entry, document)).join(' | '), schema)
	}

	if (schema.anyOf && schema.anyOf.length > 0) {
		return withNullable(schema.anyOf.map((entry) => convertSchema(entry, document)).join(' | '), schema)
	}

	if (schema.allOf && schema.allOf.length > 0) {
		return withNullable(schema.allOf.map((entry) => convertSchema(entry, document)).join(' & '), schema)
	}

	if (Array.isArray(schema.type)) {
		const unions = schema.type.map((entry) => convertSchema({ ...schema, type: entry, nullable: false }, document))
		return withNullable(unions.join(' | '), schema)
	}

	if (schema.type === 'object' || schema.properties || schema.additionalProperties) {
		const properties = schema.properties ?? {}
		const required = new Set(schema.required ?? [])
		const segments: string[] = []

		for (const [key, value] of Object.entries(properties)) {
			const optionalFlag = required.has(key) ? '' : '?'
			segments.push(`${escapePropertyKey(key)}${optionalFlag}: ${convertSchema(value, document)}`)
		}

		if (schema.additionalProperties === true) {
			segments.push('[key: string]: unknown')
		} else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
			segments.push(`[key: string]: ${convertSchema(schema.additionalProperties, document)}`)
		}

		if (segments.length === 0) {
			return withNullable('Record<string, never>', schema)
		}

		return withNullable(`{ ${segments.join('; ')} }`, schema)
	}

	if (schema.type === 'array') {
		return withNullable(`Array<${convertSchema(schema.items, document)}>`, schema)
	}

	if (schema.type === 'integer' || schema.type === 'number') {
		return withNullable('number', schema)
	}

	if (schema.type === 'boolean') {
		return withNullable('boolean', schema)
	}

	if (schema.type === 'null') {
		return 'null'
	}

	if (schema.type === 'string') {
		return withNullable('string', schema)
	}

	void document
	return 'unknown'
}

function renderContent(content: Record<string, OpenApiMediaType> | undefined, document: OpenApiDocument) {
	if (!content || Object.keys(content).length === 0) {
		return 'never'
	}

	const items = Object.entries(content).map(
		([contentType, mediaType]) => `${JSON.stringify(contentType)}: ${convertSchema(mediaType.schema, document)}`,
	)

	return `{ ${items.join('; ')} }`
}

function renderRequestBody(requestBody: OpenApiRequestBody | undefined, document: OpenApiDocument) {
	if (!requestBody || !requestBody.content) {
		return null
	}

	const content = renderContent(requestBody.content, document)
	return `requestBody${requestBody.required ? '' : '?'}: { content: ${content} }`
}

function renderParameters(parameters: OpenApiParameter[] | undefined, document: OpenApiDocument) {
	if (!parameters || parameters.length === 0) {
		return null
	}

	const groups = new Map<string, string[]>()

	for (const parameter of parameters) {
		const entry = `${escapePropertyKey(parameter.name)}${parameter.required ? '' : '?'}: ${convertSchema(parameter.schema, document)}`
		const current = groups.get(parameter.in) ?? []
		current.push(entry)
		groups.set(parameter.in, current)
	}

	const segments = [...groups.entries()].map(([location, values]) => {
		const allRequired = parameters.filter((parameter) => parameter.in === location).every((parameter) => parameter.required)
		return `${escapePropertyKey(location)}${allRequired ? '' : '?'}: { ${values.join('; ')} }`
	})

	return `parameters: { ${segments.join('; ')} }`
}

function renderResponses(responses: Record<string, OpenApiResponse> | undefined, document: OpenApiDocument) {
	if (!responses || Object.keys(responses).length === 0) {
		return 'responses: Record<number, never>'
	}

	const segments = Object.entries(responses).map(([statusCode, response]) => {
		const content = renderContent(response.content, document)
		return `${JSON.stringify(statusCode)}: ${content === 'never' ? 'never' : `{ content: ${content} }`}`
	})

	return `responses: { ${segments.join('; ')} }`
}

function renderOperation(operation: OpenApiOperation, document: OpenApiDocument) {
	const segments = [
		renderParameters(operation.parameters, document),
		renderRequestBody(operation.requestBody, document),
		renderResponses(operation.responses, document),
	].filter(Boolean)

	return `{ ${segments.join('; ')} }`
}

function renderComponents(document: OpenApiDocument) {
	const schemas = document.components?.schemas ?? {}
	const entries = Object.entries(schemas).map(([name, schema]) => `${JSON.stringify(name)}: ${convertSchema(schema as JsonSchema, document)}`)

	return `export type components = {\n\tschemas: {\n\t\t${entries.join(';\n\t\t')}\n\t}\n}\n`
}

function renderPaths(document: OpenApiDocument) {
	const pathEntries = Object.entries(document.paths).map(([pathKey, methods]) => {
		const methodEntries = METHOD_ORDER.filter((method) => method in methods).map((method) => {
			return `${method}: ${renderOperation(methods[method] as OpenApiOperation, document)}`
		})

		return `\t${JSON.stringify(pathKey)}: {\n\t\t${methodEntries.join(';\n\t\t')}\n\t}`
	})

	return `export type paths = {\n${pathEntries.join(';\n')}\n}\n`
}

async function main() {
	const document = await buildOpenApiDocument()
	const currentFilePath = fileURLToPath(import.meta.url)
	const currentDir = path.dirname(currentFilePath)
	const outputPath = path.resolve(currentDir, '../../../web/src/types/generated/openapi.ts')
	const outputDir = path.dirname(outputPath)

	await mkdir(outputDir, { recursive: true })

	const source = `/* eslint-disable */\n/* biome-ignore-all lint: generated file */\n// This file is auto-generated from the backend OpenAPI document.\n// Do not edit it by hand.\n\n${renderComponents(document)}\n${renderPaths(document)}`

	await writeFile(outputPath, source, 'utf8')
	console.log(`Generated web API types at ${outputPath}`)
}

await main()
