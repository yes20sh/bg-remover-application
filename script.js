// --- DOM Elements ---
const imageUpload = document.getElementById('imageUpload');
const removeBgBtn = document.getElementById('removeBgBtn');
const previewContainer = document.getElementById('previewContainer');
const borderWidth = document.getElementById('borderWidth');
const borderWidthValue = document.getElementById('borderWidthValue');
const borderColor = document.getElementById('borderColor');
const bgColor = document.getElementById('bgColor');
const bgColorHex = document.getElementById('bgColorHex');
const bgTypeBtns = document.querySelectorAll('[data-bgtype]');
const bgColorPicker = document.getElementById('bgColorPicker');
const bgGradientPicker = document.getElementById('bgGradientPicker');
const bgGradientStart = document.getElementById('bgGradientStart');
const bgGradientEnd = document.getElementById('bgGradientEnd');
const gradientDirection = document.getElementById('gradientDirection');
const bgImagePicker = document.getElementById('bgImagePicker');
const bgImageUpload = document.getElementById('bgImageUpload');
const downloadBtn = document.getElementById('downloadBtn');
const messageContainer = document.getElementById('messageContainer');

// Retro text controls
const retroTextToggle = document.getElementById('retroTextToggle');
const retroTextInput = document.getElementById('retroTextInput');
const retroFont = document.getElementById('retroFont');
const retroTextColor = document.getElementById('retroTextColor');
const textSize = document.getElementById('textSize');
const textSizeValue = document.getElementById('textSizeValue');
const textShadow = document.getElementById('textShadow');
const textShadowValue = document.getElementById('textShadowValue');

// --- Variables ---
let originalImage = null;
let processedImage = null;
let imageDataWithAlpha = null;
let bgType = 'color';
let bgImage = null;
let retroTextOn = false;
let retroText = "RETRO!";
let retroFontClass = "retro-press";
let retroColor = "#ff00cc";
let retroTextPos = { x: 100, y: 40 };
let isDraggingText = false;
let dragOffset = { x: 0, y: 0 };
let currentCanvas = null;

// Note: Replace with your actual API key
const API_KEY = 'rJydvtaG9FNeABRSdPP1kqez';

// --- Utility Functions ---
function showMessage(message, type = 'error') {
    messageContainer.innerHTML = `<div class="${type}-message">${message}</div>`;
    setTimeout(() => {
        messageContainer.innerHTML = '';
    }, 5000);
}

function validateImageFile(file) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        throw new Error('Please upload a valid image file (JPG, PNG, GIF, or WebP)');
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('Image file is too large. Please use an image smaller than 10MB');
    }
}

function setLoadingState(loading) {
    if (loading) {
        document.body.classList.add('loading');
        removeBgBtn.disabled = true;
        removeBgBtn.textContent = 'Processing...';
    } else {
        document.body.classList.remove('loading');
        removeBgBtn.disabled = false;
        removeBgBtn.textContent = 'Remove Background';
    }
}

// --- Event Listeners ---
imageUpload.addEventListener('change', handleImageUpload);
removeBgBtn.addEventListener('click', removeBackground);

borderWidth.addEventListener('input', function() {
    borderWidthValue.textContent = this.value + 'px';
    updatePreview();
});

borderColor.addEventListener('input', updatePreview);
bgColor.addEventListener('input', updateBackgroundColor);
bgColorHex.addEventListener('input', updateBackgroundColorFromHex);
bgGradientStart.addEventListener('input', updatePreview);
bgGradientEnd.addEventListener('input', updatePreview);
gradientDirection.addEventListener('change', updatePreview);
downloadBtn.addEventListener('click', downloadImage);

// Background type buttons
bgTypeBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        bgType = this.dataset.bgtype;
        updateBgTypeUI();
        updatePreview();
    });
});

bgImageUpload.addEventListener('change', handleBgImageUpload);

// Retro text controls
retroTextToggle.addEventListener('change', function() {
    retroTextOn = this.checked;
    updateRetroTextUI();
    updatePreview();
});

retroTextInput.addEventListener('input', function() {
    retroText = this.value;
    updatePreview();
});

retroFont.addEventListener('change', function() {
    retroFontClass = this.value;
    updatePreview();
});

