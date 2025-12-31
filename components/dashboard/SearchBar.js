'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'

export default function SearchBar({ onSearch }) {
  const [searchTerm, setSearchTerm] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch(searchTerm)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by establishment name or address..."
          className="w-full pl-10 pr-4 py-3 border border-border-default rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        />
        <Search className="absolute left-3 top-3.5 h-5 w-5 text-text-tertiary" />
      </div>
    </form>
  )
}
