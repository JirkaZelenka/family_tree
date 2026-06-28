// Global state
let currentTree = null;
let currentTreeId = null;
let selectedPerson = null;
let highlightedAncestors = new Set();
let zoom = null;
let svg = null;
let g = null;
let yearBands = null;
let currentVisualization = '2d'; // '2d', '3d-space', '3d-tower'
let timelineEvents = [
    { year: 1914, event: 'World War I begins', type: 'world' },
    { year: 1918, event: 'World War I ends', type: 'world' },
    { year: 1929, event: 'Great Depression', type: 'world' },
    { year: 1939, event: 'World War II begins', type: 'world' },
    { year: 1945, event: 'World War II ends', type: 'world' },
    { year: 1969, event: 'Moon Landing', type: 'world' },
    { year: 1989, event: 'Fall of Berlin Wall', type: 'world' },
    { year: 2001, event: '9/11 Attacks', type: 'world' },
    { year: 2020, event: 'COVID-19 Pandemic', type: 'world' }
];
let birthdayTimeline = [];
let showEventsTimeline = false;
let showBirthdayTimeline = false;

const API_BASE = '/api';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    loadTrees();
});

function initializeApp() {
    // Clear any existing content
    const container = d3.select('#tree-visualization');
    container.selectAll('*').remove();
    
    // Create SVG for visualization
    svg = container.append('svg');
    g = svg.append('g');
    
    // Setup zoom
    zoom = d3.zoom()
        .scaleExtent([0.1, 3])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
            updateYearIndicator();
        });
    
    svg.call(zoom);
    
    // Initial transform
    g.attr('transform', 'translate(0, 0) scale(1)');
    
    // Year indicator update on scroll
    if (svg.node()) {
        svg.node().addEventListener('scroll', updateYearIndicator);
    }
}

function setupEventListeners() {
    document.getElementById('tree-selector').addEventListener('change', (e) => {
        if (e.target.value) {
            loadTree(e.target.value);
        }
    });
    
    document.getElementById('visualization-selector').addEventListener('change', (e) => {
        switchVisualization(e.target.value);
    });
    
    document.getElementById('new-tree-btn').addEventListener('click', createNewTree);
    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });
    document.getElementById('export-btn').addEventListener('click', exportCurrentTree);
    document.getElementById('file-input').addEventListener('change', handleFileImport);
    document.getElementById('add-person-btn').addEventListener('click', showAddPersonForm);
    document.getElementById('cancel-form').addEventListener('click', hidePersonForm);
    document.getElementById('person-form').addEventListener('submit', savePerson);
    document.getElementById('delete-person').addEventListener('click', deleteCurrentPerson);
    document.getElementById('show-events').addEventListener('change', toggleEventsTimeline);
    document.getElementById('show-birthdays').addEventListener('change', toggleBirthdayTimeline);
    document.getElementById('highlight-main-branch').addEventListener('click', highlightMainBranch);
    
    // Year indicator update on scroll (only for 2D)
    if (svg && svg.node()) {
        svg.node().addEventListener('scroll', updateYearIndicator);
    }
}

