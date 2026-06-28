// Option 1: 3D Force-Directed Space Visualization
console.log('=== app-3d-space.js STARTING TO LOAD ===');

// Global state - declare variables first
let currentTree = null;
let currentTreeId = null;
let selectedPerson = null;
let highlightedAncestors = new Set();
let scene, camera, renderer, controls;
let personMeshes = new Map();
let connectionLines = [];
let raycaster, mouse;
let animationId;
let particles = [];
let yearBands = [];

// IMMEDIATELY define function on window - before anything else
console.log('About to define window.init3DScene...');
window.init3DScene = function() {
    console.log('init3DScene called!');
    // Check if Three.js is loaded
    if (typeof THREE === 'undefined') {
        console.error('Three.js is not loaded! Please wait for scripts to load.');
        alert('Three.js library is not loaded. Please refresh the page.');
        return;
    }
    
    const container = document.getElementById('tree-visualization');
    if (!container) {
        console.error('Container element not found!');
        return;
    }
    
    // Ensure container has dimensions
    if (container.clientWidth === 0 || container.clientHeight === 0) {
        console.warn('Container has zero dimensions, using defaults');
        container.style.width = '100%';
        container.style.height = '100%';
    }
    
    console.log('Initializing 3D Space visualization...', {
        width: container.clientWidth,
        height: container.clientHeight
    });
    
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.002);
    
    // Camera
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    camera = new THREE.PerspectiveCamera(
        75,
        width / height,
        0.1,
        10000
    );
    camera.position.set(0, 50, 150);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    console.log('Renderer created and added to container');
    
    // Controls (OrbitControls for rotation)
    // Try multiple ways to access OrbitControls
    try {
        if (typeof THREE !== 'undefined' && THREE.OrbitControls) {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            console.log('OrbitControls loaded via THREE.OrbitControls');
        } else if (typeof OrbitControls !== 'undefined') {
            controls = new OrbitControls(camera, renderer.domElement);
            console.log('OrbitControls loaded via global OrbitControls');
        } else {
            console.warn('OrbitControls not found. Camera controls will be limited.');
            // Create a simple manual control fallback
            let isDragging = false;
            let previousMousePosition = { x: 0, y: 0 };
            renderer.domElement.addEventListener('mousedown', (e) => {
                isDragging = true;
                previousMousePosition = { x: e.clientX, y: e.clientY };
            });
            renderer.domElement.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    const deltaX = e.clientX - previousMousePosition.x;
                    const deltaY = e.clientY - previousMousePosition.y;
                    camera.rotation.y += deltaX * 0.01;
                    camera.rotation.x += deltaY * 0.01;
                    previousMousePosition = { x: e.clientX, y: e.clientY };
                }
            });
            renderer.domElement.addEventListener('mouseup', () => {
                isDragging = false;
            });
            renderer.domElement.addEventListener('wheel', (e) => {
                camera.position.z += e.deltaY * 0.1;
            });
        }
        if (controls) {
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.minDistance = 30;
            controls.maxDistance = 500;
            controls.autoRotate = false;
        }
    } catch (e) {
        console.error('Error setting up controls:', e);
    }
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(50, 100, 50);
    directionalLight1.castShadow = true;
    directionalLight1.shadow.mapSize.width = 2048;
    directionalLight1.shadow.mapSize.height = 2048;
    scene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0x4488ff, 0.3);
    directionalLight2.position.set(-50, -50, -50);
    scene.add(directionalLight2);
    
    // Point lights for glow effect
    const pointLight1 = new THREE.PointLight(0x4488ff, 1, 200);
    pointLight1.position.set(0, 0, 0);
    scene.add(pointLight1);
    
    // Raycaster for mouse interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Mouse events
    renderer.domElement.addEventListener('click', onMouseClick);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    
    // Window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start animation loop
    animate();
};

console.log('window.init3DScene defined:', typeof window.init3DScene === 'function');

