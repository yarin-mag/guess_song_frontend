import { user } from '$lib/stores/userStore';
import { isTermsModalOpen } from '$lib/stores/modalStore';
import { clearLocalData } from '$lib/utils/localDataFuncs';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { Clerk } from '@clerk/clerk-js';

export async function signOutAndReset() {
  if (!browser) return;

  // Sign out from Clerk
  const clerk = window.Clerk as Clerk;
  await clerk.signOut();

  // Clear app state
  user.set(null);
  isTermsModalOpen.set(false);
  clearLocalData();

  // Optionally: force reload
  window.location.href = '/';
  // OR softer client-side version:
  // goto('/');
}