retroTextColor.addEventListener('input', function() {
    retroColor = this.value;
    updatePreview();
});

textSize.addEventListener('input', function() {
    textSizeValue.textContent = this.value + 'px';
    updatePreview();
});

textShadow.addEventListener('input', function() {
    textShadowValue.textContent = this.value + 'px';
    updatePreview();
});

// --- Core Functions ---
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        validateImageFile(file);
        const reader = new FileReader();
        reader.onload = function(event) {
            originalImage = new Image();
            originalImage.onload = function() {
                processedImage = null; // Reset processed image
                imageDataWithAlpha = null;
                retroTextPos = { x: originalImage.width / 2, y: 50 };
                updatePreview();
                showMessage('Image uploaded successfully!', 'success');
            };
            originalImage.onerror = function() {
                showMessage('Failed to load image. Please try a different file.');
            };
            originalImage.src = event.target.result;
        };
        reader.onerror = function() {
            showMessage('Failed to read file. Please try again.');
        };
        reader.readAsDataURL(file);
    } catch (error) {
        showMessage(error.message);
    }
}

async function removeBackground() {
    if (!originalImage) {
        showMessage('Please upload an image first');
        return;
    }

    if (!API_KEY || API_KEY === 'YOUR_REMOVE_BG_API_KEY_HERE') {
        showMessage('Please add your Remove.bg API key to use background removal feature');
        return;
    }

    setLoadingState(true);
    
    try {
        // Convert image to blob
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = originalImage.width;
        canvas.height = originalImage.height;
        ctx.drawImage(originalImage, 0, 0);
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        
        const formData = new FormData();
        formData.append('image_file', blob, 'image.png');
        formData.append('size', 'auto');

        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: { 'X-Api-Key': API_KEY },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.errors?.[0]?.title || 'Failed to remove background');
        }

        const processedBlob = await response.blob();
        const processedUrl = URL.createObjectURL(processedBlob);
        
        processedImage = new Image();
        processedImage.onload = function() {
            getImageDataWithAlpha(processedImage);
            retroTextPos = { x: processedImage.width / 2, y: 50 };
            updatePreview();
            showMessage('Background removed successfully!', 'success');
            URL.revokeObjectURL(processedUrl);
        };
        processedImage.src = processedUrl;

    } catch (error) {
        showMessage('Error removing background: ' + error.message);
    } finally {
        setLoadingState(false);
    }
}

function getImageDataWithAlpha(image) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
    imageDataWithAlpha = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function handleBgImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        validateImageFile(file);
        const reader = new FileReader();
        reader.onload = function(event) {
            bgImage = new Image();
            bgImage.onload = updatePreview;
            bgImage.onerror = function() {
                showMessage('Failed to load background image');
            };
            bgImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    } catch (error) {
        showMessage(error.message);
    }
}

function updateBgTypeUI() {
    // Update button states
    bgTypeBtns.forEach(btn => {
        btn.classList.remove('ring-2', 'ring-blue-500');
        if (btn.dataset.bgtype === bgType) {
            btn.classList.add('ring-2', 'ring-blue-500');
        }
    });

    // Show/hide relevant pickers
    bgColorPicker.classList.toggle('hidden', bgType !== 'color');
    bgGradientPicker.classList.toggle('hidden', bgType !== 'gradient');
    bgImagePicker.classList.toggle('hidden', bgType !== 'image');
}

function updateRetroTextUI() {
    const controls = [retroTextInput, retroFont, retroTextColor, textSize, textShadow];
    controls.forEach(control => {
        control.disabled = !retroTextOn;
    });
}

function updateBackgroundColor() {
    bgColorHex.value = bgColor.value;
    updatePreview();
}

function updateBackgroundColorFromHex() {
    if (/^#[0-9A-F]{6}$/i.test(bgColorHex.value)) {
        bgColor.value = bgColorHex.value;
        updatePreview();
    }
}

function getRetroFontCss() {
    const size = textSize.value;
    switch (retroFontClass) {
        case "retro-orbitron": return `bold ${size}px 'Orbitron', sans-serif`;
        case "retro-vt323": return `bold ${Math.floor(size * 1.2)}px 'VT323', monospace`;
        case "retro-monoton": return `bold ${size}px 'Monoton', cursive`;
        default: return `${Math.floor(size * 0.8)}px 'Press Start 2P', cursive`;
    }
}

