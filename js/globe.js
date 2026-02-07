import * as THREE from 'three';

// ==================== PREMIUM GLOBE CONFIGURATION ====================
const CONFIG = {
    globe: {
        radius: 1.4,
        segments: 128,
        // Ultra-dark colors for premium subtle look
        baseColor: 0x080812,        // Almost black
        emissive: 0x0a0a1a,         // Very dark purple-blue
        emissiveIntensity: 0.05,    // Barely visible
        atmosphereColor: 0x1a1a3a,  // Dark blue atmosphere
        atmosphereIntensity: 0.15,  // Very subtle glow
    },
    camera: {
        fov: 35,                    // Narrower FOV for more premium look
        near: 0.1,
        far: 1000,
        position: { x: 0, y: 0, z: 5.5 }
    },
    animation: {
        rotationSpeed: 0.0003,      // Very slow rotation
        transitionDuration: 2.0,    // Slower, smoother transitions
        dampingFactor: 0.92         // Smooth camera movement
    },
    stars: {
        count: 2000,                // Subtle starfield
        size: 0.8,
        spread: 25,
        opacity: 0.4
    },
    markers: {
        baseSize: 0.015,
        glowSize: 0.025,
        color: 0x6366f1,            // Subtle purple
        opacity: 0.7,
        pulseSpeed: 0.001
    }
};

// ==================== PREMIUM GLOBE SCENE ====================
class PremiumGlobeScene {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.camera = null;
        this.renderer = null;
        this.globe = null;
        this.atmosphere = null;
        this.starfield = null;
        this.markers = [];
        this.currentSection = 0;

        // Camera animation targets
        this.targetCameraPos = new THREE.Vector3(
            CONFIG.camera.position.x,
            CONFIG.camera.position.y,
            CONFIG.camera.position.z
        );
        this.targetGlobeRotation = { x: 0, y: 0 };