function switchVisualization(mode) {
    currentVisualization = mode;
    const container = document.getElementById('tree-visualization');
    
    // Diagnostic logging
    console.log('Switching to visualization:', mode);
    console.log('Three.js loaded:', typeof THREE !== 'undefined');
    console.log('OrbitControls available:', typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined' || typeof OrbitControls !== 'undefined');
    console.log('init3DScene available:', typeof window.init3DScene === 'function');
    console.log('init3DTower available:', typeof window.init3DTower === 'function');
    console.log('Current tree:', currentTree ? `${currentTree.persons?.length || 0} persons` : 'none');
    
    // Clear container
    container.innerHTML = '';
    
    if (mode === '2d') {
        // Initialize 2D visualization
        initializeApp();
        if (currentTree) {
            renderTree();
        }
    } else if (mode === '3d-space') {
        // Check if Three.js is loaded
        if (typeof THREE === 'undefined') {
            console.error('Three.js is not loaded yet. Please wait and try again.');
            alert('Three.js is still loading. Please wait a moment and try again.');
            return;
        }
        
        // Initialize 3D Space visualization
        // Try multiple ways to access the function
        const initFunc = window.init3DScene || (typeof init3DScene !== 'undefined' ? init3DScene : null);
        
        console.log('initFunc:', initFunc);
        console.log('typeof initFunc:', typeof initFunc);
        
        if (typeof initFunc === 'function') {
            try {
                initFunc();
                // Wait a bit for initialization, then load tree
                setTimeout(() => {
                    if (currentTree && typeof window.loadTree3DSpace === 'function') {
                        window.loadTree3DSpace(currentTree);
                    } else if (!currentTree) {
                        console.warn('No tree loaded yet. Please select a tree first.');
                    }
                }, 200);
            } catch (e) {
                console.error('Error initializing 3D Space:', e);
                alert('Error initializing 3D Space visualization: ' + e.message);
            }
        } else {
            console.error('3D Space visualization function not found');
            alert('3D Space visualization not loaded. Please refresh the page.');
        }
    } else if (mode === '3d-tower') {
        // Check if Three.js is loaded
        if (typeof THREE === 'undefined') {
            console.error('Three.js is not loaded yet. Please wait and try again.');
            alert('Three.js is still loading. Please wait a moment and try again.');
            return;
        }
        
        // Initialize 3D Tower visualization
        // Try multiple ways to access the function
        const initFunc = window.init3DTower || (typeof init3DTower !== 'undefined' ? init3DTower : null);
        
        console.log('initFunc:', initFunc);
        console.log('typeof initFunc:', typeof initFunc);
        
        if (typeof initFunc === 'function') {
            try {
                initFunc();
                // Wait a bit for initialization, then load tree
                setTimeout(() => {
                    if (currentTree && typeof window.loadTree3DTower === 'function') {
                        window.loadTree3DTower(currentTree);
                    } else if (!currentTree) {
                        console.warn('No tree loaded yet. Please select a tree first.');
                    }
                }, 200);
            } catch (e) {
                console.error('Error initializing 3D Tower:', e);
                alert('Error initializing 3D Tower visualization: ' + e.message);
            }
        } else {
            console.error('3D Tower visualization function not found');
            alert('3D Tower visualization not loaded. Please refresh the page.');
        }
    }
}

async function loadTrees() {
    try {
        const response = await fetch(`${API_BASE}/trees`);
        const data = await response.json();
        
        const selector = document.getElementById('tree-selector');
        selector.innerHTML = '<option value="">Select a tree...</option>';
        
        data.trees.forEach(treeId => {
            const option = document.createElement('option');
            option.value = treeId;
            option.textContent = treeId;
            selector.appendChild(option);
        });
        
        if (data.trees.length > 0) {
            loadTree(data.trees[0]);
        }
    } catch (error) {
        console.error('Error loading trees:', error);
    }
}

async function loadTree(treeId) {
    try {
        const response = await fetch(`${API_BASE}/trees/${treeId}`);
        currentTree = await response.json();
        currentTreeId = treeId;
        document.getElementById('tree-selector').value = treeId;
        
        // Merge tree events with default events
        if (currentTree.events) {
            timelineEvents = [...timelineEvents, ...currentTree.events];
        }
        
        // Render based on current visualization mode
        if (currentVisualization === '2d') {
            renderTree();
        } else if (currentVisualization === '3d-space' && typeof window.loadTree3DSpace === 'function') {
            window.loadTree3DSpace(currentTree);
        } else if (currentVisualization === '3d-tower' && typeof window.loadTree3DTower === 'function') {
            window.loadTree3DTower(currentTree);
        }
        
        updateSidebar();
    } catch (error) {
        console.error('Error loading tree:', error);
    }
}

function renderTree() {
    if (!currentTree || !currentTree.persons) return;
    
    const persons = currentTree.persons;
    if (persons.length === 0) return;
    
    // Clear previous rendering
    g.selectAll('*').remove();
    
    // Calculate layout
    const layout = calculateLayout(persons);
    
    // Draw year bands
    drawYearBands(layout);
    
    // Draw connections
    drawConnections(persons, layout);
    
    // Draw person nodes
    drawPersonNodes(persons, layout);
    
    // Update viewport
    fitToView(layout);
    
    // Update period people
    updatePeriodPeople();
    
    // Render timelines if enabled
    renderTimelines();
}

function calculateLayout(persons) {
    const nodeWidth = 160;
    const nodeHeight = 110;
    const coupleSpacing = 30; // Space between husband and wife
    const verticalSpacing = 250; // Space between generations
    const siblingSpacing = 40; // Space between siblings
    
    // Create person lookup
    const personMap = new Map();
    persons.forEach(p => personMap.set(p.id, p));
    
    // Build marriages structure
    persons.forEach(person => {
        if (!person.marriages && person.spouses) {
            person.marriages = person.spouses.map(spouseId => ({
                spouseId: spouseId,
                children: []
            }));
        }
        if (!person.marriages) {
            person.marriages = [];
        }
    });
    
    // Assign children to marriages based on parents
    persons.forEach(person => {
        if (person.parents && person.parents.length >= 2) {
            const parent1 = personMap.get(person.parents[0]);
            const parent2 = personMap.get(person.parents[1]);
            
            if (parent1 && parent2) {
                const marriage1 = parent1.marriages.find(m => m.spouseId === parent2.id);
                const marriage2 = parent2.marriages.find(m => m.spouseId === parent1.id);
                
                if (marriage1 && !marriage1.children.includes(person.id)) {
                    marriage1.children.push(person.id);
                }
                if (marriage2 && !marriage2.children.includes(person.id)) {
                    marriage2.children.push(person.id);
                }
            }
        }
    });
    
    // Calculate generation for each person
    const generations = new Map();
    const visited = new Set();
    
    function getGeneration(personId) {
        if (generations.has(personId)) {
            return generations.get(personId);
        }
        if (visited.has(personId)) {
            return 0;
        }
        visited.add(personId);
        
        const person = personMap.get(personId);
        if (!person || !person.parents || person.parents.length === 0) {
            generations.set(personId, 0);
            return 0;
        }
        
        let maxParentGen = -1;
        person.parents.forEach(parentId => {
            const parentGen = getGeneration(parentId);
            maxParentGen = Math.max(maxParentGen, parentGen);
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
        if (!byGeneration[gen]) {
            byGeneration[gen] = [];
        }
        byGeneration[gen].push(person);
        maxGeneration = Math.max(maxGeneration, gen);
    });
    
    // Calculate positions - traditional family tree layout
    const nodes = [];
    const positions = new Map();
    const marriages = new Map();
    const processed = new Set();
    
    // Process each generation from oldest to youngest
    for (let gen = 0; gen <= maxGeneration; gen++) {
        const genPersons = byGeneration[gen] || [];
        const genY = gen * verticalSpacing;
        let currentX = 0;
        
        // Group by sibling groups (same parents)
        const siblingGroups = new Map();
        genPersons.forEach(person => {
            if (processed.has(person.id)) return;
            
            let groupKey = 'root';
            if (person.parents && person.parents.length >= 2) {
                groupKey = person.parents.sort().join(',');
            }
            
            if (!siblingGroups.has(groupKey)) {
                siblingGroups.set(groupKey, []);
            }
            siblingGroups.get(groupKey).push(person);
        });
        
        // Process each sibling group
        siblingGroups.forEach((siblings) => {
            // Sort siblings by birth year
            siblings.sort((a, b) => {
                const aYear = getYear(a.birthDate) || 0;
                const bYear = getYear(b.birthDate) || 0;
                return aYear - bYear;
            });
            
            // Process each sibling
            siblings.forEach(sibling => {
                if (processed.has(sibling.id)) return;
                
                // Find marriages for this sibling
                const siblingMarriages = sibling.marriages || [];
                
                if (siblingMarriages.length > 0) {
                    // Process first marriage (for now, handle multiple marriages later)
                    const marriage = siblingMarriages[0];
                    const spouse = personMap.get(marriage.spouseId);
                    
                    if (spouse && !processed.has(spouse.id) && generations.get(spouse.id) === gen) {
                        // Couple - place side by side
                        const husbandX = currentX;
                        const wifeX = currentX + nodeWidth + coupleSpacing;
                        const centerX = (husbandX + wifeX + nodeWidth) / 2;
                        
                        const husband = sibling.gender === 'male' ? sibling : spouse;
                        const wife = sibling.gender === 'female' ? sibling : spouse;
                        
                        positions.set(husband.id, { x: husbandX, y: genY });
                        positions.set(wife.id, { x: wifeX, y: genY });
                        
                        nodes.push({
                            person: husband,
                            x: husbandX,
                            y: genY,
                            year: getYear(husband.birthDate)
                        });
                        nodes.push({
                            person: wife,
                            x: wifeX,
                            y: genY,
                            year: getYear(wife.birthDate)
                        });
                        
                        // Store marriage info
                        marriages.set(`${husband.id}-${wife.id}`, {
                            x: centerX,
                            y: genY + nodeHeight / 2,
                            person1: husband.id,
                            person2: wife.id,
                            children: marriage.children || []
                        });
                        
                        processed.add(husband.id);
                        processed.add(wife.id);
                        currentX = wifeX + nodeWidth + 150;
                    } else {
                        // Spouse not in same generation or already processed - treat as single
                        const x = currentX;
                        positions.set(sibling.id, { x: x, y: genY });
                        nodes.push({
                            person: sibling,
                            x: x,
                            y: genY,
                            year: getYear(sibling.birthDate)
                        });
                        processed.add(sibling.id);
                        currentX += nodeWidth + 100;
                    }
                } else {
                    // No spouse - single person
                    const x = currentX;
                    positions.set(sibling.id, { x: x, y: genY });
                    nodes.push({
                        person: sibling,
                        x: x,
                        y: genY,
                        year: getYear(sibling.birthDate)
                    });
                    processed.add(sibling.id);
                    currentX += nodeWidth + 100;
                }
            });
        });
    }
    
    // Position children below their parents, centered
    for (let gen = 0; gen < maxGeneration; gen++) {
        const genPersons = byGeneration[gen] || [];
        const childGen = gen + 1;
        const childY = childGen * verticalSpacing;
        
        // Group children by their parents
        const childrenByParents = new Map();
        byGeneration[childGen]?.forEach(child => {
            if (child.parents && child.parents.length >= 2) {
                const parentKey = child.parents.sort().join(',');
                if (!childrenByParents.has(parentKey)) {
                    childrenByParents.set(parentKey, []);
                }
                childrenByParents.get(parentKey).push(child);
            }
        });
        
        // Position children for each parent pair
        childrenByParents.forEach((children, parentKey) => {
            const parentIds = parentKey.split(',');
            const parent1Node = nodes.find(n => n.person.id === parentIds[0]);
            const parent2Node = nodes.find(n => n.person.id === parentIds[1]);
            
            if (!parent1Node || !parent2Node) return;
            
            // Find center between parents
            const parentCenterX = (parent1Node.x + parent2Node.x + nodeWidth) / 2;
            
            // Sort children by birth year
            children.sort((a, b) => {
                const aYear = getYear(a.birthDate) || 0;
                const bYear = getYear(b.birthDate) || 0;
                return aYear - bYear;
            });
            
            // Calculate total width needed for children
            const childrenWidth = children.length * nodeWidth + (children.length - 1) * siblingSpacing;
            const startX = parentCenterX - childrenWidth / 2;
            
            // Position each child
            children.forEach((child, idx) => {
                if (processed.has(child.id)) {
                    // Update existing position
                    const existingNode = nodes.find(n => n.person.id === child.id);
                    if (existingNode) {
                        existingNode.x = startX + idx * (nodeWidth + siblingSpacing);
                        existingNode.y = childY;
                    }
                } else {
                    const childX = startX + idx * (nodeWidth + siblingSpacing);
                    positions.set(child.id, { x: childX, y: childY });
                    nodes.push({
                        person: child,
                        x: childX,
                        y: childY,
                        year: getYear(child.birthDate)
                    });
                    processed.add(child.id);
                }
            });
        });
    }
    
    // Ensure all persons are included (fallback)
    persons.forEach(person => {
        if (!processed.has(person.id)) {
            const gen = generations.get(person.id) || 0;
            const y = gen * verticalSpacing;
            const x = 0; // Will be centered later
            positions.set(person.id, { x: x, y: y });
            nodes.push({
                person: person,
                x: x,
                y: y,
                year: getYear(person.birthDate)
            });
        }
    });
    
    // Center the entire tree horizontally
    if (nodes.length > 0) {
        const minX = Math.min(...nodes.map(n => n.x));
        const maxX = Math.max(...nodes.map(n => n.x + nodeWidth));
        const centerOffset = -minX + 100;
        
        nodes.forEach(node => {
            node.x += centerOffset;
        });
        
        marriages.forEach(marriage => {
            marriage.x += centerOffset;
        });
    }
    
    // Calculate year range
    const minYear = Math.min(...persons.map(p => getYear(p.birthDate) || 2000));
    const maxYear = Math.max(...persons.map(p => getYear(p.deathDate) || p.birthDate) || 2000) || new Date().getFullYear();
    
    return {
        nodes: nodes,
        marriages: marriages,
        minYear: minYear,
        maxYear: maxYear,
        nodeWidth: nodeWidth,
        nodeHeight: nodeHeight
    };
}

function drawYearBands(layout) {
    const bands = g.append('g').attr('class', 'year-bands');
    
    // Calculate generation-based Y positions
    const generationHeight = 200;
    const maxGen = Math.max(...layout.nodes.map(n => {
        // Estimate generation from Y position
        return Math.round(n.y / generationHeight);
    }));
    
    // Draw bands for each generation (alternating colors)
    for (let gen = 0; gen <= maxGen; gen++) {
        const y = gen * generationHeight;
        const height = generationHeight;
        
        // Alternate colors every 2 generations
        const isEven = gen % 2 === 0;
        bands.append('rect')
            .attr('class', `year-band ${isEven ? 'year-band-25' : 'year-band-50'}`)
            .attr('x', -5000)
            .attr('y', y)
            .attr('width', 20000)
            .attr('height', height)
            .attr('opacity', 0.08);
    }
}

function drawConnections(persons, layout) {
    const connections = g.append('g').attr('class', 'connections');
    
    // Draw connections for marriages (couples)
    layout.marriages.forEach((marriage) => {
        const person1Node = layout.nodes.find(n => n.person.id === marriage.person1);
        const person2Node = layout.nodes.find(n => n.person.id === marriage.person2);
        
        if (!person1Node || !person2Node) return;
        
        // Draw horizontal line between spouses
        const x1 = person1Node.x + layout.nodeWidth;
        const x2 = person2Node.x;
        const y = person1Node.y + layout.nodeHeight / 2;
        
        connections.append('line')
            .attr('class', 'connection-line marriage-line')
            .attr('x1', x1)
            .attr('y1', y)
            .attr('x2', x2)
            .attr('y2', y)
            .attr('stroke-width', 2.5)
            .attr('stroke', '#34495e');
        
        // Draw connections from marriage center to children
        if (marriage.children && marriage.children.length > 0) {
            const childNodes = marriage.children
                .map(childId => layout.nodes.find(n => n.person.id === childId))
                .filter(n => n);
            
            if (childNodes.length > 0) {
                const childMinX = Math.min(...childNodes.map(n => n.x));
                const childMaxX = Math.max(...childNodes.map(n => n.x + layout.nodeWidth));
                const childCenterX = (childMinX + childMaxX) / 2;
                const childY = childNodes[0].y;
                const parentY = person1Node.y + layout.nodeHeight;
                
                // Vertical line from marriage center down to children level
                connections.append('line')
                    .attr('class', 'connection-line parent-child-line')
                    .attr('x1', marriage.x)
                    .attr('y1', parentY)
                    .attr('x2', marriage.x)
                    .attr('y2', childY)
                    .attr('stroke-width', 2)
                    .attr('stroke', '#34495e');
                
                // Horizontal line connecting siblings (if more than one)
                if (childNodes.length > 1) {
                    connections.append('line')
                        .attr('class', 'connection-line sibling-line')
                        .attr('x1', childMinX)
                        .attr('y1', childY)
                        .attr('x2', childMaxX)
                        .attr('y2', childY)
                        .attr('stroke-width', 2)
                        .attr('stroke', '#34495e');
                }
                
                // Connection from marriage center to children center (diagonal, optional)
                connections.append('line')
                    .attr('class', 'connection-line family-branch')
                    .attr('x1', marriage.x)
                    .attr('y1', parentY)
                    .attr('x2', childCenterX)
                    .attr('y2', childY)
                    .attr('stroke-width', 1.5)
                    .attr('stroke', '#34495e')
                    .style('opacity', 0.4);
            }
        }
    });
    
    // Handle single parents with children (backward compatibility)
    const childrenByParents = new Map();
    persons.forEach(person => {
        if (person.parents && person.parents.length > 0) {
            const parentKey = person.parents.sort().join(',');
            if (!childrenByParents.has(parentKey)) {
                childrenByParents.set(parentKey, []);
            }
            childrenByParents.get(parentKey).push(person);
        }
    });
    
    childrenByParents.forEach((children, parentKey) => {
        // Check if this is already handled by a marriage
        const parentIds = parentKey.split(',');
        let handled = false;
        layout.marriages.forEach(marriage => {
            if ((marriage.person1 === parentIds[0] && marriage.person2 === parentIds[1]) ||
                (marriage.person1 === parentIds[1] && marriage.person2 === parentIds[0])) {
                handled = true;
            }
        });
        if (handled) return;
        
        // Draw connections for single parent or unhandled cases
        const parentNodes = parentIds
            .map(id => layout.nodes.find(n => n.person.id === id))
            .filter(n => n);
        
        if (parentNodes.length === 0 || children.length === 0) return;
        
        const parentCenterX = parentNodes.length === 1 
            ? parentNodes[0].x + layout.nodeWidth / 2
            : (Math.min(...parentNodes.map(n => n.x)) + Math.max(...parentNodes.map(n => n.x + layout.nodeWidth))) / 2;
        
        const parentY = parentNodes[0].y + layout.nodeHeight;
        
        const childNodes = children
            .map(child => layout.nodes.find(n => n.person.id === child.id))
            .filter(n => n);
        
        if (childNodes.length === 0) return;
        
        const childMinX = Math.min(...childNodes.map(n => n.x));
        const childMaxX = Math.max(...childNodes.map(n => n.x + layout.nodeWidth));
        const childCenterX = (childMinX + childMaxX) / 2;
        const childY = childNodes[0].y;
        
        // Vertical line from parent to children
        connections.append('line')
            .attr('class', 'connection-line parent-child-line')
            .attr('x1', parentCenterX)
            .attr('y1', parentY)
            .attr('x2', parentCenterX)
            .attr('y2', childY)
            .attr('stroke-width', 2)
            .attr('stroke', '#34495e');
        
        // Horizontal line connecting siblings
        if (childNodes.length > 1) {
            connections.append('line')
                .attr('class', 'connection-line sibling-line')
                .attr('x1', childMinX)
                .attr('y1', childY)
                .attr('x2', childMaxX)
                .attr('y2', childY)
                .attr('stroke-width', 2)
                .attr('stroke', '#34495e');
        }
    });
}

function drawPersonNodes(persons, layout) {
    const nodesGroup = g.append('g').attr('class', 'person-nodes');
    
    layout.nodes.forEach(nodeData => {
        const person = nodeData.person;
        const node = nodesGroup.append('g')
            .attr('class', 'person-node')
            .attr('transform', `translate(${nodeData.x}, ${nodeData.y})`)
            .attr('data-person-id', person.id)
            .on('click', () => selectPerson(person));
        
        // Determine node style
        if (person.uncertain) {
            node.classed('uncertain', true);
        }
        if (person.veryUncertain) {
            node.classed('very-uncertain', true);
        }
        if (highlightedAncestors.has(person.id)) {
            node.classed('highlighted', true);
        }
        
        // Background rectangle with branch-based color
        const nodeColor = getPersonNodeColor(person, persons);
        node.append('rect')
            .attr('width', layout.nodeWidth)
            .attr('height', layout.nodeHeight)
            .attr('rx', 10)
            .attr('fill', nodeColor)
            .attr('stroke', '#2c3e50')
            .attr('stroke-width', 2.5);
        
        // Name
        node.append('text')
            .attr('x', layout.nodeWidth / 2)
            .attr('y', 28)
            .attr('text-anchor', 'middle')
            .attr('font-size', '13px')
            .attr('font-weight', '600')
            .attr('fill', '#2c3e50')
            .text(person.name || 'Unknown');
        
        // Birth date
        if (person.birthDate) {
            const birthYear = getYear(person.birthDate);
            node.append('text')
                .attr('x', layout.nodeWidth / 2)
                .attr('y', 50)
                .attr('text-anchor', 'middle')
                .attr('font-size', '11px')
                .attr('fill', '#555')
                .text(`b. ${birthYear || formatDate(person.birthDate)}`);
        } else {
            node.append('text')
                .attr('x', layout.nodeWidth / 2)
                .attr('y', 50)
                .attr('text-anchor', 'middle')
                .attr('font-size', '11px')
                .attr('fill', '#e74c3c')
                .text('b. ?');
        }
        
        // Death date
        if (person.deathDate) {
            const deathYear = getYear(person.deathDate);
            node.append('text')
                .attr('x', layout.nodeWidth / 2)
                .attr('y', 70)
                .attr('text-anchor', 'middle')
                .attr('font-size', '11px')
                .attr('fill', '#555')
                .text(`d. ${deathYear || formatDate(person.deathDate)}`);
        } else if (person.birthDate) {
            // Show age if alive
            const birthYear = getYear(person.birthDate);
            if (birthYear) {
                const age = new Date().getFullYear() - birthYear;
                node.append('text')
                    .attr('x', layout.nodeWidth / 2)
                    .attr('y', 70)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '11px')
                    .attr('fill', '#27ae60')
                    .text(`Age: ${age}`);
            }
        }
        
        // Question marks for uncertain data
        if (person.uncertain || !person.name || !person.birthDate) {
            node.append('text')
                .attr('class', 'question-mark')
                .attr('x', layout.nodeWidth - 12)
                .attr('y', 22)
                .attr('font-size', '16px')
                .text('?');
        }
    });
}

function fitToView(layout) {
    if (layout.nodes.length === 0) return;
    
    const bounds = {
        minX: Math.min(...layout.nodes.map(n => n.x)),
        maxX: Math.max(...layout.nodes.map(n => n.x + layout.nodeWidth)),
        minY: Math.min(...layout.nodes.map(n => n.y)),
        maxY: Math.max(...layout.nodes.map(n => n.y + layout.nodeHeight))
    };
    
    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;
    
    const scale = Math.min(width / (bounds.maxX - bounds.minX), height / (bounds.maxY - bounds.minY)) * 0.8;
    const translateX = (width - (bounds.maxX + bounds.minX) * scale) / 2;
    const translateY = (height - (bounds.maxY + bounds.minY) * scale) / 2;
    
    g.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
}

function updateYearIndicator() {
    if (currentVisualization !== '2d') {
        // For 3D visualizations, show current year or average
        if (currentTree && currentTree.persons) {
            const years = currentTree.persons
                .map(p => getYear(p.birthDate))
                .filter(y => y !== null);
            if (years.length > 0) {
                const avgYear = Math.round(years.reduce((a, b) => a + b, 0) / years.length);
                document.getElementById('year-indicator').textContent = `Year: ${avgYear}`;
            }
        }
        return;
    }
    
    // Calculate current visible year based on transform (2D only)
    if (!svg || !svg.node()) return;
    
    const transform = d3.zoomTransform(svg.node());
    const centerY = -transform.y / transform.k;
    
    // Estimate year from Y position (rough calculation)
    if (currentTree && currentTree.persons) {
        const minYear = Math.min(...currentTree.persons.map(p => getYear(p.birthDate) || 2000));
        const estimatedYear = Math.round(minYear + centerY / 20);
        document.getElementById('year-indicator').textContent = `Year: ${estimatedYear}`;
    }
}

function updateSidebar() {
    updateLegend();
}

function updateLegend() {
    if (!currentTree || !currentTree.persons) return;
    
    const legend = document.getElementById('legend');
    legend.innerHTML = '';
    
    // Group by family (simplified - could be improved)
    const families = {};
    currentTree.persons.forEach(person => {
        const family = person.name ? person.name.split(' ').pop() : 'Unknown';
        if (!families[family]) {
            families[family] = {
                name: family,
                color: getFamilyColor(family),
                count: 0
            };
        }
        families[family].count++;
    });
    
    Object.values(families).forEach(family => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `
            <div class="legend-color" style="background: ${family.color}"></div>
            <span>${family.name} (${family.count})</span>
        `;
        legend.appendChild(item);
    });
}