function animate() {
    animationId = requestAnimationFrame(animate);
    
    // Update controls
    if (controls && controls.update) {
        controls.update();
    }
    
    // Animate particles
    particles.forEach(particle => {
        particle.rotation.y += 0.01;
        particle.position.y += Math.sin(Date.now() * 0.001 + particle.userData.offset) * 0.02;
    });
    
    // Animate person meshes (gentle floating)
    personMeshes.forEach((mesh, personId) => {
        if (mesh && mesh.userData) {
            const time = Date.now() * 0.001;
            mesh.position.y += Math.sin(time + mesh.userData.offset) * 0.01;
            mesh.rotation.y += 0.005;
            
            // Pulse effect for highlighted nodes
            if (highlightedAncestors.has(personId)) {
                const scale = 1 + Math.sin(time * 2) * 0.1;
                mesh.scale.set(scale, scale, scale);
            }
        }
    });
    
    // Update connection lines glow
    connectionLines.forEach(line => {
        if (line.material) {
            line.material.opacity = 0.5 + Math.sin(Date.now() * 0.002) * 0.3;
        }
    });
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    const container = document.getElementById('tree-visualization');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function onMouseClick(event) {
    const container = document.getElementById('tree-visualization');
    mouse.x = (event.clientX / container.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / container.clientHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(Array.from(personMeshes.values()));
    
    if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const personId = clickedMesh.userData.personId;
        const person = currentTree.persons.find(p => p.id === personId);
        if (person) {
            selectPerson(person);
        }
    }
}

function onMouseMove(event) {
    const container = document.getElementById('tree-visualization');
    mouse.x = (event.clientX / container.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / container.clientHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(Array.from(personMeshes.values()));
    
    // Reset all hover states
    personMeshes.forEach(mesh => {
        if (mesh.userData.hoverMaterial) {
            mesh.material = mesh.userData.originalMaterial;
        }
    });
    
    // Set hover state
    if (intersects.length > 0) {
        const hoveredMesh = intersects[0].object;
        hoveredMesh.userData.originalMaterial = hoveredMesh.material;
        hoveredMesh.material = hoveredMesh.userData.hoverMaterial || hoveredMesh.material;
        renderer.domElement.style.cursor = 'pointer';
    } else {
        renderer.domElement.style.cursor = 'default';
    }
}

function renderTree() {
    console.log('renderTree called, currentTree:', currentTree);
    if (!currentTree || !currentTree.persons) {
        console.warn('No tree data available');
        return;
    }
    
    if (!scene || !renderer) {
        console.error('Scene or renderer not initialized!');
        return;
    }
    
    // Clear previous scene
    clearScene();
    
    const persons = currentTree.persons;
    if (persons.length === 0) {
        console.warn('No persons in tree');
        return;
    }
    
    console.log(`Rendering ${persons.length} persons`);
    
    // Calculate 3D layout
    const layout = calculate3DLayout(persons);
    
    // Create year bands (time-based depth)
    createYearBands(layout);
    
    // Create person nodes
    createPersonNodes(persons, layout);
    
    // Create connections
    createConnections(persons, layout);
    
    // Add particles for ambiance
    createParticles();
    
    // Update camera position to view the tree
    fitToView(layout);
    
    updatePeriodPeople();
}

function calculate3DLayout(persons) {
    const personMap = new Map();
    persons.forEach(p => personMap.set(p.id, p));
    
    // Calculate generations
    const generations = new Map();
    const visited = new Set();
    
    function getGeneration(personId) {
        if (generations.has(personId)) return generations.get(personId);
        if (visited.has(personId)) return 0;
        visited.add(personId);
        
        const person = personMap.get(personId);
        if (!person || !person.parents || person.parents.length === 0) {
            generations.set(personId, 0);
            return 0;
        }
        
        let maxParentGen = -1;
        person.parents.forEach(parentId => {
            maxParentGen = Math.max(maxParentGen, getGeneration(parentId));
        });
        
        const gen = maxParentGen + 1;
        generations.set(personId, gen);
        return gen;
    }
    
    persons.forEach(p => getGeneration(p.id));
    
    // Group by generation
    const byGeneration = {};
    let maxGeneration = 0;
    persons.forEach(person => {
        const gen = generations.get(person.id);
        if (!byGeneration[gen]) byGeneration[gen] = [];
        byGeneration[gen].push(person);
        maxGeneration = Math.max(maxGeneration, gen);
    });
    
    // Calculate 3D positions
    const nodes = [];
    const spacing = 15;
    const depthSpacing = 20; // Z-axis spacing for generations
    
    // Calculate year range for depth
    const minYear = Math.min(...persons.map(p => getYear(p.birthDate) || 2000));
    const maxYear = Math.max(...persons.map(p => getYear(p.deathDate) || p.birthDate) || 2000) || new Date().getFullYear();
    
    for (let gen = 0; gen <= maxGeneration; gen++) {
        const genPersons = byGeneration[gen] || [];
        const genZ = -gen * depthSpacing; // Older generations further back
        
        // Arrange in a circle or grid
        const angleStep = (Math.PI * 2) / genPersons.length;
        genPersons.forEach((person, idx) => {
            const angle = idx * angleStep;
            const radius = Math.max(20, genPersons.length * 2);
            const x = Math.cos(angle) * radius;
            const y = gen * 10; // Slight vertical offset per generation
            const z = genZ + (getYear(person.birthDate) - minYear) * 0.5; // Time-based depth
            
            nodes.push({
                person: person,
                position: new THREE.Vector3(x, y, z),
                generation: gen
            });
        });
    }
    
    return {
        nodes: nodes,
        minYear: minYear,
        maxYear: maxYear,
        maxGeneration: maxGeneration
    };
}

function createYearBands(layout) {
    // Create semi-transparent planes for each generation/time period
    for (let i = 0; i <= layout.maxGeneration; i++) {
        const geometry = new THREE.PlaneGeometry(500, 500);
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL((i * 30) % 360 / 360, 0.3, 0.1),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.1
        });
        const plane = new THREE.Mesh(geometry, material);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = i * 10;
        plane.position.z = -i * 20;
        scene.add(plane);
        yearBands.push(plane);
    }
}

