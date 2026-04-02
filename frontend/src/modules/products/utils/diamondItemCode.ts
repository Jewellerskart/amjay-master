const DEFAULT_CLARITY_MAP: Record<string, string> = {
  'VVS-VS': 'VVS-VS',
  'VS-SI': 'VS-SI',
  VVS: 'VVS',
  VS: 'VS',
  SI: 'SI',
};

const DEFAULT_SHAPE_MAP: Record<string, string> = {
  ROUND: 'ROUND',
  RND: 'ROUND',
  RD: 'ROUND',
  PRINCESS: 'PRINCESS',
  OVAL: 'OVAL',
  PEAR: 'PEAR',
  EMERALD: 'EMERALD',
  MARQUISE: 'MARQUISE',
  CUSHION: 'CUSHION',
};

const sortedKeys = (map: Record<string, string>) =>
  Object.keys(map)
    .map((item) => `${item || ''}`.trim().toUpperCase())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

export const getClarityFromItemCode = (code?: string) => {
  const clarityMap: Record<string, string> = { ...DEFAULT_CLARITY_MAP };
  const val = `${code || ''}`.trim().toUpperCase();

  const len = val.length;
  if (len >= 6) {
    const s5 = val.slice(len - 6);
    if (clarityMap[s5]) return clarityMap[s5];
  }

  for (const key of sortedKeys(clarityMap)) {
    if (val.endsWith(key)) return clarityMap[key];
  }

  return '';
};

export const getShapeFromItemCode = (code?: string) => {
  const shapeMap: Record<string, string> = { ...DEFAULT_SHAPE_MAP };
  const val = `${code || ''}`.trim().toUpperCase();

  const len = val.length;
  if (len >= 6) {
    const s5 = val.slice(len - 6);
    if (shapeMap[s5]) return shapeMap[s5];
  }

  for (const key of sortedKeys(shapeMap)) {
    if (val.endsWith(key)) return shapeMap[key];
  }

  return '';
};
