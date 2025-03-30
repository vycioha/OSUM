import { CVSSVersion } from '../types/settings';

interface CVSSMetric {
  version: string;
  vectorString: string;
  baseScore: number;
}

export function getCVSSMetric(metrics: any, preferredVersion: CVSSVersion): CVSSMetric | null {
  // Try to find metrics in preferred order
  const versionOrder: CVSSVersion[] = ['3.1', '3.0', '4.0', '2.0'];
  const startIndex = versionOrder.indexOf(preferredVersion);
  const orderedVersions = [
    ...versionOrder.slice(startIndex),
    ...versionOrder.slice(0, startIndex)
  ];

  for (const version of orderedVersions) {
    const metricKey = `cvssMetricV${version.replace('.', '')}`;
    const metric = metrics[metricKey]?.[0]?.cvssData;
    
    if (metric) {
      return {
        version: metric.version,
        vectorString: formatVectorString(metric.version, metric.vectorString),
        baseScore: metric.baseScore
      };
    }
  }

  return null;
}

function formatVectorString(version: string, vector: string): string {
  if (version === '2.0' && !vector.startsWith('CVSS:2.0/')) {
    return `CVSS:2.0/${vector}`;
  }
  return vector;
}
