import { onMounted, onUnmounted } from 'vue';
import { settingsManager } from '../services/settingsManager';

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
  function handleKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
    ) {
      return;
    }

    const app = window.app;

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        if (actions?.togglePlay) actions.togglePlay();
        else app?.togglePlayback();
        break;

      case 'ArrowLeft':
        event.preventDefault();
        if (event.shiftKey) {
          if (actions?.prevClip) actions.prevClip();
          else app?.previousClip();
        } else {
          const vp = app?.videoPlayer;
          if (vp) {
            vp.seek(vp.currentTime - 5);
          }
        }
        break;

      case 'ArrowRight':
        event.preventDefault();
        if (event.shiftKey) {
          if (actions?.nextClip) actions.nextClip();
          else app?.nextClip();
        } else {
          const vp = app?.videoPlayer;
          if (vp) {
            vp.seek(vp.currentTime + 5);
          }
        }
        break;

      case 'KeyL':
        event.preventDefault();
        app?.layoutManager?.nextLayout();
        break;

      case 'KeyH':
      case 'Slash':
        if (event.key === '?' || event.code === 'KeyH') {
          event.preventDefault();
          if (actions?.openHelp) actions.openHelp();
          else app?.helpModal?.toggle();
        }
        break;

      case 'Comma':
        event.preventDefault();
        if (actions?.frameBack) actions.frameBack();
        else app?.videoPlayer?.stepFrame(-1);
        break;

      case 'Period':
        event.preventDefault();
        if (actions?.frameForward) actions.frameForward();
        else app?.videoPlayer?.stepFrame(1);
        break;

      case 'KeyQ':
        event.preventDefault();
        if (actions?.openSettings) actions.openSettings();
        else settingsManager?.showSettingsModal();
        break;

      case 'KeyI':
        event.preventDefault();
        if (actions?.markIn) actions.markIn();
        else app?.markIn();
        break;

      case 'KeyO':
        event.preventDefault();
        if (actions?.markOut) actions.markOut();
        else app?.markOut();
        break;

      case 'KeyS':
        event.preventDefault();
        if (actions?.captureScreenshot) actions.captureScreenshot();
        else app?.captureScreenshot();
        break;

      case 'KeyP':
        event.preventDefault();
        app?.togglePictureInPicture();
        break;

      case 'KeyE':
        event.preventDefault();
        if (actions?.exportVideo) actions.exportVideo();
        else app?.exportVideo();
        break;

      case 'KeyF':
        event.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
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
          const targetCam = cameras[cameraIndex];
          if (actions?.changeFocusCamera) {
            actions.changeFocusCamera(targetCam);
          } else {
            app?.layoutManager?.setLayout('layout-focus');
            app?.layoutManager?.setFocusCamera(targetCam);
          }
        }
        break;
      }

      case 'Digit0': {
        event.preventDefault();
        const vp = app?.videoPlayer;
        if (vp) vp.playbackRate = 1;
        break;
      }

      case 'Equal':
      case 'NumpadAdd':
        event.preventDefault();
        app?.changeSpeed(1);
        break;

      case 'Minus':
      case 'NumpadSubtract':
        event.preventDefault();
        app?.changeSpeed(-1);
        break;

      case 'PageUp':
      case 'ArrowUp':
        event.preventDefault();
        if (actions?.prevEvent) actions.prevEvent();
        else app?.previousEvent();
        break;

      case 'PageDown':
      case 'ArrowDown':
        event.preventDefault();
        if (actions?.nextEvent) actions.nextEvent();
        else app?.nextEvent();
        break;

      case 'Home':
        event.preventDefault();
        app?.videoPlayer?.seekToEventTime(0);
        break;

      case 'End': {
        event.preventDefault();
        const duration = app?.timeline?.duration || 0;
        app?.videoPlayer?.seekToEventTime(Math.max(0, duration - 1));
        break;
      }

      case 'Escape':
        event.preventDefault();
        if (actions?.clearMarks) {
          actions.clearMarks();
        } else {
          app?.clearMarks();
        }
        break;
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });
}