function drawBackground(ctx, width, height) {
    if (bgType === 'transparent') {
        // Draw transparent checkerboard pattern
        const checkSize = 20;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#f0f0f0';
        for (let x = 0; x < width; x += checkSize) {
            for (let y = 0; y < height; y += checkSize) {
                if ((Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2) {
                    ctx.fillRect(x, y, checkSize, checkSize);
                }
            }
        }
    } else if (bgType === 'color') {
        ctx.fillStyle = bgColor.value;
        ctx.fillRect(0, 0, width, height);
    } else if (bgType === 'blue') {
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(0, 0, width, height);
    } else if (bgType === 'gradient') {
        let gradient;
        if (gradientDirection.value === 'radial') {
            gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/2);
        } else {
            gradient = ctx.createLinearGradient(0, 0, width, height);
        }
        gradient.addColorStop(0, bgGradientStart.value);
        gradient.addColorStop(1, bgGradientEnd.value);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    } else if (bgType === 'image' && bgImage) {
        // Scale background image to cover the canvas
        const imgAspect = bgImage.width / bgImage.height;
        const canvasAspect = width / height;
        let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
        
        if (imgAspect > canvasAspect) {
            drawHeight = height;
            drawWidth = height * imgAspect;
            offsetX = (width - drawWidth) / 2;
        } else {
            drawWidth = width;
            drawHeight = width / imgAspect;
            offsetY = (height - drawHeight) / 2;
        }
        
        ctx.drawImage(bgImage, offsetX, offsetY, drawWidth, drawHeight);
    } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
    }
}

function drawOutline(ctx, width, height) {
    const outlineWidth = parseInt(borderWidth.value);
    if (outlineWidth <= 0 || !imageDataWithAlpha) return;

    const outlineColor = borderColor.value;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = width;
    tempCanvas.height = height;
    
    const data = imageDataWithAlpha.data;
    const edgePixels = new Set();
    
    // Find edge pixels
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const alpha = data[i + 3];
            
            if (alpha > 0) {
                // Check 8-connected neighbors
                const directions = [
                    [-1, -1], [0, -1], [1, -1],
                    [-1, 0],           [1, 0],
                    [-1, 1],  [0, 1],  [1, 1]
                ];
                
                for (const [dx, dy] of directions) {
                    const nx = x + dx;
                    const ny = y + dy;
                    
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const ni = (ny * width + nx) * 4;
                        if (data[ni + 3] === 0) {
                            edgePixels.add(`${x},${y}`);
                            break;
                        }
                    } else {
                        edgePixels.add(`${x},${y}`);
                        break;
                    }
                }
            }
        }
    }

    // Draw outline
    tempCtx.fillStyle = outlineColor;
    for (const pixel of edgePixels) {
        const [x, y] = pixel.split(',').map(Number);
        tempCtx.beginPath();
        tempCtx.arc(x, y, outlineWidth, 0, 2 * Math.PI);
        tempCtx.fill();
    }
    
    ctx.drawImage(tempCanvas, 0, 0);
}

function drawRetroText(ctx) {
    if (!retroTextOn || !retroText.trim()) return;

    ctx.save();
    ctx.font = getRetroFontCss();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    
    const shadowBlur = parseInt(textShadow.value);
    
    // Draw shadow
    if (shadowBlur > 0) {
        ctx.shadowColor = "#000";
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
    }
    
    // Draw stroke
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#fff";
    ctx.strokeText(retroText, retroTextPos.x, retroTextPos.y);
    
    // Reset shadow for fill
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw fill
    ctx.fillStyle = retroColor;
    ctx.fillText(retroText, retroTextPos.x, retroTextPos.y);
    
    ctx.restore();
}

function updatePreview() {
    const currentImage = processedImage || originalImage;
    if (!currentImage) return;

    previewContainer.innerHTML = '';
    
    const canvas = document.createElement('canvas');
    currentCanvas = canvas;
    canvas.width = currentImage.width;
    canvas.height = currentImage.height;
    const ctx = canvas.getContext('2d');

    // Draw background
    if (bgType !== 'transparent' || !processedImage) {
        drawBackground(ctx, canvas.width, canvas.height);
    }

    // Draw outline
    drawOutline(ctx, canvas.width, canvas.height);

    // Draw main image
    ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);

    // Draw retro text
    drawRetroText(ctx);

    previewContainer.appendChild(canvas);
    enableTextDrag(canvas);
}

