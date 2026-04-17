import { useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import StarRating from '../components/StarRating'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { QUESTIONS, ADMIN_PIN } from '../data/questions'

function exportCSV(responses) {
  const headers = [
    'Date', 'Contractor', 'Trade', 'Respondent Type',
    ...QUESTIONS.map((q) => q.label),
    'Average Score', 'Comments',
  ]
  const rows = responses.map((r) => {
    const scores = QUESTIONS.map((q) => r.ratings[q.id] || '')
    const avg = scores.filter(Boolean).length
      ? (scores.filter(Boolean).reduce((a, b) => a + Number(b), 0) / scores.filter(Boolean).length).toFixed(2)
      : ''
    const commentStr = QUESTIONS.map((q) => r.comments?.[q.id] ? `${q.label}: ${r.comments[q.id]}` : '').filter(Boolean).join(' | ')
    return [
      new Date(r.submittedAt).toLocaleDateString(),
      r.contractorName,
      r.contractorTrade || '',
      r.respondentType === 'staff' ? 'Staff' : 'Subcontractor',
      ...scores,
      avg,
      commentStr,
    ]
  })

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `contractor-evaluations-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function avgScore(response) {
  const scores = QUESTIONS.map((q) => response.ratings[q.id]).filter(Boolean)
  if (!scores.length) return null
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
}

export default function Admin() {
  const [pin, setPin] = useState('')
  const [authed, setAuthed] = useState(false)
  const [pinError, setPinError] = useState(false)
  const [tab, setTab] = useState('contractors')

  const [contractors, setContractors] = useLocalStorage('contractors', [])
  const [responses, setResponses] = useLocalStorage('responses', [])

  const [newName, setNewName] = useState('')
  const [newTrade, setNewTrade] = useState('')
  const [filterContractor, setFilterContractor] = useState('')

  function handleLogin(e) {
    e.preventDefault()
    if (pin === ADMIN_PIN) {
      setAuthed(true)
      setPinError(false)
    } else {
      setPinError(true)
    }
  }

  function addContractor() {
    if (!newName.trim()) return
    const entry = { id: crypto.randomUUID(), name: newName.trim(), trade: newTrade.trim() }
    setContractors((prev) => [...prev, entry].sort((a, b) => a.name.localeCompare(b.name)))
    setNewName('')
    setNewTrade('')
  }

  function removeContractor(id) {
    if (!window.confirm('Remove this contractor? Their survey responses will remain.')) return
    setContractors((prev) => prev.filter((c) => c.id !== id))
  }

  function clearAllResponses() {
    if (!window.confirm('Delete ALL survey responses? This cannot be undone.')) return
    setResponses([])
  }

  const filteredResponses = filterContractor
    ? responses.filter((r) => r.contractorId === filterContractor)
    : responses

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-sm mx-auto px-4 py-16">
          <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5">
            <h2 className="text-xl font-bold text-gray-800">Admin Access</h2>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter PIN"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {pinError && <p className="text-red-500 text-xs mt-1">Incorrect PIN</p>}
            </div>
            <button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2 rounded-xl">
              Enter
            </button>
            <Link to="/" className="block text-center text-sm text-gray-400 hover:underline">← Back to Survey</Link>
          </form>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Admin Panel</h2>
          <Link to="/" className="text-sm text-brand-500 hover:underline">← Back to Survey</Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[{ key: 'contractors', label: `Contractors (${contractors.length})` }, { key: 'results', label: `Results (${responses.length})` }].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2 rounded-lg font-medium text-sm transition-all ${
                tab === t.key ? 'bg-brand-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'contractors' && (
          <div className="space-y-6">
            {/* Add form */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-700 mb-4">Add Contractor</h3>
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="Contractor name *"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addContractor()}
                  className="flex-1 min-w-48 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <input
                  type="text"
                  placeholder="Trade / specialty"
                  value={newTrade}
                  onChange={(e) => setNewTrade(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addContractor()}
                  className="flex-1 min-w-40 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  onClick={addContractor}
                  className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-semibold"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Contractor list */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {contractors.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm">No contractors added yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Name</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Trade</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Responses</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractors.map((c) => (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-800">{c.name}</td>
                        <td className="px-5 py-3 text-gray-500">{c.trade || '—'}</td>
                        <td className="px-5 py-3 text-gray-500">{responses.filter((r) => r.contractorId === c.id).length}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => removeContractor(c.id)}
                            className="text-red-400 hover:text-red-600 text-xs font-medium"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {tab === 'results' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={filterContractor}
                onChange={(e) => setFilterContractor(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">All Contractors</option>
                {contractors.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={() => exportCSV(filteredResponses)}
                disabled={filteredResponses.length === 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                Export CSV ({filteredResponses.length})
              </button>
              <button
                onClick={clearAllResponses}
                disabled={responses.length === 0}
                className="text-red-400 hover:text-red-600 disabled:opacity-40 text-sm font-medium ml-auto"
              >
                Clear all responses
              </button>
            </div>

            {filteredResponses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400 text-sm">
                No responses yet.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Date</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Contractor</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">By</th>
                      {QUESTIONS.map((q) => (
                        <th key={q.id} className="text-center px-3 py-3 font-semibold text-gray-600 whitespace-nowrap text-xs">
                          {q.label}
                        </th>
                      ))}
                      <th className="text-center px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...filteredResponses].reverse().map((r) => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(r.submittedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{r.contractorName}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.respondentType === 'staff' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {r.respondentType === 'staff' ? 'Staff' : 'Self'}
                          </span>
                        </td>
                        {QUESTIONS.map((q) => (
                          <td key={q.id} className="px-3 py-3 text-center">
                            {r.ratings[q.id] ? (
                              <span className="text-yellow-500 font-semibold">{r.ratings[q.id]}★</span>
                            ) : '—'}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center font-bold text-brand-600">{avgScore(r)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
