<template>
  <div class="setting-row">
    <label :for="htmlFor" class="setting-label">{{ label }}</label>
    <slot />
    <span v-if="hint" class="setting-hint">{{ hint }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  htmlFor: string;
  label: string;
  hint?: string;
}>();
</script>
<style scoped>
@reference "tailwindcss";

.setting-row {
  @apply flex flex-wrap items-center justify-between gap-2 border-b border-(--border) py-3.5 last:border-b-0;
}

.setting-label {
  @apply text-[0.9rem] text-(--text-primary);
}

.setting-hint {
  @apply mt-1.5 w-full text-xs text-(--text-muted);
}
</style>