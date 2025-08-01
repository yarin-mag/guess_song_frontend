<script lang="ts">
  import { SignIn } from 'svelte-clerk';
  import { ClerkProvider } from 'svelte-clerk';
  import { derived, get } from 'svelte/store';
  import { enUS, heIL } from '@clerk/localizations';
  import { locale } from '$lib/i18n';

  const clerkLocalization = derived(locale, ($locale) => {
    switch ($locale) {
      case 'he':
        return heIL;
      case 'en':
      default:
        return enUS;
    }
  });

  let ready = false;
  $: if (get(locale)) {
    ready = true;
  }
</script>

{#if ready}
  <div class="flex justify-center items-center h-screen">
    <ClerkProvider localization={$clerkLocalization}>
      <SignIn signUpUrl="/sign-up" afterSignInUrl="/" />
    </ClerkProvider>
  </div>
{/if}
