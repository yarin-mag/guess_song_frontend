import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const createClerkStore = () => {
  const { subscribe, set } = writable({ client: null, session: null });

  async function initialize() {
    if (browser) {
      const { Clerk } = await import('@clerk/clerk-js');
      const clerk = new Clerk(PUBLIC_CLERK_PUBLISHABLE_KEY);
      await clerk.load();
      set({ client: clerk, session: clerk.session });

      clerk.addListener((e) => {
        set({ client: clerk, session: e.session });
      });
    }
  }

  initialize();

  return {
    subscribe,
  };
};

export const clerkStore = createClerkStore();