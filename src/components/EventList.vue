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

function t(key: string): string {
  return window.i18n ? window.i18n.t(key) : key.split('.').pop() || '';
}

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
