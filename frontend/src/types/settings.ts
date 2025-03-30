export interface CVSSSettings {
  showVectorString: boolean;
  sortBy: 'date' | 'rating';
  preferredVersion: CVSSVersion;
}

export type CVSSVersion = '4.0' | '3.1' | '3.0' | '2.0';

export interface AppSettings {
  // ...existing code...
  cvss: CVSSSettings;
}
