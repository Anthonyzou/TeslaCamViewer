import { onKeyStroke, useFullscreen } from '@vueuse/core';
import { useClipMarking } from './useClipMarking';
import { eventsStore } from './useEvents';
import { layoutStore } from './useLayout';
import { helpModalStore } from './useModals';
import { playbackStore } from './usePlayback';
import { settingsStore } from './useSettings';
import { timelineStore } from './useTimeline';
import { videoPlayer } from './useVideoPlayer';

interface ShortcutActions {
  togglePlay?: () => void;
  prevClip?: () => void;
  nextClip?: () => void;
  prevEvent?: () => void;
  nextEvent?: () => void;
  markIn?: () => void;
  markOut?: () => void;
  clearMarks?: () => void;
  captureScreenshot?: () => void;
  exportVideo?: () => void;
  openSettings?: () => void;
  openHelp?: () => void;
  frameBack?: () => void;
  frameForward?: () => void;
  changeLayout?: (layout: string) => void;
  changeFocusCamera?: (camera: string) => void;
}

/**
 * useKeyboardShortcuts - Global keyboard shortcuts handler for TeslaCamViewer
 */
export function useKeyboardShortcuts(actions?: ShortcutActions) {
  const { toggle: toggleFullscreen } = useFullscreen();

  onKeyStroke((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
    ) {
      return;
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        if (actions?.togglePlay) actions.togglePlay();
        else playbackStore.togglePlay();
        break;

      case 'ArrowLeft':
        event.preventDefault();
        if (event.shiftKey) {
          if (actions?.prevClip) actions.prevClip();
          else playbackStore.prevClip();
        } else {
          videoPlayer.seek(videoPlayer.currentTime - 5);
        }
        break;

      case 'ArrowRight':
        event.preventDefault();
        if (event.shiftKey) {
          if (actions?.nextClip) actions.nextClip();
          else playbackStore.nextClip();
        } else {
          videoPlayer.seek(videoPlayer.currentTime + 5);
        }
        break;

      case 'KeyH':
      case 'Slash':
        if (event.key === '?' || event.code === 'KeyH') {
          event.preventDefault();
          if (actions?.openHelp) actions.openHelp();
          else helpModalStore.toggle();
        }
        break;

      case 'Comma':
        event.preventDefault();
        if (actions?.frameBack) actions.frameBack();
        else videoPlayer.stepFrame(-1);
        break;

      case 'Period':
        event.preventDefault();
        if (actions?.frameForward) actions.frameForward();
        else videoPlayer.stepFrame(1);
        break;

      case 'KeyQ':
        event.preventDefault();
        if (actions?.openSettings) actions.openSettings();
        else settingsStore.showSettingsModal();
        break;

      case 'KeyL':
        event.preventDefault();
        layoutStore.nextLayout();
        break;

      case 'KeyI':
        event.preventDefault();
        if (actions?.markIn) actions.markIn();
        else useClipMarking().setInPoint();
        break;

      case 'KeyO':
        event.preventDefault();
        if (actions?.markOut) actions.markOut();
        else useClipMarking().setOutPoint();
        break;

      case 'KeyS':
        event.preventDefault();
        actions?.captureScreenshot?.();
        break;

      case 'KeyE':
        event.preventDefault();
        actions?.exportVideo?.();
        break;

      case 'KeyF':
        event.preventDefault();
        toggleFullscreen().catch(console.error);
        break;

      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5':
      case 'Digit6': {
        event.preventDefault();
        const cameras = [
          'front',
          'back',
          'left_repeater',
          'right_repeater',
          'left_pillar',
          'right_pillar',
        ];
        const cameraIndex = parseInt(event.key, 10) - 1;
        if (cameraIndex >= 0 && cameraIndex < cameras.length) {
          if (actions?.changeFocusCamera) {
            actions.changeFocusCamera(cameras[cameraIndex]);
          } else {
            layoutStore.setLayout('layout-focus');
            layoutStore.setFocusCamera(cameras[cameraIndex]);
          }
        }
        break;
      }

      case 'Digit0':
        event.preventDefault();
        videoPlayer.setPlaybackSpeed(1);
        break;

      case 'Equal':
      case 'NumpadAdd':
        event.preventDefault();
        playbackStore.stepSpeed(1);
        break;

      case 'Minus':
      case 'NumpadSubtract':
        event.preventDefault();
        playbackStore.stepSpeed(-1);
        break;

      case 'PageUp':
      case 'ArrowUp':
        event.preventDefault();
        if (actions?.prevEvent) actions.prevEvent();
        else eventsStore.previousEvent();
        break;

      case 'PageDown':
      case 'ArrowDown':
        event.preventDefault();
        if (actions?.nextEvent) actions.nextEvent();
        else eventsStore.nextEvent();
        break;

      case 'Home':
        event.preventDefault();
        videoPlayer.seekToEventTime(0);
        break;

      case 'End': {
        event.preventDefault();
        const duration = timelineStore.duration || 0;
        videoPlayer.seekToEventTime(Math.max(0, duration - 1));
        break;
      }

      case 'Escape':
        event.preventDefault();
        if (actions?.clearMarks) {
          actions.clearMarks();
        } else {
          useClipMarking().clearMarks();
        }
        break;
    }
  });
}
