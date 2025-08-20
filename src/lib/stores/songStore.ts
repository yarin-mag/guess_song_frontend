import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { Song } from '$lib/utils/localDataFuncs';

const getInitialValue = (): Song | null => {
  if (!browser) return null;

  const storedSong = localStorage.getItem('winningSong');
  if (storedSong) {
    try {
      return JSON.parse(storedSong);
    } catch (e) {
      console.error('Error parsing winning song from localStorage', e);
      return null;
    }
  }
  return null;
};

const winningSong = writable<Song | null>(getInitialValue());

winningSong.subscribe((value) => {
  if (browser) {
    if (value) {
      localStorage.setItem('winningSong', JSON.stringify(value));
    } else {
      localStorage.removeItem('winningSong');
    }
  }
});

export default winningSong;