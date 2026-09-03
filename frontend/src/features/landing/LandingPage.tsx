import { Sparkles, BookOpen, Repeat, Layers, ChevronRight } from 'lucide-react';

export function LandingPage() {
    
  const handleLogin = () => {
      // Mock login for now
      localStorage.setItem('isAuthenticated', 'true');
      window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center max-w-7xl mx-auto z-50">
        <div className="flex items-center space-x-3">
          <img src="/brain-svgrepo-com.svg" alt="Memoriser Logo" className="w-10 h-10" />
          <span className="font-extrabold text-2xl tracking-tight text-slate-800">Memoriser</span>
        </div>
        <button 
          onClick={handleLogin}
          className="bg-white border border-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex items-center space-x-2"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
          <span>Sign in with Google</span>
        </button>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] opacity-30 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 blur-[100px] rounded-full mix-blend-multiply animate-pulse" style={{ animationDuration: '4s' }}></div>
            <div className="absolute top-20 left-20 w-[600px] h-[600px] bg-gradient-to-tr from-purple-400 to-pink-400 blur-[120px] rounded-full mix-blend-multiply animate-pulse" style={{ animationDuration: '7s' }}></div>
        </div>

        <div className="relative max-w-5xl mx-auto text-center z-10">
          <div className="inline-flex items-center space-x-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full font-bold text-sm mb-8 border border-indigo-100">
             <Sparkles className="w-4 h-4" />
             <span>The ultimate language acquisition engine</span>
          </div>
          
          <h1 className="text-6xl lg:text-8xl font-extrabold tracking-tight mb-8 text-slate-900 leading-tight">
            Never forget a <br className="hidden lg:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">word again.</span>
          </h1>
          
          <p className="text-xl lg:text-2xl text-slate-600 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
            A beautiful, intelligent vocabulary manager powered by Spaced Repetition algorithms to seamlessly transfer words from short-term to permanent memory.
          </p>
          
          <button 
             onClick={handleLogin}
             className="bg-slate-900 text-white text-lg font-bold py-5 px-10 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 hover:bg-slate-800 transition-all flex items-center space-x-3 mx-auto"
          >
             <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6 bg-white rounded-full p-1" alt="Google" />
             <span>Get Started for Free</span>
             <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 py-24 relative z-10">
          <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold text-slate-900">Engineered for absolute retention.</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all group">
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Repeat className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">Spaced Repetition</h3>
                  <p className="text-slate-600 leading-relaxed">
                      Our smart Memory Engine calculates the mathematically optimal time for you to review a word just before you forget it.
                  </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all group">
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <BookOpen className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">Auto-Dictionary</h3>
                  <p className="text-slate-600 leading-relaxed">
                      Stop typing definitions manually. Just enter a word and our integrated dictionary automatically fetches definitions, examples, and audio pronunciations.
                  </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all group">
                  <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Layers className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">Targeted Collections</h3>
                  <p className="text-slate-600 leading-relaxed">
                      Organize your vocabulary into distinct collections. Prepare for the TOEFL, learn conversational French, or simply expand your daily vocabulary.
                  </p>
              </div>
          </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 text-center text-slate-500 font-medium">
          <div className="flex justify-center items-center space-x-2 mb-4 opacity-50">
             <img src="/brain-svgrepo-com.svg" alt="Logo" className="w-6 h-6 grayscale" />
             <span className="font-bold tracking-wider uppercase text-sm">Memoriser</span>
          </div>
          <p>© 2026 Memoriser. Learn faster, remember forever.</p>
      </footer>
    </div>
  );
}
