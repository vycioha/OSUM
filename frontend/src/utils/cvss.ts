export const getRiskInfo = (score: number) => {
  if (score >= 9.0) return { label: 'Critical', color: 'red.600' };
  if (score >= 7.0) return { label: 'High', color: 'orange.500' };
  if (score >= 4.0) return { label: 'Medium', color: 'yellow.500' };
  if (score >= 0.1) return { label: 'Low', color: 'green.500' };
  return { label: 'None', color: 'gray.500' };
};

export const getCVSSColor = (score: number | null) => {
  if (score === null) return 'gray.200';
  if (score >= 9.0) return 'red.300';
  if (score >= 7.0) return 'orange.200';
  if (score >= 4.0) return 'yellow.200';
  if (score >= 0.1) return 'green.200';
  return 'gray.200';
}; 