import { useState, useMemo } from 'react';
import { useMyVocabulary, useAddVocabulary, useUpdateVocabulary, useDeleteVocabulary } from './api';
import { fetchApi } from '../../api/client';
import { Plus, Search, Filter, Edit2, Trash2, X, Wand2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function VocabularyManager() {
  const { data: words, isLoading } = useMyVocabulary();
  const addWord = useAddVocabulary();
  const updateWord = useUpdateVocabulary();
  const deleteWord = useDeleteVocabulary();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formWord, setFormWord] = useState('');
  const [formDef, setFormDef] = useState('');
  const [formExample, setFormExample] = useState('');
  const [formPronunciation, setFormPronunciation] = useState('');
  
  const [isFetchingDictionary, setIsFetchingDictionary] = useState(false);
  const [dictionaryError, setDictionaryError] = useState('');

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormWord('');
    setFormDef('');
    setFormExample('');
    setFormPronunciation('');
    setDictionaryError('');
    setShowAddForm(true);
  };

  const handleOpenEdit = (word: any) => {
    setEditingId(word.id);
    setFormWord(word.word);
    setFormDef(word.definitions?.[0] || '');
    setFormExample(word.examples?.[0] || '');
    setFormPronunciation(word.pronunciation || '');
    setDictionaryError('');
    setShowAddForm(true);
  };
  
  const handleFetchDictionary = async () => {
    if (!formWord.trim()) return;
    setIsFetchingDictionary(true);
    setDictionaryError('');
    try {
      const data = await fetchApi<any>(`/dictionary/${formWord.trim()}`);
      
      if (data.error) {
         throw new Error(data.error);
      }
      
      if (data.definition) setFormDef(data.definition);
      if (data.example) setFormExample(data.example);
      if (data.pronunciation) setFormPronunciation(data.pronunciation);
      
    } catch (err: any) {
      setDictionaryError(err.message || 'Failed to fetch');
    } finally {
      setIsFetchingDictionary(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWord.trim()) return;
    
    const payload = { 
      word: formWord, 
      definitions: formDef.trim() ? [formDef] : [],
      examples: formExample.trim() ? [formExample] : [],
      pronunciation: formPronunciation 
    };

    if (editingId) {
      updateWord.mutate({ id: editingId, item: payload });
    } else {
      addWord.mutate(payload);
    }
    
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this word?")) {
      deleteWord.mutate(id);
    }
  };

  const filteredAndSortedWords = useMemo(() => {
    if (!words) return [];
    
    let result = words.filter(w => 
      w.word.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (w.definitions && w.definitions[0]?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    if (sortBy === 'name') {
      result.sort((a, b) => a.word.localeCompare(b.word));
    } else {
      result.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
    }
    
    return result;
  }, [words, searchTerm, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">My Vocabulary</h1>
            <Link to="/" className="text-blue-600 hover:underline text-sm font-medium">← Back to Dashboard</Link>
          </div>
          <button 
            onClick={handleOpenAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Word</span>
          </button>
        </header>

        {showAddForm && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 animate-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Word' : 'Add New Word'}</h2>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Word</label>
                <div className="flex space-x-2">
                  <input 
                    type="text" 
                    value={formWord}
                    onChange={e => setFormWord(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Ubiquitous"
                    required
                  />
                  <button 
                    type="button"
                    onClick={handleFetchDictionary}
                    disabled={isFetchingDictionary || !formWord.trim()}
                    className="flex items-center space-x-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-100 disabled:opacity-50 transition-colors border border-indigo-100"
                  >
                    {isFetchingDictionary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    <span>Auto-fill</span>
                  </button>
                </div>
                {dictionaryError && <p className="text-red-500 text-xs mt-1">{dictionaryError}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Definition (Leave blank to auto-fetch on save)</label>
                <input 
                  type="text" 
                  value={formDef}
                  onChange={e => setFormDef(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Present everywhere"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Example</label>
                  <input 
                    type="text" 
                    value={formExample}
                    onChange={e => setFormExample(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. His ubiquitous influence..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pronunciation</label>
                  <input 
                    type="text" 
                    value={formPronunciation}
                    onChange={e => setFormPronunciation(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. /juːˈbɪkwɪtəs/"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={addWord.isPending || updateWord.isPending} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm">
                  {editingId ? 'Update Word' : 'Save Word'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
            <div className="relative w-full sm:w-64">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search words..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600 font-medium mr-2">Sort by:</span>
              <select 
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Date Added (Newest)</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500">Loading your vocabulary...</div>
            ) : filteredAndSortedWords.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-slate-500 mb-4">No words found.</p>
                <button onClick={handleOpenAdd} className="text-blue-600 font-medium hover:underline">Add your first word</button>
              </div>
            ) : (
              filteredAndSortedWords.map(word => (
                <div key={word.id} className="p-6 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {word.word}
                      {word.pronunciation && <span className="text-sm font-normal text-slate-500 ml-2">{word.pronunciation}</span>}
                    </h3>
                    <p className="text-slate-600 mt-1">{word.definitions?.[0]}</p>
                    {word.examples && word.examples[0] && (
                      <p className="text-slate-500 text-sm mt-2 italic">"{word.examples[0]}"</p>
                    )}
                  </div>
                  <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenEdit(word)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(word.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
