<template>
  <div class="command-palette" :class="{ visible: isOpen }">
    <div class="command-palette-backdrop" @click="close"></div>
    <div class="command-palette-panel">
      <div class="command-palette-input-row">
        <Search class="command-palette-icon" :size="18" />
        <input
          ref="inputRef"
          type="text"
          class="command-palette-input"
          placeholder="Type a command or search events…"
          spellcheck="false"
          autocomplete="off"
          v-model="query"
          @keydown="onInputKey"
        />
        <span class="command-palette-hint">Esc</span>
      </div>
      <div ref="listRef" class="command-palette-list" role="listbox">
        <div v-if="filtered.length === 0" class="command-palette-empty">
          No matches
        </div>
        <template v-else>
          <div
            v-for="(item, idx) in filtered"
            :key="idx"
            class="command-palette-item"
            :class="{
              selected: idx === selectedIndex,
              'command-palette-event': item.kind === 'event',
            }"
            :data-idx="idx"
            @click="selectAndExecute(idx)"
          >
            <template v-if="item.kind === 'cmd'">
              <span v-if="item.cmd.category" class="command-palette-cat">{{
                item.cmd.category
              }}</span>
              <span class="command-palette-title">{{ item.cmd.title }}</span>
              <span v-if="item.cmd.shortcut" class="command-palette-shortcut">{{
                item.cmd.shortcut
              }}</span>
            </template>
            <template v-else>
              <span class="command-palette-cat">Event</span>
              <span class="command-palette-title">{{ item.label }}</span>
            </template>
          </div>
        </template>
      </div>
      <div class="command-palette-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span><kbd>Enter</kbd> execute</span>
        <span><kbd>Esc</kbd> close</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Search } from 'lucide-vue-next';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useModals } from '../composables/useModals';
import type { CommandItem, TeslaCamEvent } from '../types';

type FilteredItem =
  | { kind: 'cmd'; cmd: CommandItem }
  | { kind: 'event'; event: TeslaCamEvent; label: string };

const props = defineProps<{
  app?: any;
}>();

const MAX_EVENT_RESULTS = 17;

const {
  isCommandPaletteOpen: isOpen,
  commandPaletteCommands: commands,
  commandPaletteModal,
} = useModals();

const query = ref('');
const selectedIndex = ref(0);

const inputRef = ref<HTMLInputElement | null>(null);
const listRef = ref<HTMLDivElement | null>(null);

function register(command: CommandItem): void {
  commandPaletteModal.register(command);
}

function registerMany(cmds: CommandItem[]): void {
  commandPaletteModal.registerMany(cmds);
}

function getSearchableEvents(): TeslaCamEvent[] {
  return props.app && Array.isArray(props.app.allEvents)
    ? props.app.allEvents
    : [];
}

function formatEventLabel(ev: TeslaCamEvent): string {
  const date = ev.timestamp ? new Date(ev.timestamp).toLocaleString() : '';
  const loc = ev.metadata?.city || ev.metadata?.street || '';
  const type = ev.type || '';
  return [date, loc, type].filter(Boolean).join(' — ');
}

const filtered = computed<FilteredItem[]>(() => {
  const q = query.value.trim().toLowerCase();
  const results: FilteredItem[] = [];

  for (const cmd of commands.value) {
    if (cmd.enabled && !cmd.enabled(props.app)) continue;
    if (q === '') {
      results.push({ kind: 'cmd', cmd });
      continue;
    }
    const hay = [
      cmd.title,
      cmd.category || '',
      Array.isArray(cmd.keywords) ? cmd.keywords.join(' ') : cmd.keywords || '',
    ]
      .join(' ')
      .toLowerCase();

    if (hay.includes(q)) {
      results.push({ kind: 'cmd', cmd });
    }
  }

  // Dynamic event search (requires at least 2 characters)
  if (q.length >= 2) {
    const events = getSearchableEvents();
    let added = 0;
    for (const ev of events) {
      if (added >= MAX_EVENT_RESULTS) break;
      const label = formatEventLabel(ev);
      if (label.toLowerCase().includes(q)) {
        results.push({ kind: 'event', event: ev, label });
        added++;
      }
    }
  }

  return results;
});

// Reset selected index when query changes
watch(query, () => {
  selectedIndex.value = 0;
});

// Scroll selected item into view
watch(selectedIndex, () => {
  nextTick(() => {
    const sel = listRef.value?.querySelector('.command-palette-item.selected');
    if (sel) {
      sel.scrollIntoView({ block: 'nearest' });
    }
  });
});

function open(): void {
  commandPaletteModal.open();
  query.value = '';
  selectedIndex.value = 0;
  nextTick(() => {
    inputRef.value?.focus();
  });
}