function createPersonNodes(persons, layout) {
    const personMap = new Map();
    persons.forEach(p => personMap.set(p.id, p));
    
    layout.nodes.forEach(nodeData => {
        const person = nodeData.person;
        const position = nodeData.position;
        
        // Create 3D card/box for person
        const geometry = new THREE.BoxGeometry(4, 6, 0.5);
        
        // Color based on family branch
        const color = getPersonNodeColor(person, persons);
        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
            shininess: 100
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.personId = person.id;
        mesh.userData.offset = Math.random() * Math.PI * 2;
        
        // Hover material (brighter)
        const hoverMaterial = material.clone();
        hoverMaterial.emissiveIntensity = 0.8;
        mesh.userData.hoverMaterial = hoverMaterial;
        mesh.userData.originalMaterial = material;
        
        // Add text sprite (simplified - using geometry for now)
        // In production, use TextGeometry or Canvas texture
        
        // Add glow effect
        const glowGeometry = new THREE.BoxGeometry(4.5, 6.5, 0.6);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(position);
        scene.add(glow);
        
        scene.add(mesh);
        personMeshes.set(person.id, mesh);
        
        // Add label (using sprite or text)
        addPersonLabel(mesh, person, position);
    });
}

function addPersonLabel(mesh, person, position) {
    // Create canvas texture for text
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    
    context.fillStyle = '#ffffff';
    context.font = 'Bold 24px Arial';
    context.textAlign = 'center';
    context.fillText(person.name || 'Unknown', 128, 40);
    
    if (person.birthDate) {
        context.font = '16px Arial';
        context.fillText(`b. ${getYear(person.birthDate)}`, 128, 70);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(position.x, position.y + 4, position.z);
    sprite.scale.set(8, 4, 1);
    scene.add(sprite);
    
    mesh.userData.label = sprite;
}

function createConnections(persons, layout) {
    const nodeMap = new Map();
    layout.nodes.forEach(node => {
        nodeMap.set(node.person.id, node);
    });
    
    const personMap = new Map();
    persons.forEach(p => personMap.set(p.id, p));
    
    // Draw parent-child connections
    persons.forEach(person => {
        if (person.parents && person.parents.length > 0) {
            const childNode = nodeMap.get(person.id);
            if (!childNode) return;
            
            person.parents.forEach(parentId => {
                const parentNode = nodeMap.get(parentId);
                if (parentNode) {
                    createConnectionLine(parentNode.position, childNode.position, 0x4488ff);
                }
            });
        }
    });
    
    // Draw marriage connections
    persons.forEach(person => {
        if (person.spouses && person.spouses.length > 0) {
            person.spouses.forEach(spouseId => {
                const personNode = nodeMap.get(person.id);
                const spouseNode = nodeMap.get(spouseId);
                if (personNode && spouseNode && person.id < spouseId) { // Avoid duplicates
                    createConnectionLine(personNode.position, spouseNode.position, 0xff88ff, 0.3);
                }
            });
        }
    });
}

function createConnectionLine(start, end, color, opacity = 0.6) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
        linewidth: 2
    });
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    connectionLines.push(line);
}

