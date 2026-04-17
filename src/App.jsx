import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Survey from './pages/Survey'
import ThankYou from './pages/ThankYou'
import Admin from './pages/Admin'

export default function App() {
  return (
    <BrowserRouter basename="/Survey-">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/staff" element={<Survey respondentType="staff" />} />
        <Route path="/contractor" element={<Survey respondentType="contractor" />} />
        <Route path="/thankyou" element={<ThankYou />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}
