<script lang="ts">
  import { t } from '$lib/i18n';
  export let onClick: () => void;
</script>

<button
  on:click={onClick}
  class="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:scale-[1.03] transition-transform duration-200 text-white font-semibold rounded-lg shadow-md cursor-pointer"
>
  {$t('submitButton.text')}
</button>