function getFamilyColor(familyName) {
    // Simple hash function for consistent colors
    let hash = 0;
    for (let i = 0; i < familyName.length; i++) {
        hash = familyName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 60%)`;
}

function getPersonBranchColor(person, persons) {
    // Trace back through ancestors to find the root family branch
    function getRootAncestor(p, visited = new Set()) {
        if (visited.has(p.id)) return null;
        visited.add(p.id);
        
        if (!p.parents || p.parents.length === 0) {
            return p;
        }
        
        // Follow the first parent (paternal line)
        const parent = persons.find(per => per.id === p.parents[0]);
        if (parent) {
            return getRootAncestor(parent, visited);
        }
        return p;
    }
    
    const rootAncestor = getRootAncestor(person);
    if (rootAncestor) {
        const lastName = rootAncestor.name ? rootAncestor.name.split(' ').pop() : 'Unknown';
        return getFamilyColor(lastName);
    }
    
    // Fallback to gender-based color
    return person.gender === 'female' ? '#ffb3d9' : '#b3d9ff';
}

function getPersonNodeColor(person, persons) {
    const branchColor = getPersonBranchColor(person, persons);
    
    // Convert to RGB and adjust brightness for gender
    if (person.gender === 'female') {
        // Lighter shade for females
        return adjustColorBrightness(branchColor, 1.2);
    } else {
        // Standard shade for males
        return adjustColorBrightness(branchColor, 0.9);
    }
}

function adjustColorBrightness(color, factor) {
    // Simple brightness adjustment for HSL colors
    if (color.startsWith('hsl')) {
        const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        if (match) {
            const h = match[1];
            const s = match[2];
            const l = Math.min(95, Math.max(5, parseInt(match[3]) * factor));
            return `hsl(${h}, ${s}%, ${l}%)`;
        }
    }
    return color;
}

function updatePeriodPeople() {
    if (!currentTree || !currentTree.persons) return;
    
    const container = document.getElementById('period-people');
    container.innerHTML = '';
    
    // Get current visible period (simplified)
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

function selectPerson(person) {
    selectedPerson = person;
    displayPersonDetails(person);
    
    // Highlight ancestors based on visualization mode
    if (currentVisualization === '2d') {
        highlightAncestors(person);
    } else if (currentVisualization === '3d-space' && typeof window.selectPerson3DSpace === 'function') {
        window.selectPerson3DSpace(person);
    } else if (currentVisualization === '3d-tower' && typeof window.selectPerson3DTower === 'function') {
        window.selectPerson3DTower(person);
    }
}

function highlightAncestors(person) {
    highlightedAncestors.clear();
    
    function addAncestors(p) {
        if (p.parents) {
            p.parents.forEach(parentId => {
                highlightedAncestors.add(parentId);
                const parent = currentTree.persons.find(per => per.id === parentId);
                if (parent) {
                    addAncestors(parent);
                }
            });
        }
    }
    
    addAncestors(person);
    renderTree();
}

function highlightMainBranch() {
    if (!currentTree || !currentTree.persons) return;
    
    if (currentVisualization === '2d') {
        // Find the longest branch (most generations)
        function getBranchDepth(person, visited = new Set()) {
            if (visited.has(person.id)) return 0;
            visited.add(person.id);
            
            if (!person.parents || person.parents.length === 0) {
                return 1;
            }
            
            let maxDepth = 0;
            person.parents.forEach(parentId => {
                const parent = currentTree.persons.find(p => p.id === parentId);
                if (parent) {
                    const depth = getBranchDepth(parent, new Set(visited));
                    maxDepth = Math.max(maxDepth, depth);
                }
            });
            
            return maxDepth + 1;
        }
        
        let maxDepth = 0;
        let deepestPerson = null;
        
        currentTree.persons.forEach(person => {
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
    } else if (currentVisualization === '3d-space' && typeof window.highlightMainBranch3DSpace === 'function') {
        window.highlightMainBranch3DSpace();
    } else if (currentVisualization === '3d-tower' && typeof window.highlightMainBranch3DTower === 'function') {
        window.highlightMainBranch3DTower();
    }
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
            ${person.uncertain ? '<p style="color: #e74c3c;"><strong>⚠ Uncertain Data</strong></p>' : ''}
        </div>
    `;
    
    // Populate form for editing
    document.getElementById('person-id').value = person.id;
    document.getElementById('person-name').value = person.name || '';
    document.getElementById('person-birth').value = person.birthDate || '';
    document.getElementById('person-death').value = person.deathDate || '';
    document.getElementById('person-gender').value = person.gender || 'male';
    document.getElementById('person-notes').value = person.notes || '';
    document.getElementById('person-contact').value = person.contact || '';
    document.getElementById('person-uncertain').checked = person.uncertain || false;
}

