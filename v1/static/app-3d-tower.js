// Option 2: 3D Timeline Tower Visualization
console.log('=== app-3d-tower.js STARTING TO LOAD ===');

// Global state
let currentTree = null;
let currentTreeId = null;
let selectedPerson = null;
let highlightedAncestors = new Set();
let scene, camera, renderer, controls;
let personCards = new Map();
let connectionLines = [];
let raycaster, mouse;
let animationId;
let towerLevels = [];
let timelineRings = [];

// IMMEDIATELY define function on window - before anything else executes
console.log('About to define window.init3DTower...');
window.init3DTower = function() {
    console.log('init3DTower called!');
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
    
    console.log('Initializing 3D Tower visualization...', {
        width: container.clientWidth,
        height: container.clientHeight
    });
    
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    
    // Camera
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    camera = new THREE.PerspectiveCamera(
        60,
        width / height,
        0.1,
        2000
    );
    camera.position.set(0, 100, 200);
    camera.lookAt(0, 0, 0);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    console.log('Renderer created and added to container');
    
    // Controls
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
            controls.minDistance = 50;
            controls.maxDistance = 500;
            controls.maxPolarAngle = Math.PI / 2.2; // Prevent going below ground
        }
    } catch (e) {
        console.error('Error setting up controls:', e);
    }
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -200;
    directionalLight.shadow.camera.right = 200;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;
    scene.add(directionalLight);
    
    // Point lights for each level
    for (let i = 0; i < 10; i++) {
        const pointLight = new THREE.PointLight(0x4488ff, 0.5, 100);
        pointLight.position.set(0, i * 30, 0);
        scene.add(pointLight);
    }
    
    // Raycaster
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Mouse events
    renderer.domElement.addEventListener('click', onMouseClick);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    
    // Window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start animation
    animate();
};

console.log('window.init3DTower defined:', typeof window.init3DTower === 'function');

console.log('window.init3DTower defined:', typeof window.init3DTower === 'function');

