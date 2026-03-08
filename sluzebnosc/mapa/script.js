/**
 * Mapa Linii Energetycznych - Scripts
 */

document.addEventListener('DOMContentLoaded', function() {
    initMainMap();
    initModal();
    initLeadForm();
    initSearch();
});

/**
 * Main Map with Power Lines
 */
let mainMap = null;
let powerLinesLayer = null;
let clickMarker = null;
let currentBounds = null;

function initMainMap() {
    const mapContainer = document.getElementById('main-map');
    if (!mapContainer) return;

    // Initialize map centered on Poland
    mainMap = L.map('main-map', {
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        dragging: true
    }).setView([52.0, 19.5], 6);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
    }).addTo(mainMap);

    // Initialize power lines layer group
    powerLinesLayer = L.layerGroup().addTo(mainMap);

    // Load power lines when map is ready
    mainMap.on('load', () => loadPowerLines());
    mainMap.on('moveend', debounce(() => loadPowerLines(), 500));

    // Initial load
    setTimeout(() => loadPowerLines(), 500);

    // Click handler for parcel info
    mainMap.on('click', handleMapClick);

    // Locate me button
    document.getElementById('locate-me')?.addEventListener('click', locateUser);

    // Info panel close
    document.getElementById('info-panel-close')?.addEventListener('click', () => {
        document.getElementById('info-panel')?.classList.remove('visible');
        if (clickMarker) {
            mainMap.removeLayer(clickMarker);
            clickMarker = null;
        }
    });
}

/**
 * Load power lines from Overpass API
 */
async function loadPowerLines() {
    if (!mainMap) return;

    const zoom = mainMap.getZoom();

    // Only load detailed lines at zoom >= 10
    if (zoom < 8) {
        document.getElementById('lines-count').textContent = '—';
        document.getElementById('area-name').textContent = 'Przybliż mapę';
        return;
    }

    const bounds = mainMap.getBounds();
    const boundsStr = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;

    // Check if we already loaded this area
    if (currentBounds === boundsStr) return;
    currentBounds = boundsStr;

    // Show loading
    document.getElementById('map-loading')?.classList.add('visible');

    try {
        // Overpass query for power lines
        const query = `
            [out:json][timeout:30];
            (
                way["power"="line"](${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
            );
            out geom;
        `;

        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: 'data=' + encodeURIComponent(query),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (!response.ok) throw new Error('API error');

        const data = await response.json();

        // Clear existing lines
        powerLinesLayer.clearLayers();

        // Add lines to map
        let lineCount = 0;
        data.elements.forEach(element => {
            if (element.geometry && element.geometry.length > 1) {
                const coords = element.geometry.map(p => [p.lat, p.lon]);
                const voltage = parseInt(element.tags?.voltage) || 0;

                const line = L.polyline(coords, {
                    color: getVoltageColor(voltage),
                    weight: getVoltageWeight(voltage),
                    opacity: 1,
                    lineCap: 'round',
                    lineJoin: 'round'
                });

                // Add popup with info
                const popupContent = `
                    <strong>Linia energetyczna</strong><br>
                    ${element.tags?.name || 'Bez nazwy'}<br>
                    Napięcie: ${formatVoltage(voltage)}<br>
                    ${element.tags?.operator ? 'Operator: ' + element.tags.operator : ''}
                `;
                line.bindPopup(popupContent);

                powerLinesLayer.addLayer(line);
                lineCount++;
            }
        });

        // Update stats
        document.getElementById('lines-count').textContent = lineCount;
        updateAreaName(bounds);

    } catch (error) {
        console.error('Error loading power lines:', error);
        document.getElementById('lines-count').textContent = 'Błąd';
    } finally {
        document.getElementById('map-loading')?.classList.remove('visible');
    }
}

/**
 * Get color based on voltage
 */
function getVoltageColor(voltage) {
    if (voltage >= 380000) return '#e11d48'; // 400kV - bright red/pink
    if (voltage >= 200000) return '#f97316'; // 220kV - bright orange
    if (voltage >= 100000) return '#facc15'; // 110kV - bright yellow
    return '#a855f7'; // other - purple (more visible than gray)
}

/**
 * Get line weight based on voltage
 */
function getVoltageWeight(voltage) {
    if (voltage >= 380000) return 6;
    if (voltage >= 200000) return 5;
    if (voltage >= 100000) return 4;
    return 3;
}

/**
 * Format voltage for display
 */
function formatVoltage(voltage) {
    if (!voltage) return 'Nieznane';
    if (voltage >= 1000) return (voltage / 1000) + ' kV';
    return voltage + ' V';
}

