/**
 * Odszkodowanie za Słupy - Landing Page Scripts
 */

document.addEventListener('DOMContentLoaded', function() {
    initCountdown();
    initSmoothScroll();
    initModal();
    initLeadForm();
});

/**
 * Countdown Timer do 2 marca 2026
 */
function initCountdown() {
    const deadline = new Date('2026-03-02T23:59:59').getTime();

    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');

    if (!daysEl || !hoursEl || !minutesEl) return;

    function updateCountdown() {
        const now = new Date().getTime();
        const timeLeft = deadline - now;

        if (timeLeft < 0) {
            daysEl.textContent = '0';
            hoursEl.textContent = '0';
            minutesEl.textContent = '0';
            return;
        }

        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

        daysEl.textContent = days;
        hoursEl.textContent = hours.toString().padStart(2, '0');
        minutesEl.textContent = minutes.toString().padStart(2, '0');
    }

    updateCountdown();
    setInterval(updateCountdown, 60000);
}

/**
 * Smooth scroll for anchor links
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]:not([data-open-modal])').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * Modal functionality
 */
function initModal() {
    const modal = document.getElementById('lead-modal');
    if (!modal) return;

    const backdrop = modal.querySelector('.modal-backdrop');
    const closeBtn = modal.querySelector('.modal-close');
    const closeBtnSuccess = modal.querySelector('.modal-close-btn');

    // Open modal triggers
    document.querySelectorAll('[data-open-modal="lead-modal"]').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });
    });

    // Close modal triggers (only X button and success close button)
    closeBtn?.addEventListener('click', closeModal);
    closeBtnSuccess?.addEventListener('click', closeModal);
    // Backdrop click disabled - user must use X button

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) {
            closeModal();
        }
    });

    function openModal() {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }

    // Expose for external use
    window.openLeadModal = openModal;
    window.closeLeadModal = closeModal;
}

/**
 * Multi-step Lead Form
 * Step order: 1. Equipment → 2. Qualification → 3. Contact → 4. Map + Details
 */