function showAddPersonForm() {
    document.getElementById('person-form-container').style.display = 'block';
    document.getElementById('person-form').reset();
    document.getElementById('person-id').value = '';
    document.getElementById('delete-person').style.display = 'none';
}

function hidePersonForm() {
    document.getElementById('person-form-container').style.display = 'none';
}

async function savePerson(e) {
    e.preventDefault();
    
    const personData = {
        id: document.getElementById('person-id').value || undefined,
        name: document.getElementById('person-name').value,
        birthDate: document.getElementById('person-birth').value || null,
        deathDate: document.getElementById('person-death').value || null,
        gender: document.getElementById('person-gender').value,
        notes: document.getElementById('person-notes').value,
        contact: document.getElementById('person-contact').value,
        uncertain: document.getElementById('person-uncertain').checked,
        parents: selectedPerson?.parents || [],
        spouses: selectedPerson?.spouses || []
    };
    
    try {
        const url = personData.id 
            ? `${API_BASE}/trees/${currentTreeId}/persons/${personData.id}`
            : `${API_BASE}/trees/${currentTreeId}/persons`;
        
        const method = personData.id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(personData)
        });
        
        const result = await response.json();
        
        if (result.duplicates && result.duplicates.length > 0) {
            alert(`Warning: Potential duplicates found:\n${result.duplicates.map(d => d.name).join('\n')}`);
        }
        
        await loadTree(currentTreeId);
        hidePersonForm();
    } catch (error) {
        console.error('Error saving person:', error);
        alert('Error saving person');
    }
}