function animate() {
    animationId = requestAnimationFrame(animate);
    
    if (controls && controls.update) {
        controls.update();
    }
    
    // Rotate timeline rings
    timelineRings.forEach(ring => {
        ring.rotation.y += 0.002;
    });
    
    // Animate person cards (gentle rotation and float)
    personCards.forEach((card, personId) => {
        if (card && card.userData) {
            const time = Date.now() * 0.001;
            card.rotation.y = Math.sin(time + card.userData.offset) * 0.1;
            card.position.y += Math.sin(time * 0.5 + card.userData.offset) * 0.05;
            
            // Highlight pulse
            if (highlightedAncestors.has(personId)) {
                const scale = 1 + Math.sin(time * 3) * 0.15;
                card.scale.set(scale, scale, scale);
                if (card.userData.glow) {
                    card.userData.glow.material.opacity = 0.5 + Math.sin(time * 3) * 0.3;
                }
            }
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
    const intersects = raycaster.intersectObjects(Array.from(personCards.values()));
    
    if (intersects.length > 0) {
        const clickedCard = intersects[0].object;
        const personId = clickedCard.userData.personId;
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
    const intersects = raycaster.intersectObjects(Array.from(personCards.values()));
    
    // Reset hover
    personCards.forEach(card => {
        if (card.userData.originalScale) {
            card.scale.copy(card.userData.originalScale);
        }
    });
    
    // Set hover
    if (intersects.length > 0) {
        const hoveredCard = intersects[0].object;
        if (!hoveredCard.userData.originalScale) {
            hoveredCard.userData.originalScale = hoveredCard.scale.clone();
        }
        hoveredCard.scale.multiplyScalar(1.2);
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
    
    clearScene();
    
    const persons = currentTree.persons;
    if (persons.length === 0) {
        console.warn('No persons in tree');
        return;
    }
    
    console.log(`Rendering ${persons.length} persons`);
    
    const layout = calculateTowerLayout(persons);
    
    createTowerLevels(layout);
    createTimelineRings(layout);
    createPersonCards(persons, layout);
    createConnections(persons, layout);
    
    fitToView(layout);
    updatePeriodPeople();
}

function calculateTowerLayout(persons) {
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
    
    // Calculate positions in tower structure
    const nodes = [];
    const levelHeight = 40;
    const baseRadius = 30;
    
    const minYear = Math.min(...persons.map(p => getYear(p.birthDate) || 2000));
    const maxYear = Math.max(...persons.map(p => getYear(p.deathDate) || p.birthDate) || 2000) || new Date().getFullYear();
    
    for (let gen = 0; gen <= maxGeneration; gen++) {
        const genPersons = byGeneration[gen] || [];
        const y = gen * levelHeight; // Vertical position (tower level)
        
        // Arrange in a circle on this level
        const angleStep = (Math.PI * 2) / genPersons.length;
        const radius = baseRadius + gen * 5; // Wider circles for higher generations
        
        genPersons.forEach((person, idx) => {
            const angle = idx * angleStep;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            nodes.push({
                person: person,
                position: new THREE.Vector3(x, y, z),
                generation: gen,
                angle: angle,
                radius: radius
            });
        });
    }
    
    return {
        nodes: nodes,
        minYear: minYear,
        maxYear: maxYear,
        maxGeneration: maxGeneration,
        levelHeight: levelHeight
    };
}

function createTowerLevels(layout) {
    // Create platform for each generation level
    for (let gen = 0; gen <= layout.maxGeneration; gen++) {
        const y = gen * layout.levelHeight;
        const radius = 30 + gen * 5;
        
        // Main platform
        const platformGeometry = new THREE.CylinderGeometry(radius, radius, 2, 32);
        const platformMaterial = new THREE.MeshPhongMaterial({
            color: new THREE.Color().setHSL((gen * 40) % 360 / 360, 0.5, 0.3),
            transparent: true,
            opacity: 0.6,
            emissive: new THREE.Color().setHSL((gen * 40) % 360 / 360, 0.5, 0.1),
            emissiveIntensity: 0.5
        });
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.y = y;
        platform.rotation.x = Math.PI / 2;
        platform.receiveShadow = true;
        scene.add(platform);
        towerLevels.push(platform);
        
        // Support column
        if (gen > 0) {
            const columnGeometry = new THREE.CylinderGeometry(2, 2, layout.levelHeight, 16);
            const columnMaterial = new THREE.MeshPhongMaterial({
                color: 0x444444,
                emissive: 0x222222,
                emissiveIntensity: 0.3
            });
            const column = new THREE.Mesh(columnGeometry, columnMaterial);
            column.position.y = y - layout.levelHeight / 2;
            column.castShadow = true;
            scene.add(column);
            towerLevels.push(column);
        }
    }
}

function createTimelineRings(layout) {
    // Create rotating rings around the tower for timeline visualization
    for (let i = 0; i <= layout.maxGeneration; i++) {
        const radius = 50 + i * 8;
        const geometry = new THREE.TorusGeometry(radius, 1, 8, 64);
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL((i * 30) % 360 / 360, 0.7, 0.5),
            transparent: true,
            opacity: 0.3
        });
        const ring = new THREE.Mesh(geometry, material);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = i * layout.levelHeight;
        scene.add(ring);
        timelineRings.push(ring);
    }
}

function createPersonCards(persons, layout) {
    const personMap = new Map();
    persons.forEach(p => personMap.set(p.id, p));
    
    layout.nodes.forEach(nodeData => {
        const person = nodeData.person;
        const position = nodeData.position;
        
        // Create 3D card
        const cardGroup = new THREE.Group();
        
        // Card front (main face)
        const cardGeometry = new THREE.PlaneGeometry(8, 10);
        const color = getPersonNodeColor(person, persons);
        const cardMaterial = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.2,
            side: THREE.DoubleSide
        });
        const card = new THREE.Mesh(cardGeometry, cardMaterial);
        card.position.z = 0.5;
        card.castShadow = true;
        card.receiveShadow = true;
        cardGroup.add(card);
        
        // Card back
        const backCard = new THREE.Mesh(cardGeometry, cardMaterial.clone());
        backCard.position.z = -0.5;
        backCard.rotation.y = Math.PI;
        cardGroup.add(backCard);
        
        // Card frame/edge
        const edgeGeometry = new THREE.BoxGeometry(8.2, 10.2, 1);
        const edgeMaterial = new THREE.MeshPhongMaterial({
            color: 0x333333,
            emissive: 0x111111
        });
        const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
        cardGroup.add(edge);
        
        // Glow effect
        const glowGeometry = new THREE.PlaneGeometry(9, 11);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.z = 1;
        cardGroup.add(glow);
        card.userData.glow = glow;
        
        cardGroup.position.copy(position);
        cardGroup.userData.personId = person.id;
        cardGroup.userData.offset = Math.random() * Math.PI * 2;
        cardGroup.userData.originalScale = new THREE.Vector3(1, 1, 1);
        
        // Add text label
        addPersonLabel(cardGroup, person, position);
        
        scene.add(cardGroup);
        personCards.set(person.id, cardGroup);
    });
}

function addPersonLabel(cardGroup, person, position) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Background
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, 512, 256);
    
    // Name
    context.fillStyle = '#ffffff';
    context.font = 'Bold 32px Arial';
    context.textAlign = 'center';
    context.fillText(person.name || 'Unknown', 256, 80);
    
    // Birth date
    if (person.birthDate) {
        context.font = '20px Arial';
        context.fillText(`b. ${getYear(person.birthDate)}`, 256, 140);
    }
    
    // Death date or age
    if (person.deathDate) {
        context.fillText(`d. ${getYear(person.deathDate)}`, 256, 180);
    } else if (person.birthDate) {
        const age = new Date().getFullYear() - getYear(person.birthDate);
        context.fillStyle = '#4ade80';
        context.fillText(`Age: ${age}`, 256, 180);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(position.x, position.y + 6, position.z + 1);
    sprite.scale.set(10, 5, 1);
    scene.add(sprite);
    
    cardGroup.userData.label = sprite;
}

