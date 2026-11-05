import { MOCK_TRACKS } from '../src/assets/tracks/mockData';
import { normalizeTrackCategories } from '../src/utils/trackCategories';

describe('track categories', () => {
  it('assigns known style and mood categories to every bundled track', () => {
    expect(MOCK_TRACKS.every((track) => track.categories.length > 0)).toBe(true);
    expect(MOCK_TRACKS.find((track) => track.id === '7').categories).toEqual([
      'OPM',
      'R&B',
      'Sad',
    ]);
    expect(MOCK_TRACKS.find((track) => track.id === '4').categories).toContain('Rap');
    expect(MOCK_TRACKS.find((track) => track.id === '8').categories).toContain('Sad');
  });

  it('maps common source genre labels to stable category tags', () => {
    expect(normalizeTrackCategories('Hip-Hop/Rap', 'R&B/Soul', 'Heartbreak')).toEqual([
      'Hip-Hop',
      'Rap',
      'R&B',
      'Soul',
      'Sad',
    ]);
  });

  it('ignores unknown or non-string category values', () => {
    expect(normalizeTrackCategories(['OPM', null, 'unclassified'])).toEqual(['OPM']);
  });
});
