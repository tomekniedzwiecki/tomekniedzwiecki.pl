import * as THREE from 'three';

// ==================== GLOBE CONFIGURATION ====================
const CONFIG = {
    globe: {
        radius: 1.2,
        segments: 128, // High detail for smooth surface
        wireframe: false,
        color: 0x10b981, // emerald-500
        emissive: 0x10b981,
        emissiveIntensity: 0.15,
        // Earth texture from CDN
        textureUrl: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
        bumpUrl: 'https://unpkg.com/three-globe/example/img/earth-topology.png'
    },
    particles: {
        count: 1500,
        size: 0.015,
        spread: 2.5
    },
    camera: {
        fov: 45,
        near: 0.1,
        far: 1000,
        position: { x: 0, y: 0, z: 4 }
    },
    animations: {
        rotationSpeed: 0.0008,
        transitionDuration: 1.5
    }
};

// ==================== SCENE SETUP ====================
class GlobeScene {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.globe = null;
        this.particles = null;
        this.markers = [];
        this.currentSection = 0;

        this.init();
        this.setupEventListeners();
        this.animate();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000000, 5, 15);

        // Camera
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

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
        this.container.appendChild(this.renderer.domElement);

        // Create starfield background
        this.createStarfield();

        // Create globe
        this.createGlobe();

        // Create particles
        this.createParticles();

        // Add lights
        this.addLights();
    }

    createStarfield() {
        // Create thousands of stars in the background
        const starGeometry = new THREE.BufferGeometry();
        const starPositions = [];
        const starSizes = [];
        const starColors = [];

        const starCount = 3000;
        const radius = 20; // Far from globe

        for (let i = 0; i < starCount; i++) {
            // Random position in sphere
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = radius + Math.random() * 10;

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            starPositions.push(x, y, z);

            // Random size for star twinkle effect
            starSizes.push(Math.random() * 2 + 0.5);

            // White to slightly blue-ish stars
            const intensity = 0.7 + Math.random() * 0.3;
            starColors.push(intensity, intensity, intensity * 1.1);
        }

        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
        starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

        const starMaterial = new THREE.PointsMaterial({
            size: 0.05,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        this.starfield = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.starfield);
    }

    createGlobe() {
        // High-detail sphere geometry for smooth Earth
        const geometry = new THREE.SphereGeometry(
            CONFIG.globe.radius,
            CONFIG.globe.segments,
            CONFIG.globe.segments
        );

        // Texture loader
        const textureLoader = new THREE.TextureLoader();

        // Load Earth texture and bump map
        const earthTexture = textureLoader.load(CONFIG.globe.textureUrl);
        const bumpTexture = textureLoader.load(CONFIG.globe.bumpUrl);

        // Realistic Earth material
        const material = new THREE.MeshStandardMaterial({
            map: earthTexture,
            bumpMap: bumpTexture,
            bumpScale: 0.015,
            emissive: CONFIG.globe.emissive,
            emissiveIntensity: CONFIG.globe.emissiveIntensity,
            metalness: 0.1,
            roughness: 0.9
        });

        this.globe = new THREE.Mesh(geometry, material);
        this.scene.add(this.globe);

        // Add atmosphere glow
        const atmosphereGeometry = new THREE.SphereGeometry(
            CONFIG.globe.radius * 1.08,
            64,
            64
        );
        const atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0x10b981) }
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
                varying vec3 vNormal;
                void main() {
                    float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                    gl_FragColor = vec4(color, 1.0) * intensity;
                }
            `,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.scene.add(atmosphere);

        // Add thin wireframe overlay for tech feel (optional)
        const wireframeGeometry = new THREE.IcosahedronGeometry(
            CONFIG.globe.radius * 1.002,
            2
        );
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x10b981,
            wireframe: true,
            transparent: true,
            opacity: 0.15
        });
        const wireframeOverlay = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
        this.globe.add(wireframeOverlay);
    }

    createParticles() {
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];

        // Color palette matching site theme
        const colorPalette = [
            new THREE.Color(0x10b981), // emerald
            new THREE.Color(0xffb400), // amber
            new THREE.Color(0x3b82f6), // blue
            new THREE.Color(0xa855f7)  // purple
        ];

        for (let i = 0; i < CONFIG.particles.count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = CONFIG.globe.radius + Math.random() * CONFIG.particles.spread;

            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);

            positions.push(x, y, z);

            // Random color from palette
            const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
            colors.push(color.r, color.g, color.b);
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: CONFIG.particles.size,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    addLights() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Main directional light (like the sun)
        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(5, 3, 5);
        this.scene.add(sunLight);

        // Point lights for accent and atmosphere
        const accentLight1 = new THREE.PointLight(0x10b981, 0.6, 12);
        accentLight1.position.set(3, 2, 3);
        this.scene.add(accentLight1);

        const accentLight2 = new THREE.PointLight(0x3b82f6, 0.4, 12);
        accentLight2.position.set(-3, -1, -2);
        this.scene.add(accentLight2);

        // Back light for rim lighting effect
        const rimLight = new THREE.PointLight(0xa855f7, 0.3, 15);
        rimLight.position.set(0, 0, -5);
        this.scene.add(rimLight);
    }

    addMarker(lat, lon, color = 0x10b981) {
        // Convert lat/lon to 3D coordinates
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        const x = -(CONFIG.globe.radius * Math.sin(phi) * Math.cos(theta));
        const y = CONFIG.globe.radius * Math.cos(phi);
        const z = CONFIG.globe.radius * Math.sin(phi) * Math.sin(theta);

        // Create marker
        const geometry = new THREE.SphereGeometry(0.02, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9
        });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.set(x, y, z);

        // Add pulsing glow
        const glowGeometry = new THREE.SphereGeometry(0.04, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3
        });
        const markerGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        marker.add(markerGlow);

        this.globe.add(marker);
        this.markers.push({ mesh: marker, glow: markerGlow });

        return marker;
    }

    clearMarkers() {
        this.markers.forEach(({ mesh }) => {
            this.globe.remove(mesh);
        });
        this.markers = [];
    }

    // ==================== SECTION ANIMATIONS ====================
    animateToSection(sectionIndex) {
        this.currentSection = sectionIndex;
        this.clearMarkers();

        switch(sectionIndex) {
            case 0: // Hero - general view
                this.animateHero();
                break;
            case 1: // Droga - timeline path
                this.animateDroga();
                break;
            case 2: // Sklep - Poland marker
                this.animateSklep();
                break;
            case 3: // TakeDrop - network connections
                this.animateTakeDrop();
                break;
            case 4: // Inkubator - spreading effect
                this.animateInkubator();
                break;
            case 5: // Motto - calm view
                this.animateMotto();
                break;
            case 6: // Współpraca - timeline orbits
                this.animateWspolpraca();
                break;
            case 7: // CTA - zoom to Europe
                this.animateCTA();
                break;
        }
    }

    animateHero() {
        gsap.to(this.camera.position, {
            x: 0,
            y: 0,
            z: 4,
            duration: CONFIG.animations.transitionDuration,
            ease: 'power2.inOut'
        });

        gsap.to(this.globe.rotation, {
            y: 0,
            duration: CONFIG.animations.transitionDuration,
            ease: 'power2.inOut'
        });
    }

    animateDroga() {
        gsap.to(this.camera.position, {
            x: 0.5,
            y: 0.3,
            z: 3.5,
            duration: CONFIG.animations.transitionDuration,
            ease: 'power2.inOut'
        });
    }

    animateSklep() {
        // Poland coordinates
        this.addMarker(52.2297, 21.0122, 0x10b981); // Warsaw

        gsap.to(this.camera.position, {
            x: -0.5,
            y: 0.8,
            z: 3,
            duration: CONFIG.animations.transitionDuration,
            ease: 'power2.inOut'
        });

        gsap.to(this.globe.rotation, {
            y: -0.4,
            duration: CONFIG.animations.transitionDuration,
            ease: 'power2.inOut'
        });
    }

    animateTakeDrop() {
        // Multiple markers for 5000 shops
        const cities = [
            [52.2297, 21.0122], // Warsaw
            [50.0647, 19.9450], // Krakow
            [51.7592, 19.4560], // Lodz
            [51.1079, 17.0385], // Wroclaw
            [54.3520, 18.6466]  // Gdansk
        ];

        cities.forEach(([lat, lon]) => {
            this.addMarker(lat, lon, 0xffb400);
        });

        gsap.to(this.camera.position, {
            x: 0,
            y: 1,
            z: 3.2,
            duration: CONFIG.animations.transitionDuration,
            ease: 'power2.inOut'
        });
    }

    animateInkubator() {
        gsap.to(this.camera.position, {
            x: -0.3,
            y: -0.5,
            z: 3.8,
            duration: CONFIG.animations.transitionDuration,
            ease: 'power2.inOut'
        });

        gsap.to(this.globe.material, {
            emissiveIntensity: 0.4,
            duration: CONFIG.animations.transitionDuration,
            ease: 'power2.inOut'
        });
    }

    animateMotto() {
        gsap.to(this.camera.position, {
            x: 0,
            y: 0,
            z: 4.5,
            duration: CONFIG.animations.transitionDuration,
            ease: 'power2.inOut'
        });

        gsap.to(this.globe.material, {
            emissiveIntensity: 0.15,
            duration: CONFIG.animations.transitionDuration,
            ease: 'power2.inOut'
        });
    }

    animateWspolpraca() {
        gsap.to(this.camera.position, {
            x: 0.3,
            y: -0.2,
            z: 3.5,
            duration: CONFIG.animations.transitionDuration,
            ease: 'power2.inOut'
        });
    }

    animateCTA() {
        gsap.to(this.camera.position, {
            x: -0.5,
            y: 0.5,
            z: 2.8,
            duration: CONFIG.animations.transitionDuration,
            ease: 'power2.inOut'
        });

        gsap.to(this.globe.rotation, {
            y: -0.3,
            duration: CONFIG.animations.transitionDuration,
            ease: 'power2.inOut'
        });
    }

    // ==================== ANIMATION LOOP ====================
    animate() {
        requestAnimationFrame(() => this.animate());

        // Slow rotating starfield
        if (this.starfield) {
            this.starfield.rotation.y += CONFIG.animations.rotationSpeed * 0.05;
            this.starfield.rotation.x += CONFIG.animations.rotationSpeed * 0.02;
        }

        // Slow auto-rotation
        this.globe.rotation.y += CONFIG.animations.rotationSpeed;

        // Rotate particles slower
        if (this.particles) {
            this.particles.rotation.y += CONFIG.animations.rotationSpeed * 0.5;
        }

        // Pulse markers
        this.markers.forEach(({ glow }, i) => {
            const scale = 1 + Math.sin(Date.now() * 0.002 + i) * 0.2;
            glow.scale.set(scale, scale, scale);
        });

        this.renderer.render(this.scene, this.camera);
    }

    // ==================== EVENT LISTENERS ====================
    setupEventListeners() {
        // Resize handler
        window.addEventListener('resize', () => this.handleResize());

        // Section change observer
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const sectionIndex = parseInt(entry.target.dataset.section);
                        this.animateToSection(sectionIndex);
                    }
                });
            },
            { threshold: 0.5 }
        );

        // Observe all sections
        document.querySelectorAll('.fullpage-section').forEach(section => {
            observer.observe(section);
        });
    }

    handleResize() {
        const width = this.container.offsetWidth;
        const height = this.container.offsetHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
}

// ==================== INITIALIZATION ====================
// Wait for DOM and check if we're on desktop
if (window.innerWidth >= 768) { // Only on desktop
    const container = document.getElementById('globe-container');
    if (container) {
        new GlobeScene(container);
    }
}