function enableTextDrag(canvas) {
    let isMouseDown = false;

    canvas.style.cursor = 'default';
    
    canvas.addEventListener('mousedown', function(e) {
        if (!retroTextOn || !retroText.trim()) return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        // Check if click is on text
        const ctx = canvas.getContext('2d');
        ctx.save();
        ctx.font = getRetroFontCss();
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const textMetrics = ctx.measureText(retroText);
        const textWidth = textMetrics.width;
        const textHeight = parseInt(textSize.value);
        ctx.restore();
        
        if (x >= retroTextPos.x - textWidth / 2 &&
            x <= retroTextPos.x + textWidth / 2 &&
            y >= retroTextPos.y &&
            y <= retroTextPos.y + textHeight) {
            
            isMouseDown = true;
            isDraggingText = true;
            dragOffset.x = x - retroTextPos.x;
            dragOffset.y = y - retroTextPos.y;
            canvas.style.cursor = 'grabbing';
        }
    });
    
    canvas.addEventListener('mousemove', function(e) {
        if (!retroTextOn || !retroText.trim()) return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        if (isDraggingText) {
            retroTextPos.x = Math.max(0, Math.min(canvas.width, x - dragOffset.x));
            retroTextPos.y = Math.max(0, Math.min(canvas.height - parseInt(textSize.value), y - dragOffset.y));
            updatePreview();
        } else {
            // Check if hovering over text for cursor change
            const ctx = canvas.getContext('2d');
            ctx.save();
            ctx.font = getRetroFontCss();
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            const textMetrics = ctx.measureText(retroText);
            const textWidth = textMetrics.width;
            const textHeight = parseInt(textSize.value);
            ctx.restore();
            
            if (x >= retroTextPos.x - textWidth / 2 &&
                x <= retroTextPos.x + textWidth / 2 &&
                y >= retroTextPos.y &&
                y <= retroTextPos.y + textHeight) {
                canvas.style.cursor = 'grab';
            } else {
                canvas.style.cursor = 'default';
            }
        }
    });
    
    canvas.addEventListener('mouseup', function() {
        if (isDraggingText) {
            isDraggingText = false;
            canvas.style.cursor = 'grab';
        }
    });
    
    canvas.addEventListener('mouseleave', function() {
        if (isDraggingText) {
            isDraggingText = false;
            canvas.style.cursor = 'default';
        }
    });
}

function downloadImage() {
    const canvas = currentCanvas;
    if (!canvas) {
        showMessage('No image to download');
        return;
    }

    try {
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `edited-image-${timestamp}.png`;
        
        // For transparent background, use PNG with alpha
        if (bgType === 'transparent' && processedImage) {
            link.href = canvas.toDataURL('image/png');
        } else {
            link.href = canvas.toDataURL('image/png');
        }
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showMessage('Image downloaded successfully!', 'success');
    } catch (error) {
        showMessage('Failed to download image. Please try again.');
    }
}

// --- Initialize UI ---
function initializeUI() {
    borderWidthValue.textContent = borderWidth.value + 'px';
    textSizeValue.textContent = textSize.value + 'px';
    textShadowValue.textContent = textShadow.value + 'px';
    
    // Disable retro text controls initially
    updateRetroTextUI();
    
    // Set initial background type
    updateBgTypeUI();
    
    // Set initial color sync
    bgColorHex.value = bgColor.value;
}

// --- Keyboard Shortcuts ---
document.addEventListener('keydown', function(e) {
    // Prevent default behavior for our shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        downloadImage();
    }
    
    if (e.key === 'Escape' && isDraggingText) {
        isDraggingText = false;
        if (currentCanvas) {
            currentCanvas.style.cursor = 'default';
        }
    }
});

// --- Drag and Drop Support ---
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    previewContainer.addEventListener(eventName, function(e) {
        e.preventDefault();
        e.stopPropagation();
    });
});

['dragenter', 'dragover'].forEach(eventName => {
    previewContainer.addEventListener(eventName, function() {
        previewContainer.classList.add('border-blue-500', 'bg-blue-50');
    });
});