function close(): void {
  commandPaletteModal.close();
  if (inputRef.value) {
    inputRef.value.blur();
  }
}

function toggle(): void {
  if (isOpen.value) close();
  else open();
}

function moveSelection(delta: number): void {
  if (filtered.value.length === 0) return;
  selectedIndex.value =
    (selectedIndex.value + delta + filtered.value.length) %
    filtered.value.length;
}

function setSelection(idx: number): void {
  selectedIndex.value = Math.max(0, Math.min(idx, filtered.value.length - 1));
}

function executeSelected(): void {
  const item = filtered.value[selectedIndex.value];
  if (!item) return;
  close();
  try {
    if (item.kind === 'cmd') {
      item.cmd.action(props.app);
    } else if (item.kind === 'event') {
      props?.app?.onEventSelected?.(item.event);
    }
  } catch (err) {
    console.warn('[CommandPalette] Command failed:', err);
  }
}

function selectAndExecute(idx: number): void {
  selectedIndex.value = idx;
  executeSelected();
}

function onInputKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.preventDefault();
    close();
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    moveSelection(1);
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    moveSelection(-1);
    return;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    executeSelected();
    return;
  }
  if (e.key === 'Home') {
    e.preventDefault();
    setSelection(0);
    return;
  }
  if (e.key === 'End') {
    e.preventDefault();
    setSelection(filtered.value.length - 1);
    return;
  }
}

function onGlobalKeyDown(e: KeyboardEvent): void {
  if (!(e.key === 'k' || e.key === 'K')) return;
  if (!(e.ctrlKey || e.metaKey)) return;

  const tgt = e.target as HTMLElement | null;
  const isTextInput =
    tgt &&
    (tgt.tagName === 'INPUT' ||
      tgt.tagName === 'TEXTAREA' ||
      tgt.isContentEditable);
  const isPaletteInput =
    tgt && tgt.classList?.contains('command-palette-input');
  if (isTextInput && !isPaletteInput) return;

  e.preventDefault();
  toggle();
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeyDown);
});

defineExpose({
  open,
  close,
  toggle,
  register,
  registerMany,
  isOpen,
});
</script>

<style scoped>
.command-palette {
  position: fixed;
  inset: 0;
  z-index: 10001;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.12s ease;
}

.command-palette.visible {
  opacity: 1;
  visibility: visible;
}

.command-palette-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
}

.command-palette-panel {
  position: absolute;
  top: 12vh;
  left: 50%;
  transform: translateX(-50%);
  width: min(640px, 90vw);
  max-height: 70vh;
  background: var(--bg-panel, #242424);
  border: 1px solid var(--border, #3a3a3a);
  border-radius: 10px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.command-palette-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border, #3a3a3a);
}

.command-palette-icon {
  color: var(--text-muted, #888);
  flex-shrink: 0;
}

.command-palette-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 1rem;
  font-family: inherit;
}

.command-palette-hint {
  padding: 2px 8px;
  border: 1px solid var(--border, #3a3a3a);
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--text-muted, #888);
  font-family: monospace;
  flex-shrink: 0;
}

.command-palette-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
  min-height: 80px;
}

.command-palette-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-primary);
  transition: background 0.08s ease;
}

.command-palette-item:hover,
.command-palette-item.selected {
  background: var(--bg-elevated, #2f2f2f);
}

.command-palette-cat {
  font-size: 0.7rem;
  color: var(--text-muted, #888);
  background: var(--bg-tertiary, #1a1a1a);
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.command-palette-title {
  flex: 1;
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-palette-shortcut {
  font-size: 0.75rem;
  font-family: monospace;
  color: var(--text-muted, #888);
  padding: 2px 6px;
  border: 1px solid var(--border, #3a3a3a);
  border-radius: 4px;
  flex-shrink: 0;
}

.command-palette-event .command-palette-cat {
  background: var(--accent-subtle, #1b3a52);
  color: var(--accent, #4a9eff);
}

.command-palette-empty {
  padding: 32px;
  text-align: center;
  color: var(--text-muted, #888);
  font-size: 0.9rem;
}

.command-palette-footer {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 14px;
  border-top: 1px solid var(--border, #3a3a3a);
  font-size: 0.75rem;
  color: var(--text-muted, #888);
}

.command-palette-footer kbd {
  background: var(--bg-tertiary, #1a1a1a);
  border: 1px solid var(--border, #3a3a3a);
  border-radius: 3px;
  padding: 1px 5px;
  font-family: monospace;
  font-size: 0.7rem;
  margin-right: 2px;
}
</style>
