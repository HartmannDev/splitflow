import type { Database } from '../db/db.ts'

export type AppDependency = {
	db: Database
	config: {
		passwordPepper: string
		sessionSecret: string
	}
}

export type NodeEnvTypes = 'dev' | 'prod' | 'test'

export type BuildAppOptions = {
	sessionSecret: string
	passwordPepper: string
	nodeEnv: NodeEnvTypes
	database: Database
	logger?: boolean | object
}