function initLeadForm() {
    const form = document.getElementById('lead-form');
    if (!form) return;

    const steps = form.querySelectorAll('.form-step');
    const successEl = form.querySelector('.form-success');

    let map = null;
    let marker = null;

    // Clear errors when user interacts with step 1 options
    form.querySelectorAll('input[name="urzadzenia"]').forEach(input => {
        input.addEventListener('change', () => {
            hideError('step1-error');
            form.querySelectorAll('.option-card').forEach(card => card.classList.remove('has-error'));
        });
    });

    // Clear errors when user interacts with step 2 questions
    ['wlasciciel', 'umowa', 'wynagrodzenie'].forEach(name => {
        form.querySelectorAll(`input[name="${name}"]`).forEach(input => {
            input.addEventListener('change', () => {
                const question = input.closest('.form-question');
                question.classList.remove('has-error');
                const allAnswered = ['wlasciciel', 'umowa', 'wynagrodzenie'].every(q =>
                    form.querySelector(`input[name="${q}"]:checked`)
                );
                if (allAnswered) hideError('step2-error');
            });
        });
    });

    // Clear errors when user interacts with step 3 (contact) fields
    ['imie', 'telefon'].forEach(id => {
        const input = form.querySelector(`#${id}`);
        if (input) {
            input.addEventListener('input', () => {
                input.classList.remove('has-error');
                hideError('step3-error');
            });
        }
    });

    const zgodaCheckbox = form.querySelector('input[name="zgoda"]');
    if (zgodaCheckbox) {
        zgodaCheckbox.addEventListener('change', () => {
            document.getElementById('zgoda-field')?.classList.remove('has-error');
            hideError('step3-error');
        });
    }

    // Next buttons
    form.querySelectorAll('.btn-form-next').forEach(btn => {
        btn.addEventListener('click', () => {
            const currentStep = btn.closest('.form-step');
            const nextStepNum = btn.dataset.next;

            // Validate step 1 (equipment)
            if (currentStep.dataset.step === '1') {
                const checked = currentStep.querySelectorAll('input[name="urzadzenia"]:checked');
                if (checked.length === 0) {
                    showError('step1-error');
                    form.querySelectorAll('.option-card').forEach(card => card.classList.add('has-error'));
                    shakeButton(btn);
                    return;
                }
            }

            // Validate step 2 (qualification)
            if (currentStep.dataset.step === '2') {
                const questions = ['wlasciciel', 'umowa', 'wynagrodzenie'];
                let hasError = false;

                for (const q of questions) {
                    const questionEl = form.querySelector(`.form-question[data-question="${q}"]`);
                    if (!form.querySelector(`input[name="${q}"]:checked`)) {
                        questionEl?.classList.add('has-error');
                        hasError = true;
                    }
                }

                if (hasError) {
                    showError('step2-error');
                    shakeButton(btn);
                    return;
                }
            }

            // Validate step 3 (contact info)
            if (currentStep.dataset.step === '3') {
                const imie = form.querySelector('#imie');
                const telefon = form.querySelector('#telefon');
                const zgoda = form.querySelector('input[name="zgoda"]');
                const zgodaField = document.getElementById('zgoda-field');
                const errorText = document.getElementById('step3-error-text');

                let hasError = false;

                if (!imie.value.trim()) {
                    imie.classList.add('has-error');
                    hasError = true;
                }

                if (!telefon.value.trim()) {
                    telefon.classList.add('has-error');
                    hasError = true;
                }

                if (!zgoda.checked) {
                    zgodaField?.classList.add('has-error');
                    hasError = true;
                }

                if (hasError) {
                    if (!imie.value.trim() || !telefon.value.trim()) {
                        errorText.textContent = 'Wypełnij wymagane pola';
                    } else {
                        errorText.textContent = 'Zaakceptuj zgodę na kontakt';
                    }
                    showError('step3-error');
                    shakeButton(btn);

                    if (!imie.value.trim()) {
                        imie.focus();
                    } else if (!telefon.value.trim()) {
                        telefon.focus();
                    }
                    return;
                }
            }

            // Validate step 4 (map location)
            if (currentStep.dataset.step === '4') {
                const locationLat = form.querySelector('#location-lat');
                const locationLng = form.querySelector('#location-lng');
                const mapContainer = document.getElementById('location-map');
                const errorText = document.getElementById('step4-error-text');

                if (!locationLat.value || !locationLng.value) {
                    errorText.textContent = 'Wskaż lokalizację na mapie';
                    showError('step4-error');
                    mapContainer?.classList.add('has-error');
                    shakeButton(btn);
                    return;
                }
            }

            goToStep(nextStepNum);

            // Initialize map when entering step 4
            if (nextStepNum === '4') {
                setTimeout(() => initMap(), 100);
            }
        });
    });

    // Back buttons
    form.querySelectorAll('.btn-form-back').forEach(btn => {
        btn.addEventListener('click', () => {
            goToStep(btn.dataset.back);
        });
    });

    // Form submit (step 5 - no required fields, just submit)
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Collect data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.urzadzenia = Array.from(form.querySelectorAll('input[name="urzadzenia"]:checked'))
            .map(cb => cb.value);

        console.log('Lead data:', data);

        // Show success
        steps.forEach(s => s.classList.remove('active'));
        form.querySelector('.form-progress').style.display = 'none';
        successEl.style.display = 'block';

        // TODO: Send data to backend
    });

    function initMap() {
        const mapContainer = document.getElementById('location-map');
        if (!mapContainer || map) return;

        // Center on Poland
        map = L.map('location-map').setView([52.0, 19.5], 6);

        // Fullscreen toggle
        const fullscreenBtn = document.getElementById('map-fullscreen-btn');
        const mapWrapper = mapContainer.closest('.map-wrapper');

        if (fullscreenBtn && mapWrapper) {
            fullscreenBtn.addEventListener('click', () => {
                mapWrapper.classList.toggle('map-fullscreen');
                document.body.classList.toggle('map-fullscreen-active');

                // Update button icon
                const isFullscreen = mapWrapper.classList.contains('map-fullscreen');
                fullscreenBtn.innerHTML = isFullscreen
                    ? `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M7 3H3v4M13 3h4v4M7 17H3v-4M13 17h4v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                       </svg>`
                    : `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M3 7V3h4M17 7V3h-4M3 13v4h4M17 13v4h-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                       </svg>`;

                // Invalidate map size after transition
                setTimeout(() => map.invalidateSize(), 300);
            });

            // Close fullscreen on Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && mapWrapper.classList.contains('map-fullscreen')) {
                    mapWrapper.classList.remove('map-fullscreen');
                    document.body.classList.remove('map-fullscreen-active');
                    fullscreenBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M3 7V3h4M17 7V3h-4M3 13v4h4M17 13v4h-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                       </svg>`;
                    setTimeout(() => map.invalidateSize(), 300);
                }
            });
        }

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap',
            maxZoom: 19
        }).addTo(map);

        // Custom pin icon
        const pinIcon = L.divIcon({
            className: 'custom-map-pin',
            html: `<svg width="32" height="42" viewBox="0 0 32 42" fill="none">
                <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z" fill="#dc2626"/>
                <circle cx="16" cy="16" r="6" fill="white"/>
            </svg>`,
            iconSize: [32, 42],
            iconAnchor: [16, 42]
        });

        // Handle map click
        map.on('click', function(e) {
            const { lat, lng } = e.latlng;

            // Remove existing marker
            if (marker) {
                map.removeLayer(marker);
            }

            // Add new marker
            marker = L.marker([lat, lng], { icon: pinIcon }).addTo(map);

            // Update hidden fields
            document.getElementById('location-lat').value = lat.toFixed(6);
            document.getElementById('location-lng').value = lng.toFixed(6);

            // Update UI
            document.getElementById('map-hint').style.display = 'none';
            document.getElementById('map-selected').style.display = 'flex';

            // Clear any error
            hideError('step4-error');
            mapContainer.classList.remove('has-error');

            // Reverse geocode to show location name
            reverseGeocode(lat, lng);

            // Fetch parcel number from ULDK
            fetchParcelInfo(lat, lng);
        });

        // Try to get user's location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    map.setView([latitude, longitude], 13);
                },
                () => {
                    // User denied or error - stay on Poland view
                },
                { timeout: 5000 }
            );
        }
    }

    async function reverseGeocode(lat, lng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=pl`
            );
            const data = await response.json();

            if (data.address) {
                const parts = [];
                if (data.address.village || data.address.town || data.address.city) {
                    parts.push(data.address.village || data.address.town || data.address.city);
                }
                if (data.address.county) {
                    parts.push(data.address.county);
                }

                if (parts.length > 0) {
                    document.getElementById('location-display').textContent = parts.join(', ');
                }
            }
        } catch (error) {
            // Silently fail - display will show default text
        }
    }

    async function fetchParcelInfo(lat, lng) {
        const parcelInfo = document.getElementById('parcel-info');
        const parcelNumber = document.getElementById('parcel-number');
        const parcelInput = document.getElementById('numer-dzialki');

        // Show loading state
        parcelInfo.style.display = 'flex';
        parcelNumber.textContent = 'Szukam...';

        try {
            // ULDK API - format: xy=longitude,latitude,SRID (4326 = WGS84)
            const response = await fetch(
                `https://uldk.gugik.gov.pl/?request=GetParcelByXY&xy=${lng},${lat},4326&result=teryt,parcel,region`
            );
            const text = await response.text();
            const lines = text.trim().split('\n');

            // ULDK returns: line 1 = status (0=success, -1=error), line 2 = data
            if (lines[0] === '0' && lines[1]) {
                const parts = lines[1].split('|');
                if (parts.length >= 2) {
                    const teryt = parts[0];
                    const parcel = parts[1];
                    const region = parts[2] || '';

                    // Format: region + numer działki
                    const displayText = region ? `${region}, dz. ${parcel}` : parcel;
                    parcelNumber.textContent = displayText;
                    parcelInput.value = teryt;
                } else {
                    parcelNumber.textContent = 'Nie znaleziono';
                    parcelInput.value = '';
                }
            } else {
                parcelNumber.textContent = 'Nie znaleziono';
                parcelInput.value = '';
            }
        } catch (error) {
            parcelNumber.textContent = 'Błąd pobierania';
            parcelInput.value = '';
        }
    }

    function goToStep(stepNum) {
        document.querySelectorAll('.form-error').forEach(el => el.classList.remove('visible'));

        steps.forEach(s => s.classList.remove('active'));
        const target = form.querySelector(`.form-step[data-step="${stepNum}"]`);
        if (target) {
            target.classList.add('active');
            updateProgress(stepNum);
        }
    }

    function updateProgress(stepNum) {
        const progressBar = form.querySelector('.progress-bar');
        if (progressBar) {
            const progress = (stepNum / 5) * 100;
            progressBar.style.setProperty('--progress', `${progress}%`);
        }
    }

    function showError(errorId) {
        const errorEl = document.getElementById(errorId);
        if (errorEl) errorEl.classList.add('visible');
    }

    function hideError(errorId) {
        const errorEl = document.getElementById(errorId);
        if (errorEl) errorEl.classList.remove('visible');
    }

    function shakeButton(btn) {
        btn.classList.add('shake');
        setTimeout(() => btn.classList.remove('shake'), 500);
    }
}
