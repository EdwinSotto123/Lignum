export interface Quiz {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface Scene {
  number: number;
  narrative: string;
  educationalSummary: string;
  imagePrompt: string;
  quiz: Quiz;
  generatedImageUrl?: string; // Populated after image generation
  generatedAudioBuffer?: AudioBuffer; // Populated after TTS
}

export interface StoryPlan {
  title: string;
  scenes: Scene[];
}

export enum AppState {
  DRAWING = 'DRAWING',
  GENERATING_PLAN = 'GENERATING_PLAN',
  GENERATING_ASSETS = 'GENERATING_ASSETS',
  VIEWING_STORY = 'VIEWING_STORY',
  ERROR = 'ERROR'
}

export type BrushType = 'marker' | 'watercolor' | 'spray' | 'eraser';

export interface DrawingTool {
  type: BrushType;
  color: string;
  width: number;
}

export type VoiceName = 'Puck' | 'Kore' | 'Fenrir' | 'Zephyr';
