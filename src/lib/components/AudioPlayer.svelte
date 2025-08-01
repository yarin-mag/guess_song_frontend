<script lang="ts">
  import { t } from '$lib/i18n';
  export let clipUrl: string;
</script>

{#if clipUrl}
  <div class="text-center">
    <audio controls class="w-full">
      <source src={clipUrl} type="audio/mpeg" />
      {$t('audioPlayer.unsupported')}
    </audio>
  </div>
{:else}
  <p class="text-center text-gray-400">{$t('audioPlayer.loading')}</p>
{/if}
