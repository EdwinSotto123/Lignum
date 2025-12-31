import React from 'react';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export interface ModuleFeature {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  techStack: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
}