/**
 * Professional Diagram Patterns for cf_ai_canvas
 * 
 * This module provides pre-defined, professionally-designed diagram patterns
 * that ensure consistent, high-quality output regardless of AI variability.
 */

export type PlannedElement = {
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
};

export type DiagramPattern = {
  name: string;
  description: string;
  keywords: string[];
  generate: (prompt: string) => PlannedElement[];
};

export const DIAGRAM_PATTERNS: DiagramPattern[] = [
  {
    name: 'login_flow',
    description: 'Login flow with success and error paths',
    keywords: ['login', 'authentication', 'sign in', 'credentials', 'success', 'error', 'failure'],
    generate: (prompt: string) => [
      { type: 'text', x: 400, y: 30, width: 400, text: `Login Flow: ${prompt}`, color: 'black', fill: 'none' },
      { type: 'ellipse', x: 100, y: 100, width: 120, height: 60, text: 'Start', color: 'blue' },
      { type: 'arrow', x: 220, y: 130, width: 100, height: 0, color: 'grey' },
      { type: 'rectangle', x: 320, y: 90, width: 180, height: 80, text: 'Enter Credentials', color: 'light-blue' },
      { type: 'arrow', x: 500, y: 130, width: 100, height: 0, color: 'grey' },
      { type: 'diamond', x: 600, y: 80, width: 160, height: 100, text: 'Valid?', color: 'yellow' },
      { type: 'arrow', x: 680, y: 130, width: 0, height: 80, color: 'grey' },
      { type: 'rectangle', x: 560, y: 240, width: 200, height: 80, text: 'Success', color: 'green' },
      { type: 'arrow', x: 680, y: 180, width: 100, height: -50, color: 'grey' },
      { type: 'rectangle', x: 780, y: 130, width: 200, height: 80, text: 'Error', color: 'red' },
    ],
  },
  {
    name: 'cloudflare_architecture',
    description: 'Cloudflare Workers AI architecture',
    keywords: ['cloudflare', 'workers', 'architecture', 'ai', 'durable objects', 'edge', 'system design'],
    generate: (prompt: string) => [
      { type: 'text', x: 400, y: 30, width: 400, text: `Architecture: ${prompt}`, color: 'black', fill: 'none' },
      { type: 'frame', x: 50, y: 80, width: 300, height: 300, text: 'Client Layer', color: 'light-blue' },
      { type: 'rectangle', x: 80, y: 120, width: 240, height: 60, text: 'React UI', color: 'blue' },
      { type: 'rectangle', x: 80, y: 200, width: 240, height: 60, text: 'tldraw Canvas', color: 'light-blue' },
      { type: 'arrow', x: 330, y: 150, width: 80, height: 0, color: 'grey' },
      { type: 'arrow', x: 330, y: 230, width: 80, height: 0, color: 'grey' },
      { type: 'frame', x: 400, y: 80, width: 350, height: 350, text: 'Cloudflare Worker', color: 'orange' },
      { type: 'rectangle', x: 430, y: 120, width: 300, height: 60, text: 'Worker Router', color: 'orange' },
      { type: 'rectangle', x: 430, y: 220, width: 150, height: 80, text: 'ChatAgent DO', color: 'green' },
      { type: 'rectangle', x: 590, y: 220, width: 150, height: 80, text: 'CanvasMCP DO', color: 'violet' },
      { type: 'arrow', x: 510, y: 300, width: 0, height: 50, color: 'grey' },
      { type: 'frame', x: 800, y: 80, width: 350, height: 350, text: 'Cloudflare Services', color: 'yellow' },
      { type: 'rectangle', x: 830, y: 120, width: 300, height: 60, text: 'Workers AI', color: 'red' },
      { type: 'rectangle', x: 830, y: 220, width: 300, height: 60, text: 'Workers KV', color: 'yellow' },
      { type: 'arrow', x: 750, y: 150, width: 50, height: 0, color: 'grey' },
      { type: 'arrow', x: 750, y: 250, width: 50, height: 0, color: 'grey' },
    ],
  },
  {
    name: 'oauth_flow',
    description: 'OAuth 2.0 authorization flow',
    keywords: ['oauth', 'authorization', 'auth code', 'token', 'consent', 'redirect'],
    generate: (prompt: string) => [
      { type: 'text', x: 400, y: 30, width: 400, text: `OAuth Flow: ${prompt}`, color: 'black', fill: 'none' },
      { type: 'rectangle', x: 100, y: 100, width: 160, height: 60, text: 'MCP Client', color: 'blue' },
      { type: 'arrow', x: 260, y: 130, width: 80, height: 0, color: 'grey' },
      { type: 'rectangle', x: 340, y: 100, width: 180, height: 60, text: 'Auth Server', color: 'orange' },
      { type: 'arrow', x: 520, y: 130, width: 80, height: 0, color: 'grey' },
      { type: 'diamond', x: 600, y: 90, width: 140, height: 80, text: 'User Consent', color: 'yellow' },
      { type: 'arrow', x: 670, y: 130, width: 80, height: 0, color: 'grey' },
      { type: 'rectangle', x: 750, y: 100, width: 180, height: 60, text: 'Callback', color: 'green' },
      { type: 'arrow', x: 830, y: 160, width: 0, height: 80, color: 'grey' },
      { type: 'rectangle', x: 750, y: 240, width: 180, height: 60, text: 'Token Exchange', color: 'violet' },
      { type: 'arrow', x: 830, y: 160, width: 80, height: 80, color: 'grey' },
      { type: 'rectangle', x: 910, y: 100, width: 180, height: 60, text: 'API Access', color: 'light-blue' },
    ],
  },
  {
    name: 'microservices',
    description: 'Microservices architecture',
    keywords: ['microservices', 'service', 'api', 'distributed', 'architecture'],
    generate: (prompt: string) => [
      { type: 'text', x: 400, y: 30, width: 400, text: `Microservices: ${prompt}`, color: 'black', fill: 'none' },
      { type: 'rectangle', x: 100, y: 100, width: 160, height: 60, text: 'API Gateway', color: 'orange' },
      { type: 'rectangle', x: 300, y: 60, width: 160, height: 60, text: 'Auth Service', color: 'green' },
      { type: 'rectangle', x: 300, y: 140, width: 160, height: 60, text: 'User Service', color: 'blue' },
      { type: 'rectangle', x: 500, y: 60, width: 160, height: 60, text: 'Order Service', color: 'violet' },
      { type: 'rectangle', x: 500, y: 140, width: 160, height: 60, text: 'Payment Service', color: 'red' },
      { type: 'rectangle', x: 700, y: 100, width: 160, height: 60, text: 'Database', color: 'yellow' },
      { type: 'arrow', x: 260, y: 130, width: 40, height: -30, color: 'grey' },
      { type: 'arrow', x: 260, y: 130, width: 40, height: 30, color: 'grey' },
      { type: 'arrow', x: 460, y: 90, width: 40, height: -10, color: 'grey' },
      { type: 'arrow', x: 460, y: 170, width: 40, height: 10, color: 'grey' },
      { type: 'arrow', x: 660, y: 130, width: 40, height: 0, color: 'grey' },
    ],
  },
  {
    name: 'data_flow',
    description: 'Data processing pipeline',
    keywords: ['data', 'pipeline', 'etl', 'processing', 'flow'],
    generate: (prompt: string) => [
      { type: 'text', x: 400, y: 30, width: 400, text: `Data Flow: ${prompt}`, color: 'black', fill: 'none' },
      { type: 'rectangle', x: 100, y: 100, width: 160, height: 60, text: 'Data Source', color: 'light-blue' },
      { type: 'arrow', x: 260, y: 130, width: 80, height: 0, color: 'grey' },
      { type: 'rectangle', x: 340, y: 100, width: 160, height: 60, text: 'ETL Process', color: 'orange' },
      { type: 'arrow', x: 500, y: 130, width: 80, height: 0, color: 'grey' },
      { type: 'rectangle', x: 580, y: 100, width: 160, height: 60, text: 'Transformation', color: 'green' },
      { type: 'arrow', x: 740, y: 130, width: 80, height: 0, color: 'grey' },
      { type: 'rectangle', x: 820, y: 100, width: 160, height: 60, text: 'Data Warehouse', color: 'violet' },
    ],
  },
];

export function matchPattern(prompt: string): DiagramPattern | null {
  const normalized = prompt.toLowerCase();
  
  for (const pattern of DIAGRAM_PATTERNS) {
    if (pattern.keywords.some(keyword => normalized.includes(keyword))) {
      return pattern;
    }
  }
  
  return null;
}

export function generateDiagram(prompt: string): PlannedElement[] {
  const pattern = matchPattern(prompt);
  
  if (pattern) {
    return pattern.generate(prompt);
  }
  
  return [
    { type: 'rectangle', x: 100, y: 100, width: 180, height: 80, text: 'Start', color: 'blue' },
    { type: 'arrow', x: 290, y: 140, width: 100, height: 0, color: 'grey' },
    { type: 'rectangle', x: 400, y: 100, width: 180, height: 80, text: 'Process', color: 'green' },
    { type: 'arrow', x: 590, y: 140, width: 100, height: 0, color: 'grey' },
    { type: 'rectangle', x: 700, y: 100, width: 180, height: 80, text: 'End', color: 'violet' },
  ];
}