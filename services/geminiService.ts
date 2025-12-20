
import { GoogleGenAI, Type } from "@google/genai";
import { BrandInfo, LogoConcept, StyleGuide } from "../types";

const API_KEY = process.env.API_KEY || "";

export class GeminiService {
  private static ai = new GoogleGenAI({ apiKey: API_KEY });

  static async generateLogoConcepts(brand: BrandInfo): Promise<LogoConcept[]> {
    const concepts: LogoConcept[] = [];
    
    // We'll generate 3 different variations by varying the prompt slightly
    const styles = [
      "minimalist and vector style",
      "bold and modern geometric",
      "elegant and professional typography"
    ];

    const promises = styles.map(async (styleModifier, index) => {
      const prompt = `Professional professional logo for a small business named "${brand.businessName}" in the ${brand.industry} industry. 
      Values: ${brand.coreValues}. Style: ${brand.preferredStyle}, ${styleModifier}. 
      Target Audience: ${brand.targetAudience}. 
      The logo should be modern, memorable, high resolution, white background, no text besides the business name if appropriate.`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: { aspectRatio: "1:1" }
        }
      });

      let imageUrl = "";
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        }
      }

      return {
        id: `concept-${index}`,
        imageUrl,
        conceptName: `Concept ${index + 1}: ${styleModifier.split(' ')[0]}`,
        description: `This design focuses on ${styleModifier} to reflect ${brand.coreValues}.`
      } as LogoConcept;
    });

    return Promise.all(promises);
  }

  static async generateStyleGuide(brand: BrandInfo, selectedLogo: LogoConcept): Promise<StyleGuide> {
    const prompt = `Based on a logo that is ${selectedLogo.description} for "${brand.businessName}", 
    provide a professional style guide including:
    1. Primary, Secondary, and Accent hex colors that match this aesthetic.
    2. A professional font suggestion from Google Fonts.
    3. 3-4 usage tips for maintaining brand consistency.`;

    const response = await this.ai.models.generateContent({
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
            usageTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["primaryColor", "secondaryColor", "accentColor", "fontFamily", "usageTips"]
        }
      }
    });

    return JSON.parse(response.text);
  }
}
