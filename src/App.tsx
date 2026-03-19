import { BrowserRouter } from 'react-router-dom'
import { Auth } from './auth'
import { AppRoutes } from './routes/approots'

function App() {
  return (
    <BrowserRouter>
      <Auth>
        <AppRoutes />
      </Auth>
    </BrowserRouter>
  )
}

export default App
