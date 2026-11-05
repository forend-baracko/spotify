const CATEGORY_ALIASES = {
  acoustic: ['Acoustic'],
  alternative: ['Alternative'],
  heartbreak: ['Sad'],
  chill: ['Chill'],
  classical: ['Classical'],
  country: ['Country'],
  dance: ['Dance'],
  electronic: ['Electronic'],
  filipino: ['OPM'],
  hiphop: ['Hip-Hop', 'Rap'],
  'hip-hop': ['Hip-Hop', 'Rap'],
  'hip-hop/rap': ['Hip-Hop', 'Rap'],
  indie: ['Indie'],
  jazz: ['Jazz'],
  latin: ['Latin'],
  love: ['Love'],
  melancholic: ['Sad'],
  opm: ['OPM'],
  pop: ['Pop'],
  rap: ['Rap'],
  romantic: ['Love'],
  rnb: ['R&B'],
  'r&b': ['R&B'],
  'r&b/soul': ['R&B', 'Soul'],
  reggae: ['Reggae'],
  rock: ['Rock'],
  relaxing: ['Chill'],
  sad: ['Sad'],
  soul: ['Soul'],
  upbeat: ['Upbeat'],
  philippines: ['OPM'],
};

export const normalizeTrackCategories = (...values) => {
  const categories = new Set();
  const addValue = (value) => {
    if (Array.isArray(value)) {
      value.forEach(addValue);
      return;
    }
    if (typeof value !== 'string') return;

    value.split(/[|,;]/).forEach((part) => {
      const key = part.trim().toLowerCase().replace(/\s+/g, '');
      (CATEGORY_ALIASES[key] || []).forEach((category) => categories.add(category));
    });
  };

  values.forEach(addValue);
  return [...categories];
};