async function deleteCurrentPerson() {
    if (!selectedPerson) return;
    
    if (!confirm(`Delete ${selectedPerson.name}?`)) return;
    
    try {
        await fetch(`${API_BASE}/trees/${currentTreeId}/persons/${selectedPerson.id}`, {
            method: 'DELETE'
        });
        
        await loadTree(currentTreeId);
        hidePersonForm();
        document.getElementById('person-details').innerHTML = '<p class="placeholder">Click on a person to see details</p>';
    } catch (error) {
        console.error('Error deleting person:', error);
        alert('Error deleting person');
    }
}

function createNewTree() {
    const name = prompt('Enter tree name:');
    if (!name) return;
    
    const treeId = name.toLowerCase().replace(/\s+/g, '_');
    const newTree = {
        id: treeId,
        name: name,
        persons: []
    };
    
    fetch(`${API_BASE}/trees/${treeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTree)
    }).then(() => {
        loadTrees();
    });
}

async function exportCurrentTree() {
    if (!currentTreeId) return;
    
    try {
        const response = await fetch(`${API_BASE}/trees/${currentTreeId}/export`);
        const data = await response.json();
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentTreeId}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting tree:', error);
    }
}

function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const treeData = JSON.parse(event.target.result);
            const treeId = treeData.id || `imported_${Date.now()}`;
            
            const response = await fetch(`${API_BASE}/trees/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...treeData, tree_id: treeId })
            });
            
            const result = await response.json();
            
            if (Object.keys(result.intersections).length > 0) {
                let message = 'Found potential intersections:\n';
                Object.keys(result.intersections).forEach(treeId => {
                    message += `\n${treeId}: ${result.intersections[treeId].length} matches`;
                });
                alert(message);
            }
            
            loadTrees();
        } catch (error) {
            console.error('Error importing tree:', error);
            alert('Error importing tree');
        }
    };
    reader.readAsText(file);
}

