import { buildApp } from '../app.ts'

type OpenApiDocument = {
	openapi: string
	info: {
		title: string
		version: string
	}
	components?: {
		schemas?: Record<string, unknown>
		securitySchemes?: Record<string, unknown>
	}
	paths: Record<string, Record<string, unknown>>
}

export async function buildOpenApiDocument(): Promise<OpenApiDocument> {
	const fakePool = {
		query: async () => ({ rows: [], rowCount: 0 }),
	}

	const app = buildApp({
		sessionSecret: 'openapi-session-secret-openapi-session-secret',
		passwordPepper: 'openapi-pepper',
		nodeEnv: 'test',
		database: {
			query: async () => ({ rows: [], rowCount: 0 }),
			transaction: async () => undefined,
			closePool: async () => undefined,
			testConnection: async () => undefined,
			pool: fakePool,
		} as never,
		emailTransporter: {
			sendMail: async () => ({ messageId: 'openapi-preview' }),
			verify: async () => true,
		} as never,
		logger: false,
	})

	try {
		await app.ready()
		return app.swagger() as OpenApiDocument
	} finally {
		await app.close()
	}
}