function createParticles() {
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 500;
        positions[i + 1] = (Math.random() - 0.5) * 500;
        positions[i + 2] = (Math.random() - 0.5) * 500;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
        color: 0x4488ff,
        size: 2,
        transparent: true,
        opacity: 0.6
    });
    
    const particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);
    particles.push(particleSystem);
}

function clearScene() {
    // Remove person meshes
    personMeshes.forEach(mesh => {
        if (mesh.userData.label) {
            scene.remove(mesh.userData.label);
        }
        scene.remove(mesh);
    });
    personMeshes.clear();
    
    // Remove connection lines
    connectionLines.forEach(line => scene.remove(line));
    connectionLines = [];
    
    // Remove particles
    particles.forEach(particle => scene.remove(particle));
    particles = [];
    
    // Remove year bands
    yearBands.forEach(band => scene.remove(band));
    yearBands = [];
}

function fitToView(layout) {
    if (layout.nodes.length === 0) return;
    
    // Calculate bounding box
    const positions = layout.nodes.map(n => n.position);
    const box = new THREE.Box3().setFromPoints(positions);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    // Position camera to view the tree
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2;
    
    camera.position.set(center.x, center.y + distance * 0.5, center.z + distance);
    camera.lookAt(center);
    if (controls && controls.target) {
        controls.target.copy(center);
        controls.update();
    }
}

// Utility functions (reuse from original app.js)
function getYear(dateString) {
    if (!dateString) return null;
    return new Date(dateString).getFullYear();
}

function getPersonNodeColor(person, persons) {
    const branchColor = getPersonBranchColor(person, persons);
    return new THREE.Color(branchColor);
}

function getPersonBranchColor(person, persons) {
    function getRootAncestor(p, visited = new Set()) {
        if (visited.has(p.id)) return null;
        visited.add(p.id);
        if (!p.parents || p.parents.length === 0) return p;
        const parent = persons.find(per => per.id === p.parents[0]);
        if (parent) return getRootAncestor(parent, visited);
        return p;
    }
    
    const rootAncestor = getRootAncestor(person);
    if (rootAncestor) {
        const lastName = rootAncestor.name ? rootAncestor.name.split(' ').pop() : 'Unknown';
        return getFamilyColor(lastName);
    }
    return person.gender === 'female' ? '#ffb3d9' : '#b3d9ff';
}

