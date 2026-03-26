import type { Database } from '../db/db.ts'
import type { EmailTransporter } from '../plugins/nodemailer.ts'

export type AppDependency = {
	db: Database
	emailTransporter: EmailTransporter
	config: {
		passwordPepper: string
		sessionSecret: string
		nodeEnv: NodeEnvTypes
	}
}

export type NodeEnvTypes = 'dev' | 'prod' | 'test'

export type BuildAppOptions = {
	sessionSecret: string
	passwordPepper: string
	nodeEnv: NodeEnvTypes
	database: Database
	emailTransporter: EmailTransporter
	logger?: boolean | object
}
