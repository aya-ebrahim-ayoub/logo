
import React, { useState, useCallback } from 'react';
import { 
  Palette, 
  Rocket, 
  Layout, 
  CheckCircle2, 
  Loader2, 
  ArrowRight, 
  Download, 
  FileText, 
  Layers,
  Sparkles
} from 'lucide-react';
import { BrandInfo, LogoConcept, StyleGuide, AppStep } from './types';
import { GeminiService } from './services/geminiService';

export default function App() {
  const [step, setStep] = useState<AppStep>(AppStep.IDLE);
  const [brandInfo, setBrandInfo] = useState<BrandInfo>({
    businessName: '',
    industry: '',
    coreValues: '',
    targetAudience: '',
    preferredStyle: 'Modern'
  });
  const [concepts, setConcepts] = useState<LogoConcept[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<LogoConcept | null>(null);
  const [styleGuide, setStyleGuide] = useState<StyleGuide | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('');

  const handleStartWizard = () => setStep(AppStep.WIZARD);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep(AppStep.GENERATING);
    setLoadingMsg('Analyzing brand identity...');
    
    try {
      setLoadingMsg('Crafting 3 unique logo concepts...');
      const results = await GeminiService.generateLogoConcepts(brandInfo);
      setConcepts(results);
      setStep(AppStep.GALLERY);
    } catch (error) {
      console.error(error);
      alert('Failed to generate logos. Please try again.');
      setStep(AppStep.WIZARD);
    }
  };

  const handleSelectLogo = async (concept: LogoConcept) => {
    setSelectedConcept(concept);
    setStep(AppStep.GENERATING);
    setLoadingMsg('Generating professional style guide...');
    
    try {
      const guide = await GeminiService.generateStyleGuide(brandInfo, concept);
      setStyleGuide(guide);
      setStep(AppStep.STYLE_GUIDE);
    } catch (error) {
      console.error(error);
      alert('Error creating style guide.');
      setStep(AppStep.GALLERY);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setStep(AppStep.IDLE)}>
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">Logosmith AI</span>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
            <span className={step === AppStep.WIZARD ? "text-indigo-600 font-bold" : ""}>1. Brand</span>
            <ArrowRight className="w-4 h-4" />
            <span className={step === AppStep.GALLERY ? "text-indigo-600 font-bold" : ""}>2. Concepts</span>
            <ArrowRight className="w-4 h-4" />
            <span className={step === AppStep.STYLE_GUIDE ? "text-indigo-600 font-bold" : ""}>3. Guide</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {step === AppStep.IDLE && (
          <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-semibold">
              <Sparkles className="w-4 h-4" />
              AI-Powered Logo Studio
            </div>
            <h1 className="text-5xl font-extrabold text-slate-900 leading-tight">
              Design a Professional Logo <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                For Your Small Business
              </span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-slate-600">
              Transform your brand identity into a modern, memorable visual. 
              Get 3 custom concepts and a full style guide in minutes.
            </p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={handleStartWizard}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 group"
              >
                Start Your Project
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 pt-16 border-t border-slate-200">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                <div className="bg-blue-50 p-3 rounded-xl mb-4 text-blue-600">
                  <Rocket className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900">Swift Delivery</h3>
                <p className="text-slate-500 text-sm mt-2 text-center">Get professional concepts faster than traditional design agency timelines.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                <div className="bg-purple-50 p-3 rounded-xl mb-4 text-purple-600">
                  <Layout className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900">Scalable Assets</h3>
                <p className="text-slate-500 text-sm mt-2 text-center">High-resolution outputs ready for digital, print, and branding materials.</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
                <div className="bg-emerald-50 p-3 rounded-xl mb-4 text-emerald-600">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900">Brand Style Guide</h3>
                <p className="text-slate-500 text-sm mt-2 text-center">Automated color codes and font usage to keep your brand consistent.</p>
              </div>
            </div>
          </div>
        )}

        {step === AppStep.WIZARD && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50">
              <h2 className="text-2xl font-bold text-slate-900">Brand Discovery</h2>
              <p className="text-slate-500">Tell us about your business to help the AI designer understand your vision.</p>
            </div>
            <form onSubmit={handleGenerate} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Business Name</label>
                  <input 
                    required
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="e.g. Bloom Floral Studio"
                    value={brandInfo.businessName}
                    onChange={e => setBrandInfo({...brandInfo, businessName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Industry</label>
                  <input 
                    required
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="e.g. Retail, Tech, Healthcare"
                    value={brandInfo.industry}
                    onChange={e => setBrandInfo({...brandInfo, industry: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Core Values / Keywords</label>
                <textarea 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all h-24"
                  placeholder="e.g. Trust, Innovation, Sustainability, Happiness"
                  value={brandInfo.coreValues}
                  onChange={e => setBrandInfo({...brandInfo, coreValues: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Target Audience</label>
                <input 
                  required
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="e.g. Young eco-conscious professionals"
                  value={brandInfo.targetAudience}
                  onChange={e => setBrandInfo({...brandInfo, targetAudience: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Logo Style Preference</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {['Modern', 'Minimalist', 'Classic', 'Bold'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setBrandInfo({...brandInfo, preferredStyle: s})}
                      className={`py-3 rounded-xl text-sm font-medium border transition-all ${
                        brandInfo.preferredStyle === s 
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100" 
                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 transition-all mt-4"
              >
                Generate Logo Concepts
                <Rocket className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}

        {step === AppStep.GENERATING && (
          <div className="max-w-xl mx-auto text-center py-20 space-y-6">
            <div className="relative inline-block">
              <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Designing Magic...</h2>
            <p className="text-slate-500 animate-pulse">{loadingMsg}</p>
          </div>
        )}

        {step === AppStep.GALLERY && (
          <div className="space-y-12">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-slate-900">Your Initial Logo Concepts</h2>
              <p className="text-slate-500">Pick the concept that best represents {brandInfo.businessName}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {concepts.map((concept) => (
                <div 
                  key={concept.id}
                  className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-200"
                >
                  <div className="aspect-square bg-slate-100 relative">
                    <img 
                      src={concept.imageUrl} 
                      alt={concept.conceptName} 
                      className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{concept.conceptName}</h3>
                      <p className="text-sm text-slate-500 mt-1">{concept.description}</p>
                    </div>
                    <button 
                      onClick={() => handleSelectLogo(concept)}
                      className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      Select Concept
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-center mt-12">
              <button 
                onClick={() => setStep(AppStep.WIZARD)}
                className="text-slate-500 hover:text-indigo-600 font-semibold underline decoration-2 underline-offset-4"
              >
                Not feeling these? Refine your brand details and retry.
              </button>
            </div>
          </div>
        )}

        {step === AppStep.STYLE_GUIDE && styleGuide && selectedConcept && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Logo Showcase */}
              <div className="w-full md:w-1/2 bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                <div className="aspect-square bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100">
                   <img src={selectedConcept.imageUrl} alt="Final Selection" className="w-full h-full object-contain" />
                </div>
                <div className="mt-6 space-y-4">
                  <h3 className="text-2xl font-bold text-slate-900">The Winner</h3>
                  <div className="flex flex-wrap gap-2">
                    <button className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" /> PNG
                    </button>
                    <button className="flex-1 bg-indigo-50 text-indigo-600 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                      <Layers className="w-4 h-4" /> SVG
                    </button>
                  </div>
                </div>
              </div>

              {/* Style Guide */}
              <div className="w-full md:w-1/2 space-y-6">
                <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 space-y-6">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-indigo-600" />
                    Brand Style Guide
                  </h2>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Color Palette</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <div className="h-16 rounded-xl shadow-inner border border-slate-100" style={{ backgroundColor: styleGuide.primaryColor }}></div>
                        <p className="text-xs font-mono font-bold text-center">{styleGuide.primaryColor}</p>
                        <p className="text-[10px] text-slate-400 text-center">Primary</p>
                      </div>
                      <div className="space-y-2">
                        <div className="h-16 rounded-xl shadow-inner border border-slate-100" style={{ backgroundColor: styleGuide.secondaryColor }}></div>
                        <p className="text-xs font-mono font-bold text-center">{styleGuide.secondaryColor}</p>
                        <p className="text-[10px] text-slate-400 text-center">Secondary</p>
                      </div>
                      <div className="space-y-2">
                        <div className="h-16 rounded-xl shadow-inner border border-slate-100" style={{ backgroundColor: styleGuide.accentColor }}></div>
                        <p className="text-xs font-mono font-bold text-center">{styleGuide.accentColor}</p>
                        <p className="text-[10px] text-slate-400 text-center">Accent</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Typography</h4>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-lg font-semibold" style={{ fontFamily: styleGuide.fontFamily }}>{styleGuide.fontFamily}</p>
                      <p className="text-sm text-slate-500">Modern sans-serif typeface optimized for readability across digital and print.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Usage Tips</h4>
                    <ul className="space-y-2">
                      {styleGuide.usageTips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <button 
                  onClick={() => window.print()}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                >
                  Download Full Brand Package
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="text-center pt-8">
              <button 
                onClick={() => setStep(AppStep.IDLE)}
                className="text-indigo-600 font-bold hover:underline"
              >
                Start New Project
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-600" />
              <span className="text-lg font-bold text-slate-900 tracking-tight">Logosmith AI</span>
            </div>
            <p className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} Logosmith AI. Professional branding for every entrepreneur.
            </p>
            <div className="flex gap-6 text-sm font-medium text-slate-400">
              <a href="#" className="hover:text-indigo-600">Terms</a>
              <a href="#" className="hover:text-indigo-600">Privacy</a>
              <a href="#" className="hover:text-indigo-600">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
