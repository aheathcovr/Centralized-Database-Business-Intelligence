'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { SalesRepFilterValue } from './types';

interface SalesRep {
  id: string;
  name: string;
  group: string;
}

interface SalesRepGroup {
  id: string;
  name: string;
  repCount: number;
}

interface SalesRepFilterProps {
  value: SalesRepFilterValue;
  onChange: (value: SalesRepFilterValue) => void;
  reps?: SalesRep[];
  groups?: SalesRepGroup[];
  loading?: boolean;
  className?: string;
}

// Default groups based on customer_type_label from BigQuery data
const DEFAULT_GROUPS: SalesRepGroup[] = [
  { id: 'enterprise', name: 'Enterprise', repCount: 0 },
  { id: 'mid-market', name: 'Mid-Market', repCount: 0 },
  { id: 'smb', name: 'SMB', repCount: 0 },
  { id: 'strategic', name: 'Strategic Accounts', repCount: 0 },
];

export default function SalesRepFilter({
  value,
  onChange,
  reps = [],
  groups = DEFAULT_GROUPS,
  loading = false,
  className = '',
}: SalesRepFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'reps' | 'groups'>('reps');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredReps = reps.filter((rep) =>
    searchQuery === '' ||
    rep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rep.group.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter((group) =>
    searchQuery === '' ||
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRepToggle = useCallback(
    (repId: string) => {
      const newReps = value.reps.includes(repId)
        ? value.reps.filter((id) => id !== repId)
        : [...value.reps, repId];
      onChange({ ...value, reps: newReps });
    },
    [value, onChange]
  );

  const handleGroupToggle = useCallback(
    (groupId: string) => {
      const newGroups = value.groups.includes(groupId)
        ? value.groups.filter((id) => id !== groupId)
        : [...value.groups, groupId];
      onChange({ ...value, groups: newGroups });
    },
    [value, onChange]
  );

  const handleSelectAllReps = useCallback(() => {
    if (value.reps.length === reps.length) {
      onChange({ ...value, reps: [] });
    } else {
      onChange({ ...value, reps: reps.map((r) => r.id) });
    }
  }, [value, onChange, reps]);

  const handleSelectAllGroups = useCallback(() => {
    if (value.groups.length === groups.length) {
      onChange({ ...value, groups: [] });
    } else {
      onChange({ ...value, groups: groups.map((g) => g.id) });
    }
  }, [value, onChange, groups]);

  const handleClear = useCallback(() => {
    onChange({ reps: [], groups: [] });
  }, [onChange]);

  const selectedCount = value.reps.length + value.groups.length;

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Sales Rep / Group
      </label>
      <div className="relative" ref={dropdownRef}>
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="filter-select w-full flex items-center justify-between text-left"
          disabled={loading}
        >
          <span className={selectedCount > 0 ? 'text-gray-900' : 'text-gray-400'}>
            {loading
              ? 'Loading...'
              : selectedCount > 0
              ? `${selectedCount} selected`
              : 'All reps & groups'}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full min-w-[280px] bg-white border border-gray-200 rounded-lg shadow-lg">
            {/* Search */}
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reps or groups..."
                className="filter-select w-full text-xs"
              />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              <button
                type="button"
                onClick={() => setActiveTab('reps')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'reps'
                    ? 'text-covr-blue border-b-2 border-covr-blue'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Reps ({reps.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('groups')}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'groups'
                    ? 'text-covr-blue border-b-2 border-covr-blue'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Groups ({groups.length})
              </button>
            </div>

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto">
              {activeTab === 'reps' ? (
                <div>
                  {/* Select All */}
                  <button
                    type="button"
                    onClick={handleSelectAllReps}
                    className="w-full px-3 py-2 flex items-center gap-2 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer border-b border-gray-50"
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        value.reps.length === reps.length && reps.length > 0
                          ? 'bg-covr-blue border-covr-blue'
                          : value.reps.length > 0
                          ? 'bg-covr-blue/20 border-covr-blue/50'
                          : 'border-gray-300'
                      }`}
                    >
                      {value.reps.length === reps.length && reps.length > 0 && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {value.reps.length > 0 && value.reps.length < reps.length && (
                        <span className="w-2 h-0.5 bg-covr-blue rounded" />
                      )}
                    </span>
                    Select All Reps
                  </button>

                  {filteredReps.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-gray-400 text-center">
                      {reps.length === 0
                        ? 'No sales reps configured. Add reps via API.'
                        : 'No reps match your search.'}
                    </p>
                  ) : (
                    filteredReps.map((rep) => (
                      <button
                        key={rep.id}
                        type="button"
                        onClick={() => handleRepToggle(rep.id)}
                        className="w-full px-3 py-2 flex items-center gap-2 text-xs hover:bg-gray-50 cursor-pointer"
                      >
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                            value.reps.includes(rep.id)
                              ? 'bg-covr-blue border-covr-blue'
                              : 'border-gray-300'
                          }`}
                        >
                          {value.reps.includes(rep.id) && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <div className="flex-1 text-left">
                          <span className="text-gray-900">{rep.name}</span>
                          <span className="text-gray-400 ml-1">({rep.group})</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <div>
                  {/* Select All Groups */}
                  <button
                    type="button"
                    onClick={handleSelectAllGroups}
                    className="w-full px-3 py-2 flex items-center gap-2 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer border-b border-gray-50"
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        value.groups.length === groups.length && groups.length > 0
                          ? 'bg-covr-blue border-covr-blue'
                          : value.groups.length > 0
                          ? 'bg-covr-blue/20 border-covr-blue/50'
                          : 'border-gray-300'
                      }`}
                    >
                      {value.groups.length === groups.length && groups.length > 0 && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {value.groups.length > 0 && value.groups.length < groups.length && (
                        <span className="w-2 h-0.5 bg-covr-blue rounded" />
                      )}
                    </span>
                    Select All Groups
                  </button>

                  {filteredGroups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => handleGroupToggle(group.id)}
                      className="w-full px-3 py-2 flex items-center gap-2 text-xs hover:bg-gray-50 cursor-pointer"
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          value.groups.includes(group.id)
                            ? 'bg-covr-blue border-covr-blue'
                            : 'border-gray-300'
                        }`}
                      >
                        {value.groups.includes(group.id) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <div className="flex-1 text-left">
                        <span className="text-gray-900">{group.name}</span>
                        {group.repCount > 0 && (
                          <span className="text-gray-400 ml-1">({group.repCount} reps)</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            {selectedCount > 0 && (
              <div className="p-2 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {selectedCount} filter{selectedCount !== 1 ? 's' : ''} active
                </span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-covr-blue hover:underline cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Filter Chips */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.reps.map((repId) => {
            const rep = reps.find((r) => r.id === repId);
            if (!rep) return null;
            return (
              <span
                key={repId}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs"
              >
                {rep.name}
                <button
                  type="button"
                  onClick={() => handleRepToggle(repId)}
                  className="hover:bg-blue-100 rounded-full p-0.5 cursor-pointer"
                  aria-label={`Remove ${rep.name} filter`}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            );
          })}
          {value.groups.map((groupId) => {
            const group = groups.find((g) => g.id === groupId);
            if (!group) return null;
            return (
              <span
                key={groupId}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full text-xs"
              >
                {group.name}
                <button
                  type="button"
                  onClick={() => handleGroupToggle(groupId)}
                  className="hover:bg-teal-100 rounded-full p-0.5 cursor-pointer"
                  aria-label={`Remove ${group.name} filter`}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
