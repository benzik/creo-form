document.addEventListener('DOMContentLoaded', () => {
    const savedData = localStorage.getItem('visualEditorCountryData');
    if (savedData) {
        countryData = JSON.parse(savedData);
        console.log("Loaded data from localStorage.");
    }

    let currentSelectedElement = null;
    let timerInterval = null;
    let hideBannerTimeout = null;
    let dragTimer = null;
    let hasMoved = false;
    let animationTimeouts = [];

    const undoButton = document.getElementById('undo-button');
    const redoButton = document.getElementById('redo-button');
    let historyStack = [];
    let redoStack = [];
    const MAX_HISTORY_STATES = 50;
    let isRestoringState = false;

    let imageInput = document.getElementById('ctrl-image');
    let flagInput = document.getElementById('ctrl-flag');

    const editBanner = document.getElementById('edit-banner');
    const previewPanel = document.querySelector('.preview');
    const formatButtons = document.getElementById('format-buttons');
    const colorInput = document.getElementById('ctrl-color');
    const fontSelect = document.getElementById('ctrl-font');
    const fontSizeInput = document.getElementById('ctrl-font-size');
    const addTextButton = document.getElementById('add-text-button');
    const deleteTextButton = document.getElementById('delete-text-button');
    const regionInput = document.getElementById('ctrl-region-input');
    const clearRegionButton = document.getElementById('clear-region-button');
    const countryList = document.getElementById('country-list');
    const generateDataButton = document.getElementById('generate-data-button');
    const replaceFlagButton = document.getElementById('replace-flag-button');
    const timerFontSizeInput = document.getElementById('ctrl-timer-font-size');
    const timerInput = document.getElementById('ctrl-timer-input');

    // --- ЛОГИКА АККОРДЕОНА ---
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            header.classList.toggle('active');
            content.classList.toggle('active');
        });
    });

    // --- ЛОГИКА МОДАЛЬНОГО ОКНА ПОМОЩИ ---
    const helpButton = document.getElementById('help-button');
    const helpModal = document.getElementById('help-modal');
    const helpModalClose = helpModal.querySelector('.close-button');

    function showHelpModal() {
        helpModal.classList.remove('hidden');
    }
    function hideHelpModal() {
        helpModal.classList.add('hidden');
    }

    helpButton.addEventListener('click', showHelpModal);
    helpModalClose.addEventListener('click', hideHelpModal);
    helpModal.addEventListener('click', (event) => {
        if (event.target === helpModal) {
            hideHelpModal();
        }
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !helpModal.classList.contains('hidden')) {
            hideHelpModal();
        }
    });

    // --- ФУНКЦИИ ДЛЯ РАБОТЫ С ИСТОРИЕЙ ---
    function updateHistoryButtons() {
        undoButton.disabled = historyStack.length <= 1;
        redoButton.disabled = redoStack.length === 0;
    }

    function saveState() {
        if (isRestoringState) return;

        const phoneInput = document.querySelector('#preview-phone');
        if (phoneInput) {
            phoneInput.setAttribute('value', phoneInput.value);
        }
        
        const formWrapper = document.querySelector('.form-wrapper');
        const state = {
            html: formWrapper.innerHTML,
            regionValue: regionInput.value,
            wrapperHeight: formWrapper.style.height
        };

        const lastState = historyStack[historyStack.length - 1];
        if (lastState && lastState.html === state.html && lastState.regionValue === state.regionValue && lastState.wrapperHeight === state.wrapperHeight) {
            return;
        }

        historyStack.push(state);
        redoStack = [];

        if (historyStack.length > MAX_HISTORY_STATES) {
            historyStack.shift();
        }
        updateHistoryButtons();
    }

    function restoreState(state) {
        if (!state) return;
        isRestoringState = true;
        
        const formWrapper = document.querySelector('.form-wrapper');
        formWrapper.innerHTML = state.html;
        formWrapper.style.height = state.wrapperHeight;
        regionInput.value = state.regionValue;

        reinitializeInteractions();
        attachFileInputListeners();

        isRestoringState = false;
        updateHistoryButtons();
    }

    function undo() {
        if (historyStack.length <= 1) return;
        deselectAll(true);
        redoStack.push(historyStack.pop());
        const stateToRestore = historyStack[historyStack.length - 1];
        restoreState(stateToRestore);
    }

    function redo() {
        if (redoStack.length === 0) return;
        deselectAll(true);
        const stateToRestore = redoStack.pop();
        historyStack.push(stateToRestore);
        restoreState(stateToRestore);
    }

    undoButton.addEventListener('click', undo);
    redoButton.addEventListener('click', redo);

    document.addEventListener('keydown', (e) => {
        if (e.target.isContentEditable && e.target.closest('.preview')) {
            return;
        }

        if (e.ctrlKey && !e.shiftKey && e.code === 'KeyZ') {
            e.preventDefault();
            undo();
        } 
        else if (e.ctrlKey && (e.code === 'KeyY' || (e.shiftKey && e.code === 'KeyZ'))) {
            e.preventDefault();
            redo();
        }
    });

    function reinitializeInteractions() {
        const formWrapper = document.querySelector('.form-wrapper');
        const snapGuide = document.getElementById('snap-guide');

        const snapModifier = interact.modifiers.snap({
            targets: [
                (x, y) => {
                    const parentRect = formWrapper.getBoundingClientRect();
                    const parentWidth = parentRect.width;
                    return { x: parentWidth / 2, range: 15 };
                }
            ],
            relativePoints: [ { x: 0.5, y: 0.5 } ], 
            offset: 'parent',
        });
        
        interact('.draggable').draggable({
            ignoreFrom: '.resize-handle', 
            listeners: {
                start: (event) => {
                    const target = event.target;
                    if (target.getAttribute('data-x') === null) {
                        let initialX = 0;
                        let initialY = 0;
                        
                        if (getComputedStyle(target).transform.includes('matrix')) {
                             initialX = -target.offsetWidth / 2;
                        }

                        target.setAttribute('data-x', initialX);
                        target.setAttribute('data-y', initialY);
                        target.style.transform = `translate(${initialX}px, ${initialY}px)`;
                    }

                    snapGuide.style.display = 'none';
                    hasMoved = false; 
                },
                move: (event) => {
                    if (document.body.classList.contains('simulation-mode') || (event.target.isContentEditable)) return;
                    
                    hasMoved = true; 

                    if (event.modifiers && event.modifiers.length > 0 && event.modifiers[0].inRange) {
                        snapGuide.style.display = 'block';
                    } else {
                        snapGuide.style.display = 'none';
                    }
                    
                    const target = event.target;
                    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                    
                    target.style.transform = `translate(${x}px, ${y}px)`;
                    
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                },
                end: (event) => {
                    snapGuide.style.display = 'none';
                    updateWrapperSize();
                    saveState();
                }
            },
            modifiers: [snapModifier]
        });
        
        const productArea = document.getElementById('product-area');
        if (productArea) {
             interact(productArea).resizable({
                edges: { left: true, right: true, bottom: true, top: true },
                modifiers: [
                    interact.modifiers.aspectRatio({ equalDelta: true })
                ],
                listeners: {
                    start(event) {
                        const target = event.target;
                        if (target.getAttribute('data-x') === null) {
                            let initialX = 0;
                            let initialY = 0;
                            if (getComputedStyle(target).transform.includes('matrix')) {
                                initialX = -target.offsetWidth / 2;
                            }
                            target.setAttribute('data-x', initialX);
                            target.setAttribute('data-y', initialY);
                            target.style.transform = `translate(${initialX}px, ${initialY}px)`;
                        }
                    },
                    move(event) {
                        if (document.body.classList.contains('simulation-mode')) return;
                        const target = event.target;
                        let x = (parseFloat(target.getAttribute('data-x')) || 0);
                        let y = (parseFloat(target.getAttribute('data-y')) || 0);
                        
                        target.style.width = event.rect.width + 'px';
                        target.style.height = event.rect.height + 'px';

                        x += event.deltaRect.left;
                        y += event.deltaRect.top;
                        
                        target.style.transform = 'translate(' + x + 'px,' + y + 'px)';
                        target.setAttribute('data-x', x);
                        target.setAttribute('data-y', y);
                    },
                    end: () => { 
                        updateWrapperSize(); 
                        saveState(); 
                    }
                }
            });
        }
    }
    
    function updateFormForCountry(countryCode) {
        const data = countryData[countryCode];
        if (!data) return;
        document.getElementById('top-text').innerHTML = data.translations.top_text;
        document.getElementById('preview-discount').innerText = data.translations.discount_text;
        document.getElementById('timer-label').innerText = data.translations.timer_label;
        document.getElementById('name-label').innerText = data.translations.name_label;
        document.getElementById('preview-name').innerText = data.translations.name_placeholder;
        document.getElementById('phone-label').innerText = data.translations.phone_label;
        document.getElementById('preview-button').innerText = data.translations.submit_button;
        document.getElementById('bottom-text').innerText = data.translations.bottom_text;
        const priceOld = document.querySelector('.price-old');
        const priceNew = document.querySelector('.price-new');
        priceOld.innerText = (priceOld.innerText.match(/\d+/g) || ["280"]).join('') + data.currency;
        priceNew.innerText = (priceNew.innerText.match(/\d+/g) || ["59"]).join('') + data.currency;
        const flagImg = document.getElementById('preview-flag');
        const flagToggle = document.getElementById('flag-toggle');
        if (data.flagCode) {
             flagImg.src = `https://flagcdn.com/w40/${data.flagCode}.png`;
             flagImg.classList.remove('hidden');
             flagToggle.classList.remove('dimmed');
        } else {
             flagImg.classList.add('hidden');
             flagToggle.classList.add('dimmed');
        }
        document.getElementById('preview-phone').value = data.phoneCode;
        saveState();
    }

    generateDataButton.addEventListener('click', () => {
        const selectedName = regionInput.value; const code = getCodeByName(selectedName); if (!code) return;
        const data = countryData[code]; if (!data || !data.sampleNames || !data.sampleNames.length || !data.samplePhones || !data.samplePhones.length) return;
        const randomName = data.sampleNames[Math.floor(Math.random() * data.sampleNames.length)];
        const randomPhone = data.samplePhones[Math.floor(Math.random() * data.samplePhones.length)];
        document.getElementById('preview-name').innerText = randomName;
        document.getElementById('preview-phone').value = data.phoneCode + randomPhone.replace(/[^0-9-]/g, '');
        saveState();
    });
    
    function populateCountrySelector() {
        const currentVal = regionInput.value;
        countryList.innerHTML = '';
        Object.entries(countryData).sort((a,b) => a[1].name.localeCompare(b[1].name)).forEach(([code, data]) => {
            const option = document.createElement('option');
            option.value = `${data.name} (${code})`;
            option.dataset.code = code;
            countryList.appendChild(option);
        });
        if (currentVal) { regionInput.value = currentVal; }
    }

    function getCodeByName(nameWithCode) {
        const options = countryList.options;
        for (let i = 0; i < options.length; i++) { if (options[i].value === nameWithCode) { return options[i].dataset.code; } }
        return null;
    }
    
    regionInput.addEventListener('input', (e) => {
        const selectedName = e.target.value;
        const code = getCodeByName(selectedName);
        if (code) {
            updateFormForCountry(code);
        }
        if (regionInput.value) {
            clearRegionButton.classList.remove('hidden');
        } else {
            clearRegionButton.classList.add('hidden');
        }
    });

    clearRegionButton.addEventListener('click', () => {
        regionInput.value = '';
        clearRegionButton.classList.add('hidden');
    });
    
    function updateWrapperSize() { const wrapper = document.querySelector('.form-wrapper'); if (!wrapper) return; const els = [...wrapper.querySelectorAll('.draggable')].filter(el => el.offsetParent !== null); const wRect = wrapper.getBoundingClientRect(); let maxBottom = 0; els.forEach(el => { const r = el.getBoundingClientRect(); const bottom = r.bottom - wRect.top; if (bottom > maxBottom) maxBottom = bottom; }); wrapper.style.height = Math.ceil(maxBottom + 20) + 'px'; }
    
    function startTimer(minutes, seconds) { 
        clearInterval(timerInterval); 
        let totalSeconds = (minutes * 60) + seconds; 
        const timerElement = document.getElementById('preview-timer'); 
        timerInterval = setInterval(() => { 
            if (totalSeconds < 0) { 
                clearInterval(timerInterval); 
                return; 
            } 
            const min = Math.floor(totalSeconds / 60); 
            const sec = totalSeconds % 60; 
            timerElement.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`; 
            totalSeconds--; 
        }, 1000); 
    }
    
    function deselectAll(withoutSaving = false) { 
        if (currentSelectedElement) { 
            currentSelectedElement.contentEditable = false; 
            currentSelectedElement.blur(); 
            currentSelectedElement = null; 
        } 
        const productArea = document.getElementById('product-area');
        if (productArea) productArea.classList.remove('selected');
        
        document.querySelector('.form-wrapper').classList.remove('text-editing-mode');
        formatButtons.classList.add('disabled'); 
        deleteTextButton.disabled = true;
        if (!withoutSaving) saveState();
    }

    function activateEditing(target) {
        deselectAll(true);
        currentSelectedElement = target;
        target.contentEditable = true;
        target.focus();
        document.querySelector('.form-wrapper').classList.add('text-editing-mode');
        formatButtons.classList.remove('disabled');
        deleteTextButton.disabled = false;
    }
    
    previewPanel.addEventListener('mousedown', (event) => { if (document.body.classList.contains('simulation-mode')) return; const textTarget = event.target.closest('.editable-text'); const imageTarget = event.target.closest('#product-area'); if (textTarget) { if (textTarget.isContentEditable) return; hasMoved = false; dragTimer = setTimeout(() => { clearTimeout(dragTimer); dragTimer = null; }, 200); } else if (imageTarget) { deselectAll(true); imageTarget.classList.add('selected'); } else { deselectAll(); } });
    previewPanel.addEventListener('mouseup', (event) => { if (document.body.classList.contains('simulation-mode')) return; const target = event.target.closest('.editable-text'); if (dragTimer && !hasMoved && target) { activateEditing(target); } clearTimeout(dragTimer); dragTimer = null; });
    addTextButton.addEventListener('click', () => { const newText = document.createElement('p'); newText.id = `dynamic-text-${Date.now()}`; newText.classList.add('draggable', 'editable-text', 'dynamic-text'); const code = getCodeByName(regionInput.value) || 'ru'; const placeholder = (countryData[code] && countryData[code].translations.new_text_placeholder) || "Ваш текст"; newText.innerText = placeholder; document.querySelector('.form-wrapper').appendChild(newText); reinitializeInteractions(); updateWrapperSize(); activateEditing(newText); saveState(); });
    deleteTextButton.addEventListener('click', () => { if (currentSelectedElement) { if (currentSelectedElement.classList.contains('dynamic-text')) { currentSelectedElement.remove(); } else { currentSelectedElement.innerHTML = ''; } deselectAll(); } });
    previewPanel.addEventListener('keydown', (event) => {if (currentSelectedElement) { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); deselectAll(); } else if (event.key === 'Enter' && event.shiftKey) { setTimeout(updateWrapperSize, 10);}}});
    previewPanel.addEventListener('input', () => { if (currentSelectedElement) { updateWrapperSize(); }});
    
    function hasSelection() {
        const selection = window.getSelection();
        return selection && !selection.isCollapsed;
    }

    formatButtons.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button || !currentSelectedElement) return;
        const command = button.dataset.command;
        if (command) {
            const hadSelection = hasSelection();
            if (!hadSelection) {
                const range = document.createRange();
                range.selectNodeContents(currentSelectedElement);
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(range);
            }
            
            document.execCommand(command, false, null);
            
            if (!hadSelection) {
                window.getSelection().collapseToEnd();
            }
            currentSelectedElement.focus();
            saveState();
        }
    });

    colorInput.addEventListener('input', (e) => {
        if (currentSelectedElement) {
             const hadSelection = hasSelection();
            if (!hadSelection) {
                const range = document.createRange();
                range.selectNodeContents(currentSelectedElement);
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(range);
            }

            document.execCommand('foreColor', false, e.target.value);

            if (!hadSelection) {
                window.getSelection().collapseToEnd();
            }
            currentSelectedElement.focus();
            saveState();
        }
    });

    function applyStyleToSelection(styleProperty, value) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const span = document.createElement('span');
            span.style[styleProperty] = value;
            try {
                range.surroundContents(span);
            } catch (e) {
                const selectedContents = range.extractContents();
                span.appendChild(selectedContents);
                range.insertNode(span);
            }
        }
    }
    
    fontSelect.addEventListener('change', (e) => {
        if (currentSelectedElement) {
            if (hasSelection()) {
                applyStyleToSelection('fontFamily', e.target.value);
            } else {
                currentSelectedElement.style.fontFamily = e.target.value;
            }
            updateWrapperSize();
            saveState();
        }
    });

    fontSizeInput.addEventListener('input', (e) => {
        if (currentSelectedElement) {
            const size = e.target.value + 'px';
             if (hasSelection()) {
                applyStyleToSelection('fontSize', size);
            } else {
                currentSelectedElement.style.fontSize = size;
            }
            updateWrapperSize();
            saveState();
        }
    });

    document.getElementById('add-product-button').addEventListener('click', () => imageInput.click());
    replaceFlagButton.addEventListener('click', () => flagInput.click());

    function attachFileInputListeners() {
        imageInput = document.getElementById('ctrl-image');
        flagInput = document.getElementById('ctrl-flag');

        imageInput.addEventListener('change', event => { 
            const file = event.target.files[0]; 
            if (file) { 
                const productArea = document.getElementById('product-area'); 
                const currentContent = productArea.querySelector('img, .image-placeholder'); 
                if (currentContent) { currentContent.remove(); } 
                const img = document.createElement('img'); 
                img.src = URL.createObjectURL(file); 
                productArea.prepend(img); 
                updateWrapperSize(); 
                saveState(); 
            }
        });
        
        flagInput.addEventListener('change', event => {
            const file = event.target.files[0];
            if (file) {
                const flagImg = document.getElementById('preview-flag');
                flagImg.src = URL.createObjectURL(file);
                flagImg.classList.remove('hidden');
                document.getElementById('flag-toggle').classList.remove('dimmed');
                saveState();
            }
        });
    }

    function updateTimerDisplay() {
        const parts = timerInput.value.split(':');
        const minutes = parseInt(parts[0], 10) || 0;
        const seconds = parseInt(parts[1], 10) || 0;

        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(seconds).padStart(2, '0');
        
        const previewTimer = document.getElementById('preview-timer');
        if (previewTimer) {
            previewTimer.textContent = `${formattedMinutes}:${formattedSeconds}`;
        }
    }

    timerInput.addEventListener('input', () => { updateTimerDisplay(); saveState(); });
    timerFontSizeInput.addEventListener('input', (e) => { const previewTimer = document.getElementById('preview-timer'); if (previewTimer) { previewTimer.style.fontSize = e.target.value + 'px'; saveState(); }});

    document.getElementById('flag-toggle').addEventListener('click', (e) => { e.currentTarget.classList.toggle('dimmed'); document.getElementById('preview-flag').classList.toggle('hidden'); saveState(); });
    
    document.getElementById('timer-toggle').addEventListener('click', (e) => {
        const icon = e.currentTarget;
        const timerEl = document.getElementById('preview-timer');
        const labelEl = document.getElementById('timer-label');
    
        icon.classList.toggle('dimmed');
        const isHiding = icon.classList.contains('dimmed');
    
        timerEl.classList.toggle('hidden', isHiding);
        labelEl.classList.toggle('hidden', isHiding);
    
        const yOffset = 85;
        const direction = isHiding ? -1 : 1;
    
        const elementsToShift = [
            document.getElementById('name-label'),
            document.getElementById('preview-name'),
            document.getElementById('phone-label'),
            document.getElementById('phone-input-container'),
            document.getElementById('preview-button'),
            document.getElementById('bottom-text')
        ];
    
        elementsToShift.forEach(el => {
            if (el) {
                const computedTop = window.getComputedStyle(el).top;
                const currentTop = parseInt(computedTop, 10);
                el.style.top = (currentTop + (yOffset * direction)) + 'px';
            }
        });
    
        updateWrapperSize();
        saveState();
    });
    
    function scheduleAnimation(callback, delay) {
        const timeoutId = setTimeout(callback, delay);
        animationTimeouts.push(timeoutId);
    }

    function simulateTyping(element, text, isInput, avgDelay, callback) {
        if (!text || text.length === 0) {
            if (callback) callback();
            return;
        }
        let i = 0;
        const variation = avgDelay * 0.7; 

        function typeChar() {
            if (i < text.length) {
                const char = text.charAt(i);
                if (isInput) {
                    element.value += char;
                } else {
                    element.textContent += char;
                }
                i++;
                const randomJitter = (Math.random() * variation * 2) - variation;
                const nextDelay = Math.max(avgDelay + randomJitter, 30); 

                scheduleAnimation(typeChar, nextDelay);
            } else if (callback) {
                callback();
            }
        }
        typeChar();
    }

    document.getElementById('ready-button').addEventListener('click', () => {
        deselectAll();
        document.body.classList.add('simulation-mode');

        if (!document.getElementById('preview-timer').classList.contains('hidden')) {
            const parts = timerInput.value.split(':');
            const minutes = parseInt(parts[0], 10) || 0;
            const seconds = parseInt(parts[1], 10) || 0;
            startTimer(minutes, seconds);
        }

        const nameEl = document.getElementById('preview-name');
        const phoneEl = document.getElementById('preview-phone');
        const buttonEl = document.getElementById('preview-button');
        
        const animationDuration = (parseInt(document.getElementById('ctrl-animation-duration').value, 10) || 5) * 1000;
        
        const code = getCodeByName(regionInput.value) || 'ru';
        const data = countryData[code] || {};
        
        const targetName = nameEl.textContent;
        nameEl.textContent = data.translations ? data.translations.name_placeholder : "Имя";
        nameEl.style.color = '#999';

        const fullTargetPhone = phoneEl.value;
        const phoneCode = data.phoneCode || '';
        const targetPhone = fullTargetPhone.startsWith(phoneCode) ? fullTargetPhone.substring(phoneCode.length) : fullTargetPhone;

        phoneEl.value = phoneCode;

        scheduleAnimation(() => {
            const nameDuration = animationDuration * 0.5;
            const phoneDuration = animationDuration * 0.5;
            const avgNameDelay = targetName.length > 0 ? nameDuration / targetName.length : 0;
            const avgPhoneDelay = targetPhone.length > 0 ? phoneDuration / targetPhone.length : 0;

            nameEl.textContent = '';
            nameEl.style.color = '#333';

            simulateTyping(nameEl, targetName, false, avgNameDelay, () => {
                scheduleAnimation(() => {
                    simulateTyping(phoneEl, targetPhone, true, avgPhoneDelay, () => {
                        scheduleAnimation(() => {
                            const hasBeenMoved = buttonEl.hasAttribute('data-x');
                            let transformPart;

                            if (hasBeenMoved) {
                                const currentX = parseFloat(buttonEl.getAttribute('data-x')) || 0;
                                const currentY = parseFloat(buttonEl.getAttribute('data-y')) || 0;
                                transformPart = `translate(${currentX}px, ${currentY}px)`;
                            } else {
                                transformPart = 'translateX(-50%)';
                            }

                            buttonEl.style.transform = `${transformPart} scale(0.96)`;
                            scheduleAnimation(() => {
                                buttonEl.style.transform = `${transformPart} scale(1)`;
                            }, 400);
                        }, 500);
                    });
                }, 1000);
            });
        }, 3000);
    });

    editBanner.addEventListener('click', () => {
        document.body.classList.remove('simulation-mode');
        editBanner.classList.remove('visible');
        clearInterval(timerInterval);

        animationTimeouts.forEach(clearTimeout);
        animationTimeouts = [];

        const lastState = historyStack[historyStack.length - 1];
        if (lastState) {
            restoreState(lastState);
        }
    });

    document.addEventListener('mousemove', (event) => { if (document.body.classList.contains('simulation-mode')) { if (event.clientY < 50) { clearTimeout(hideBannerTimeout); editBanner.classList.add('visible'); } else if (event.clientY > 70) { clearTimeout(hideBannerTimeout); hideBannerTimeout = setTimeout(() => { editBanner.classList.remove('visible'); }, 1000); }}});
    
    const presetsSelect = document.getElementById('format-presets');
    const STORAGE_KEY = 'visualEditorPresets';

    function getPresets() {
        const presetsJSON = localStorage.getItem(STORAGE_KEY);
        return presetsJSON ? JSON.parse(presetsJSON) : {};
    }

    function updatePresetsList() {
        const presets = getPresets();
        const currentSelection = presetsSelect.value;
        presetsSelect.innerHTML = '';
        if (Object.keys(presets).length === 0) {
            const option = document.createElement('option');
            option.textContent = 'Нет сохраненных пресетов';
            option.disabled = true;
            presetsSelect.appendChild(option);
        } else {
            for (const name in presets) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                presetsSelect.appendChild(option);
            }
            presetsSelect.value = currentSelection;
        }
    }
    
    function saveFormatting() {
        const defaultName = `Пресет от ${new Date().toLocaleDateString()}`;
        const presetName = prompt("Введите имя для этого пресета:", presetsSelect.value || defaultName);
        if (!presetName) return;

        const formWrapper = document.querySelector('.form-wrapper');
        const timerToggle = document.getElementById('timer-toggle');
        const flagToggle = document.getElementById('flag-toggle');

        const formattingData = {
            formHtml: formWrapper.innerHTML,
            timerValue: timerInput.value,
            timerFontSize: timerFontSizeInput.value,
            animationDuration: document.getElementById('ctrl-animation-duration').value,
            isTimerHidden: timerToggle.classList.contains('dimmed'),
            isFlagHidden: flagToggle.classList.contains('dimmed'),
            regionValue: regionInput.value // ИЗМЕНЕНИЕ: Сохраняем выбранную страну
        };
        
        const presets = getPresets();
        presets[presetName] = formattingData;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
        
        updatePresetsList();
        presetsSelect.value = presetName;
        alert(`Пресет "${presetName}" сохранен!`);
    }

    function loadFormatting() {
        const presetName = presetsSelect.value;
        if (!presetName || presetsSelect.options[presetsSelect.selectedIndex].disabled) {
            alert('Пожалуйста, выберите пресет для загрузки.');
            return;
        }

        const presets = getPresets();
        const formattingData = presets[presetName];

        if (!formattingData) {
            alert(`Ошибка: Пресет "${presetName}" не найден.`);
            return;
        }

        // ИЗМЕНЕНИЕ: Сначала устанавливаем страну, чтобы остальные данные (валюта и т.д.) применились корректно
        if (formattingData.regionValue) {
            regionInput.value = formattingData.regionValue;
            // Программно вызываем событие input, чтобы обновились все данные, связанные со страной
            regionInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        const formWrapper = document.querySelector('.form-wrapper');
        formWrapper.innerHTML = formattingData.formHtml;
        timerInput.value = formattingData.timerValue;
        timerFontSizeInput.value = formattingData.timerFontSize;
        document.getElementById('ctrl-animation-duration').value = formattingData.animationDuration;
        
        document.getElementById('timer-toggle').classList.toggle('dimmed', formattingData.isTimerHidden);
        document.getElementById('flag-toggle').classList.toggle('dimmed', formattingData.isFlagHidden);

        reinitializeInteractions();
        attachFileInputListeners();
        updateTimerDisplay();

        setTimeout(() => {
            updateWrapperSize();
            saveState();
        }, 0);

        alert(`Пресет "${presetName}" загружен!`);
    }

    function deleteFormatting() {
        const presetName = presetsSelect.value;
        if (!presetName || presetsSelect.options[presetsSelect.selectedIndex].disabled) {
            alert('Пожалуйста, выберите пресет для удаления.');
            return;
        }
        
        if (!confirm(`Вы уверены, что хотите удалить пресет "${presetName}"?`)) {
            return;
        }

        const presets = getPresets();
        delete presets[presetName];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
        
        updatePresetsList();
        alert(`Пресет "${presetName}" удален.`);
    }

    function resetFormView() {
        if (confirm('Вы уверены, что хотите сбросить текущее редактирование? Форма вернется к исходному состоянию. Сохраненные пресеты не будут удалены.')) {
            window.location.reload();
        }
    }
    
    document.getElementById('reset-button').addEventListener('click', resetFormView); 
    document.getElementById('save-format-button').addEventListener('click', saveFormatting);
    document.getElementById('load-format-button').addEventListener('click', loadFormatting);
    document.getElementById('delete-format-button').addEventListener('click', deleteFormatting);
    
    function initialize() {
        populateCountrySelector();
        updatePresetsList();
        const initialCode = 'ru'; 
        updateFormForCountry(initialCode); 
        regionInput.value = ''; 
        reinitializeInteractions();
        attachFileInputListeners();
        updateTimerDisplay();

        if (regionInput.value) {
            clearRegionButton.classList.remove('hidden');
        } else {
            clearRegionButton.classList.add('hidden');
        }

        setTimeout(() => {
            updateWrapperSize();
            historyStack = [];
            saveState(); 
        }, 100);

        window.addEventListener('resize', updateWrapperSize);
    }
    
    initialize();
});