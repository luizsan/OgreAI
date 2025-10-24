import './css/const.css'
import './css/main.css'
import './css/layout.css'
import './css/theme.css'
import './css/colors.css'
import './css/components.css'
import './css/scrollbar.css'
import './css/overrides.css'

import App from './views/main/App.svelte'

const app = new App({
  target: document.getElementById('app'),
})

export default app
