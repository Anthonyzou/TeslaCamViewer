<template>
  <div id="eventList" class="event-list" ref="listContainerRef">
    <div
      v-if="!events || events.length === 0"
      class="empty-state"
      id="emptyState"
    >
      <p data-i18n="sidebar.emptyState">{{ t('sidebar.emptyState') }}</p>
      <p class="hint" data-i18n="sidebar.emptyStateHint">
        {{ t('sidebar.emptyStateHint') }}
      </p>
    </div>
    <template v-else>
      <EventCard
        v-for="event in events"
        :key="event.compoundKey || event.name"
        :event="event"
        :isSelected="currentEvent?.name === event.name"
        @select="onSelectEvent"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { useI18n } from '../composables/useI18n';
import type { TeslaCamEvent } from '../types';
import EventCard from './EventCard.vue';

const props = defineProps<{
  events?: TeslaCamEvent[];
  currentEvent?: TeslaCamEvent | null;
}>();

const emit = defineEmits<{
  (e: 'selectEvent', event: TeslaCamEvent): void;
}>();

const listContainerRef = ref<HTMLElement | null>(null);
const { t } = useI18n();

function onSelectEvent(event: TeslaCamEvent): void {
  emit('selectEvent', event);
}

// Scroll active card into view when currentEvent changes
watch(
  () => props.currentEvent,
  async (newEv) => {
    if (!newEv || !listContainerRef.value) return;
    await nextTick();
    const activeEl = listContainerRef.value.querySelector('.event-item.active');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
);
</script>

<style scoped>
/* Event List */
.event-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem;
    scroll-behavior: smooth;
}

.event-list::-webkit-scrollbar {
    width: 6px;
}

.event-list::-webkit-scrollbar-track {
    background: transparent;
}

.event-list::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 3px;
}

.event-list::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-thumb-hover);
}

.empty-state {
    text-align: center;
    padding: 3rem 1.5rem;
    color: var(--text-muted);
}

.empty-state .hint {
    margin-top: 0.75rem;
    font-size: 0.8rem;
    color: var(--text-muted);
}

/* Welcome screen language selector */
.welcome-language-selector {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
}

.welcome-language-selector label {
    color: var(--text-secondary);
    font-size: 0.85rem;
}

.welcome-language-select {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
    font-family: var(--font-ui);
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.welcome-language-select:hover {
    border-color: var(--accent);
}

.welcome-language-select:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-subtle);
}

.welcome-language-select option {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}
</style>
