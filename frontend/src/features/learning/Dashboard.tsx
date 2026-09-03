import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLearningStats } from './api'
import { useCollections } from '../vocabulary/api'
import { BookOpen, Brain, Clock, ChevronRight, Activity, AlertCircle, Target, Award, Layers } from 'lucide-react'

export function Dashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading, isError } = useLearningStats();
  const { data: collections } = useCollections();
  
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('all');

  const dueCount = stats?.dueCount || 0;
  const newCount = stats?.newCount || 0;
  const totalWords = stats?.totalWords || 0;
  const accuracy = stats?.accuracyPercent || 0;

  const handleStartLearning = () => {
      if (selectedCollectionId === 'all') {
          navigate('/session');
      } else {
          navigate(`/session?collectionId=${selectedCollectionId}`);
      }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto p-8 pt-16">
        
        <header className="mb-12 flex justify-between items-end">
          <div>
            <div className="flex items-center space-x-3 mb-6">
               <img src="/brain-svgrepo-com.svg" alt="Memoriser Logo" className="w-10 h-10" />
               <span className="font-extrabold text-2xl tracking-tight text-slate-800">Memoriser</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
              Good morning.
            </h1>
            <p className="text-lg text-slate-500 mt-2 font-medium">Ready to expand your vocabulary?</p>
          </div>
          <div className="hidden sm:flex items-center space-x-4">
             <div className="flex items-center space-x-2 text-sm font-semibold text-slate-400 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
                {isError ? (
                    <>
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-red-500">Backend Disconnected</span>
                    </>
                ) : (
                    <>
                        <Activity className="w-4 h-4 text-emerald-500" />
                        <span>Memory Engine Active</span>
                    </>
                )}
             </div>
             <Link to="/collections" className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors flex items-center space-x-1">
                 <Layers className="w-4 h-4"/> <span>Collections</span>
             </Link>
             <Link to="/vocabulary" className="text-sm font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors">Vocabulary</Link>
          </div>
        </header>

        {isError && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-4">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-bold">Cannot connect to backend</h3>
              <p className="text-red-600 mt-1">Make sure you have started the Micronaut backend server on port 8080.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Main Action Card */}
          <div className="lg:col-span-2 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
            <div className="relative h-full bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Brain className="w-48 h-48" />
              </div>
              
              <div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mb-6">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Today's Session</h2>
                <p className="text-slate-500 max-w-sm">
                  You have <strong className="text-slate-800">{isLoading ? '...' : dueCount} words</strong> scheduled for optimal memory retention today.
                </p>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <button 
                  onClick={handleStartLearning}
                  disabled={isError || dueCount === 0}
                  className={`inline-flex items-center justify-center space-x-2 font-medium text-lg py-4 px-8 rounded-2xl transition-all shadow-md w-full sm:w-auto ${isError || dueCount === 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 text-white hover:shadow-xl hover:shadow-slate-900/20 active:scale-95'}`}
                >
                  <span>Start Learning</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
                
                {collections && collections.length > 0 && (
                    <select 
                        value={selectedCollectionId}
                        onChange={e => setSelectedCollectionId(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-700 py-4 px-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto font-medium"
                    >
                        <option value="all">Global (All Collections)</option>
                        {collections.map(c => (
                            <option key={c.id} value={c.id}>Target: {c.name}</option>
                        ))}
                    </select>
                )}
              </div>
            </div>
          </div>

          {/* Stats Column */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between transition hover:shadow-md">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Due for Review</p>
                <p className="text-3xl font-bold text-slate-800">{isLoading ? '-' : dueCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center justify-between transition hover:shadow-md">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">New Words</p>
                <p className="text-3xl font-bold text-slate-800">{isLoading ? '-' : newCount}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center space-x-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                    <Target className="w-7 h-7" />
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-400 mb-1">Retention Accuracy</p>
                    <p className="text-2xl font-bold text-slate-800">{isLoading ? '-' : `${accuracy}%`}</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center space-x-6">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500">
                    <Award className="w-7 h-7" />
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-400 mb-1">Total Vocabulary</p>
                    <p className="text-2xl font-bold text-slate-800">{isLoading ? '-' : totalWords}</p>
                </div>
            </div>
        </div>

      </div>
    </div>
  )
}
