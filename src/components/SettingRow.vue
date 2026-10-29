<template>
  <div class="
    flex flex-wrap items-center justify-between gap-2 border-b border-(--border)
    py-3.5
    last:border-b-0
  ">
    <label :for="htmlFor" class="text-[0.9rem] text-(--text-primary)">{{ label }}</label>
    <slot />
    <span v-if="hint" class="mt-1.5 w-full text-xs text-(--text-muted)">{{ hint }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  htmlFor: string;
  label: string;
  hint?: string;
}>();
</script>
