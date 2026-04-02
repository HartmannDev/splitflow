import React from 'react'
import ReactDOM from 'react-dom/client'

import { App } from '@/app/App'
import '@/styles/global.css'

const storedTheme = window.localStorage.getItem('splitflow.theme')
const preferredTheme =
	storedTheme === 'light' || storedTheme === 'dark'
		? storedTheme
		: window.matchMedia('(prefers-color-scheme: dark)').matches
			? 'dark'
			: 'light'

document.documentElement.dataset.theme = preferredTheme
document.documentElement.style.colorScheme = preferredTheme

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
)
