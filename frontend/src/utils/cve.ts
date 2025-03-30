export const getCVEYearAndNumber = (cveId: string) => {
  const match = cveId.match(/CVE-(\d+)-(\d+)/);
  if (match) {
    return {
      year: parseInt(match[1]),
      number: parseInt(match[2])
    };
  }
  return { year: 0, number: 0 };
}; 