/**
 * Update area name based on bounds center
 */
async function updateAreaName(bounds) {
    const center = bounds.getCenter();
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${center.lat}&lon=${center.lng}&format=json&zoom=10&accept-language=pl`
        );
        const data = await response.json();

        let name = 'Polska';
        if (data.address) {
            name = data.address.city || data.address.town || data.address.county || data.address.state || 'Polska';
        }
        document.getElementById('area-name').textContent = name;
    } catch (e) {
        document.getElementById('area-name').textContent = 'Polska';
    }
}

/**
 * Handle map click - get parcel info
 */
async function handleMapClick(e) {
    const { lat, lng } = e.latlng;

    // Custom pin icon
    const pinIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `<svg width="32" height="42" viewBox="0 0 32 42" fill="none">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z" fill="#1e40af"/>
            <circle cx="16" cy="16" r="6" fill="white"/>
        </svg>`,
        iconSize: [32, 42],
        iconAnchor: [16, 42]
    });

    // Remove existing marker
    if (clickMarker) {
        mainMap.removeLayer(clickMarker);
    }

    // Add new marker
    clickMarker = L.marker([lat, lng], { icon: pinIcon }).addTo(mainMap);

    // Show info panel with loading state
    const infoPanel = document.getElementById('info-panel');
    const infoLocation = document.getElementById('info-location');
    const infoParcel = document.getElementById('info-parcel');
    const infoLine = document.getElementById('info-line');
    const infoDistance = document.getElementById('info-distance');
    const infoVerdict = document.getElementById('info-verdict');

    infoPanel?.classList.add('visible');
    infoLocation.textContent = 'Szukam...';
    infoParcel.textContent = 'Szukam...';
    infoLine.textContent = '—';
    infoDistance.textContent = '—';
    infoVerdict.className = 'info-verdict';
    infoVerdict.innerHTML = '';

    // Hide map hint
    document.getElementById('map-hint-overlay').style.display = 'none';

    // Fetch location and parcel info in parallel
    const [locationData, parcelData] = await Promise.all([
        fetchLocationName(lat, lng),
        fetchParcelInfo(lat, lng)
    ]);

    // Update location
    infoLocation.textContent = locationData || 'Nieznana lokalizacja';

    // Update parcel
    if (parcelData.parcel) {
        infoParcel.textContent = parcelData.display;
    } else {
        infoParcel.textContent = 'Nie znaleziono';
    }

    // Find nearest power line
    const nearestLine = findNearestPowerLine(lat, lng);
    if (nearestLine) {
        infoLine.textContent = formatVoltage(nearestLine.voltage);
        infoDistance.textContent = nearestLine.distance < 1000
            ? `${Math.round(nearestLine.distance)} m`
            : `${(nearestLine.distance / 1000).toFixed(1)} km`;

        // Determine verdict
        const inZone = isInProtectionZone(nearestLine.voltage, nearestLine.distance);
        if (inZone) {
            infoVerdict.className = 'info-verdict positive';
            infoVerdict.innerHTML = `
                <div class="verdict-icon">✓</div>
                <div class="verdict-text">Prawdopodobnie przysługuje odszkodowanie</div>
            `;
        } else if (nearestLine.distance < 200) {
            infoVerdict.className = 'info-verdict warning';
            infoVerdict.innerHTML = `
                <div class="verdict-icon">?</div>
                <div class="verdict-text">Możliwe roszczenie - wymaga weryfikacji</div>
            `;
        } else {
            infoVerdict.className = 'info-verdict negative';
            infoVerdict.innerHTML = `
                <div class="verdict-icon">—</div>
                <div class="verdict-text">Działka poza strefą ochronną</div>
            `;
        }
    } else {
        infoLine.textContent = 'Brak w pobliżu';
        infoDistance.textContent = '—';
        infoVerdict.className = 'info-verdict negative';
        infoVerdict.innerHTML = `
            <div class="verdict-icon">—</div>
            <div class="verdict-text">Nie wykryto linii w pobliżu</div>
        `;
    }
}

/**
 * Fetch location name using Nominatim
 */
async function fetchLocationName(lat, lng) {
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
            return parts.join(', ');
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Fetch parcel info from ULDK
 */
async function fetchParcelInfo(lat, lng) {
    try {
        const response = await fetch(
            `https://uldk.gugik.gov.pl/?request=GetParcelByXY&xy=${lng},${lat},4326&result=teryt,parcel,region`
        );
        const text = await response.text();
        const lines = text.trim().split('\n');

        if (lines[0] === '0' && lines[1]) {
            const parts = lines[1].split('|');
            if (parts.length >= 2) {
                const teryt = parts[0];
                const parcel = parts[1];
                const region = parts[2] || '';

                return {
                    teryt: teryt,
                    parcel: parcel,
                    region: region,
                    display: region ? `${region}, dz. ${parcel}` : parcel
                };
            }
        }
        return { parcel: null };
    } catch (e) {
        return { parcel: null };
    }
}

