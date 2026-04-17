import { useState } from 'react'

export default function ContractorSelect({ contractors, value, onChange }) {
  const [query, setQuery] = useState('')

  const filtered = contractors.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search contractor name..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(null)
        }}
        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {query && !value && (
        <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-52 overflow-y-auto shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-4 py-2 text-gray-400 text-sm">No contractors found</li>
          ) : (
            filtered.map((c) => (
              <li
                key={c.id}
                onClick={() => {
                  onChange(c)
                  setQuery(c.name)
                }}
                className="px-4 py-2 hover:bg-brand-50 cursor-pointer text-sm"
              >
                <span className="font-medium">{c.name}</span>
                {c.trade && <span className="text-gray-400 ml-2">— {c.trade}</span>}
              </li>
            ))
          )}
        </ul>
      )}
      {value && (
        <div className="mt-1 text-sm text-green-600 font-medium">✓ {value.name}</div>
      )}
    </div>
  )
}
