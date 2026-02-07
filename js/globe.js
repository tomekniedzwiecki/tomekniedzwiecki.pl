import createGlobe from 'https://cdn.jsdelivr.net/npm/cobe@0.6.3/dist/index.esm.js';

// ==================== GLOBE CONFIGURATION ====================
const CONFIG = {
    // Visual settings
    devicePixelRatio: 2,
    width: 1000,
    height: 1000,
    phi: 0, // Rotation
    theta: 0.3, // Vertical tilt

    // Colors (RGB 0-1 format)
    dark: [0.1, 0.1, 0.15], // Dark blue base
    glowColor: [0.2, 0.2, 0.4], // Blue glow
    markerColor: [0.6, 0.2, 1], // Purple markers

    // Performance
    mapSamples: 16000, // High resolution
    mapBrightness: 6.0, // Glow intensity

    // Animation
    rotationSpeed: 0.003,
    transitionDuration: 1500, // milliseconds

    // Markers (cities)
    markers: [
        { location: [52.2297, 21.0122], size: 0.08 }, // Warsaw (larger)
        { location: [50.0647, 19.9450], size: 0.05 }, // Krakow
        { location: [51.7592, 19.4560], size: 0.05 }, // Lodz
        { location: [51.1079, 17.0385], size: 0.05 }, // Wroclaw
        { location: [54.3520, 18.6466], size: 0.05 }, // Gdansk
    ]
};

// ==================== GLOBE SCENE ====================
class GlobeScene {
    constructor(container) {
        this.container = container;
        this.canvas = null;
        this.globe = null;
        this.currentSection = 0;
        this.targetPhi = 0;
        this.targetTheta = 0.3;
        this.activeMarkers = [...CONFIG.markers];

        this.init();
    }

    init() {
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.container.appendChild(this.canvas);

        // Initialize COBE globe
        this.globe = createGlobe(this.canvas, {
            devicePixelRatio: CONFIG.devicePixelRatio,
            width: CONFIG.width,
            height: CONFIG.height,
            phi: CONFIG.phi,
            theta: CONFIG.theta,
            dark: 1,
            diffuse: 1.2,
            mapSamples: CONFIG.mapSamples,
            mapBrightness: CONFIG.mapBrightness,
            baseColor: CONFIG.dark,
            markerColor: CONFIG.markerColor,
            glowColor: CONFIG.glowColor,
            markers: this.activeMarkers,
            onRender: (state) => {
                // Smooth rotation
                state.phi = this.targetPhi;
                this.targetPhi += CONFIG.rotationSpeed;

                // Smooth camera transitions
                state.theta = state.theta * 0.95 + this.targetTheta * 0.05;

                // Update markers
                state.markers = this.activeMarkers;
            }
        });

        // Setup scroll detection
        this.setupScrollDetection();

        // Resize handler
        this.setupResizeHandler();
    }

    setupScrollDetection() {
        const sections = [
            { id: 'hero', index: 0 },
            { id: 'droga', index: 1 },
            { id: 'sklep', index: 2 },
            { id: 'takedrop', index: 3 },
            { id: 'inkubator', index: 4 },
            { id: 'motto', index: 5 },
            { id: 'wspolpraca', index: 6 },
            { id: 'cta', index: 7 }
        ];

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const section = sections.find(s => entry.target.id === s.id);
                        if (section) {
                            this.animateToSection(section.index);
                        }
                    }
                });
            },
            { threshold: 0.3 }
        );

        sections.forEach(({ id }) => {
            const element = document.getElementById(id);
            if (element) observer.observe(element);
        });
    }

    setupResizeHandler() {
        window.addEventListener('resize', () => {
            // COBE handles resize automatically
        });
    }

    // ==================== SECTION ANIMATIONS ====================
    animateToSection(sectionIndex) {
        this.currentSection = sectionIndex;

        switch(sectionIndex) {
            case 0: // Hero
                this.animateHero();
                break;
            case 1: // Droga
                this.animateDroga();
                break;
            case 2: // Sklep
                this.animateSklep();
                break;
            case 3: // TakeDrop
                this.animateTakeDrop();
                break;
            case 4: // Inkubator
                this.animateInkubator();
                break;
            case 5: // Motto
                this.animateMotto();
                break;
            case 6: // Współpraca
                this.animateWspolpraca();
                break;
            case 7: // CTA
                this.animateCTA();
                break;
        }
    }

    animateHero() {
        this.targetTheta = 0.3;
        this.activeMarkers = [];
    }

    animateDroga() {
        this.targetTheta = 0.5;
        this.activeMarkers = [];
    }

    animateSklep() {
        // Show Warsaw marker
        this.targetTheta = 0.8;
        this.activeMarkers = [
            { location: [52.2297, 21.0122], size: 0.08 }
        ];
    }

    animateTakeDrop() {
        // Show all Polish cities
        this.targetTheta = 0.7;
        this.activeMarkers = [
            { location: [52.2297, 21.0122], size: 0.07 }, // Warsaw
            { location: [50.0647, 19.9450], size: 0.06 }, // Krakow
            { location: [51.7592, 19.4560], size: 0.06 }, // Lodz
            { location: [51.1079, 17.0385], size: 0.06 }, // Wroclaw
            { location: [54.3520, 18.6466], size: 0.06 }  // Gdansk
        ];
    }

    animateInkubator() {
        this.targetTheta = 0.4;
        this.activeMarkers = [
            { location: [52.2297, 21.0122], size: 0.05 }
        ];
    }

    animateMotto() {
        this.targetTheta = 0.2;
        this.activeMarkers = [];
    }

    animateWspolpraca() {
        this.targetTheta = 0.6;
        this.activeMarkers = [
            { location: [52.2297, 21.0122], size: 0.06 }
        ];
    }

    animateCTA() {
        this.targetTheta = 0.8;
        this.activeMarkers = [
            { location: [52.2297, 21.0122], size: 0.08 }
        ];
    }

    destroy() {
        if (this.globe) {
            this.globe.destroy();
        }
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('globe-container');
    if (container) {
        // Only initialize on desktop
        if (window.innerWidth >= 1024) {
            new GlobeScene(container);
        }
    }
});