function toggleEventsTimeline(e) {
    showEventsTimeline = e.target.checked;
    renderTimelines();
}

function toggleBirthdayTimeline(e) {
    showBirthdayTimeline = e.target.checked;
    renderTimelines();
}

function renderTimelines() {
    // Remove existing timelines
    g.selectAll('.timeline-container').remove();
    
    if (!showEventsTimeline && !showBirthdayTimeline) return;
    
    const timelineContainer = g.append('g').attr('class', 'timeline-container');
    
    if (showEventsTimeline) {
        renderEventsTimeline(timelineContainer);
    }
    
    if (showBirthdayTimeline) {
        renderBirthdayTimeline(timelineContainer);
    }
}

function renderEventsTimeline(container) {
    if (!currentTree || !currentTree.persons) return;
    
    const minYear = Math.min(...currentTree.persons.map(p => getYear(p.birthDate) || 2000));
    
    const eventsGroup = container.append('g').attr('class', 'events-timeline');
    
    timelineEvents.forEach(event => {
        const y = (event.year - minYear) * 20;
        
        const eventGroup = eventsGroup.append('g')
            .attr('transform', `translate(50, ${y})`);
        
        eventGroup.append('circle')
            .attr('r', 5)
            .attr('fill', '#e74c3c');
        
        eventGroup.append('text')
            .attr('x', 10)
            .attr('y', 5)
            .attr('font-size', '12px')
            .attr('fill', '#2c3e50')
            .text(`${event.year}: ${event.event}`);
    });
}

