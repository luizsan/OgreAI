import './css/const.css'
import './css/main.css'
import './css/scrollbar.css'
import './css/components.css'
import './css/colors.css'
import './css/overrides.css'

import App from './views/main/App.svelte'
import { mount } from "svelte";

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
