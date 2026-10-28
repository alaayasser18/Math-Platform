import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Local fonts – loaded offline so Arabic text always renders correctly
import '@fontsource/cairo/400.css'
import '@fontsource/cairo/600.css'
import '@fontsource/cairo/700.css'
import '@fontsource/cairo/800.css'
import '@fontsource/cairo/900.css'
import '@fontsource/alexandria/400.css'
import '@fontsource/alexandria/500.css'
import '@fontsource/alexandria/600.css'
import '@fontsource/alexandria/700.css'
import '@fontsource/alexandria/800.css'
import './index.css'
import './responsive.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
