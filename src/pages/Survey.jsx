import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import StarRating from '../components/StarRating'
import ContractorSelect from '../components/ContractorSelect'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { QUESTIONS } from '../data/questions'

export default function Survey({ respondentType }) {
  const navigate = useNavigate()
  const [contractors] = useLocalStorage('contractors', [])
  const [responses, setResponses] = useLocalStorage('responses', [])

  const [contractor, setContractor] = useState(null)
  const [ratings, setRatings] = useState({})
  const [comments, setComments] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const isStaff = respondentType === 'staff'
  const allRated = QUESTIONS.every((q) => ratings[q.id] > 0)
  const canSubmit = allRated && contractor && !submitted

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return

    const entry = {
      id: crypto.randomUUID(),
      contractorId: contractor.id,
      contractorName: contractor.name,
      contractorTrade: contractor.trade || '',
      respondentType,
      ratings,
      comments,
      submittedAt: new Date().toISOString(),
    }

    setResponses((prev) => [...prev, entry])
    setSubmitted(true)
    navigate('/thankyou')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* Role banner */}
        <div className={`rounded-xl px-5 py-3 mb-5 flex items-center gap-3 text-sm font-medium ${isStaff ? 'bg-blue-50 border border-blue-100 text-blue-800' : 'bg-purple-50 border border-purple-100 text-purple-800'}`}>
          <span className="text-xl">{isStaff ? '🏗️' : '🔨'}</span>
          <span>{isStaff ? 'Nexstar Homes Staff — Contractor Evaluation' : 'Subcontractor Self-Evaluation'}</span>
          <Link to="/" className="ml-auto text-xs underline opacity-60 hover:opacity-100">Change</Link>
        </div>

        {/* Contractor selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {isStaff ? 'Select the Subcontractor you are evaluating' : 'Select your company'}
          </label>
          {contractors.length === 0 ? (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              No contractors have been added yet.{' '}
              <a href="/admin" className="underline font-medium">Go to Admin</a> to add them.
            </p>
          ) : (
            <ContractorSelect
              contractors={contractors}
              value={contractor}
              onChange={setContractor}
            />
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {QUESTIONS.map((q, i) => (
            <div key={q.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="mb-3">
                <span className="text-xs font-semibold text-brand-500 uppercase tracking-wide">
                  Question {i + 1} of {QUESTIONS.length}
                </span>
                <h3 className="text-base font-bold text-gray-800 mt-0.5">{q.label}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{q.description}</p>
              </div>
              <StarRating
                value={ratings[q.id] || 0}
                onChange={(val) => setRatings((prev) => ({ ...prev, [q.id]: val }))}
              />
              <textarea
                placeholder="Optional comment…"
                value={comments[q.id] || ''}
                onChange={(e) => setComments((prev) => ({ ...prev, [q.id]: e.target.value }))}
                rows={2}
                className="mt-3 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full py-3 rounded-xl font-semibold text-white transition-all ${
              canSubmit
                ? 'bg-brand-500 hover:bg-brand-600 shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {!contractor
              ? 'Select a contractor above to continue'
              : !allRated
              ? `Rate all ${QUESTIONS.length} questions to submit`
              : 'Submit Evaluation'}
          </button>
        </form>
      </main>
    </div>
  )
}