        this.init();
    }

    init() {
        this.setupCamera();
        this.setupRenderer();
        this.createStarfield();
        this.createGlobe();
        this.createAtmosphere();
        this.addLights();
        this.setupScrollDetection();
        this.setupResizeHandler();
        this.animate();
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            CONFIG.camera.fov,
            this.container.offsetWidth / this.container.offsetHeight,
            CONFIG.camera.near,
            CONFIG.camera.far
        );
        this.camera.position.set(
            CONFIG.camera.position.x,
            CONFIG.camera.position.y,
            CONFIG.camera.position.z
        );
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.5; // Darker overall
        this.container.appendChild(this.renderer.domElement);
    }

    createStarfield() {
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const sizes = [];
        const colors = [];

        for (let i = 0; i < CONFIG.stars.count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = CONFIG.stars.spread + Math.random() * 5;

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            positions.push(x, y, z);
            sizes.push(Math.random() * CONFIG.stars.size);

            // Very subtle blue-ish stars
            const intensity = 0.4 + Math.random() * 0.3;
            colors.push(intensity, intensity, intensity * 1.05);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.03,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: CONFIG.stars.opacity,
            blending: THREE.AdditiveBlending
        });

        this.starfield = new THREE.Points(geometry, material);
        this.scene.add(this.starfield);
    }

    createGlobe() {
        const geometry = new THREE.SphereGeometry(
            CONFIG.globe.radius,
            CONFIG.globe.segments,
            CONFIG.globe.segments
        );

        // Load Earth topology texture
        const textureLoader = new THREE.TextureLoader();
        const earthTexture = textureLoader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg');
        const bumpTexture = textureLoader.load('https://unpkg.com/three-globe/example/img/earth-topology.png');

        const material = new THREE.MeshStandardMaterial({
            map: earthTexture,
            bumpMap: bumpTexture,
            bumpScale: 0.008,
            color: CONFIG.globe.baseColor,
            emissive: CONFIG.globe.emissive,
            emissiveIntensity: CONFIG.globe.emissiveIntensity,
            metalness: 0.1,
            roughness: 1.0,
            transparent: true,
            opacity: 0.85
        });

        this.globe = new THREE.Mesh(geometry, material);
        this.scene.add(this.globe);
    }

    createAtmosphere() {
        const geometry = new THREE.SphereGeometry(
            CONFIG.globe.radius * 1.08,
            64,
            64
        );

        const material = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(CONFIG.globe.atmosphereColor) },
                intensity: { value: CONFIG.globe.atmosphereIntensity }
            },
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform float intensity;
                varying vec3 vNormal;
                void main() {
                    float glow = pow(0.5 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
                    gl_FragColor = vec4(color, 1.0) * glow * intensity;
                }
            `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });

        this.atmosphere = new THREE.Mesh(geometry, material);
        this.scene.add(this.atmosphere);
    }

    addLights() {
        // Very subtle ambient light
        const ambient = new THREE.AmbientLight(0x0a0a1a, 0.3);
        this.scene.add(ambient);

        // Subtle directional light (like moonlight)
        const directional = new THREE.DirectionalLight(0x4a4a6a, 0.4);
        directional.position.set(3, 2, 4);
        this.scene.add(directional);

        // Rim light for subtle edge glow
        const rim = new THREE.PointLight(0x2a2a4a, 0.3, 15);
        rim.position.set(-3, 0, -4);
        this.scene.add(rim);
    }

    addMarker(lat, lon) {
        // Convert lat/lon to 3D coordinates
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        const x = -(CONFIG.globe.radius * Math.sin(phi) * Math.cos(theta));
        const y = CONFIG.globe.radius * Math.cos(phi);
        const z = CONFIG.globe.radius * Math.sin(phi) * Math.sin(theta);

        // Main marker dot
        const dotGeometry = new THREE.SphereGeometry(CONFIG.markers.baseSize, 16, 16);
        const dotMaterial = new THREE.MeshBasicMaterial({
            color: CONFIG.markers.color,
            transparent: true,
            opacity: CONFIG.markers.opacity
        });
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        dot.position.set(x, y, z);

        // Subtle glow ring
        const glowGeometry = new THREE.SphereGeometry(CONFIG.markers.glowSize, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: CONFIG.markers.color,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        dot.add(glow);

        this.globe.add(dot);
        this.markers.push({ mesh: dot, glow: glow });

        return dot;
    }

    clearMarkers() {
        this.markers.forEach(({ mesh }) => {
            this.globe.remove(mesh);
        });
        this.markers = [];
    }

    // ==================== SECTION ANIMATIONS ====================
    setupScrollDetection() {
        const sections = [
            { id: 'start', index: 0 },
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

    animateToSection(index) {
        this.currentSection = index;
        this.clearMarkers();

        const animations = {
            0: () => { // Hero - general view
                this.targetCameraPos.set(0, 0, 5.5);
                this.targetGlobeRotation = { x: 0.1, y: 0 };
            },
            1: () => { // Droga - slight tilt
                this.targetCameraPos.set(0.3, 0.2, 5.2);
                this.targetGlobeRotation = { x: 0.15, y: 0.2 };
            },
            2: () => { // Sklep - focus on Poland
                this.addMarker(52.2297, 21.0122); // Warsaw
                this.targetCameraPos.set(-0.4, 0.6, 4.8);
                this.targetGlobeRotation = { x: 0.25, y: -0.35 };
            },
            3: () => { // TakeDrop - multiple Polish cities
                this.addMarker(52.2297, 21.0122); // Warsaw
                this.addMarker(50.0647, 19.9450); // Krakow
                this.addMarker(51.7592, 19.4560); // Lodz
                this.addMarker(51.1079, 17.0385); // Wroclaw
                this.addMarker(54.3520, 18.6466); // Gdansk
                this.targetCameraPos.set(-0.2, 0.7, 4.5);
                this.targetGlobeRotation = { x: 0.3, y: -0.4 };
            },
            4: () => { // Inkubator - zoom out
                this.targetCameraPos.set(0, -0.3, 5.8);
                this.targetGlobeRotation = { x: -0.1, y: 0.1 };
            },
            5: () => { // Motto - calm view
                this.targetCameraPos.set(0, 0, 6.0);
                this.targetGlobeRotation = { x: 0, y: 0 };
            },
            6: () => { // Współpraca - slight angle
                this.targetCameraPos.set(0.2, -0.2, 5.3);
                this.targetGlobeRotation = { x: -0.15, y: 0.15 };
            },
            7: () => { // CTA - focus back on Poland
                this.addMarker(52.2297, 21.0122);
                this.targetCameraPos.set(-0.3, 0.5, 5.0);
                this.targetGlobeRotation = { x: 0.2, y: -0.3 };
            }
        };

        if (animations[index]) {
            animations[index]();
        }
    }

    // ==================== ANIMATION LOOP ====================
    animate() {
        requestAnimationFrame(() => this.animate());

        // Smooth camera movement
        this.camera.position.lerp(this.targetCameraPos, 1 - CONFIG.animation.dampingFactor);

        // Smooth globe rotation to target
        this.globe.rotation.x += (this.targetGlobeRotation.x - this.globe.rotation.x) * 0.05;
        this.globe.rotation.y += (this.targetGlobeRotation.y - this.globe.rotation.y) * 0.05;

        // Continuous slow rotation
        this.globe.rotation.y += CONFIG.animation.rotationSpeed;

        // Subtle starfield rotation
        if (this.starfield) {
            this.starfield.rotation.y += CONFIG.animation.rotationSpeed * 0.3;
            this.starfield.rotation.x += CONFIG.animation.rotationSpeed * 0.1;
        }

        // Pulse markers subtly
        this.markers.forEach(({ glow }, i) => {
            const pulse = 1 + Math.sin(Date.now() * CONFIG.markers.pulseSpeed + i) * 0.15;
            glow.scale.set(pulse, pulse, pulse);
        });

        this.renderer.render(this.scene, this.camera);
    }

    setupResizeHandler() {
        window.addEventListener('resize', () => {
            const width = this.container.offsetWidth;
            const height = this.container.offsetHeight;

            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        });
    }

    destroy() {
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('globe-container');
    if (container && window.innerWidth >= 1024) {
        new PremiumGlobeScene(container);
    }
});