['dragleave', 'drop'].forEach(eventName => {
    previewContainer.addEventListener(eventName, function() {
        previewContainer.classList.remove('border-blue-500', 'bg-blue-50');
    });
});

previewContainer.addEventListener('drop', function(e) {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        // Simulate file input change
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        imageUpload.files = dataTransfer.files;
        
        // Trigger change event
        const changeEvent = new Event('change', { bubbles: true });
        imageUpload.dispatchEvent(changeEvent);
    }
});

// --- Responsive Text Sizing ---
function adjustTextSizeForCanvas() {
    if (!currentCanvas || !retroTextOn) return;
    
    const canvasWidth = currentCanvas.width;
    const ctx = currentCanvas.getContext('2d');
    ctx.save();
    ctx.font = getRetroFontCss();
    const textWidth = ctx.measureText(retroText).width;
    ctx.restore();
    
    // If text is too wide, suggest smaller size
    if (textWidth > canvasWidth * 0.8) {
        const suggestedSize = Math.floor(parseInt(textSize.value) * (canvasWidth * 0.8) / textWidth);
        if (suggestedSize < parseInt(textSize.value)) {
            textSize.value = Math.max(16, suggestedSize);
            textSizeValue.textContent = textSize.value + 'px';
            updatePreview();
        }
    }
}

// Adjust text size when text changes
retroTextInput.addEventListener('input', function() {
    setTimeout(adjustTextSizeForCanvas, 100);
});

// --- Performance Optimization ---
let updateTimeout;
function debouncedUpdate() {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(updatePreview, 100);
}

// Use debounced updates for frequent events
borderWidth.addEventListener('input', debouncedUpdate);
textSize.addEventListener('input', function() {
    textSizeValue.textContent = this.value + 'px';
    debouncedUpdate();
});
textShadow.addEventListener('input', function() {
    textShadowValue.textContent = this.value + 'px';
    debouncedUpdate();
});

// --- Error Handling for Canvas Operations ---
function safeCanvasOperation(operation) {
    try {
        return operation();
    } catch (error) {
        console.error('Canvas operation failed:', error);
        showMessage('An error occurred while processing the image. Please try again.');
        return null;
    }
}

// --- Initialize Application ---
initializeUI();

// --- Browser Compatibility Checks ---
if (!window.FileReader) {
    showMessage('Your browser does not support file reading. Please use a modern browser.');
}

if (!document.createElement('canvas').getContext) {
    showMessage('Your browser does not support canvas. Please use a modern browser.');
}

// --- Service Worker for Offline Support (Optional) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // Uncomment to enable service worker
        // navigator.serviceWorker.register('/sw.js');
    });
}

// --- Analytics/Usage Tracking (Optional) ---
function trackEvent(eventName, properties = {}) {
    // Implement your analytics tracking here
    console.log('Event:', eventName, properties);
}

// Track usage events
imageUpload.addEventListener('change', () => trackEvent('image_uploaded'));
removeBgBtn.addEventListener('click', () => trackEvent('background_removed'));
downloadBtn.addEventListener('click', () => trackEvent('image_downloaded'));

// --- Memory Management ---
function cleanupResources() {
            // Clean up object URLs to prevent memory leaks
            if (originalImage && originalImage.src.startsWith('blob:')) {
                URL.revokeObjectURL(originalImage.src);
            }
            if (processedImage && processedImage.src.startsWith('blob:')) {
                URL.revokeObjectURL(processedImage.src);
            }
            if (bgImage && bgImage.src.startsWith('blob:')) {
                URL.revokeObjectURL(bgImage.src);
            }
        }

        // Clean up on page unload
        window.addEventListener('beforeunload', cleanupResources);

        // --- Accessibility Improvements ---
        // Add ARIA labels and keyboard navigation
        downloadBtn.setAttribute('aria-label', 'Download edited image');
        removeBgBtn.setAttribute('aria-label', 'Remove background from image');
        
        // Focus management for better keyboard navigation
        imageUpload.addEventListener('focus', function() {
            this.parentElement.style.outline = '2px solid #2563eb';
        });
        
        imageUpload.addEventListener('blur', function() {
            this.parentElement.style.outline = 'none';
        });

        console.log('Image Background Remover initialized successfully!');