
import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Rocket, 
  Layout, 
  CheckCircle2, 
  ArrowRight, 
  Download, 
  FileText, 
  Layers,
  Sparkles,
  Key,
  AlertCircle
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { BrandInfo, LogoConcept, StyleGuide, AppStep } from './types.ts';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    // Fixed: Removed readonly to match other potential global declarations and satisfy TypeScript's requirement for identical modifiers across interface merges.
    aistudio: AIStudio;
  }
}

export default function App() {
  const [step, setStep] = useState<AppStep>(AppStep.IDLE);
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        try {
          const selected = await window.aistudio.hasSelectedApiKey();
          setHasKey(selected);
        } catch (e) {
          console.error("Key check failed", e);
        }
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true); // Proceed assuming success per documentation race condition guidelines
      return true;
    }
    return false;
  };

  const generateLogoConcepts = async (brand: BrandInfo): Promise<LogoConcept[]> => {
    // Create new GoogleGenAI instance right before making an API call per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const styles = [
      "minimalist vector emblem",
      "bold modern geometric icon",
      "elegant premium typography mark"
    ];

    const promises = styles.map(async (styleModifier, index) => {
      const prompt = `Create a professional logo for "${brand.businessName}", in the ${brand.industry} industry. 
      Core Values: ${brand.coreValues}. Style: ${brand.preferredStyle}, ${styleModifier}. 
      Target Audience: ${brand.targetAudience}. 
      Requirements: Clean design, solid white background, high resolution, professional brand mark.`;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: { parts: [{ text: prompt }] },
          config: {
            imageConfig: { aspectRatio: "1:1", imageSize: "1K" }
          }
        });

        let imageUrl = "";
        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          }
        }

        if (!imageUrl) throw new Error("The design engine did not return an image part.");

        return {
          id: `concept-${index}`,
          imageUrl,
          conceptName: `Concept ${index + 1}`,
          description: `Strategic design focusing on ${styleModifier}.`
        } as LogoConcept;
      } catch (err: any) {
        console.error("Individual Generation Error:", err);
        // Handle "Requested entity was not found" error by indicating key issues
        if (err.message?.includes("entity was not found")) {
          throw new Error("PRO_KEY_NEEDED");
        }
        throw err;
      }
    });

    return Promise.all(promises);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    // If no key is selected, we must open the selector
    if (!hasKey && window.aistudio) {
      const success = await handleOpenKeySelector();
      if (!success) return;
    }

    setStep(AppStep.GENERATING);
    setLoadingMsg('Connecting to Creative Engine...');
    
    try {
      const results = await generateLogoConcepts(brandInfo);
      setConcepts(results);
      setStep(AppStep.GALLERY);
    } catch (error: any) {
      console.error("Design Generation Error:", error);
      if (error.message === "PRO_KEY_NEEDED") {
        setErrorMsg("Professional model requires a paid API key and billing setup. Please select a key from a paid GCP project.");
        setStep(AppStep.WIZARD);
        await handleOpenKeySelector();
      } else {
        setErrorMsg(`Design process interrupted: ${error.message || "Network Error"}.`);
        setStep(AppStep.WIZARD);
      }
    }
  };

  const handleSelectLogo = async (concept: LogoConcept) => {
    setSelectedConcept(concept);
    setStep(AppStep.GENERATING);
    setLoadingMsg('Crafting your full brand style guide...');
    
    try {
      // Create new GoogleGenAI instance right before making an API call per guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Based on a logo for "${brandInfo.businessName}" that is ${concept.description}, provide a professional style guide (JSON format).`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              primaryColor: { type: Type.STRING },
              secondaryColor: { type: Type.STRING },
              accentColor: { type: Type.STRING },
              fontFamily: { type: Type.STRING },
              usageTips: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["primaryColor", "secondaryColor", "accentColor", "fontFamily", "usageTips"]
          }
        }
      });

      setStyleGuide(JSON.parse(response.text || '{}'));
      setStep(AppStep.STYLE_GUIDE);
    } catch (error: any) {
      console.error("Style Guide Error:", error);
      alert('Error creating style guide. You can still download your logo below.');
      setStep(AppStep.GALLERY);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setStep(AppStep.IDLE)}>
            <div className="bg-indigo-600 p-2 rounded-lg group-hover:scale-105 transition-transform">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">Logosmith AI</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleOpenKeySelector}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${hasKey ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}
            >
              <Key className="w-4 h-4" /> {hasKey ? "Key Connected" : "Connect Pro Key"}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {step === AppStep.IDLE && (
          <div className="text-center space-y-12 animate-in fade-in duration-700">
            <div className="space-y-6">
              <h1 className="text-6xl font-black text-slate-900 tracking-tight">
                Branding for <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-fuchsia-600">
                  Entrepreneurs
                </span>
              </h1>
              <p className="max-w-xl mx-auto text-xl text-slate-500 font-medium">
                Generate studio-quality logos and style guides for your business instantly.
              </p>
            </div>
            <button 
              onClick={() => setStep(AppStep.WIZARD)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-6 rounded-2xl font-black shadow-2xl transition-all text-xl"
            >
              Start Your Design
            </button>
          </div>
        )}

        {step === AppStep.WIZARD && (
          <div className="max-w-2xl mx-auto bg-white rounded-[2rem] shadow-2xl border border-slate-200 p-10 space-y-8 animate-in slide-in-from-bottom-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Brand Details</h2>
              <p className="text-slate-500 font-medium">Tell us about your business vision.</p>
            </div>

            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3 text-red-800 text-sm font-bold">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Business Name</label>
                  <input required className="w-full px-5 py-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold" value={brandInfo.businessName} onChange={e => setBrandInfo({...brandInfo, businessName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Industry</label>
                  <input required className="w-full px-5 py-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold" value={brandInfo.industry} onChange={e => setBrandInfo({...brandInfo, industry: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Core Values</label>
                <textarea required className="w-full px-5 py-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold h-24" placeholder="e.g. Innovation, Trust, Speed" value={brandInfo.coreValues} onChange={e => setBrandInfo({...brandInfo, coreValues: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-5 rounded-2xl font-black transition-all flex items-center justify-center gap-3 text-lg">
                Generate My Logo
                <Rocket className="w-6 h-6" />
              </button>
            </form>
          </div>
        )}

        {step === AppStep.GENERATING && (
          <div className="text-center py-24 space-y-8">
            <div className="inline-block relative">
              <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-indigo-600 animate-pulse" />
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Designing...</h2>
            <p className="text-slate-500 text-xl font-medium animate-pulse">{loadingMsg}</p>
          </div>
        )}

        {step === AppStep.GALLERY && (
          <div className="space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-black text-slate-900 tracking-tight">Initial Concepts</h2>
              <p className="text-slate-500 text-xl font-medium">Select a concept to refine and generate a style guide.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {concepts.map((concept) => (
                <div key={concept.id} className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden hover:shadow-2xl transition-all group flex flex-col">
                  <div className="aspect-square p-8 bg-slate-50 flex items-center justify-center relative overflow-hidden">
                    <img src={concept.imageUrl} alt={concept.conceptName} className="w-full h-full object-contain drop-shadow-xl group-hover:scale-110 transition-transform duration-700" />
                  </div>
                  <div className="p-8 space-y-4 flex-1 flex flex-col justify-between">
                    <h3 className="text-2xl font-black text-slate-900">{concept.conceptName}</h3>
                    <button onClick={() => handleSelectLogo(concept)} className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-4 rounded-xl font-black transition-all">
                      Select This Design
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === AppStep.STYLE_GUIDE && styleGuide && selectedConcept && (
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in duration-1000">
            <div className="bg-white p-10 rounded-[2rem] shadow-xl border border-slate-200 h-fit sticky top-24">
              <img src={selectedConcept.imageUrl} alt="Final Logo" className="w-full aspect-square object-contain p-4 mb-8 bg-slate-50 rounded-xl" />
              <div className="flex gap-4">
                <button onClick={() => window.print()} className="flex-1 bg-indigo-600 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"><Download className="w-5 h-5" /> Export Brand</button>
              </div>
            </div>
            <div className="space-y-8">
              <div className="bg-white p-10 rounded-[2rem] shadow-xl border border-slate-200 space-y-8">
                <h2 className="text-3xl font-black text-slate-900">Brand Guide</h2>
                <div className="space-y-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Colors</p>
                  <div className="grid grid-cols-3 gap-4">
                    {[styleGuide.primaryColor, styleGuide.secondaryColor, styleGuide.accentColor].map((c, i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-16 rounded-xl border border-slate-100" style={{backgroundColor: c}}></div>
                        <p className="text-[10px] font-mono font-black text-center">{c}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Typography</p>
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-4xl font-black" style={{fontFamily: styleGuide.fontFamily}}>{styleGuide.fontFamily}</p>
                    <p className="text-xs text-slate-400 mt-2 italic">Suggested for headings and digital interfaces.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Guidelines</p>
                  <ul className="space-y-2">
                    {styleGuide.usageTips.map((tip, i) => (
                      <li key={i} className="flex gap-3 text-sm font-bold text-slate-600">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <button onClick={() => setStep(AppStep.IDLE)} className="text-indigo-600 font-black text-sm uppercase tracking-widest hover:underline">New Project</button>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-12 text-center">
        <p className="text-slate-400 font-bold text-sm">Powered by Gemini Cloud Creative &copy; {new Date().getFullYear()} Logosmith Studio.</p>
      </footer>
    </div>
  );
}