function createConnections(persons, layout) {
    const nodeMap = new Map();
    layout.nodes.forEach(node => {
        nodeMap.set(node.person.id, node);
    });
    
    const personMap = new Map();
    persons.forEach(p => personMap.set(p.id, p));
    
    // Parent-child connections (vertical)
    persons.forEach(person => {
        if (person.parents && person.parents.length > 0) {
            const childNode = nodeMap.get(person.id);
            if (!childNode) return;
            
            person.parents.forEach(parentId => {
                const parentNode = nodeMap.get(parentId);
                if (parentNode) {
                    createConnectionLine(parentNode.position, childNode.position, 0x4488ff, 0.8);
                }
            });
        }
    });
    
    // Marriage connections (horizontal on same level)
    persons.forEach(person => {
        if (person.spouses && person.spouses.length > 0) {
            person.spouses.forEach(spouseId => {
                const personNode = nodeMap.get(person.id);
                const spouseNode = nodeMap.get(spouseId);
                if (personNode && spouseNode && person.id < spouseId) {
                    createConnectionLine(personNode.position, spouseNode.position, 0xff88ff, 0.6);
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
        linewidth: 3
    });
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    connectionLines.push(line);
}

function clearScene() {
    personCards.forEach(card => {
        if (card.userData.label) {
            scene.remove(card.userData.label);
        }
        scene.remove(card);
    });
    personCards.clear();
    
    connectionLines.forEach(line => scene.remove(line));
    connectionLines = [];
    
    towerLevels.forEach(level => scene.remove(level));
    towerLevels = [];
    
    timelineRings.forEach(ring => scene.remove(ring));
    timelineRings = [];
}

function fitToView(layout) {
    if (layout.nodes.length === 0) return;
    
    const positions = layout.nodes.map(n => n.position);
    const box = new THREE.Box3().setFromPoints(positions);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2.5;
    
    camera.position.set(0, layout.maxGeneration * layout.levelHeight * 0.6, distance);
    camera.lookAt(center);
    if (controls && controls.target) {
        controls.target.copy(center);
        controls.update();
    }
}

// Utility functions
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

// Verify function is available - check immediately
console.log('=== app-3d-tower.js START ===');
console.log('init3DTower type:', typeof window.init3DTower);
console.log('init3DTower is function:', typeof window.init3DTower === 'function');
if (typeof window.init3DTower === 'function') {
    console.log('✓ init3DTower is available!');
} else {
    console.error('✗ init3DTower is NOT available!');
}

// Initialize when DOM is ready (only if not already initialized)
document.addEventListener('DOMContentLoaded', () => {
    // Don't auto-initialize - let the main app.js handle it
    // This allows switching between visualizations
    console.log('DOMContentLoaded - init3DTower available:', typeof window.init3DTower === 'function');
});

// Export functions
window.renderTree3DTower = renderTree;
window.loadTree3DTower = function(tree) {
    console.log('Loading tree into 3D Tower:', tree);
    if (!tree || !tree.persons) {
        console.error('Invalid tree data:', tree);
        return;
    }
    currentTree = tree;
    currentTreeId = tree.id;
    
    // Make sure scene is initialized
    if (!scene || !renderer) {
        console.error('Scene not initialized! Initializing now...');
        init3DTower();
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
window.selectPerson3DTower = selectPerson;
window.highlightMainBranch3DTower = function() {
    if (!currentTree || !currentTree.persons) return;
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
console.log('=== app-3d-tower.js COMPLETE ===');
console.log('window.init3DTower:', typeof window.init3DTower);
if (typeof window.init3DTower !== 'function') {
    console.error('ERROR: init3DTower is not a function!');
}

