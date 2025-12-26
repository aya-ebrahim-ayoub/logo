
import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Rocket, 
  CheckCircle2, 
  Download, 
  FileText, 
  Layers,
  Sparkles,
  Key,
  AlertCircle,
  RefreshCcw,
  ExternalLink
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { BrandInfo, LogoConcept, StyleGuide, AppStep } from './types.ts';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
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
      try {
        await window.aistudio.openSelectKey();
        setHasKey(true);
        return true;
      } catch (e) {
        console.error("Key selection failed", e);
        return false;
      }
    }
    return false;
  };

  const generateLogoConcepts = async (brand: BrandInfo): Promise<LogoConcept[]> => {
    const styles = [
      "minimalist vector emblem, high-end professional brand mark, clean lines, solid background",
      "bold modern geometric icon, corporate flat design, high contrast, minimalist",
      "elegant premium typographic mark, unique letterform logo, solid professional color"
    ];

    const results: LogoConcept[] = [];
    
    for (let i = 0; i < styles.length; i++) {
      setLoadingMsg(`Architecting concept ${i + 1} of 3...`);
      const styleModifier = styles[i];
      
      const prompt = `Create a professional corporate logo for:
Business Name: ${brand.businessName}
Industry: ${brand.industry}
Style: ${brand.preferredStyle}, ${styleModifier}
Values: ${brand.coreValues}
Technical requirements: Flat vector style, high resolution icon, solid white background. No complex gradients, no 3D renders, no realistic photos. Pure graphic design icon.`;

      // Always initialize new instance to pick up latest selected key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image', // More stable model for general tasks
          contents: { parts: [{ text: prompt }] },
          config: {
            imageConfig: { aspectRatio: "1:1" }
          }
        });

        let imageUrl = "";
        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          }
        }

        if (!imageUrl) {
          throw new Error("Design engine didn't return visual data. Check your prompt or try again.");
        }

        results.push({
          id: `concept-${i}`,
          imageUrl,
          conceptName: `Direction ${i + 1}`,
          description: `Strategic identity design focusing on ${styleModifier.split(',')[0]}.`
        });
      } catch (err: any) {
        console.error(`Concept ${i + 1} error:`, err);
        
        if (err.message?.includes("404") || err.message?.includes("not found")) {
          throw new Error("MODEL_NOT_FOUND");
        }
        if (err.message?.includes("429")) {
          throw new Error("Rate limit reached. Please wait a moment and try again.");
        }
        if (err.message?.includes("API key")) {
          throw new Error("INVALID_KEY");
        }
        throw err;
      }
    }

    return results;
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    // Initial key check
    if (window.aistudio) {
      const selected = await window.aistudio.hasSelectedApiKey();
      if (!selected) {
        const success = await handleOpenKeySelector();
        if (!success) return;
      }
    }

    setStep(AppStep.GENERATING);
    setLoadingMsg('Connecting to Design Engine...');
    
    try {
      const results = await generateLogoConcepts(brandInfo);
      setConcepts(results);
      setStep(AppStep.GALLERY);
    } catch (error: any) {
      console.error("Full Flow Error:", error);
      
      if (error.message === "MODEL_NOT_FOUND" || error.message === "INVALID_KEY") {
        setErrorMsg("API Key Issue: Please ensure you have selected an API key from a project with billing enabled. Image generation requires a paid tier project.");
        setStep(AppStep.WIZARD);
        if (window.aistudio) await window.aistudio.openSelectKey();
      } else {
        setErrorMsg(error.message || "An unexpected error occurred. Please refresh the page and try again.");
        setStep(AppStep.WIZARD);
      }
    }
  };

  const handleSelectLogo = async (concept: LogoConcept) => {
    setSelectedConcept(concept);
    setStep(AppStep.GENERATING);
    setLoadingMsg('Crafting your digital brand manual...');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Based on this brand "${brandInfo.businessName}" and this logo design (${concept.description}), create a complete brand style guide in JSON.`;

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
      alert('Logo generated! However, we had trouble drafting the full guide.');
      setStep(AppStep.GALLERY);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setStep(AppStep.IDLE)}>
            <div className="bg-indigo-600 p-2 rounded-xl group-hover:rotate-12 transition-transform shadow-lg shadow-indigo-100">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Logosmith</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleOpenKeySelector}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black transition-all border-2 ${hasKey ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100 animate-pulse"}`}
            >
              <Key className="w-4 h-4" />
              {hasKey ? "Connected" : "Select Paid Key"}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {step === AppStep.IDLE && (
          <div className="text-center py-20 space-y-12 animate-in fade-in duration-1000">
            <div className="space-y-6">
              <h1 className="text-7xl font-black text-slate-900 tracking-tighter leading-none">
                Design Your Vision <br />
                <span className="text-indigo-600 italic">With AI Mastery</span>
              </h1>
              <p className="max-w-2xl mx-auto text-xl text-slate-500 font-medium leading-relaxed">
                Logosmith generates custom, production-ready logos and comprehensive style guides for entrepreneurs who demand excellence.
              </p>
            </div>
            <button 
              onClick={() => setStep(AppStep.WIZARD)}
              className="bg-slate-900 hover:bg-indigo-600 text-white px-14 py-6 rounded-2xl font-black shadow-2xl hover:scale-105 transition-all text-xl"
            >
              Start Design Process
            </button>
          </div>
        )}

        {step === AppStep.WIZARD && (
          <div className="max-w-xl mx-auto bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-10 space-y-8 animate-in slide-in-from-bottom-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Brand Discovery</h2>
              <p className="text-slate-500 font-medium">Input your brand essence to guide the AI Studio.</p>
            </div>

            {errorMsg && (
              <div className="p-5 bg-red-50 border-2 border-red-100 rounded-2xl flex gap-4 text-red-900 text-sm font-bold">
                <AlertCircle className="w-6 h-6 shrink-0 text-red-500" />
                <div className="space-y-1">
                  <p className="font-black uppercase tracking-widest text-[10px] text-red-400">Error Details</p>
                  <p className="leading-relaxed">{errorMsg}</p>
                  {errorMsg.includes("API Key Issue") && (
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="flex items-center gap-1 text-red-600 underline mt-2">
                      Check Billing Docs <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Business Identity</label>
                <div className="grid grid-cols-1 gap-4">
                  <input required className="w-full px-6 py-4 rounded-xl border-2 border-slate-50 focus:border-indigo-500 outline-none font-bold text-lg bg-slate-50/50" placeholder="Business Name" value={brandInfo.businessName} onChange={e => setBrandInfo({...brandInfo, businessName: e.target.value})} />
                  <input required className="w-full px-6 py-4 rounded-xl border-2 border-slate-50 focus:border-indigo-500 outline-none font-bold bg-slate-50/50" placeholder="Industry (e.g. Fintech, Organic Food)" value={brandInfo.industry} onChange={e => setBrandInfo({...brandInfo, industry: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Core Values</label>
                <textarea required className="w-full px-6 py-4 rounded-xl border-2 border-slate-50 focus:border-indigo-500 outline-none font-bold h-24 bg-slate-50/50" placeholder="Trust, Speed, Innovation..." value={brandInfo.coreValues} onChange={e => setBrandInfo({...brandInfo, coreValues: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-slate-900 text-white py-5 rounded-2xl font-black transition-all flex items-center justify-center gap-3 text-lg shadow-xl shadow-indigo-100 group">
                {hasKey ? "Generate Designs" : "Select Key & Generate"}
                <Rocket className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </form>
          </div>
        )}

        {step === AppStep.GENERATING && (
          <div className="text-center py-20 space-y-10">
            <div className="relative inline-block">
              <div className="w-28 h-28 border-[6px] border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Studio Processing</h2>
              <p className="text-slate-500 text-xl font-medium animate-pulse">{loadingMsg}</p>
            </div>
          </div>
        )}

        {step === AppStep.GALLERY && (
          <div className="space-y-16 animate-in fade-in duration-1000">
            <div className="text-center space-y-4">
              <h2 className="text-6xl font-black text-slate-900 tracking-tighter italic">Curated Selection</h2>
              <p className="text-slate-500 text-xl font-medium">Three distinct visual directions for {brandInfo.businessName}.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {concepts.map((concept) => (
                <div key={concept.id} className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden hover:shadow-2xl transition-all group hover:-translate-y-2 flex flex-col">
                  <div className="aspect-square p-12 bg-slate-50/50 flex items-center justify-center relative">
                    <img src={concept.imageUrl} alt={concept.conceptName} className="w-full h-full object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-700" />
                  </div>
                  <div className="p-10 space-y-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight">{concept.conceptName}</h3>
                      <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">{concept.description}</p>
                    </div>
                    <button onClick={() => handleSelectLogo(concept)} className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-4 rounded-xl font-black transition-all">
                      Finalize Brand
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center">
              <button onClick={() => setStep(AppStep.WIZARD)} className="text-slate-400 font-black hover:text-indigo-600 transition-colors flex items-center gap-2 mx-auto">
                <RefreshCcw className="w-4 h-4" /> Try Different Inputs
              </button>
            </div>
          </div>
        )}

        {step === AppStep.STYLE_GUIDE && styleGuide && selectedConcept && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in duration-1000">
            <div className="lg:col-span-5">
              <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-50 sticky top-28">
                <div className="aspect-square bg-slate-50 rounded-[2rem] p-10 shadow-inner flex items-center justify-center border-2 border-white">
                  <img src={selectedConcept.imageUrl} alt="Master Mark" className="max-w-full max-h-full object-contain drop-shadow-2xl" />
                </div>
                <div className="mt-10 space-y-4">
                  <button onClick={() => window.print()} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-indigo-100">
                    <Download className="w-5 h-5" /> Export Brand Kit
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-10">
              <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-50 space-y-12">
                <div className="flex justify-between items-center border-b border-slate-50 pb-8">
                  <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Manual 1.0</h2>
                  <FileText className="w-8 h-8 text-slate-200" />
                </div>

                <div className="space-y-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Signature Colors</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[styleGuide.primaryColor, styleGuide.secondaryColor, styleGuide.accentColor].map((hex, i) => (
                      <div key={i} className="space-y-3">
                        <div className="h-28 rounded-2xl shadow-inner border-4 border-white" style={{backgroundColor: hex}}></div>
                        <p className="text-xs font-black font-mono text-center uppercase tracking-widest">{hex}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Typography</p>
                  <div className="p-8 bg-slate-50/50 rounded-3xl border-2 border-slate-50">
                    <p className="text-4xl font-black text-slate-900" style={{fontFamily: styleGuide.fontFamily}}>{styleGuide.fontFamily}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-2 tracking-widest uppercase italic">Master Branding Font</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Usage Tips</p>
                  <div className="grid grid-cols-1 gap-3">
                    {styleGuide.usageTips.map((tip, i) => (
                      <div key={i} className="flex gap-4 p-5 bg-white border border-slate-100 rounded-2xl">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <p className="text-sm font-bold text-slate-700">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center px-6">
                <button onClick={() => setStep(AppStep.IDLE)} className="text-indigo-600 font-black text-xs uppercase tracking-widest hover:underline">New Project</button>
                <p className="text-slate-300 font-black text-[10px] uppercase tracking-widest">© Logosmith Studio AI</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-16 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <p className="text-slate-400 font-bold text-sm tracking-tight italic">
            Developed with Gemini Creative Cloud API. Your professional design companion.
          </p>
          <div className="flex justify-center gap-10 text-[10px] font-black text-slate-300 uppercase tracking-widest">
            <a href="#" className="hover:text-indigo-600">Privacy Policy</a>
            <a href="#" className="hover:text-indigo-600">API Status</a>
            <a href="#" className="hover:text-indigo-600">Global Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
