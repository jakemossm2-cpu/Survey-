import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 space-y-8 text-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Subcontractor Evaluation</h2>
            <p className="text-gray-500 mt-2 text-sm">
              Select the form that applies to you to begin your evaluation.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => navigate('/staff')}
              className="group flex flex-col items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl px-8 py-7 transition-all shadow-sm"
            >
              <span className="text-4xl">🏗️</span>
              <span className="text-lg font-bold">Next Our Homes Staff</span>
              <span className="text-brand-100 text-sm">Evaluate a subcontractor</span>
            </button>

            <button
              onClick={() => navigate('/contractor')}
              className="group flex flex-col items-center gap-2 bg-white hover:bg-gray-50 border-2 border-brand-500 text-brand-700 rounded-2xl px-8 py-7 transition-all"
            >
              <span className="text-4xl">🔨</span>
              <span className="text-lg font-bold">Subcontractor</span>
              <span className="text-brand-500 text-sm">Self-evaluation</span>
            </button>
          </div>
        </div>

        <p className="text-center mt-6 text-xs text-gray-400">
          <a href="/admin" className="hover:underline">Admin Panel</a>
        </p>
      </main>
    </div>
  )
}
