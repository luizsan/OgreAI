import './css/core/const.css'
import './css/core/main.css'

import './css/widgets/box.css'
import './css/widgets/field.css'
import './css/widgets/button.css'
import './css/widgets/range.css'
import './css/widgets/checkbox.css'
import './css/widgets/dropdown.css'
import './css/widgets/decoration.css'
import './css/widgets/scrollbar.css'

import './css/style/layout.css'
import './css/style/overrides.css'
import './css/style/theme.css'

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