/**
 * Find nearest power line to a point
 */
function findNearestPowerLine(lat, lng) {
    if (!powerLinesLayer) return null;

    let nearest = null;
    let minDistance = Infinity;

    powerLinesLayer.eachLayer(layer => {
        if (layer instanceof L.Polyline) {
            const latlngs = layer.getLatLngs();

            // Find closest point on line
            for (let i = 0; i < latlngs.length - 1; i++) {
                const dist = distanceToSegment(
                    { lat, lng },
                    latlngs[i],
                    latlngs[i + 1]
                );

                if (dist < minDistance) {
                    minDistance = dist;
                    // Extract voltage from line color
                    const color = layer.options.color;
                    nearest = {
                        distance: dist,
                        voltage: colorToVoltage(color)
                    };
                }
            }
        }
    });

    return nearest;
}

/**
 * Calculate distance from point to line segment (in meters)
 */
function distanceToSegment(point, lineStart, lineEnd) {
    const R = 6371000; // Earth radius in meters

    // Convert to radians
    const lat = point.lat * Math.PI / 180;
    const lng = point.lng * Math.PI / 180;
    const lat1 = lineStart.lat * Math.PI / 180;
    const lng1 = lineStart.lng * Math.PI / 180;
    const lat2 = lineEnd.lat * Math.PI / 180;
    const lng2 = lineEnd.lng * Math.PI / 180;

    // Simplified calculation - distance to closest endpoint or perpendicular
    const d1 = haversineDistance(point.lat, point.lng, lineStart.lat, lineStart.lng);
    const d2 = haversineDistance(point.lat, point.lng, lineEnd.lat, lineEnd.lng);

    return Math.min(d1, d2);
}

/**
 * Haversine distance between two points (in meters)
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

/**
 * Convert color back to approximate voltage
 */
function colorToVoltage(color) {
    if (color === '#e11d48') return 400000;
    if (color === '#f97316') return 220000;
    if (color === '#facc15') return 110000;
    return 15000;
}

/**
 * Check if distance is within protection zone for given voltage
 */
function isInProtectionZone(voltage, distance) {
    // Protection zones (approximate)
    const zones = {
        400000: 70,  // 400kV - 70m
        220000: 50,  // 220kV - 50m
        110000: 30,  // 110kV - 30m
        15000: 10    // LV - 10m
    };

    const zone = zones[voltage] || 10;
    return distance <= zone;
}

/**
 * Locate user using GPS
 */
function locateUser() {
    if (!navigator.geolocation) {
        alert('Twoja przeglądarka nie wspiera geolokalizacji');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            mainMap.setView([latitude, longitude], 14);
        },
        (error) => {
            alert('Nie udało się pobrać lokalizacji. Sprawdź uprawnienia.');
        },
        { timeout: 10000 }
    );
}

/**
 * Initialize search functionality
 */
