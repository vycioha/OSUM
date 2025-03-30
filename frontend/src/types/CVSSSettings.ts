export interface CVSSSettings {
  showVectorString: boolean;
  sortBy: 'date' | 'rating';
  preferredVersion: 'v4.0' | 'v3.1' | 'v3.0' | 'v2.0';
}

export interface CVSSScore {
  version: string;
  baseScore: number;
  vectorString?: string;
}
