import { useActivityAnalytics, useConfidenceAnalytics, useCollectionsAnalytics } from './api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';

const COLORS = ['#10B981', '#F59E0B', '#EF4444'];
const PIE_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1'];

export function AnalyticsDashboard() {
  const { data: activityData, isLoading: activityLoading } = useActivityAnalytics();
  const { data: confidenceData, isLoading: confidenceLoading } = useConfidenceAnalytics();
  const { data: collectionsData, isLoading: collectionsLoading } = useCollectionsAnalytics();

  if (activityLoading || confidenceLoading || collectionsLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // Formatting Activity Data for Chart
  const formattedActivity = (activityData?.activity || []).map(item => ({
    name: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Reviews: item.reviews,
    'New Words Added': item.newWords
  }));

  // Formatting Confidence Data for Chart
  const formattedConfidence = [
    { name: 'High Confidence', value: confidenceData?.high || 0 },
    { name: 'Learning', value: confidenceData?.medium || 0 },
    { name: 'Low Confidence', value: confidenceData?.low || 0 },
  ];

  const totalWords = formattedConfidence.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-8 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Learning Analytics</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Activity Chart (Takes 2 cols on large screens) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">30-Day Activity</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="Reviews" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="New Words Added" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confidence Donut */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
          <h3 className="text-lg font-bold text-slate-800 mb-2 w-full">Memory Retention</h3>
          <div className="flex-1 w-full flex items-center justify-center relative min-h-[200px]">
            {totalWords === 0 ? (
                <p className="text-slate-400 text-sm">Not enough data</p>
            ) : (
                <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={formattedConfidence}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {formattedConfidence.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                        <span className="text-3xl font-extrabold text-slate-800">{totalWords}</span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Words</span>
                    </div>
                </>
            )}
          </div>
          
          <div className="w-full space-y-2 mt-4">
            {formattedConfidence.map((item, i) => (
               <div key={item.name} className="flex justify-between items-center text-sm">
                   <div className="flex items-center space-x-2">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                       <span className="text-slate-600 font-medium">{item.name}</span>
                   </div>
                   <span className="font-bold text-slate-800">{item.value}</span>
               </div>
            ))}
          </div>
        </div>

      </div>

      {/* Collections Breakdown */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Collections Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {collectionsData?.map((col, index) => (
                  <div key={col.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col">
                      <div className="flex items-center space-x-2 mb-3">
                         <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                         <h4 className="font-bold text-slate-800 truncate">{col.name}</h4>
                      </div>
                      <div className="flex justify-between items-end mt-auto">
                          <div>
                              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Words</p>
                              <p className="font-extrabold text-xl text-slate-800">{col.wordCount}</p>
                          </div>
                          <div className="text-right">
                              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Accuracy</p>
                              <p className="font-extrabold text-xl text-slate-800">{col.accuracyPercent}%</p>
                          </div>
                      </div>
                  </div>
              ))}
              {(!collectionsData || collectionsData.length === 0) && (
                  <p className="text-slate-500 col-span-full">No collections available yet.</p>
              )}
          </div>
      </div>
    </div>
  );
}
