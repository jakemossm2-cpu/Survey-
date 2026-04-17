import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import ContractorSelect from '../components/ContractorSelect'
import { useLocalStorage } from '../hooks/useLocalStorage'

export default function Landing() {
  const [contractors] = useLocalStorage('contractors', [])
  const [role, setRole] = useState('')
  const [contractor, setContractor] = useState(null)
  const navigate = useNavigate()

  const canStart = role && contractor

  function handleStart() {
    if (!canStart) return
    sessionStorage.setItem('survey_context', JSON.stringify({ role, contractor }))
    navigate('/survey')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Subcontractor Evaluation</h2>
            <p className="text-gray-500 mt-1 text-sm">
              Please complete an evaluation for the subcontractor listed below.
            </p>
          </div>

          {/* Role selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">I am a…</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'staff', label: 'Next Our Homes Staff' },
                { value: 'contractor', label: 'Subcontractor' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                    role === opt.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contractor selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Select Subcontractor</label>
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

          <button
            onClick={handleStart}
            disabled={!canStart}
            className={`w-full py-3 rounded-xl font-semibold text-white transition-all ${
              canStart
                ? 'bg-brand-500 hover:bg-brand-600 shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Start Evaluation →
          </button>
        </div>

        <p className="text-center mt-6 text-xs text-gray-400">
          <a href="/admin" className="hover:underline">Admin Panel</a>
        </p>
      </main>
    </div>
  )
}
