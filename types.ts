
export interface BrandInfo {
  businessName: string;
  industry: string;
  coreValues: string;
  targetAudience: string;
  preferredStyle: string; // Minimalist, Bold, Classic, Modern
}

export interface LogoConcept {
  id: string;
  imageUrl: string;
  description: string;
  conceptName: string;
}

export interface StyleGuide {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  usageTips: string[];
}

export enum AppStep {
  IDLE = 'IDLE',
  WIZARD = 'WIZARD',
  GENERATING = 'GENERATING',
  GALLERY = 'GALLERY',
  STYLE_GUIDE = 'STYLE_GUIDE'
}
