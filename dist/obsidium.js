/**
 * Obsidium 1.1.0
 * A fully featured, dependency-free lightbox component for displaying image, video and text collections
 * Obsidium is a descendant of the 2016 Obsidian library that was never released.
 *
 * https://obsidium.syntheticsymbiosis.com
 * Copyright 2025 Sergey Volkar ⣿ SyntheticSymbiosis
 *
 * Released under the MIT License
 */
class Obsidium {
    constructor(source, sourceElements = 'img') {
        // Default options
        this.options = {
            zoom: true,
            zoomLevels: [1.5, 2, 2.5, 3],
            counter: true,
            preload: true,
            title: true,
            info: true,
            hide: true,
            loadExif: true,
            thumbnails: true,
            thumbnailsSize: '3rem',
            thumbnailsGap: '0.25rem',
            clickOutsideToClose: true,
            translateOnHorizontalSwipe: true,
            translateOnVerticalSwipe: true,
            animation: 'short-slide',
            theme: 'dark'
        }

        // Class properties
        this.params = { source, sourceElements }
        this.elements = null
        this.currentIndex = 0
        this.isDragging = false
        this.startX = 0
        this.startY = 0
        this.translateX = 0
        this.translateY = 0
        this.activeWrapperNumber = 1
        this.lastInteractionWasKeyboard = false
        this.zoomLevel = 0
        this.prevZoomLevel = 0
        this.isTicking = false
        this.returnFocusElement = null
        this.interfaceHidden = false
        this.contentType = false
        this.focusableString = 'button:not(.obsidium-hidden), [href]:not(.obsidium-hidden), [tabindex]:not([tabindex="-1"]):not(.obsidium-hidden)'
    }

    // --- Public functions ---

    init(userOptions = {}) {
        // Initializes the lightbox, sets options, creates DOM, and prepares elements for use.
        if (typeof this.params.source === 'string') {
            // Source is a string. Get elements from DOM
            this.gallery = document.querySelector(this.params.source)
            if (!this.gallery) return
        }
        // Merge user options with defaults
        this.#mergeOptions(userOptions)
        // Get elements from params
        this.#processParams()
        if (!this.elements.length) return
        // Create DOM elements
        this.#createLightbox()
        // Apply options
        this.#applyOptions()
        return this
    }

    open(index = 0, direction = 'none') {
        // Opens the lightbox overlay at the specified image index and transition direction.
        this.returnFocusElement = document.activeElement
        this.lightbox.removeAttribute('inert')
        this.lightbox.classList.add('active')
        document.body.style.overflow = 'hidden'
        this.#showOverlay(index, direction)
    }

    close() {
        // Closes the lightbox overlay and resets state/styles for clean exit.
        this.lightbox.classList.remove('active')
        this.lightbox.setAttribute('inert', '')
        document.body.style.overflow = ''
        // Clear styles and zoom state
        this.currentWrapper.classList.remove('active')
        this.prevWrapper.classList.remove('active')
        this.#removeWrapperAnimationClasses()
        this.#resetZoom()
        // Stop current video if any
        this.#stopCurrentVideo()
        // Return focus
        if (this.returnFocusElement) {
            this.returnFocusElement.focus()
            this.returnFocusElement = null
        }
    }

    next() {
        // Navigates to the next image in the lightbox.
        if (this.elements.length === 1) return
        const nextIndex = (this.currentIndex + 1) % this.elements.length
        this.#showOverlay(nextIndex, 'right')
    }

    prev() {
        // Navigates to the previous image in the lightbox.
        if (this.elements.length === 1) return
        const prevIndex = (this.currentIndex - 1 + this.elements.length) % this.elements.length
        this.#showOverlay(prevIndex, 'left')
    }

    hideInterface() {
        // Hides the lightbox interface if hidden.
        if (this.zoomLevel === 0 && (this.contentType === 'image' || this.contentType === 'video') && this.options.hide !== false) {
            this.lightbox.classList.add('interface-hidden')
            this.interfaceHidden = true
            this.#updateElementsVisibility()
        }
    }

    showInterface() {
        // Shows the lightbox interface if hidden.
        if (this.zoomLevel === 0) {
            this.lightbox.classList.remove('interface-hidden')
            this.interfaceHidden = false
            this.#updateElementsVisibility()
        }
    }

    refreshElements() {
        // Re-extracts gallery elements from the DOM or source and updates lightbox state.
        this.#processParams()
    }

    updateOptions(newOptions) {
        const oldOptions = this.options
        // Updates lightbox options and applies changes at runtime.
        this.#mergeOptions(newOptions)
        this.#applyOptions(oldOptions)
    }

