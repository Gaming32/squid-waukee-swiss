import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import { BracketsViewer } from './brackets-viewer'

window.bracketsViewer = new BracketsViewer()

createApp(App).mount('#app')
