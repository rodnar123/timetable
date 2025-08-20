// components/ConflictResolutionPanel.tsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Zap, 
  RefreshCw, 
  Settings,
  Clock,
  Users,
  Building,
  ArrowRight,
  Lightbulb,
  Target,
  Shield
} from 'lucide-react';
import { EnhancedConflict, ResolutionSuggestion } from '@/types/conflicts';

interface ConflictResolutionPanelProps {
  conflicts: EnhancedConflict[];
  onResolve: (conflictId: string, suggestion: ResolutionSuggestion) => Promise<void>;
  onAutoResolve: () => Promise<void>;
  onDismiss: (conflictId: string) => void;
  isResolving: boolean;
}

export default function ConflictResolutionPanel({
  conflicts,
  onResolve,
  onAutoResolve,
  onDismiss,
  isResolving
}: ConflictResolutionPanelProps) {
  const [selectedConflict, setSelectedConflict] = useState<string | null>(null);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [autoResolveOptions, setAutoResolveOptions] = useState({
    maxRelaxation: 3,
    preservePreferences: true,
    allowPartialResolution: true
  });
  const [showOptions, setShowOptions] = useState(false);

  const severityColors = {
    high: 'red',
    medium: 'orange',
    low: 'blue'
  };

  const conflictIcons = {
    room: Building,
    faculty: Users,
    course: Clock,
    student: Users,
    student_group: Users,
    time: Clock,
    room_type: Building,
    capacity: Users,
    schedule: Clock
  };

  const actionIcons = {
    move: ArrowRight,
    swap: RefreshCw,
    relax: Shield,
    split: Target,
    merge: Target,
    cancel: XCircle
  };

  const handleApplySuggestion = async (conflict: EnhancedConflict, suggestion: ResolutionSuggestion) => {
    await onResolve(conflict.id, suggestion);
    setSelectedConflict(null);
  };

  const highSeverityCount = conflicts.filter(c => c.severity === 'high').length;
  const autoResolvableCount = conflicts.filter(c => c.autoResolvable).length;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">Conflict Resolution Center</h2>
            <p className="opacity-90">
              {conflicts.length} conflicts detected • {autoResolvableCount} can be auto-resolved
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="px-4 py-2 bg-white/20 backdrop-blur rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Options
            </button>
            <button
              onClick={onAutoResolve}
              disabled={isResolving || autoResolvableCount === 0}
              className={`px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                isResolving || autoResolvableCount === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-white text-orange-600 hover:bg-orange-50'
              }`}
            >
              <Zap className="w-4 h-4" />
              {isResolving ? 'Resolving...' : 'Auto-Resolve'}
            </button>
          </div>
        </div>
      </div>

      {/* Auto-resolve options */}
      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b bg-gray-50 overflow-hidden"
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Maximum constraints to relax
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={autoResolveOptions.maxRelaxation}
                  onChange={(e) => setAutoResolveOptions({
                    ...autoResolveOptions,
                    maxRelaxation: parseInt(e.target.value)
                  })}
                  className="w-20 px-3 py-1 border rounded-lg text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Preserve faculty preferences
                </label>
                <input
                  type="checkbox"
                  checked={autoResolveOptions.preservePreferences}
                  onChange={(e) => setAutoResolveOptions({
                    ...autoResolveOptions,
                    preservePreferences: e.target.checked
                  })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Allow partial resolution
                </label>
                <input
                  type="checkbox"
                  checked={autoResolveOptions.allowPartialResolution}
                  onChange={(e) => setAutoResolveOptions({
                    ...autoResolveOptions,
                    allowPartialResolution: e.target.checked
                  })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conflict Summary */}
      <div className="p-6 border-b bg-gray-50">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{highSeverityCount}</div>
            <div className="text-sm text-gray-600">Critical</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {conflicts.filter(c => c.severity === 'medium').length}
            </div>
            <div className="text-sm text-gray-600">Important</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {conflicts.filter(c => c.severity === 'low').length}
            </div>
            <div className="text-sm text-gray-600">Minor</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{autoResolvableCount}</div>
            <div className="text-sm text-gray-600">Auto-fixable</div>
          </div>
        </div>
      </div>

      {/* Conflicts List */}
      <div className="max-h-[600px] overflow-y-auto">
        {conflicts.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              No Conflicts Found!
            </h3>
            <p className="text-gray-600">Your timetable is perfectly optimized.</p>
          </div>
        ) : (
          <div className="divide-y">
            {conflicts.map((conflict) => {
              const Icon = conflictIcons[conflict.type] || AlertTriangle;
              const isSelected = selectedConflict === conflict.id;
              
              return (
                <motion.div
                  key={conflict.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedConflict(isSelected ? null : conflict.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-${severityColors[conflict.severity]}-100`}>
                      <Icon className={`w-5 h-5 text-${severityColors[conflict.severity]}-600`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold text-gray-800">
                          {conflict.description}
                        </h4>
                        {conflict.autoResolvable && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            Auto-resolvable
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{conflict.details}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Score: {conflict.conflictScore}</span>
                        <span>•</span>
                        <span>{conflict.affectedSlots.length} slots affected</span>
                        <span>•</span>
                        <span>{conflict.constraints?.length || 0} constraints violated</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {conflict.resolved ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDismiss(conflict.id);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Resolution Suggestions */}
                  <AnimatePresence>
                    {isSelected && conflict.resolutionSuggestions && conflict.resolutionSuggestions.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 pl-14"
                      >
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-blue-600" />
                            Resolution Suggestions
                          </h5>
                          
                          <div className="space-y-2">
                            {conflict.resolutionSuggestions.map((suggestion) => {
                              const ActionIcon = actionIcons[suggestion.actions[0]?.type] || Zap;
                              const isExpanded = expandedSuggestion === suggestion.id;
                              
                              return (
                                <div
                                  key={suggestion.id}
                                  className="bg-white rounded-lg p-3 hover:shadow-sm transition-shadow"
                                >
                                  <div
                                    className="flex items-center justify-between cursor-pointer"
                                    onClick={() => setExpandedSuggestion(
                                      isExpanded ? null : suggestion.id
                                    )}
                                  >
                                    <div className="flex items-center gap-3">
                                      <ActionIcon className="w-4 h-4 text-blue-600" />
                                      <span className="text-sm font-medium">
                                        {suggestion.description}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                      <div className="text-xs text-gray-500">
                                        {Math.round(suggestion.successProbability * 100)}% success
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleApplySuggestion(conflict, suggestion);
                                        }}
                                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                      >
                                        Apply
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {isExpanded && (
                                    <div className="mt-2 pt-2 border-t text-xs text-gray-600">
                                      <div>Impact Score: {suggestion.impactScore}</div>
                                      <div className="mt-1">
                                        Actions: {suggestion.actions.map(a => a.type).join(', ')}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}