function getFamilyColor(familyName) {
    let hash = 0;
    for (let i = 0; i < familyName.length; i++) {
        hash = familyName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 60%)`;
}

function selectPerson(person) {
    selectedPerson = person;
    displayPersonDetails(person);
    highlightAncestors(person);
}

function highlightAncestors(person) {
    highlightedAncestors.clear();
    
    function addAncestors(p) {
        if (p.parents) {
            p.parents.forEach(parentId => {
                highlightedAncestors.add(parentId);
                const parent = currentTree.persons.find(per => per.id === parentId);
                if (parent) addAncestors(parent);
            });
        }
    }
    
    addAncestors(person);
    renderTree();
}

function displayPersonDetails(person) {
    const container = document.getElementById('person-details');
    container.innerHTML = `
        <div class="person-card">
            <h4>${person.name || 'Unknown'}</h4>
            <p><strong>Birth:</strong> ${person.birthDate ? formatDate(person.birthDate) : 'Unknown'}</p>
            <p><strong>Death:</strong> ${person.deathDate ? formatDate(person.deathDate) : 'Alive'}</p>
            <p><strong>Gender:</strong> ${person.gender || 'Unknown'}</p>
            ${person.notes ? `<p><strong>Notes:</strong> ${person.notes}</p>` : ''}
            ${person.contact ? `<p><strong>Contact:</strong> ${person.contact}</p>` : ''}
        </div>
    `;
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function updatePeriodPeople() {
    if (!currentTree || !currentTree.persons) return;
    const container = document.getElementById('period-people');
    container.innerHTML = '';
    
    const currentYear = parseInt(document.getElementById('year-indicator').textContent.split(': ')[1]) || 2000;
    const periodStart = currentYear - 25;
    const periodEnd = currentYear + 25;
    
    const periodPersons = currentTree.persons.filter(person => {
        const birthYear = getYear(person.birthDate);
        const deathYear = getYear(person.deathDate);
        if (!birthYear) return false;
        const aliveStart = !deathYear || deathYear >= periodStart;
        const aliveEnd = birthYear <= periodEnd;
        return aliveStart && aliveEnd;
    });
    
    periodPersons.forEach(person => {
        const item = document.createElement('div');
        item.className = 'person-item';
        item.textContent = `${person.name || 'Unknown'} (${getYear(person.birthDate) || '?'})`;
        item.addEventListener('click', () => selectPerson(person));
        container.appendChild(item);
    });
}

// Verify function is available
console.log('app-3d-space.js loaded');
console.log('init3DScene type:', typeof window.init3DScene);
console.log('init3DScene is function:', typeof window.init3DScene === 'function');

// Initialize when DOM is ready (only if not already initialized)
document.addEventListener('DOMContentLoaded', () => {
    // Don't auto-initialize - let the main app.js handle it
    // This allows switching between visualizations
    console.log('DOMContentLoaded - init3DScene available:', typeof window.init3DScene === 'function');
});

// Export functions needed by main app.js
window.renderTree3DSpace = renderTree;
window.loadTree3DSpace = function(tree) {
    console.log('Loading tree into 3D Space:', tree);
    if (!tree || !tree.persons) {
        console.error('Invalid tree data:', tree);
        return;
    }
    currentTree = tree;
    currentTreeId = tree.id;
    
    // Make sure scene is initialized
    if (!scene || !renderer) {
        console.error('Scene not initialized! Initializing now...');
        init3DScene();
    }
    
    // Render the tree
    try {
        renderTree();
        console.log('Tree rendered successfully');
    } catch (e) {
        console.error('Error rendering tree:', e);
        alert('Error rendering tree: ' + e.message);
    }
};
window.selectPerson3DSpace = selectPerson;
window.highlightMainBranch3DSpace = function() {
    if (!currentTree || !currentTree.persons) return;
    // Find longest branch logic (simplified)
    const persons = currentTree.persons;
    let maxDepth = 0;
    let deepestPerson = null;
    
    function getBranchDepth(person, visited = new Set()) {
        if (visited.has(person.id)) return 0;
        visited.add(person.id);
        if (!person.parents || person.parents.length === 0) return 1;
        let maxDepth = 0;
        person.parents.forEach(parentId => {
            const parent = persons.find(p => p.id === parentId);
            if (parent) {
                const depth = getBranchDepth(parent, new Set(visited));
                maxDepth = Math.max(maxDepth, depth);
            }
        });
        return maxDepth + 1;
    }
    
    persons.forEach(person => {
        const depth = getBranchDepth(person);
        if (depth > maxDepth) {
            maxDepth = depth;
            deepestPerson = person;
        }
    });
    
    if (deepestPerson) {
        highlightAncestors(deepestPerson);
        highlightedAncestors.add(deepestPerson.id);
        renderTree();
    }
};

// Final verification - this should always execute
console.log('=== app-3d-space.js COMPLETE ===');
console.log('window.init3DScene:', typeof window.init3DScene);
if (typeof window.init3DScene !== 'function') {
    console.error('ERROR: init3DScene is not a function!');
}

