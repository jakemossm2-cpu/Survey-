import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import StarRating from '../components/StarRating'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { QUESTIONS } from '../data/questions'

export default function Survey() {
  const navigate = useNavigate()
  const [context, setContext] = useState(null)
  const [ratings, setRatings] = useState({})
  const [comments, setComments] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [responses, setResponses] = useLocalStorage('responses', [])

  useEffect(() => {
    const raw = sessionStorage.getItem('survey_context')
    if (!raw) { navigate('/'); return }
    setContext(JSON.parse(raw))
  }, [navigate])

  const allRated = QUESTIONS.every((q) => ratings[q.id] > 0)

  function handleSubmit(e) {
    e.preventDefault()
    if (!allRated || submitted) return

    const entry = {
      id: crypto.randomUUID(),
      contractorId: context.contractor.id,
      contractorName: context.contractor.name,
      contractorTrade: context.contractor.trade || '',
      respondentType: context.role,
      ratings,
      comments,
      submittedAt: new Date().toISOString(),
    }

    setResponses((prev) => [...prev, entry])
    setSubmitted(true)
    sessionStorage.removeItem('survey_context')
    navigate('/thankyou')
  }

  if (!context) return null

  const roleLabel = context.role === 'staff' ? 'Next Our Homes Staff' : 'Subcontractor'

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Context banner */}
        <div className="bg-brand-50 border border-brand-100 rounded-xl px-5 py-3 mb-6 flex flex-wrap gap-4 text-sm">
          <span><span className="text-gray-500">Evaluating:</span> <strong>{context.contractor.name}</strong>{context.contractor.trade && ` — ${context.contractor.trade}`}</span>
          <span><span className="text-gray-500">Submitted by:</span> <strong>{roleLabel}</strong></span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {QUESTIONS.map((q, i) => (
            <div key={q.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="mb-3">
                <span className="text-xs font-semibold text-brand-500 uppercase tracking-wide">Question {i + 1} of {QUESTIONS.length}</span>
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
            disabled={!allRated}
            className={`w-full py-3 rounded-xl font-semibold text-white transition-all ${
              allRated
                ? 'bg-brand-500 hover:bg-brand-600 shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {allRated ? 'Submit Evaluation' : `Rate all ${QUESTIONS.length} questions to submit`}
          </button>
        </form>
      </main>
    </div>
  )
}
