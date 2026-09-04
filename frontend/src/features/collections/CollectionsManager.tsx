import { useState } from 'react';
import { useCollections, useMyVocabulary, useCreateCollection, useDeleteCollection, useUpdateCollectionWords, useUpdateCollection } from '../vocabulary/api';
import { Plus, Edit2, Trash2, X, Check, Layers, BookOpen } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function CollectionsManager() {
  const { data: collections, isLoading } = useCollections();
  const { data: allWords } = useMyVocabulary();
  
  const createCollection = useCreateCollection();
  const deleteCollection = useDeleteCollection();
  const updateCollection = useUpdateCollection();
  const updateWords = useUpdateCollectionWords();
  
  const navigate = useNavigate();

  const [isCreating, setIsCreating] = useState(false);
  const [editingCollection, setEditingCollection] = useState<any>(null);
  const [collectionToDelete, setCollectionToDelete] = useState<any>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());

  
  
  const confirmDelete = () => {
    if (collectionToDelete) {
      deleteCollection.mutate(collectionToDelete.id);
      setCollectionToDelete(null);
    }
  };


  const openEditCollection = (col: any) => {
      setEditingCollection(col);
      setNewName(col.name);
      setNewDesc(col.description || '');
      setIsCreating(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    if (editingCollection) {
        updateCollection.mutate({ id: editingCollection.id, name: newName, description: newDesc });
    } else {
        createCollection.mutate({ name: newName, description: newDesc });
    }
    
    setNewName('');
    setNewDesc('');
    setIsCreating(false);
    setEditingCollection(null);
  };


  const openWordEditor = (collection: any) => {
    setEditingId(collection.id);
    setSelectedWords(new Set(collection.wordIds || []));
  };

  const toggleWord = (wordId: string) => {
    const next = new Set(selectedWords);
    if (next.has(wordId)) next.delete(wordId);
    else next.add(wordId);
    setSelectedWords(next);
  };

  const saveWordAssignments = () => {
    if (editingId) {
      updateWords.mutate({ id: editingId, wordIds: Array.from(selectedWords) });
      setEditingId(null);
    }
  };
  
  const handleAddWordToCollection = (collectionId: string) => {
      navigate(`/vocabulary?addWord=true&collectionId=${collectionId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-2">
               <img src="/brain-svgrepo-com.svg" alt="Memoriser Logo" className="w-6 h-6" />
               <span className="font-extrabold text-sm tracking-tight text-slate-800">Memoriser</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">My Collections</h1>
            <Link to="/" className="text-blue-600 hover:underline text-sm font-medium">← Back to Dashboard</Link>
          </div>
          <button 
            onClick={() => { setIsCreating(true); setEditingCollection(null); setNewName(''); setNewDesc(''); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>New Collection</span>
          </button>
        </header>

        {isCreating && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 animate-in slide-in-from-top-4">
            <h2 className="text-lg font-bold mb-4">{editingCollection ? "Edit Collection" : "Create Collection"}</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. TOEFL Essential, Daily Conversational..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                <input 
                  type="text" 
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => { setIsCreating(false); setEditingCollection(null); setNewName(''); setNewDesc(''); }} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium">{editingCollection ? "Save Changes" : "Save Collection"}</button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-slate-500">Loading collections...</div>
        ) : collections?.length === 0 ? (
           <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 border-dashed">
               <Layers className="w-12 h-12 text-slate-300 mx-auto mb-4" />
               <h3 className="text-lg font-bold text-slate-700">No Collections Yet</h3>
               <p className="text-slate-500 mb-6">Group your words into manageable lists for targeted learning.</p>
               <button onClick={() => setIsCreating(true)} className="text-blue-600 font-medium hover:underline">Create your first collection</button>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {collections?.map(col => (
              <div key={col.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center space-x-2">
                            <span>{col.name}</span>
                            <button onClick={() => openEditCollection(col)} className="text-slate-300 hover:text-blue-500 transition"><Edit2 className="w-4 h-4"/></button>
                        </h3>
                        {col.description && <p className="text-slate-500 text-sm mt-1">{col.description}</p>}
                    </div>
                    <button onClick={() => setCollectionToDelete(col)} className="text-slate-400 hover:text-red-500 transition"><Trash2 className="w-5 h-5"/></button>
                </div>
                
                <div className="flex items-center space-x-2 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg w-max mb-6">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-sm font-bold">{col.wordIds?.length || 0} Words</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => handleAddWordToCollection(col.id)}
                      className="flex-1 bg-slate-900 text-white font-medium py-2 rounded-xl hover:bg-slate-800 transition flex items-center justify-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Word</span>
                    </button>
                    <button 
                      onClick={() => openWordEditor(col)}
                      className="flex-1 border border-slate-300 text-slate-700 font-medium py-2 rounded-xl hover:bg-slate-50 transition flex items-center justify-center space-x-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Bulk Move</span>
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Word Editor Modal (Bulk Assign) */}
        {editingId && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold">Bulk Assign Words to Collection</h2>
                <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {allWords?.map(word => {
                          const isSelected = selectedWords.has(word.id);
                          return (
                              <div 
                                key={word.id} 
                                onClick={() => toggleWord(word.id)}
                                className={`p-4 rounded-xl cursor-pointer border-2 transition-all flex justify-between items-center ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-white shadow-sm hover:border-slate-300'}`}
                              >
                                  <span className="font-bold text-slate-800">{word.word}</span>
                                  {isSelected && <Check className="w-5 h-5 text-blue-500" />}
                              </div>
                          )
                      })}
                  </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center">
                  <span className="text-sm text-slate-500 font-medium">{selectedWords.size} words selected</span>
                  <button onClick={saveWordAssignments} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700">Save Changes</button>
              </div>
            </div>
          </div>
        )}
        {/* Delete Confirmation Modal */}
        {collectionToDelete && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Delete "{collectionToDelete.name}"?</h2>
                <p className="text-slate-500 mb-6 text-sm leading-relaxed">
                  Are you sure you want to delete this collection? The words inside it will not be deleted from your vocabulary.
                </p>
                <div className="flex flex-col space-y-2">
                  <button 
                    onClick={confirmDelete} 
                    className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition"
                  >
                    Yes, Delete
                  </button>
                  <button 
                    onClick={() => setCollectionToDelete(null)} 
                    className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
