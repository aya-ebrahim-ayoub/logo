
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
  AlertCircle,
  RefreshCw
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
      await window.aistudio.openSelectKey();
      // Assume success as per race condition guidelines
      setHasKey(true);
      return true;
    }
    return false;
  };

  const generateLogoConcepts = async (brand: BrandInfo): Promise<LogoConcept[]> => {
    // Re-check key existence immediately before making requests
    if (window.aistudio) {
      const selected = await window.aistudio.hasSelectedApiKey();
      if (!selected) {
        throw new Error("API_KEY_MISSING");
      }
    }

    const styles = [
      "minimalist high-end vector symbol, professional, clean background",
      "bold modern geometric corporate icon, flat design, high contrast",
      "premium elegant typographic brand mark, unique letterform, solid color"
    ];

    const results: LogoConcept[] = [];
    
    // Process sequentially for better error recovery and status updates
    for (let i = 0; i < styles.length; i++) {
      setLoadingMsg(`Architecting design concept ${i + 1} of 3...`);
      const styleModifier = styles[i];
      
      const prompt = `Task: Create a professional high-quality logo mark.
Business: ${brand.businessName}
Industry: ${brand.industry}
Brand Identity: ${brand.coreValues}
Style Preference: ${brand.preferredStyle}, ${styleModifier}
Constraint: High-resolution, vector-style, solid white background, flat color palette. No complex text, no 3D, no gradients. Focus on a simple, memorable icon.`;

      // Create new instance per call for fresh API key context
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-image-preview', // High-end pro model
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

        if (!imageUrl) {
          throw new Error("The model did not return an image. It might have returned text due to safety filters.");
        }

        results.push({
          id: `concept-${i}`,
          imageUrl,
          conceptName: `Concept ${i + 1}`,
          description: `Strategic identity design focusing on ${styleModifier.split(',')[0]}.`
        });
      } catch (err: any) {
        console.error(`Concept ${i + 1} generation error:`, err);
        // Explicit detection of 404 / entity not found which points to API Key Tier or availability
        if (err.message?.includes("entity was not found") || err.message?.includes("404")) {
          throw new Error("PRO_MODEL_NOT_AVAILABLE");
        }
        if (err.message?.includes("safety") || err.message?.includes("blocked")) {
          throw new Error("The design request was blocked by safety filters. Try simplifying your brand values.");
        }
        throw err;
      }
    }

    return results;
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    // If key not active, force open the selector
    if (window.aistudio) {
      const selected = await window.aistudio.hasSelectedApiKey();
      if (!selected) {
        const opened = await handleOpenKeySelector();
        if (!opened) return;
      }
    }

    setStep(AppStep.GENERATING);
    setLoadingMsg('Initializing AI Design Studio...');
    
    try {
      const results = await generateLogoConcepts(brandInfo);
      setConcepts(results);
      setStep(AppStep.GALLERY);
    } catch (error: any) {
      console.error("Main Generation Flow Error:", error);
      
      if (error.message === "API_KEY_MISSING") {
        setErrorMsg("Please select a valid API key from the studio dialog.");
        setStep(AppStep.WIZARD);
        await handleOpenKeySelector();
      } else if (error.message === "PRO_MODEL_NOT_AVAILABLE") {
        setErrorMsg("The professional image model is not accessible. Please ensure you have selected a key from a PAID Google Cloud project with billing enabled. See: ai.google.dev/gemini-api/docs/billing");
        setStep(AppStep.WIZARD);
        if (window.aistudio) await window.aistudio.openSelectKey();
      } else {
        setErrorMsg(error.message || "An unexpected error interrupted the design process. Please try again.");
        setStep(AppStep.WIZARD);
      }
    }
  };

  const handleSelectLogo = async (concept: LogoConcept) => {
    setSelectedConcept(concept);
    setStep(AppStep.GENERATING);
    setLoadingMsg('Crafting your full brand identity manual...');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analyze this brand concept for "${brandInfo.businessName}": "${concept.description}". Provide a professional style guide in JSON format including hex colors (Primary, Secondary, Accent) and a recommended font family.`;

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
      console.error("Manual Generation Error:", error);
      alert('Logo generated successfully! However, the style guide drafting failed.');
      setStep(AppStep.GALLERY);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className