function renderBirthdayTimeline(container) {
    if (!currentTree || !currentTree.persons) return;
    
    const currentYear = new Date().getFullYear();
    const minYear = Math.min(...currentTree.persons.map(p => getYear(p.birthDate) || 2000));
    
    // Calculate birthdays for current year
    const birthdays = currentTree.persons
        .filter(p => p.birthDate)
        .map(person => {
            const birthYear = getYear(person.birthDate);
            const age = currentYear - birthYear;
            const birthDate = new Date(person.birthDate);
            const dayOfYear = Math.floor((birthDate - new Date(birthYear, 0, 0)) / (1000 * 60 * 60 * 24));
            
            return {
                person: person,
                age: age,
                dayOfYear: dayOfYear,
                isMilestone: age % 5 === 0 && age > 0
            };
        })
        .sort((a, b) => a.dayOfYear - b.dayOfYear);
    
    const birthdaysGroup = container.append('g').attr('class', 'birthdays-timeline');
    
    birthdays.forEach((birthday, index) => {
        const x = 50 + (index % 10) * 150;
        const y = (currentYear - minYear) * 20 + Math.floor(index / 10) * 30;
        
        const birthdayGroup = birthdaysGroup.append('g')
            .attr('transform', `translate(${x}, ${y})`);
        
        birthdayGroup.append('circle')
            .attr('r', birthday.isMilestone ? 6 : 4)
            .attr('fill', birthday.isMilestone ? '#f39c12' : '#3498db');
        
        birthdayGroup.append('text')
            .attr('x', 10)
            .attr('y', 5)
            .attr('font-size', birthday.isMilestone ? '13px' : '11px')
            .attr('font-weight', birthday.isMilestone ? 'bold' : 'normal')
            .attr('fill', birthday.isMilestone ? '#e67e22' : '#2c3e50')
            .text(`${birthday.person.name}: ${birthday.age} years`);
    });
}

// Utility functions
function getYear(dateString) {
    if (!dateString) return null;
    return new Date(dateString).getFullYear();
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

