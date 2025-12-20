
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
    // Fixed: Added optional modifier '?' to ensure the declaration is compatible with other definitions of Window.
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
      await window.aistudio.openSelectKey();
      setHasKey(true);
      return true;
    }
    return false;
  };

  const generateLogoConcepts = async (brand: BrandInfo): Promise<LogoConcept[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const styles = [
      "minimalist vector emblem, flat design",
      "modern geometric icon, bold shapes",
      "premium typographic mark, elegant letterform"
    ];

    const promises = styles.map(async (styleModifier, index) => {
      const prompt = `Create a professional, high-end logo for "${brand.businessName}", in the ${brand.industry} industry. 
      Core Values: ${brand.coreValues}. 
      Style Style: ${brand.preferredStyle}, ${styleModifier}. 
      Target Audience: ${brand.targetAudience}. 
      Visual Requirements: Clean vector style, solid white background, high contrast, professional brand mark. No shadows, no 3D effects, no photographic elements. Simple and memorable icon.`;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image', // Switched for better stability/availability
          contents: { parts: [{ text: prompt }] },
          config: {
            imageConfig: { aspectRatio: "1:1" }
          }
        });

        let imageUrl = "";
        const candidate = response.candidates?.[0];
        if (!candidate) throw new Error("No candidates returned from AI.");

        const parts = candidate.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          }
        }

        if (!imageUrl) {
          console.error("API Response without image:", response);
          throw new Error("The model did not return an image. It might have returned text instead.");
        }

        return {
          id: `concept-${index}`,
          imageUrl,
          conceptName: `Concept ${index + 1}`,
          description: `Strategic brand design focused on ${styleModifier.split(',')[0]}.`
        } as LogoConcept;
      } catch (err: any) {
        console.error(`Generation error for Concept ${index + 1}:`, err);
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

    if (!hasKey && window.aistudio) {
      const success = await handleOpenKeySelector();
      if (!success) return;
    }

    setStep(AppStep.GENERATING);
    setLoadingMsg('Initializing Creative Engine...');
    
    try {
      const results = await generateLogoConcepts(brandInfo);
      setConcepts(results);
      setStep(AppStep.GALLERY);
    } catch (error: any) {
      console.error("Design Generation Error:", error);
      if (error.message === "PRO_KEY_NEEDED") {
        setErrorMsg("Professional image models require a paid API key. Please connect a key from a project with billing enabled.");
        setStep(AppStep.WIZARD);
        await handleOpenKeySelector();
      } else {
        setErrorMsg(`Design process interrupted: ${error.message || "Please check your connection and try again."}`);
        setStep(AppStep.WIZARD);
      }
    }
  };

  const handleSelectLogo = async (concept: LogoConcept) => {
    setSelectedConcept(concept);
    setStep(AppStep.GENERATING);
    setLoadingMsg('Generating your custom brand style guide...');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Based on the brand identity for "${brandInfo.businessName}" and this specific logo concept: "${concept.description}", create a professional style guide. Include specific hex codes and usage tips. Return ONLY valid JSON.`;

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
      alert('Your logo is ready, but we encountered an issue generating the full brand guide.');
      setStep(AppStep.GALLERY);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setStep(AppStep.IDLE)}>
            <div className="bg-indigo-600 p-2 rounded-lg group-hover:rotate-6 transition-transform">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">Logosmith AI</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleOpenKeySelector}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-all ${hasKey ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}
            >
              <Key className="w-4 h-4" /> {hasKey ? "Key Connected" : "Connect Pro Key"}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {step === AppStep.IDLE && (
          <div className="text-center space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-6">
              <h1 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-tight">
                Studio-Quality Branding <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                  In Just Seconds
                </span>
              </h1>
              <p className="max-w-xl mx-auto text-xl text-slate-500 font-medium">
                The intelligent design partner for small businesses and startups. Generate logos, colors, and fonts tailored to your vision.
              </p>
            </div>
            <button 
              onClick={() => setStep(AppStep.WIZARD)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-6 rounded-2xl font-black shadow-2xl shadow-indigo-200 transition-all text-xl hover:-translate-y-1"
            >
              Start New Project
            </button>
          </div>
        )}

        {step === AppStep.WIZARD && (
          <div className="max-w-2xl mx-auto bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 p-10 space-y-8 animate-in zoom-in-95 duration-500">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Discovery Phase</h2>
              <p className="text-slate-500 font-medium text-lg">Define the soul of your brand to guide our AI designer.</p>
            </div>

            {errorMsg && (
              <div className="p-5 bg-red-50 border-2 border-red-100 rounded-2xl flex gap-4 text-red-900 text-sm font-bold animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-6 h-6 shrink-0 text-red-500" />
                <div className="space-y-1">
                   <p className="font-black uppercase tracking-widest text-[10px] text-red-400">Error Encountered</p>
                   <p>{errorMsg}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Business Name</label>
                  <input required className="w-full px-6 py-5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold text-lg transition-colors shadow-sm" placeholder="e.g. Skyline Coffee" value={brandInfo.businessName} onChange={e => setBrandInfo({...brandInfo, businessName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Industry</label>
                  <input required className="w-full px-6 py-5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold text-lg transition-colors shadow-sm" placeholder="e.g. Hospitality" value={brandInfo.industry} onChange={e => setBrandInfo({...brandInfo, industry: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Core Values & Identity</label>
                <textarea required className="w-full px-6 py-5 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold text-lg h-32 transition-colors shadow-sm" placeholder="e.g. Sustainable, artisanal, community-focused, premium" value={brandInfo.coreValues} onChange={e => setBrandInfo({...brandInfo, coreValues: e.target.value})} />
              </div>
              <div className="space-y-4">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Visual Style Preference</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {['Modern', 'Classic', 'Bold', 'Minimalist'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setBrandInfo({...brandInfo, preferredStyle: s})}
                      className={`py-4 rounded-xl font-black text-sm border-2 transition-all ${brandInfo.preferredStyle === s ? "bg-indigo-600 border-indigo-600 text-white shadow-lg" : "bg-white border-slate-100 text-slate-500 hover:border-indigo-200"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-6 rounded-2xl font-black transition-all flex items-center justify-center gap-3 text-xl shadow-xl hover:shadow-indigo-100 group">
                Generate Concepts
                <Rocket className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>
        )}

        {step === AppStep.GENERATING && (
          <div className="text-center py-32 space-y-10 animate-in fade-in duration-500">
            <div className="inline-block relative">
              <div className="w-32 h-32 border-[6px] border-indigo-50 border-t-indigo-600 rounded-full animate-spin"></div>
              <Sparkles className="absolute inset-0 m-auto w-12 h-12 text-indigo-600 animate-pulse" />
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Studio at Work</h2>
              <p className="text-slate-500 text-xl font-medium animate-pulse max-w-sm mx-auto">{loadingMsg}</p>
            </div>
          </div>
        )}

        {step === AppStep.GALLERY && (
          <div className="space-y-16 animate-in fade-in duration-1000">
            <div className="text-center space-y-4">
              <h2 className="text-6xl font-black text-slate-900 tracking-tight">Design Gallery</h2>
              <p className="text-slate-500 text-xl font-medium">We've generated three distinct aesthetic paths for {brandInfo.businessName}.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {concepts.map((concept) => (
                <div key={concept.id} className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-500 group flex flex-col hover:-translate-y-2">
                  <div className="aspect-square p-12 bg-slate-50 flex items-center justify-center relative overflow-hidden">
                    <img src={concept.imageUrl} alt={concept.conceptName} className="w-full h-full object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-1000 ease-out" />
                    <div className="absolute inset-0 bg-indigo-900 opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none" />
                  </div>
                  <div className="p-10 space-y-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <h3 className="text-3xl font-black text-slate-900">{concept.conceptName}</h3>
                      <p className="text-slate-500 font-medium leading-relaxed">{concept.description}</p>
                    </div>
                    <button onClick={() => handleSelectLogo(concept)} className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-5 rounded-2xl font-black transition-all flex items-center justify-center gap-3 text-lg">
                      Select Concept
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === AppStep.STYLE_GUIDE && styleGuide && selectedConcept && (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in zoom-in-95 duration-1000">
            <div className="lg:col-span-5 space-y-8">
              <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-200 sticky top-28">
                <div className="aspect-square p-10 bg-slate-50 rounded-[2rem] border-2 border-slate-100 shadow-inner">
                  <img src={selectedConcept.imageUrl} alt="Final Mark" className="w-full h-full object-contain drop-shadow-2xl" />
                </div>
                <div className="mt-10 space-y-6">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Brand Asset</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100">
                      <Download className="w-5 h-5" /> Export PNG
                    </button>
                    <button onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all">
                      <Layers className="w-5 h-5" /> SVG File
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-8">
              <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-200 space-y-12">
                <div className="border-b-2 border-slate-50 pb-8 flex items-center justify-between">
                  <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Identity Guide</h2>
                  <FileText className="w-10 h-10 text-slate-300" />
                </div>

                <div className="space-y-8">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Color Palette</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {[
                      { hex: styleGuide.primaryColor, label: "Core" },
                      { hex: styleGuide.secondaryColor, label: "Accent" },
                      { hex: styleGuide.accentColor, label: "Highlights" }
                    ].map((c, i) => (
                      <div key={i} className="group">
                        <div className="h-32 rounded-[2rem] shadow-lg border-4 border-white group-hover:-translate-y-2 transition-transform cursor-copy" style={{backgroundColor: c.hex}}></div>
                        <div className="mt-4 text-center">
                          <p className="text-lg font-mono font-black text-slate-900">{c.hex}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Typography</p>
                  <div className="p-10 bg-slate-50/50 rounded-[2rem] border-2 border-slate-50 shadow-inner group">
                    <p className="text-5xl font-black text-slate-900 group-hover:tracking-wider transition-all duration-700" style={{fontFamily: styleGuide.fontFamily}}>{styleGuide.fontFamily}</p>
                    <p className="mt-4 text-slate-400 font-medium italic">"The voice of the brand is as important as the image."</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Usage Directives</p>
                  <div className="grid grid-cols-1 gap-4">
                    {styleGuide.usageTips.map((tip, i) => (
                      <div key={i} className="flex gap-4 p-6 bg-white border-2 border-slate-50 rounded-2xl hover:border-indigo-100 transition-colors shadow-sm">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                        <p className="font-bold text-slate-700 leading-snug">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center px-6">
                <button onClick={() => setStep(AppStep.IDLE)} className="text-indigo-600 font-black text-sm uppercase tracking-widest hover:text-indigo-800 transition-colors flex items-center gap-2">
                  ← New Project
                </button>
                <p className="text-slate-300 font-black text-[10px] uppercase tracking-[0.3em]">Logosmith Studio Certified</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-16 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 p-2 rounded-xl">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tighter italic">LOGOSMITH</span>
          </div>
          <p className="text-slate-400 font-bold text-sm tracking-tight">
            Built with Gemini Generative Cloud &copy; {new Date().getFullYear()} Logosmith Studio.
          </p>
          <div className="flex gap-8 text-xs font-black text-slate-400 uppercase tracking-widest">
            <a href="#" className="hover:text-indigo-600">Privacy</a>
            <a href="#" className="hover:text-indigo-600">Terms</a>
            <a href="#" className="hover:text-indigo-600">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
