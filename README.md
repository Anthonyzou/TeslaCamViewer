# TeslaCam Viewer

A powerful browser-based Tesla dashcam viewer with synchronized multi-angle playback, telemetry visualization, and comprehensive incident analysis tools. All processing happens locally - your video files never leave your computer.

**Live Site: [teslacamviewer.com](https://teslacamviewer.com)**

## Key Features

### Video Playback

- **Synchronized Multi-Camera Playback** - View front, back, left, right (and pillar cameras on newer vehicles) simultaneously
- **Multiple Layout Presets** - Grid, Picture-in-Picture, Focus views, and more
- **Playback Speed Control** - 0.25x to 5x speed with frame-by-frame stepping
- **Fullscreen Mode** - Double-click any camera for fullscreen view

### Event Management

- **Multi-Drive Support** - Add multiple TeslaCam folders and switch between them
- **Event Filtering** - Filter by type (Saved/Sentry/Recent), date range, location, or search
- **Interactive Map** - View all events on a map with location markers and heatmap
- **Statistics Dashboard** - Analytics on event types, locations, recording time, and trends

### Telemetry and Analysis

- **Weather Display** - Historical weather conditions for each event
- **Street View Integration** - Compare dashcam view with Google Street View

### Export and Sharing

- **Screenshot Capture** - Save current frame from all cameras
- **Video Export** - Export clips as WebM or MP4 with overlays
- **Clip Marking** - Set IN/OUT points for precise export ranges

### Customization

- **Theme System** - Dark, Light, Midnight, and Tesla Red themes
- **Multi-Language Support** - Interface available in multiple languages

## Browser Requirements

**Chrome, Edge, or Chromium-based browser required** - This app uses the File System Access API which is only supported in Chromium browsers.

Firefox and Safari are not supported.

## Getting Started

### Option 1: Use the Live Site (Recommended)

Visit [teslacamviewer.com](https://teslacamviewer.com) - no installation required.

### Option 2: Run Locally

1. Clone or download this repository
2. Open `index.html` in Chrome or Edge, or run a local server:

```bash
# Using Node.js
npm run start
```

3. Open http://localhost:8000 in your browser

## Quick Start

1. Click "Select TeslaCam Folder" and choose your TeslaCam directory
2. Browse events in the sidebar - they load with thumbnails and metadata
3. Click an event to start playback
4. Use the timeline to scrub through footage
5. Press `L` to cycle through layout presets

## Keyboard Shortcuts

| Key                  | Action              |
| -------------------- | ------------------- |
| `Space`              | Play/Pause          |
| `Left/Right Arrow`   | Seek 5 seconds      |
| `Shift + Left/Right` | Previous/Next clip  |
| `Up/Down Arrow`      | Previous/Next event |
| `L`                  | Cycle layouts       |
| `M`                  | Toggle GPS mini-map |
| `F`                  | Toggle fullscreen   |
| `S`                  | Take screenshot     |
| `?`                  | Show all shortcuts  |

## Tesla Dashcam Folder Structure

The app reads the standard Tesla TeslaCam folder structure:

```
TeslaCam/
├── SavedClips/
│   └── YYYY-MM-DD_HH-MM-SS/
│       ├── event.json
│       ├── thumb.png
│       └── *.mp4 (4-6 cameras x multiple clips)
├── SentryClips/
│   └── YYYY-MM-DD_HH-MM-SS/
│       ├── event.json
│       ├── thumb.png
│       └── *.mp4
└── RecentClips/
    └── *.mp4 (rolling buffer)
```

## External Services

TeslaCamViewer connects to the following external services for enhanced functionality. **No personal information is transmitted** - only GPS coordinates when specific features are used.


### Map Tile Providers (Images Only)

| Provider                                       | Attribution                   |
| ---------------------------------------------- | ----------------------------- |
| [OpenStreetMap](https://www.openstreetmap.org) | © OpenStreetMap contributors  |

### User-Initiated Links

Links to Google Maps and Google Street View open in new tabs when you click GPS coordinates or the Street View button. No data is sent automatically.

**All video files remain on your computer and are never uploaded.**

## Troubleshooting

**"Browser not supported"**: Use Chrome or Edge browser.

**No events showing**: Ensure you selected the TeslaCam folder or its parent directory.

**Videos won't play**: Check that .mp4 files aren't corrupted. Try another event.

**Telemetry not showing**: Not all Tesla firmware versions embed telemetry data. Older recordings may not have this data.

**Buffering issues with multiple windows**: Use tabs in the same window rather than separate browser windows.

## Contributing

Contributions welcome! Feel free to open issues or pull requests on GitHub.

## Community

Have questions, ideas, or want to share how you use TeslaCam Viewer?

**[Join the Discussion](https://github.com/NateMccomb/TeslaCamViewer/discussions)**

- **Q&A** - Get help with setup or usage questions
- **Ideas** - Suggest new features or improvements
- **Show and Tell** - Share interesting clips or use cases
- **General** - Chat with other Tesla owners

## License

MIT License - see LICENSE file for details.

## Backblaze config

```
[
   {
     "corsRuleName": "allow-frontend",
     "allowedOrigins": [
       "http://localhost:8000"
     ],
     "allowedHeaders": [
       "authorization",
       "content-type",
       "range"
     ],
     "allowedOperations": [
       "s3_get_object",
       "s3_head_object"
     ],
     "exposeHeaders": [
       "content-range"
     ],
     "maxAgeSeconds": 3
   }
]
```
