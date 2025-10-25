import './css/const.css'
import './css/main.css'
import './css/layout.css'
import './css/colors.css'
import './css/components.css'
import './css/scrollbar.css'
import './css/overrides.css'

import App from './views/main/App.svelte'

// Chrome mobile requires this to correctly scale the page.
const viewport = document.querySelector('meta[name="viewport"]');
if (viewport) {
    const scale = 1.0 / window.devicePixelRatio * 2.0;
    viewport.setAttribute('content',
        `width=device-width,
        initial-scale=${scale},
        minimum-scale=${scale},
        maximum-scale=${scale}`
    );
}

const app = new App({
  target: document.getElementById('app'),
})

export default app