    destroy() {
        // Cleans up event listeners and removes the lightbox from the DOM.
        // Delete event listeners
        document.removeEventListener('pointerup', this.#onDocumentPointerUp)
        document.removeEventListener('pointercancel', this.#onDocumentPointerUp)
        window.removeEventListener('mousedown', this.#onWindowMouseDown)
        document.removeEventListener('keydown', this.#onDocumentKeyDown)
        // Delete lightbox from the DOM
        if (this.lightbox && this.lightbox.parentNode) {
            this.lightbox.parentNode.removeChild(this.lightbox)
        }
        // Clear links
        this.elements = null
        this.lightbox = null
    }

    // --- Private functions ---

    #toggleInfo() {
        // Toggles the display of the image information overlay in the lightbox.
        if (this.options.info) {
            this.lightbox.classList.toggle('info')
        }
    }

    #processParams() {
        // Processes the input parameters to build the elements array for the lightbox
        if (typeof this.params.source === 'string') {
            // Source is a string. Get elements from DOM
            const elementsArray = Array.from(document.querySelectorAll(this.params.source + ' ' + this.params.sourceElements))
            const formattedArray = []
            elementsArray.forEach((element) => {
                if (element.tagName.toLowerCase() === this.params.sourceElements) {
                    const tmpElementArray = {
                        src: element.dataset.src,
                        preview: element.src || element.dataset.preview,
                        title: element.title || element.dataset.title,
                    }
                    if (element.dataset.exif) {
                        const exif = JSON.parse(element.dataset.exif)
                        if (exif) {
                            tmpElementArray.exif = exif
                        }
                    }
                    formattedArray.push(tmpElementArray)
                }
            })
            this.elements = formattedArray
        } else if (Array.isArray(this.params.source)) {
            // Source is an array
            this.elements = this.params.source
        }

        // Fill content type for elements
        this.elements.forEach((element) => {
            if (!element.src) {
                element.type = 'text'
            } else {
                // Check if it's a video
                if (element.src.toLowerCase().endsWith('.mp4') ||
                    element.src.toLowerCase().endsWith('.webm') ||
                    element.src.toLowerCase().endsWith('.mov') ||
                    element.src.toLowerCase().endsWith('.avi') ||
                    element.src.toLowerCase().endsWith('.wmv')) {
                    element.type = 'video'
                } else {
                    element.type = 'image'
                }
            }
        })
    }

    #createLightbox() {
        // Creates and appends lightbox HTML structure to the DOM and assigns element references.
        const obsidiumHTML = `
            <div class="obsidium-container">
                <div class="obsidium-wrapper" data-wrapper="1">
                    <img src="" alt="" class="obsidium-image" data-img="1">
                    <video src="" alt="" class="obsidium-video" data-video="1" controls></video>
                    <div class="obsidium-content-wrapper" data-content="1"><div class="obsidium-content-box"><div class="obsidium-content-body"></div></div></div>
                    <div class="obsidium-title"><div data-title="1"></div></div>
                    <div class="obsidium-wrapper-background" data-bg="1"></div>
                </div>
                <div class="obsidium-wrapper" data-wrapper="2">
                    <img src="" alt="" class="obsidium-image" data-img="2">
                    <video src="" alt="" class="obsidium-video" data-video="2" controls></video>
                    <div class="obsidium-content-wrapper" data-content="2"><div class="obsidium-content-box"><div class="obsidium-content-body"></div></div></div>
                    <div class="obsidium-title"><div data-title="2"></div></div>
                    <div class="obsidium-wrapper-background" data-bg="2"></div>
                </div>
            </div>
            <div class="obsidium-counter">0 / 0</div>
            <div class="obsidium-info-wrapper"></div>
            <div class="obsidium-zoom-ratio"></div>
            <div class="obsidium-thumbnails-wrapper"><div class="obsidium-thumbnails"></div></div>

            <button class="obsidium-btn obsidium-close" tabindex="1" aria-label="Close"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-dasharray="12" stroke-dashoffset="12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 12l7 7M12 12l-7 -7M12 12l-7 7M12 12l7 -7"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.3s" values="12;0"/></path></svg></button>
            <button class="obsidium-btn obsidium-prev" tabindex="5" aria-label="Prev"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><path fill="currentColor" d="m4 10l9 9l1.4-1.5L7 10l7.4-7.5L13 1z"/></svg></button>
            <button class="obsidium-btn obsidium-next" tabindex="2" aria-label="Next"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><path fill="currentColor" d="M7 1L5.6 2.5L13 10l-7.4 7.5L7 19l9-9z"/></svg></button>
            <button class="obsidium-btn obsidium-zoom-in" tabindex="6" aria-label="Zoom in"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21l-4.35-4.35M11 8v6m-3-3h6"/></g></svg></button>
            <button class="obsidium-btn obsidium-zoom-out" tabindex="7" aria-label="Zoom out"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21l-4.35-4.35M8 11h6"/></g></svg></button>
            <button class="obsidium-btn obsidium-interface" tabindex="4" aria-label="Hide interface"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575a1 1 0 0 1 0 .696a10.8 10.8 0 0 1-1.444 2.49m-6.41-.679a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151a1 1 0 0 1 0-.696a10.75 10.75 0 0 1 4.446-5.143M2 2l20 20"/></g></svg></button>
            <button class="obsidium-btn obsidium-info" tabindex="3" aria-label="Info"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none"><circle cx="12" cy="12" r="9.25" stroke="currentColor" stroke-width="1.5"/><path stroke="currentColor" stroke-linecap="round" stroke-width="1.5" d="M12 11.813v5"/><circle cx="12" cy="8.438" r="1.25" fill="currentColor"/></g></svg></button>

            <img class="obsidium-preload" data-preload="1" fetchpriority="high" src="">
            <img class="obsidium-preload" data-preload="2" src="">`

        const container = document.createElement('div')
        container.classList.add('obsidium')
        container.setAttribute('role', 'dialog')
        container.setAttribute('aria-modal', 'true')
        container.setAttribute('inert', '')
        container.innerHTML = obsidiumHTML.trim()
        document.body.appendChild(container)
        // Static elements
        this.lightbox = container
        this.bg1 = this.lightbox.querySelector('[data-bg="1"]')
        this.bg2 = this.lightbox.querySelector('[data-bg="2"]')
        this.img1 = this.lightbox.querySelector('[data-img="1"]')
        this.img2 = this.lightbox.querySelector('[data-img="2"]')
        this.content1 = this.lightbox.querySelector('[data-content="1"]')
        this.content2 = this.lightbox.querySelector('[data-content="2"]')
        this.video1 = this.lightbox.querySelector('[data-video="1"]')
        this.video2 = this.lightbox.querySelector('[data-video="2"]')
        this.wrapper1 = this.lightbox.querySelector('[data-wrapper="1"]')
        this.wrapper2 = this.lightbox.querySelector('[data-wrapper="2"]')
        this.title1 = this.lightbox.querySelector('[data-title="1"]')
        this.title2 = this.lightbox.querySelector('[data-title="2"]')
        this.preload1 = this.lightbox.querySelector('[data-preload="1"]')
        this.preload2 = this.lightbox.querySelector('[data-preload="2"]')
        this.closeBtn = this.lightbox.querySelector('.obsidium-close')
        this.prevBtn = this.lightbox.querySelector('.obsidium-prev')
        this.nextBtn = this.lightbox.querySelector('.obsidium-next')
        this.zoomInBtn = this.lightbox.querySelector('.obsidium-zoom-in')
        this.zoomOutBtn = this.lightbox.querySelector('.obsidium-zoom-out')
        this.interfaceBtn = this.lightbox.querySelector('.obsidium-interface')
        this.infoBtn = this.lightbox.querySelector('.obsidium-info')
        this.counterText = this.lightbox.querySelector('.obsidium-counter')
        this.infoText = this.lightbox.querySelector('.obsidium-info-wrapper')
        this.zoomRatioText = this.lightbox.querySelector('.obsidium-zoom-ratio')
        this.thumbnails = this.lightbox.querySelector('.obsidium-thumbnails')
        this.thumbnailsWrapper = this.lightbox.querySelector('.obsidium-thumbnails-wrapper')
        // Dynamic elements
        this.currentWrapper = this.wrapper1
        this.currentTitle = this.title1
        this.currentVideo = this.video1
        this.currentImage = this.img1
        this.currentContent = this.content1
        this.prevWrapper = this.wrapper2
        // Bind events
        this.#bindElementsEvent()
        this.#bindGlobalEvents()
        // Apply options
        this.#applyOptions()
    }

    #applyOptions(oldOptions = false) {
        // Applies current options to the UI elements.
        this.zoomInBtn.style.display = this.options.zoom ? 'block' : 'none'
        this.zoomOutBtn.style.display = this.options.zoom ? 'block' : 'none'
        this.zoomRatioText.style.display = this.options.zoom ? 'block' : 'none'
        this.counterText.style.display = (this.options.counter && this.elements.length > 1) ? 'block' : 'none'
        this.infoBtn.style.display = this.options.info ? 'block' : 'none'
        this.infoText.style.display = this.options.info ? 'block' : 'none'
        this.title1.style.display = this.options.title ? 'block' : 'none'
        this.title2.style.display = this.options.title ? 'block' : 'none'
        this.bg1.style.display = this.options.clickOutsideToClose ? 'block' : 'none'
        this.bg2.style.display = this.options.clickOutsideToClose ? 'block' : 'none'
        this.interfaceBtn.style.display = this.options.hide ? 'block' : 'none'

        this.lightbox.classList.add('obsidium-theme-' + this.options.theme)

        if (this.options.thumbnails === false || this.elements.length === 1) {
            this.thumbnailsWrapper.style.display = 'none'
            this.lightbox.classList.remove('has-thumbnails')
        } else {
            this.thumbnailsWrapper.style.display = 'block'
            this.lightbox.classList.add('has-thumbnails')
            this.lightbox.style.setProperty('--thumbnail-size', this.options.thumbnailsSize)
            this.lightbox.style.setProperty('--thumbnail-gap', this.options.thumbnailsGap)
            this.#fillThumbnails()
        }

        if (oldOptions && this.options.animation !== oldOptions.animation) {
            // Animation changed, remove old classes
            this.#removeWrapperAnimationClasses(oldOptions.animation)
        }
        if (oldOptions && this.options.theme !== oldOptions.theme) {
            // Theme changed
            this.lightbox.classList.remove('obsidium-theme-' + oldOptions.theme)
        }

        // Lightbox is open, change state based on new settings
        if (this.lightbox.classList.contains('active')) {
            if (this.zoomLevel > 0 && this.options.zoom === false) {
                this.#resetZoom()
            }
            if (this.interfaceHidden === true && this.options.hide === false) {
                this.showInterface()
            }
            if (oldOptions && this.zoomLevel > 0 && this.options.zoomLevels !== oldOptions.zoomLevels) {
                // Zoom levels changes
                if (this.options.zoomLevels.length > 0) {
                    this.zoomLevel = 1
                } else {
                    this.zoomLevel = 0
                }
                this.#setZoom()
            }
        }
    }

