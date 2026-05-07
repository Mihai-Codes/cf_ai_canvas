/**
 * Professional Diagram Patterns for cf_ai_canvas
 * 
 * This module provides pre-defined, professionally-designed diagram patterns
 * that ensure consistent, high-quality output regardless of AI variability.
 */

export type PlannedElement = {
  type: string;
  gridRow?: number;
  gridCol?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  id?: string;
  startBoundTo?: string;
  endBoundTo?: string;
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
      { type: 'text', gridCol: 1, gridRow: 0, width: 400, text: `Login Flow: ${prompt}`, color: 'black', fill: 'none', id: 'login_flow_title' },
      { type: 'ellipse', gridCol: 0, gridRow: 1, width: 120, height: 60, text: 'Start', color: 'blue', id: 'login_flow_start' },
      { type: 'arrow', gridCol: 0, gridRow: 1, width: 100, height: 0, color: 'grey', startBoundTo: 'login_flow_start', endBoundTo: 'login_flow_credentials' },
      { type: 'rectangle', gridCol: 1, gridRow: 0, width: 180, height: 80, text: 'Enter Credentials', color: 'light-blue', id: 'login_flow_credentials' },
      { type: 'arrow', gridCol: 1, gridRow: 0, width: 100, height: 0, color: 'grey', id: 'login_flow_arrow1' },
      { type: 'diamond', gridCol: 2, gridRow: 0, width: 160, height: 100, text: 'Valid?', color: 'yellow', id: 'login_flow_decision' },
      { type: 'arrow', gridCol: 2, gridRow: 0, width: 0, height: 80, color: 'grey', id: 'login_flow_arrow2' },
      { type: 'rectangle', gridCol: 2, gridRow: 1, width: 200, height: 80, text: 'Success', color: 'green', id: 'login_flow_success' },
      { type: 'arrow', gridCol: 2, gridRow: 1, width: 100, height: -50, color: 'grey', id: 'login_flow_arrow3' },
      { type: 'rectangle', gridCol: 2, gridRow: 2, width: 200, height: 80, text: 'Error', color: 'red', id: 'login_flow_error' },
    ],
  },
  {
    name: 'cloudflare_architecture',
    description: 'Cloudflare Workers AI architecture',
    keywords: ['cloudflare', 'workers', 'architecture', 'ai', 'durable objects', 'edge', 'system design'],
generate: (prompt: string) => [
       { type: 'text', gridCol: 1, gridRow: 0, width: 400, text: `Architecture: ${prompt}`, color: 'black', fill: 'none' },
       { type: 'frame', gridCol: 0, gridRow: 1, width: 300, height: 300, text: 'Client Layer', color: 'light-blue' },
       { type: 'rectangle', gridCol: 0, gridRow: 2, width: 240, height: 60, text: 'React UI', color: 'blue' },
       { type: 'rectangle', gridCol: 0, gridRow: 3, width: 240, height: 60, text: 'tldraw Canvas', color: 'light-blue' },
       { type: 'arrow', gridCol: 1, gridRow: 2, width: 80, height: 0, color: 'grey' },
       { type: 'arrow', gridCol: 1, gridRow: 3, width: 80, height: 0, color: 'grey' },
       { type: 'frame', gridCol: 2, gridRow: 1, width: 350, height: 350, text: 'Cloudflare Worker', color: 'orange' },
       { type: 'rectangle', gridCol: 2, gridRow: 2, width: 300, height: 60, text: 'Worker Router', color: 'orange' },
       { type: 'rectangle', gridCol: 3, gridRow: 2, width: 150, height: 80, text: 'ChatAgent DO', color: 'green' },
       { type: 'rectangle', gridCol: 4, gridRow: 2, width: 150, height: 80, text: 'CanvasMCP DO', color: 'violet' },
       { type: 'arrow', gridCol: 3, gridRow: 3, width: 0, height: 50, color: 'grey' },
       { type: 'frame', gridCol: 4, gridRow: 1, width: 350, height: 350, text: 'Cloudflare Services', color: 'yellow' },
       { type: 'rectangle', gridCol: 5, gridRow: 2, width: 300, height: 60, text: 'Workers AI', color: 'red' },
       { type: 'rectangle', gridCol: 5, gridRow: 3, width: 300, height: 60, text: 'Workers KV', color: 'yellow' },
       { type: 'arrow', gridCol: 4, gridRow: 2, width: 50, height: 0, color: 'grey' },
       { type: 'arrow', gridCol: 4, gridRow: 3, width: 50, height: 0, color: 'grey' },
     ],
  },
  {
    name: 'oauth_flow',
    description: 'OAuth 2.0 authorization flow',
    keywords: ['oauth', 'authorization', 'auth code', 'token', 'consent', 'redirect'],
generate: (prompt: string) => [
       { type: 'text', gridCol: 1, gridRow: 0, width: 400, text: `OAuth Flow: ${prompt}`, color: 'black', fill: 'none' },
       { type: 'rectangle', gridCol: 0, gridRow: 1, width: 160, height: 60, text: 'MCP Client', color: 'blue' },
       { type: 'arrow', gridCol: 1, gridRow: 1, width: 80, height: 0, color: 'grey' },
       { type: 'rectangle', gridCol: 2, gridRow: 1, width: 180, height: 60, text: 'Auth Server', color: 'orange' },
       { type: 'arrow', gridCol: 3, gridRow: 1, width: 80, height: 0, color: 'grey' },
       { type: 'diamond', gridCol: 4, gridRow: 0, width: 140, height: 80, text: 'User Consent', color: 'yellow' },
       { type: 'arrow', gridCol: 4, gridRow: 1, width: 80, height: 0, color: 'grey' },
       { type: 'rectangle', gridCol: 5, gridRow: 1, width: 180, height: 60, text: 'Callback', color: 'green' },
       { type: 'arrow', gridCol: 6, gridRow: 1, width: 0, height: 80, color: 'grey' },
       { type: 'rectangle', gridCol: 5, gridRow: 2, width: 180, height: 60, text: 'Token Exchange', color: 'violet' },
       { type: 'arrow', gridCol: 6, gridRow: 1, width: 80, height: 80, color: 'grey' },
       { type: 'rectangle', gridCol: 7, gridRow: 1, width: 180, height: 60, text: 'API Access', color: 'light-blue' },
     ],
  },
  {
    name: 'microservices',
    description: 'Microservices architecture',
    keywords: ['microservices', 'service', 'api', 'distributed', 'architecture'],
generate: (prompt: string) => [
       { type: 'text', gridCol: 2, gridRow: 0, width: 400, text: `Microservices: ${prompt}`, color: 'black', fill: 'none' },
       { type: 'rectangle', gridCol: 0, gridRow: 1, width: 160, height: 60, text: 'API Gateway', color: 'orange', id: 'api_gateway' },
       { type: 'rectangle', gridCol: 0, gridRow: 2, width: 160, height: 60, text: 'Auth Service', color: 'green', id: 'auth_service' },
       { type: 'rectangle', gridCol: 0, gridRow: 3, width: 160, height: 60, text: 'User Service', color: 'blue', id: 'user_service' },
       { type: 'rectangle', gridCol: 1, gridRow: 1, width: 160, height: 60, text: 'Order Service', color: 'violet', id: 'order_service' },
       { type: 'rectangle', gridCol: 1, gridRow: 2, width: 160, height: 60, text: 'Payment Service', color: 'red', id: 'payment_service' },
       { type: 'rectangle', gridCol: 2, gridRow: 2, width: 160, height: 60, text: 'Database', color: 'yellow', id: 'database' },
       { type: 'arrow', gridCol: 0, gridRow: 1, width: 40, height: -30, color: 'grey', startBoundTo: 'api_gateway', endBoundTo: 'auth_service' },
       { type: 'arrow', gridCol: 0, gridRow: 1, width: 40, height: 30, color: 'grey', startBoundTo: 'api_gateway', endBoundTo: 'auth_service' },
       { type: 'arrow', gridCol: 0, gridRow: 2, width: 40, height: -10, color: 'grey', startBoundTo: 'auth_service', endBoundTo: 'user_service' },
       { type: 'arrow', gridCol: 0, gridRow: 2, width: 40, height: 10, color: 'grey', startBoundTo: 'auth_service', endBoundTo: 'user_service' },
       { type: 'arrow', gridCol: 1, gridRow: 1, width: 40, height: 0, color: 'grey', startBoundTo: 'order_service', endBoundTo: 'database' },
     ],
  },
  {
    name: 'data_flow',
    description: 'Data processing pipeline',
    keywords: ['data', 'pipeline', 'etl', 'processing', 'flow'],
generate: (prompt: string) => [
       { type: 'text', gridCol: 1, gridRow: 0, width: 400, text: `Data Flow: ${prompt}`, color: 'black', fill: 'none', id: 'data_flow_title' },
       { type: 'rectangle', gridCol: 0, gridRow: 1, width: 160, height: 60, text: 'Data Source', color: 'light-blue', id: 'data_source' },
       { type: 'arrow', gridCol: 0, gridRow: 1, width: 80, height: 0, color: 'grey', id: 'data_flow_arrow1', startBoundTo: 'data_source', endBoundTo: 'etl_process' },
       { type: 'rectangle', gridCol: 1, gridRow: 1, width: 160, height: 60, text: 'ETL Process', color: 'orange', id: 'etl_process' },
       { type: 'arrow', gridCol: 1, gridRow: 1, width: 80, height: 0, color: 'grey', id: 'data_flow_arrow2', startBoundTo: 'etl_process', endBoundTo: 'transformation' },
       { type: 'rectangle', gridCol: 2, gridRow: 1, width: 160, height: 60, text: 'Transformation', color: 'green', id: 'transformation' },
       { type: 'arrow', gridCol: 2, gridRow: 1, width: 80, height: 0, color: 'grey', id: 'data_flow_arrow3', startBoundTo: 'transformation', endBoundTo: 'data_warehouse' },
       { type: 'rectangle', gridCol: 3, gridRow: 1, width: 160, height: 60, text: 'Data Warehouse', color: 'violet', id: 'data_warehouse' },
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
     { type: 'rectangle', gridCol: 0, gridRow: 0, width: 180, height: 80, text: 'Start', color: 'blue' },
     { type: 'arrow', gridCol: 0, gridRow: 0, width: 100, height: 0, color: 'grey' },
     { type: 'rectangle', gridCol: 1, gridRow: 0, width: 180, height: 80, text: 'Process', color: 'green' },
     { type: 'arrow', gridCol: 1, gridRow: 0, width: 100, height: 0, color: 'grey' },
     { type: 'rectangle', gridCol: 2, gridRow: 0, width: 180, height: 80, text: 'End', color: 'violet' },
   ];
}