function initSearch() {
    const searchInput = document.getElementById('location-search');
    const searchBtn = document.getElementById('search-btn');

    if (!searchInput || !searchBtn) return;

    const performSearch = async () => {
        const query = searchInput.value.trim();
        if (!query) return;

        searchBtn.textContent = 'Szukam...';
        searchBtn.disabled = true;

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)},Polska&format=json&limit=1`
            );
            const data = await response.json();

            if (data.length > 0) {
                const { lat, lon } = data[0];
                mainMap.setView([parseFloat(lat), parseFloat(lon)], 14);
            } else {
                alert('Nie znaleziono lokalizacji. Spróbuj inny adres.');
            }
        } catch (e) {
            alert('Błąd wyszukiwania. Spróbuj ponownie.');
        } finally {
            searchBtn.textContent = 'Szukaj';
            searchBtn.disabled = false;
        }
    };

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
}

/**
 * Debounce helper
 */
function debounce(fn, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Modal functionality
 */
function initModal() {
    const modal = document.getElementById('lead-modal');
    if (!modal) return;

    const closeBtn = modal.querySelector('.modal-close');
    const closeBtnSuccess = modal.querySelector('.modal-close-btn');

    // Open modal triggers
    document.querySelectorAll('[data-open-modal="lead-modal"]').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });
    });

    // Close modal triggers
    closeBtn?.addEventListener('click', closeModal);
    closeBtnSuccess?.addEventListener('click', closeModal);

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

    window.openLeadModal = openModal;
    window.closeLeadModal = closeModal;
}

/**
 * Multi-step Lead Form (same as main page)
 */
function initLeadForm() {
    const form = document.getElementById('lead-form');
    if (!form) return;

    const steps = form.querySelectorAll('.form-step');
    const successEl = form.querySelector('.form-success');

    let map = null;
    let marker = null;

    // Clear errors on interaction
    form.querySelectorAll('input[name="urzadzenia"]').forEach(input => {
        input.addEventListener('change', () => {
            hideError('step1-error');
            form.querySelectorAll('.option-card').forEach(card => card.classList.remove('has-error'));
        });
    });

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

            // Validation logic (same as main page)
            if (currentStep.dataset.step === '1') {
                const checked = currentStep.querySelectorAll('input[name="urzadzenia"]:checked');
                if (checked.length === 0) {
                    showError('step1-error');
                    form.querySelectorAll('.option-card').forEach(card => card.classList.add('has-error'));
                    shakeButton(btn);
                    return;
                }
            }

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

            if (nextStepNum === '4') {
                setTimeout(() => initFormMap(), 100);
            }
        });
    });

    // Back buttons
    form.querySelectorAll('.btn-form-back').forEach(btn => {
        btn.addEventListener('click', () => {
            goToStep(btn.dataset.back);
        });
    });

    // Form submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.urzadzenia = Array.from(form.querySelectorAll('input[name="urzadzenia"]:checked'))
            .map(cb => cb.value);

        console.log('Lead data:', data);

        steps.forEach(s => s.classList.remove('active'));
        form.querySelector('.form-progress').style.display = 'none';
        successEl.style.display = 'block';
    });

    function initFormMap() {
        const mapContainer = document.getElementById('location-map');
        if (!mapContainer || map) return;

        map = L.map('location-map').setView([52.0, 19.5], 6);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap',
            maxZoom: 19
        }).addTo(map);

        const pinIcon = L.divIcon({
            className: 'custom-map-pin',
            html: `<svg width="32" height="42" viewBox="0 0 32 42" fill="none">
                <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z" fill="#dc2626"/>
                <circle cx="16" cy="16" r="6" fill="white"/>
            </svg>`,
            iconSize: [32, 42],
            iconAnchor: [16, 42]
        });

        map.on('click', async function(e) {
            const { lat, lng } = e.latlng;

            if (marker) map.removeLayer(marker);
            marker = L.marker([lat, lng], { icon: pinIcon }).addTo(map);

            document.getElementById('location-lat').value = lat.toFixed(6);
            document.getElementById('location-lng').value = lng.toFixed(6);

            document.getElementById('map-hint').style.display = 'none';
            document.getElementById('map-selected').style.display = 'flex';

            hideError('step4-error');
            mapContainer.classList.remove('has-error');

            // Fetch location and parcel
            const [locationName, parcelData] = await Promise.all([
                fetchLocationName(lat, lng),
                fetchParcelInfo(lat, lng)
            ]);

            if (locationName) {
                document.getElementById('location-display').textContent = locationName;
            }

            const parcelInfo = document.getElementById('parcel-info');
            const parcelNumber = document.getElementById('parcel-number');
            const parcelInput = document.getElementById('numer-dzialki');

            if (parcelData.parcel) {
                parcelInfo.style.display = 'flex';
                parcelNumber.textContent = parcelData.display;
                parcelInput.value = parcelData.teryt;
            } else {
                parcelInfo.style.display = 'flex';
                parcelNumber.textContent = 'Nie znaleziono';
                parcelInput.value = '';
            }
        });

        // Fullscreen toggle
        const fullscreenBtn = document.getElementById('map-fullscreen-btn');
        const mapWrapper = mapContainer.closest('.map-wrapper');

        if (fullscreenBtn && mapWrapper) {
            fullscreenBtn.addEventListener('click', () => {
                mapWrapper.classList.toggle('map-fullscreen');
                document.body.classList.toggle('map-fullscreen-active');
                setTimeout(() => map.invalidateSize(), 300);
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && mapWrapper.classList.contains('map-fullscreen')) {
                    mapWrapper.classList.remove('map-fullscreen');
                    document.body.classList.remove('map-fullscreen-active');
                    setTimeout(() => map.invalidateSize(), 300);
                }
            });
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    map.setView([position.coords.latitude, position.coords.longitude], 13);
                },
                () => {},
                { timeout: 5000 }
            );
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
