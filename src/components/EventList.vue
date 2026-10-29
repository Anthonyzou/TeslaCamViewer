<template>
  <div id="eventList" class="event-list" ref="listContainerRef">
    <div v-if="!events || events.length === 0" class="empty-state" id="emptyState">
      <p>{{ t('sidebar.emptyState') }}</p>
      <p class="hint">
        {{ t('sidebar.emptyStateHint') }}
      </p>
    </div>
    <template v-else>
      <EventCard v-for="event in events" :key="event.compoundKey || event.name" :event="event"
        :isSelected="currentEvent?.name === event.name" @select="onSelectEvent" />
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
@reference "tailwindcss";

/* Event List */
.event-list {
  @apply flex-1 overflow-y-auto p-3 scroll-smooth;
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
  @apply p-12 px-6 text-center text-(--text-muted);
}

.empty-state .hint {
  @apply mt-3 text-[0.8rem] text-(--text-muted);
}
</style>
