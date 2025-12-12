# Obsidium

**A fully featured, dependency-free lightbox component for displaying image, video and text collections**

Obsidium is a vanilla JavaScript lightbox viewer with smooth transitions, keyboard navigation, thumbnails strip and variable zoom with drag-to-pan functionality. Features intuitive controls, touch support for mobile devices, and works seamlessly with any image gallery. Zero dependencies.

![Preview](https://github.com/volkar/obsidium/blob/main/preview.jpg?raw=true)

## Live demo

See it in action: [obsidium.syntheticsymbiosis.com](https://obsidium.syntheticsymbiosis.com)

## Features

-   **No dependencies** - Fully standalone, requires no external libraries.
-   **Responsive** - Automatically adjusts to any device, orientation, or screen size.
-   **Swipes** - Swipe left/right to navigate and swipe down to close.
-   **Themes** - Supports light and dark themes.
-   **Customization** - Fine-grained control over visuals and behavior.
-   **Zoom levels** - Adjustable zoom levels via buttons or keyboard shortcuts.
-   **Animations** - Multiple built-in transition animations.
-   **Video** - Supports HTML5 video.
-   **Preloading** - Preloads the next two slides for smooth navigation.
-   **Text content** - Supports HTML and plain text slides.
-   **Thumbnails** - Thumbnail strip navigation.
-   **Keyboard** - Full keyboard navigation and accessibility features.
-   **EXIF** - Optional display of EXIF metadata when available.

## Installation

### Download

Download the latest release from the [releases page](https://github.com/volkar/obsidium/releases/latest) and include the library in your project:

```html
<link rel="stylesheet" href="/obsidium/obsidium.css" />
<script src="/obsidium/obsidium.js"></script>
```

### CDN (if available)

```html
<link rel="stylesheet" href="https://cdn.example.com/obsidium/obsidium.css" />
<script src="https://cdn.example.com/obsidium/obsidium.js"></script>
```

## Quick Start

1. **Create a container with preview images and full-resolution sources:**

```html
<div id="obsidium-images">
    <img src="/preview/img1.jpg" data-src="/images/img1.jpg" />
    <img src="/preview/img2.jpg" data-src="/images/img2.jpg" />
    <img src="/preview/img3.jpg" data-src="/images/img3.jpg" />
    <img src="/preview/img4.jpg" data-src="/images/img4.jpg" />
</div>
```

2. **Instantiate Obsidium and call init():**

```javascript
new Obsidium("obsidium-images").init()
```

That’s all — the lightbox is ready to use.

## Initialization

### Image elements

Option 1. Initialize the lightbox using `<img>` elements that provide a `data-src` attribute for the full-resolution image.

```html
<div id="obsidium-images">
    <img src="/preview/img1.jpg" data-src="/images/img1.jpg" />
    <img src="/preview/img2.jpg" data-src="/images/img2.jpg" />
    <img src="/preview/img3.jpg" data-src="/images/img3.jpg" />
    <img src="/preview/img4.jpg" data-src="/images/img4.jpg" />
</div>
```

```javascript
new Obsidium("obsidium-images").init()
```

### Custom elements

Option 2. Use any HTML elements that expose `data-preview` and `data-src` attributes.

```html
<div id="obsidium-custom">
    <span data-preview="/preview/img1.jpg" data-src="/images/img1.jpg">Link</span>
    <span data-preview="/preview/img2.jpg" data-src="/images/img2.jpg">Link</span>
    <span data-preview="/preview/img3.jpg" data-src="/images/img3.jpg">Link</span>
    <span data-preview="/preview/img4.jpg" data-src="/images/img4.jpg" data-title="Some title">Link</span>
</div>
```

```javascript
new Obsidium("obsidium-custom", "span").init()
```

### Programmatic invocation

Option 3. Provide the image list programmatically and trigger the lightbox manually through any user interaction.

```html
<button id="open-obsidium">Open</button>
```

```javascript
const images = [
    { preview: "/preview/img1.jpg", src: "/images/img1.jpg" },
    { preview: "/preview/img2.jpg", src: "/images/img2.jpg" },
    { preview: "/preview/img3.jpg", src: "/images/img3.jpg" },
    { preview: "/preview/img4.jpg", src: "/images/img4.jpg" },
]

const obsidium = new Obsidium(images2).init()
document.getElementById("open-obsidium").addEventListener("click", () => obsidium.open())
```

### Passing options

Additional configuration options can be passed to the `init` method to customize appearance and behavior.

```javascript
new Obsidium("obsidium", images).init({
    animation: "long-slide",
    theme: "light",
})
```

## In-depth

### Themes

Choose between the built-in `dark` (default) and `light` themes, or define a custom theme.

```javascript
new Obsidium("obsidium", images).init({
    theme: "light",
})
```

### Customization

Most UI and behavior features can be individually enabled or disabled using `init()` options.

```javascript
new Obsidium("obsidium", images).init({
    zoom: false,
    counter: false,
    preload: false,
    title: false,
    thumbnails: false,
    info: false,
    hide: false,
})
```

### Animations

`obsidium.css` includes only the default `short-slide` animation. Additional animations can be imported from the `obsidium/animations` directory.
Custom animations can be added by following the naming conventions.

```html
<link rel="stylesheet" href="/obsidium/animations/flip.css" />
```

```javascript
new Obsidium("obsidium", images).init({
    animation: "flip",
})
```

Available animations: short-slide (default), flip, bounce, fade, long-slide, rotate, stack, zoom.

### Thumbnails

Thumbnail size and spacing can be customized or disabled entirely.

```javascript
new Obsidium("obsidium", images).init({
    thumbnailsSize: "7rem",
    thumbnailsGap: "0.5rem",
})
```

### Text content

You can provide HTML or plain text as content slides.
The `element` option should reference the ID of an existing DOM node.

```html
<div id="source" style="display: none">
    <p>
        The woods are lovely, dark and deep,<br />
        But I have promises to keep,<br />
        And miles to go before I sleep,<br />
        And miles to go before I sleep.
    </p>
</div>
```

```javascript
const slides = [
    { "element": "source" }
    { "text": "Plain text content" }
]
new Obsidium("obsidium", slides).init({
    thumbnails: false,
    zoom: false
})
```

### EXIF metadata

To enable EXIF extraction in the info panel, include the `exifr` library.
Ensure that image files are served from the same origin or have CORS properly configured.

```html
<script src="https://cdn.jsdelivr.net/npm/exifr/dist/lite.umd.js"></script>
```

```javascript
new Obsidium("obsidium", images).init()
```

### Keyboard bindings

`Right, Space` Next slide
`Left, Backspace` Prev slide
`Down / Up` Hide/show interface
`Escape` Close
`+ / -` Zoom in/out
`i` Toggle the info panel

## Options

| Option                       | Type    | Default            | Description                                                                                                       |
| ---------------------------- | ------- | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `zoom`                       | boolean | `true`             | Enables or disables zoom functionality.                                                                           |
| `zoomLevels`                 | array   | `[1.5, 2, 2.5, 3]` | List of zoom multipliers used for zoom-in steps.                                                                  |
| `counter`                    | boolean | `true`             | Displays the slide counter (e.g., 1 / 6)                                                                          |
| `preload`                    | boolean | `true`             | Preloads adjacent slides to enhance navigation responsiveness.                                                    |
| `title`                      | boolean | `true`             | Displays the slide title below the image.                                                                         |
| `info`                       | boolean | `true`             | Enables the EXIF/info panel.                                                                                      |
| `hide`                       | boolean | `true`             | Allows the interface (controls, overlays) to be hidden or shown.                                                  |
| `loadExif`                   | boolean | `true`             | Allows EXIF loading from images using the `exifr` library.                                                        |
| `thumbnails`                 | boolean | `true`             | Enables the thumbnail strip under the viewer.                                                                     |
| `thumbnailsSize`             | string  | `3rem`             | Defines the size of thumbnails (CSS unit).                                                                        |
| `thumbnailsGap`              | string  | `0.25rem`          | Defines spacing between thumbnails (CSS unit).                                                                    |
| `clickOutsideToClose`        | boolean | `true`             | Closes the lightbox when the user clicks outside the image area.                                                  |
| `translateOnHorizontalSwipe` | boolean | `true`             | Enables slight horizontal translation while swiping (cosmetic). Useful to disable when using complex transitions. |
| `translateOnVerticalSwipe`   | boolean | `true`             | Enables vertical translation when swiping down to close.                                                          |
| `animation`                  | string  | `short-slide`      | Specifies the transition animation between slides (CSS class suffix).                                             |
| `theme`                      | string  | `dark`             | Sets the color theme ("dark", "light", or custom)                                                                 |

## Methods

### `init(options)`

Initializes the lightbox instance with optional configuration.

**Parameters:**

-   `options` (object, optional) - Configuration options for the lightbox

**Returns:** The lightbox instance (for method chaining)

**Example:**

```javascript
const obsidium = new Obsidium("obsidium", images).init({
    theme: "light",
})
```

### `open(index, direction)`

Opens the lightbox at a specific slide index and applies the specified animation direction.
**Parameters:**

-   `index` (integer) - Slide index
-   `direction` (string, optional) - Direction of animation. `left`, `right` or `none`

### `close()`

Closes the lightbox and resets internal state and focus.
**Parameters:** None

### `next()`

Navigates to the next slide.
**Parameters:** None

### `prev()`

Navigates to the previous slide.
**Parameters:** None

### `hideInterface()`

Hides navigation controls and overlays when enabled.
**Parameters:** None

### `showInterface()`

Shows UI controls and overlays.
**Parameters:** None

### `refreshElements()`

Re-scans the DOM or provided data array and rebuilds the slide list.
**Parameters:** None

### `updateOptions(newOptions)`

Applies updated configuration values at runtime without reinitializing the entire component.
**Parameters:**

-   `newOptions` (object) - New configuration options (will be merged with existing options)

**Example:**

```javascript
obsidium.updateOptions({
    theme: "light",
    zoom: false,
})
```

### `destroy()`

Removes all lightbox DOM elements and detaches all associated listeners.
**Parameters:** None

## Integration with Lumosaic image gallery

You can use Obsidium with [Lumosaic](https://lumosaic.syntheticsymbiosis.com) out of the box:

```html
<div id="lumosaic"></div>
```

```javascript
const images = [
    { src: "https://picsum.photos/800/600?random=1", width: 800, height: 600 },
    { src: "https://picsum.photos/800/600?random=2", width: 800, height: 600 },
    { src: "https://picsum.photos/800/800?random=3", width: 800, height: 800 },
    { src: "https://picsum.photos/600/800?random=4", width: 600, height: 800 },
    { src: "https://picsum.photos/800/600?random=5", width: 800, height: 600 },
    { src: "https://picsum.photos/800/800?random=6", width: 800, height: 800 },
]
const lumosaic = new Lumosaic("lumosaic", images).init().then(() => {
    // Bind Obsidium
    new Obsidium("#lumosaic").init()
})
```

## Browser Support

Obsidium works in all modern browsers.

## License

Released under the [MIT License](LICENSE).

## Links

-   [Documentation & Demo](https://obsidium.syntheticsymbiosis.com)
-   [GitHub Repository](https://github.com/volkar/obsidium)
-   [Latest Release](https://github.com/volkar/obsidium/releases/latest)
