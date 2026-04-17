import { Link } from 'react-router-dom'
import Header from '../components/Header'

export default function ThankYou() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 space-y-5">
          <div className="text-6xl">✅</div>
          <h2 className="text-2xl font-bold text-gray-800">Evaluation Submitted!</h2>
          <p className="text-gray-500 text-sm">
            Thank you for completing the evaluation. Your feedback helps Next Our Homes
            maintain the highest standards with our subcontractors.
          </p>
          <Link
            to="/"
            className="inline-block mt-4 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3 rounded-xl transition-all"
          >
            Submit Another Evaluation
          </Link>
        </div>
      </main>
    </div>
  )
}