    #setElementVisibility(element, visibility) {
        // Sets the visibility of a given element
        if (visibility) {
            element.classList.remove('obsidium-hidden')
            element.removeAttribute('inert')
        } else {
            element.classList.add('obsidium-hidden')
            element.setAttribute('inert', '')
        }
    }

    #updateElementsVisibility() {
        // Updates the visibility of lightbox interface elements based on the current UI state.
        this.#setElementVisibility(this.zoomOutBtn, this.zoomLevel > 0 && this.contentType === 'image')
        this.#setElementVisibility(this.zoomInBtn, (!this.interfaceHidden && this.contentType === 'image') || this.zoomLevel > 0)
        this.#setElementVisibility(this.zoomRatioText, this.zoomLevel > 0)
        this.#setElementVisibility(this.counterText, !this.interfaceHidden && this.zoomLevel === 0)
        this.#setElementVisibility(this.currentTitle, !this.interfaceHidden && this.zoomLevel === 0 && (this.contentType === 'image' || this.contentType === 'video'))
        this.#setElementVisibility(this.thumbnails, !this.interfaceHidden && this.zoomLevel === 0 && (this.contentType === 'image' || this.contentType === 'video'))
        this.#setElementVisibility(this.interfaceBtn, this.zoomLevel === 0)
        this.#setElementVisibility(this.prevBtn, !this.interfaceHidden && this.zoomLevel === 0 && this.elements.length > 1)
        this.#setElementVisibility(this.nextBtn, !this.interfaceHidden && this.zoomLevel === 0 && this.elements.length > 1)
        this.#setElementVisibility(this.infoText, !this.interfaceHidden && this.zoomLevel === 0)
        this.#setElementVisibility(this.infoBtn, !this.interfaceHidden && this.zoomLevel === 0)
        this.#setElementVisibility(this.closeBtn, !this.interfaceHidden && this.zoomLevel === 0)
    }

    #fillThumbnails() {
        // Populates the thumbnails strip with preview images for each gallery element.
        this.thumbnails.innerHTML = ''
        // Create thumbnails
        if (this.options.thumbnails === true) {
            this.elements.forEach((element, index) => {
                const thumbnail = document.createElement('div')
                thumbnail.classList.add('obsidium-thumbnail')
                thumbnail.style.backgroundImage = `url(${element.preview})`
                thumbnail.dataset.index = index
                // Add click event
                thumbnail.addEventListener('click', (e) => {
                    if (this.currentIndex > index) {
                        this.open(index, 'left')
                    } else if (this.currentIndex < index) {
                        this.open(index, 'right')
                    }
                    return false
                })
                this.thumbnails.appendChild(thumbnail)
            })
        }
    }

    #bindElementsEvent() {
        // Binds event listeners to gallery elements for opening the lightbox on thumbnail click.
        if (typeof this.params.source === 'string') {
            this.gallery.addEventListener('click', (event) => {
                // If click was on source element
                const clickedSource = event.target.closest(this.params.sourceElements)
                if (clickedSource) {
                    // Get the index
                    const allSources = Array.from(this.gallery.querySelectorAll(this.params.sourceElements))
                    const index = allSources.indexOf(clickedSource)
                    // Open lightbox
                    this.open(index)
                }
            })
        }
    }

    #bindGlobalEvents() {
        // Binds global event listeners (keyboard navigation, resize, and pointer/mouse events)

        // Mouse or touch
        document.addEventListener('pointerup', this.#onDocumentPointerUp)
        document.addEventListener('pointercancel', this.#onDocumentPointerUp)

        ;[this.img1, this.img2].forEach((el) => {
            el.addEventListener('pointerdown', (e) => {
                // Capture the pointer
                e.target.setPointerCapture(e.pointerId)

                this.isDragging = true
                this.startX = e.clientX - this.translateX
                this.startY = e.clientY - this.translateY
                e.preventDefault()
            })
            el.addEventListener('pointermove', (e) => {
                if (!this.isDragging) return
                e.preventDefault()
                // Delta coordinates
                this.translateX = e.clientX - this.startX
                this.translateY = e.clientY - this.startY
                if (this.zoomLevel > 0) {
                    // Zoomed, treat as dragging
                    if (!this.isTicking) {
                        window.requestAnimationFrame(() => {
                            this.#updateImagePosition()
                        })
                        this.isTicking = true
                    }
                } else {
                    // If not zoomed, treat as swipe
                    if (Math.abs(this.translateX) > Math.abs(this.translateY)) {
                        this.translateY = 0
                        if (this.options.translateOnHorizontalSwipe) {
                            // Allow for vertical drag
                            if (!this.isTicking) {
                                window.requestAnimationFrame(() => {
                                    this.#updateImagePosition()
                                })
                                this.isTicking = true
                            }
                        }
                    } else {
                        this.translateX = 0
                        if (this.options.translateOnVerticalSwipe) {
                            // Allow for vertical drag
                            if (!this.isTicking) {
                                window.requestAnimationFrame(() => {
                                    this.#updateImagePosition()
                                })
                                this.isTicking = true
                            }
                        }
                    }
                    // Calculate swipe
                    const swipeLength = 30
                    let dx = this.translateX
                    let dy = this.translateY
                    if (Math.abs(dx) > Math.abs(dy)) {
                        // Horizontal swipe, next/prev image
                        if (dx > swipeLength) {
                            this.prev()
                            this.isDragging = false
                        } else if (dx < -swipeLength) {
                            this.next()
                            this.isDragging = false
                        }
                    } else if (Math.abs(dy) > swipeLength) {
                        // Vertical swipe, close overlay
                        this.close()
                        this.isDragging = false
                    }
                }
            })
        })

        // Buttons

        this.closeBtn.addEventListener('click', (e) => {
            this.close()
            if (!this.lastInteractionWasKeyboard) e.currentTarget.blur()
        })
        this.prevBtn.addEventListener('click', (e) => {
            this.prev()
            if (!this.lastInteractionWasKeyboard) e.currentTarget.blur()
        })
        this.nextBtn.addEventListener('click', (e) => {
            this.next()
            if (!this.lastInteractionWasKeyboard) e.currentTarget.blur()
        })
        this.interfaceBtn.addEventListener('click', (e) => {
            if (this.interfaceHidden === false) {
                this.hideInterface()
            } else {
                this.showInterface()
            }
            if (!this.lastInteractionWasKeyboard) e.currentTarget.blur()
        })
        this.infoBtn.addEventListener('click', (e) => {
            this.#toggleInfo()
            if (!this.lastInteractionWasKeyboard) e.currentTarget.blur()
        })
        this.zoomInBtn.addEventListener('click', (e) => {
            this.#zoomIn()
            if (!this.lastInteractionWasKeyboard) e.currentTarget.blur()
        })
        this.zoomOutBtn.addEventListener('click', (e) => {
            this.#zoomOut()
            if (!this.lastInteractionWasKeyboard) e.currentTarget.blur()
        })
        // Close by background clicking
        ;[this.bg1, this.bg2].forEach((el) => el.addEventListener('click', () => this.close()))

        window.addEventListener('mousedown', this.#onWindowMouseDown)
        // Keyboard
        document.addEventListener('keydown', this.#onDocumentKeyDown)
    }

    #onDocumentPointerUp = (e) => {
        // Handles pointer up events to finish drag/pan or touch actions
        if (this.zoomLevel === 0) {
            // Reset "swipe dragging"
            this.translateX = 0
            this.translateY = 0
            this.isTicking = false
            this.#updateImagePosition()
        }
        this.isDragging = false
    }

    #onWindowMouseDown = (e) => {
        // Handles mouse down event to record that the last interaction was not via keyboard
        this.lastInteractionWasKeyboard = false
    }

    #onDocumentKeyDown = (e) => {
        // Handles keyboard navigation and interface controls for the lightbox
        if (!this.lightbox.classList.contains('active')) return

        if (['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            this.lastInteractionWasKeyboard = true
        }
        if (e.key === 'Tab') {
            this.#handleTabKey(e)
            return false
        }
        switch (e.key) {
            case 'Escape':
                this.close()
                break
            case 'ArrowLeft':
            case 'Backspace':
                this.prev()
                break
            case 'ArrowRight':
            case ' ':
                this.next()
                break
            case 'i':
                this.#toggleInfo()
                break
            case '+':
            case '=':
                this.#zoomIn()
                break
            case '-':
                this.#zoomOut()
                break
            case 'ArrowDown':
                this.hideInterface()
                break
            case 'ArrowUp':
                this.showInterface()
                break
        }
    }

    #handleTabKey = (e) => {
        const focusableElements = Array.from(this.lightbox.querySelectorAll(this.focusableString)).filter((el) => el.offsetParent !== null)

        if (focusableElements.length === 0) {
            e.preventDefault()
            return
        }
        // Sort focusableElements by numeric tabindex, falling back to 0 if not present
        focusableElements.sort((a, b) => {
            const ta = parseInt(a.getAttribute('tabindex') ?? '0', 10)
            const tb = parseInt(b.getAttribute('tabindex') ?? '0', 10)
            return ta - tb
        })
        const firstFocusable = focusableElements[0]
        const lastFocusable = focusableElements[focusableElements.length - 1]
        // If current element not in a list
        if (!focusableElements.includes(document.activeElement)) {
            focusableElements[0].focus()
            e.preventDefault()
            return
        }
        if (e.shiftKey) {
            // Shift + Tab (Backward)
            if (document.activeElement === firstFocusable) {
                e.preventDefault()
                lastFocusable.focus()
            }
        } else {
            // Tab (Forward)
            if (document.activeElement === lastFocusable) {
                e.preventDefault()
                firstFocusable.focus()
            }
        }
    }

    #stopCurrentVideo() {
        if (this.contentType === 'video' && this.currentVideo.src) {
            this.currentVideo.pause()
        }
    }

    #showOverlay(index, direction) {
        // Displays the image overlay for the given index and handles overlay transition/animation.
        this.currentIndex = index
        const element = this.elements[index]
        // Stop current video if any
        this.#stopCurrentVideo()

        if (this.options.thumbnails === true) {
            // Remove prev active thumbnail class
            const prevActiveThumbnail = this.thumbnails.querySelector('.obsidium-thumbnail.active')
            if (prevActiveThumbnail) {
                prevActiveThumbnail.classList.remove('active')
            }
            // Set active thumbnail
            const currentActiveThumbnail = this.thumbnails.querySelector(`.obsidium-thumbnail[data-index="${index}"]`)
            if (currentActiveThumbnail) {
                currentActiveThumbnail.classList.add('active')
            }

            // Scroll thumbnails horizontally to center the active thumbnail
            if (currentActiveThumbnail && this.thumbnails && this.thumbnails.parentElement) {
                const thumbnailsWrapper = this.thumbnails.parentElement
                // Calculate scroll position to center the active thumbnail
                const scrollOffset = currentActiveThumbnail.offsetLeft + currentActiveThumbnail.offsetWidth / 2 - thumbnailsWrapper.offsetWidth / 2
                thumbnailsWrapper.scrollTo({
                    left: scrollOffset,
                    behavior: 'smooth'
                })
            }
        }
        // Change active slide wrappers
        if (this.activeWrapperNumber === 1) {
            this.currentWrapper = this.wrapper2
            this.currentImage = this.img2
            this.currentVideo = this.video2
            this.currentContent = this.content2
            this.currentTitle = this.title2
            this.currentInfo = this.info2
            this.prevWrapper = this.wrapper1
            this.activeWrapperNumber = 2
        } else {
            this.currentWrapper = this.wrapper1
            this.currentImage = this.img1
            this.currentVideo = this.video1
            this.currentContent = this.content1
            this.currentTitle = this.title1
            this.currentInfo = this.info1
            this.prevWrapper = this.wrapper2
            this.activeWrapperNumber = 1
        }
        // Reset image (if already loaded)
        this.currentImage.src = ''
        // Reset video (if already loaded)
        this.currentVideo.src = ''
        // Reset preview
        this.currentImage.style.backgroundImage = ''
        // Reset content (if already loaded)
        this.currentContent.querySelector('.obsidium-content-body').textContent = ''
        // Set counter text
        this.counterText.textContent = `${index + 1} / ${this.elements.length}`
        if (element.src && (!element.type || element.type === 'image')) {
            // Image type
            this.contentType = 'image'
            this.currentWrapper.classList.remove('obsidium-type-content')
            this.currentWrapper.classList.remove('obsidium-type-video')
            this.currentWrapper.classList.add('obsidium-type-image')
            this.lightbox.classList.remove('force-hide-thumbnails')
            this.currentImage.src = element.src
            if (element.preview) {
                // Set low-resolution preview for background, while high-resolution image is loading
                this.currentImage.style.backgroundImage = 'url(' + element.preview + ')'
            }
        } else if (element.type === 'video') {
            // Video type
            this.contentType = 'video'
            this.currentWrapper.classList.remove('obsidium-type-text')
            this.currentWrapper.classList.remove('obsidium-type-image')
            this.currentWrapper.classList.add('obsidium-type-video')
            this.lightbox.classList.remove('force-hide-thumbnails')
            this.currentVideo.src = element.src
        } else if (element.text || element.element) {
            // Text content type
            this.contentType = 'text'
            this.currentWrapper.classList.remove('obsidium-type-image')
            this.currentWrapper.classList.remove('obsidium-type-video')
            this.currentWrapper.classList.add('obsidium-type-content')
            this.lightbox.classList.add('force-hide-thumbnails')
            const elementDest = this.currentContent.querySelector('.obsidium-content-body')
            if (element.text) {
                // Just a text, use innerHTML in case of HTML tags
                elementDest.innerHTML = element.text
            }
            if (element.element) {
                // Append clone children to destination element
                const sourceElement = document.getElementById(element.element)
                Array.from(sourceElement.childNodes).forEach((node) => {
                    // true означает глубокое копирование (вместе с вложенностью этого потомка)
                    const cloneNode = node.cloneNode(true)
                    elementDest.appendChild(cloneNode)
                })
            }
        }

        // Set title
        if (this.options.title) {
            if (element.title) {
                this.currentTitle.textContent = element.title
            } else {
                this.currentTitle.textContent = ''
            }
        }
        // Remove old classes
        this.#removeWrapperAnimationClasses()
        // Animation effect classes
        if (direction === 'left') {
            this.currentWrapper.classList.add('animation-in-prev' + '-' + this.options.animation)
            this.prevWrapper.classList.add('animation-out-next' + '-' + this.options.animation)
        } else if (direction === 'right') {
            this.currentWrapper.classList.add('animation-in-next' + '-' + this.options.animation)
            this.prevWrapper.classList.add('animation-out-prev' + '-' + this.options.animation)
        }
        // Active classes
        this.prevWrapper.classList.remove('active')
        this.currentWrapper.classList.add('active')
        // Reset zoom
        this.#resetZoom()
        // Set info
        if (this.options.info) {
            this.#setInfo(element)
        }
        if (this.options.preload) {
            // Preload next images
            this.#preloadImages(index, direction)
        }
        // Update UI
        this.#updateElementsVisibility()
    }

    async #setInfo(element) {
        // Sets and displays the info section (title, exif metadata, key bindings) for the given image element
        let info = ''
        if (element.title) {
            // Title
            info += '<p class="obsidium-info-headings">' + element.title + '</p>'
        }
        // Exif
        const exif = await this.#getExifData(element)
        if (exif) {
            if (exif.DateTimeOriginal) {
                info += '<p class="obsidium-info-date">' + exif.DateTimeOriginal.toLocaleString() + '</p>'
            }
            info += '<div class="obsidium-info-exif">'
            if (exif.FNumber) {
                info +=
                    '<div><svg class="obsidium-info-svg-small" xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><path fill="currentColor" d="M200.12 55.88A102 102 0 0 0 55.87 200.12A102 102 0 1 0 200.12 55.88m-102 66.67l19.65-23.14l29.86 5.46l10.21 28.58l-19.65 23.14l-29.86-5.46Zm111.81-31.86a90.24 90.24 0 0 1-2 78.63l-56.14-10.24Zm-6.16-11.28l-36.94 43.48l-30.17-84.47a89.3 89.3 0 0 1 55 25.94a91.3 91.3 0 0 1 12.11 15.05m-139.41-15a89.37 89.37 0 0 1 59.45-26.31L143 91.82L54.75 75.71a91 91 0 0 1 9.61-11.35ZM48 86.68l56.14 10.24l-58.07 68.39a90.24 90.24 0 0 1 2-78.63Zm4.21 89.91l36.94-43.48l30.17 84.47a89.3 89.3 0 0 1-55-25.94a91.3 91.3 0 0 1-12.09-15.05Zm139.41 15a89.32 89.32 0 0 1-59.45 26.26L113 164.18l88.24 16.11a91 91 0 0 1-9.6 11.35Z"/></svg><span> ƒ/' +
                    Math.round(exif.FNumber * 10) / 10 +
                    '</span></div>'
            }
            if (exif.ExposureTime) {
                info +=
                    '<div><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M11.98 16.52q0-1.01.415-1.884q.415-.872 1.113-1.495l1.938 3.378zm2.27 3.876q-.829-.467-1.406-1.23q-.577-.764-.782-1.743h3.902zm1.714-4.78l-1.714-2.993q.517-.286 1.075-.455T16.5 12q.367 0 .716.066q.35.065.686.19zm.536 5.403q-.367 0-.726-.065q-.358-.066-.695-.19l1.938-3.341l1.733 2.973q-.517.287-1.075.455t-1.175.168m.517-5.403l1.733-2.993q.829.468 1.396 1.24q.568.774.773 1.753zm2.456 4.263l-1.939-3.36H21q0 1.01-.412 1.873t-1.115 1.487m.148-10.263h-1.036q-.727-2.027-2.504-3.322T12 5Q9.075 5 7.038 7.038T5 12q0 2.108 1.11 3.79Q7.222 17.474 9 18.309V15h1v5H5v-1h3.312q-1.916-1-3.114-2.851T4 12q0-1.664.626-3.118T6.34 6.34t2.542-1.714T12 4q2.706 0 4.778 1.584q2.072 1.583 2.843 4.032"/></svg><span> 1/' +
                    Math.round(1 / exif.ExposureTime) +
                    ' s</span></div>'
            }
            if (exif.ISO) {
                info +=
                    '<div><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="currentColor" d="M24 21h-3a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2m-3-8v6h3v-6zm-6 8h-5v-2h5v-2h-3a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h5v2h-5v2h3a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2M6 11h2v10H6z"/><path fill="currentColor" d="M28 6H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2M4 24V8h24v16Z"/></svg></svg><span>' +
                    Math.round(exif.ISO) +
                    '</span></div>'
            }
            if (exif.FocalLength) {
                info +=
                    '<div><svg class="obsidium-info-svg-small" xmlns="http://www.w3.org/2000/svg" width="2048" height="2048" viewBox="0 0 2048 2048"><path fill="currentColor" d="M1344 768q-26 0-45-19t-19-45t19-45t45-19t45 19t19 45t-19 45t-45 19m595 1133l-263-262q-43 42-87 79t-95 69l151 152l-90 90l-182-179q-167 70-349 70q-105 0-205-23t-192-69t-170-110t-144-149l-204 204l-90-90l222-223q-57-99-85-210t-28-226q0-124 32-238t90-214t140-181t181-140t214-91t239-32t238 32t214 90t181 140t140 181t91 214t32 239q0 139-41 270t-122 245l272 272zM256 1024q0 89 20 175t60 166l368-367l384 384l256-256l321 321q62-95 94-202t33-221q0-106-27-204t-78-183t-120-156t-155-120t-184-77t-204-28t-204 27t-183 78t-156 120t-120 155t-77 184t-28 204m768 768q129 0 251-42l-571-572l-299 300q54 74 123 132t148 98t168 62t180 22m376-99q52-29 98-65t87-80l-241-242l-166 166z"/></svg><span>' +
                    Math.round(exif.FocalLength) +
                    ' mm</span></div>'
            }
            if (exif.ExifImageWidth && exif.ExifImageHeight) {
                info +=
                    '<div><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="currentColor" d="m22 11l-1.41 1.41L23.17 15H8.83l2.58-2.59L10 11l-5 5l5 5l1.41-1.41L8.83 17h14.34l-2.58 2.59L22 21l5-5z"/><path fill="currentColor" d="M28 30H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h24a2 2 0 0 1 2 2v24a2 2 0 0 1-2 2M4 4v24h24V4Z"/></svg><span>' +
                    exif.ExifImageWidth +
                    ' x ' +
                    exif.ExifImageHeight +
                    '</span></div>'
            }

            info +=
                '<div class="obsidium-info-exif-full"><svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m350.54 148.68l-26.62-42.06C318.31 100.08 310.62 96 302 96h-92c-8.62 0-16.31 4.08-21.92 10.62l-26.62 42.06C155.85 155.23 148.62 160 140 160H80a32 32 0 0 0-32 32v192a32 32 0 0 0 32 32h352a32 32 0 0 0 32-32V192a32 32 0 0 0-32-32h-59c-8.65 0-16.85-4.77-22.46-11.32"/><circle cx="256" cy="272" r="80" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M124 158v-22h-24v22"/></svg><span>'
            if (exif.Make && exif.Model) {
                info += exif.Make + ' ' + exif.Model
            } else {
                info += "Unknown"
            }
            info += '</span></div>'
            info += '<div class="obsidium-info-exif-full"><svg class="obsidium-info-svg-small" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2S2 6.477 2 12s4.477 10 10 10"/><path d="M17.197 9q-.15-.259-.323-.5m.937 5a6.01 6.01 0 0 1-4.311 4.311"/></g></svg><span>'

            if (exif.LensModel) {
                info += exif.LensModel
            } else {
                info += "Unknown"
            }
            info += '</span></div>'

            if (exif.latitude && exif.longitude) {
                info +=
                    '<div class="obsidium-info-gps"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M18.91 18c.915 1.368 1.301 2.203.977 2.9q-.06.128-.14.247c-.575.853-2.06.853-5.03.853H9.283c-2.97 0-4.454 0-5.029-.853a2 2 0 0 1-.14-.247c-.324-.697.062-1.532.976-2.9"/><path d="M15 9.5a3 3 0 1 1-6 0a3 3 0 0 1 6 0Z"/><path d="M12 2c4.059 0 7.5 3.428 7.5 7.587c0 4.225-3.497 7.19-6.727 9.206a1.55 1.55 0 0 1-1.546 0C8.003 16.757 4.5 13.827 4.5 9.587C4.5 5.428 7.941 2 12 2Z"/></g></svg><span><a href="https://www.google.com/maps/place/' +
                    exif.latitude +
                    ',' +
                    exif.longitude +
                    '" target="_blank" tabindex="-1">View on map</a></span></div>'
            }
            info += '</div>'
        }
        // Key bindings info
        info += '<div class="obsidium-info-keybindings">'
        info += '<p><span class="obsidium-info-key">Right, Space</span>: Next slide</p>'
        info += '<p><span class="obsidium-info-key">Left, Backspace</span>: Prev slide</p>'
        info += '<p><span class="obsidium-info-key">Down / Up</span>: Hide/show interface</p>'
        info += '<p><span class="obsidium-info-key">Escape</span>: Close</p>'
        info += '<p><span class="obsidium-info-key">+ / -</span>: Zoom in/out</p>'
        info += '<p><span class="obsidium-info-key">i</span>: Toggle info panel</p>'
        info += '</div>'
        this.infoText.innerHTML = info
    }

    async #getExifData(element) {
        // Retrieves and returns parsed EXIF metadata for a given image element
        if (element.exif) {
            // Check if EXIF info already cached on element to avoid redundant fetches
            return element.exif
        } else if (element.src && this.options.loadExif === true) {
            // Check if exifr is loaded
            if (typeof exifr !== 'undefined') {
                let exif = false
                // Get exif data
                try {
                    exif = await exifr.parse(element.src)
                } catch (error) {}
                return exif
            }
        }
        return false
    }

    #preloadImages(index, direction) {
        // Preloads upcoming images to enable smooth navigation and reduce loading delays.
        if (this.elements.length > 1) {
            // Preload next image
            let nextElement = false
            if (direction === 'right' || direction === 'none') {
                nextElement = this.elements[index + 1] || this.elements[0]
            } else {
                nextElement = this.elements[index - 1] || this.elements[this.elements.length - 1]
            }
            if (nextElement && nextElement.src) {
                // Exist and is image
                if (!nextElement.type || nextElement.type === 'image') {
                    this.preload1.src = nextElement.src
                }
            }
        }

        if (this.elements.length > 2) {
            // Preload second next image with small delay
            setTimeout(() => {
                let secondNextElement = false
                if (direction === 'right') {
                    if (this.elements[index + 2] !== undefined) {
                        secondNextElement = this.elements[index + 2]
                    } else if (this.elements[index + 1] !== undefined) {
                        secondNextElement = this.elements[0]
                    } else {
                        secondNextElement = this.elements[1]
                    }
                } else if (direction === 'left') {
                    if (this.elements[index - 2] !== undefined) {
                        secondNextElement = this.elements[index - 2]
                    } else if (this.elements[index - 1] !== undefined) {
                        secondNextElement = this.elements[this.elements.length - 1]
                    } else {
                        secondNextElement = this.elements[this.elements.length - 2]
                    }
                } else {
                    secondNextElement = this.elements[index - 1] || this.elements[this.elements.length - 1]
                }

                if (secondNextElement && secondNextElement.src) {
                    // Exist and is image
                    if (!secondNextElement.type || secondNextElement.type === 'image') {
                        this.preload2.src = secondNextElement.src
                    }
                }
            }, 100)
        }
    }

    #removeWrapperAnimationClasses(animation = false) {
        // Removes all animation-related CSS classes from both current and previous image wrappers.
        let animationToRemove = this.options.animation
        if (animation) {
            animationToRemove = animation
        }
        this.currentWrapper.classList.remove(
            'animation-in-prev' + '-' + animationToRemove,
            'animation-out-next' + '-' + animationToRemove,
            'animation-in-next' + '-' + animationToRemove,
            'animation-out-prev' + '-' + animationToRemove
        )
        this.prevWrapper.classList.remove(
            'animation-in-prev' + '-' + animationToRemove,
            'animation-out-next' + '-' + animationToRemove,
            'animation-in-next' + '-' + animationToRemove,
            'animation-out-prev' + '-' + animationToRemove
        )
    }

    #zoomIn() {
        // Increases the zoom level if not at the maximum and updates the zoom state.
        if (this.zoomLevel <= this.options.zoomLevels.length - 1 && this.options.zoom === true) {
            this.zoomLevel++
            this.#setZoom()
        }
    }

    #zoomOut() {
        // Decreases the zoom level if greater than zero and updates the zoom state.
        if (this.zoomLevel > 0 && this.options.zoom === true) {
            this.zoomLevel--
            this.#setZoom()
        }
    }

    #resetZoom() {
        // Resets the zoom state to its default (not zoomed) when closing or switching images.
        this.zoomLevel = 0
        this.#setZoom()
    }

    #setZoom() {
        if (this.contentType === 'image') {
            if (this.zoomLevel === 0) {
                // Sets the image zoom level and updates related UI and transforms.
                // Reset drag data
                this.currentImage.style.transform = ''
                this.translateX = 0
                this.translateY = 0
                // Save previous zoom level
                this.prevZoomLevel = 0
                // Set zoom ratio text
                this.zoomRatioText.textContent = '1x'
                // Remove class
                this.currentImage.classList.remove('zoomed')
                // Update elements visibility
                this.#updateElementsVisibility()
            } else {
                // Zoom in
                const zoomRatio = this.options.zoomLevels[this.zoomLevel - 1]
                // Adjust image translate based on prev zoom
                if (this.prevZoomLevel > 0) {
                    const prevZoomRatio = this.options.zoomLevels[this.prevZoomLevel - 1]
                    this.translateX *= zoomRatio / prevZoomRatio
                    this.translateY *= zoomRatio / prevZoomRatio
                }
                // Translate
                this.#updateImagePosition()
                // Save previous zoom level
                this.prevZoomLevel = this.zoomLevel
                // Set zoom ratio text
                this.zoomRatioText.textContent = `${this.options.zoomLevels[this.zoomLevel - 1]}x`
                // Add class
                this.currentImage.classList.add('zoomed')
                // Update elements visibility
                this.#updateElementsVisibility()
            }
        }
    }

    #updateImagePosition() {
        // Updates the position and scale of the current image based on zoom and drag state.
        const zoomRatio = this.zoomLevel ? this.options.zoomLevels[this.zoomLevel - 1] : 1
        this.currentImage.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${zoomRatio})`
        this.isTicking = false
    }

    #mergeOptions(newOptions) {
        // Merges the given options into the current options.
        this.options = { ...this.options, ...newOptions }
    }
}
