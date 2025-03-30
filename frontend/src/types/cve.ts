export interface CVEData {
  software: string;
  cveId: string;
  description: string;
  cvssScore: number;
  cvssVersion: string;
  vectorString: string;
  publishedDate: string;
  parsedDate?: number;
  missingCvssData?: boolean;
} 