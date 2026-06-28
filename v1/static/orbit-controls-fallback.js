// Simple OrbitControls fallback if the CDN version doesn't load
// This is a minimal implementation for basic camera control

(function() {
    'use strict';
    
    // Wait a bit to see if OrbitControls loads from CDN
    setTimeout(function() {
        if (typeof THREE !== 'undefined' && typeof THREE.OrbitControls === 'undefined' && typeof OrbitControls === 'undefined') {
            console.log('OrbitControls not found, creating minimal fallback');
            
            // Minimal OrbitControls implementation
            THREE.OrbitControls = function(camera, domElement) {
                this.camera = camera;
                this.domElement = domElement;
                this.enableDamping = false;
                this.dampingFactor = 0.05;
                this.minDistance = 10;
                this.maxDistance = 1000;
                this.autoRotate = false;
                this.target = new THREE.Vector3();
                this.maxPolarAngle = Math.PI;
                
                let isDragging = false;
                let previousMousePosition = { x: 0, y: 0 };
                let spherical = new THREE.Spherical();
                let sphericalDelta = new THREE.Spherical();
                
                // Update spherical coordinates from camera
                function updateSpherical() {
                    const offset = new THREE.Vector3();
                    offset.copy(camera.position).sub(this.target);
                    spherical.setFromVector3(offset);
                }
                
                updateSpherical.call(this);
                
                const onMouseDown = (e) => {
                    isDragging = true;
                    previousMousePosition = { x: e.clientX, y: e.clientY };
                };
                
                const onMouseMove = (e) => {
                    if (isDragging) {
                        const deltaX = e.clientX - previousMousePosition.x;
                        const deltaY = e.clientY - previousMousePosition.y;
                        
                        sphericalDelta.theta -= deltaX * 0.01;
                        sphericalDelta.phi -= deltaY * 0.01;
                        sphericalDelta.phi = Math.max(0.1, Math.min(Math.PI - 0.1, sphericalDelta.phi));
                        
                        spherical.theta += sphericalDelta.theta;
                        spherical.phi += sphericalDelta.phi;
                        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
                        
                        const offset = new THREE.Vector3();
                        offset.setFromSpherical(spherical);
                        offset.add(this.target);
                        camera.position.copy(offset);
                        camera.lookAt(this.target);
                        
                        previousMousePosition = { x: e.clientX, y: e.clientY };
                        sphericalDelta.set(0, 0, 0);
                    }
                };
                
                const onMouseUp = () => {
                    isDragging = false;
                };
                
                const onWheel = (e) => {
                    e.preventDefault();
                    const scale = 1 + e.deltaY * 0.001;
                    const distance = camera.position.distanceTo(this.target);
                    const newDistance = Math.max(this.minDistance, Math.min(this.maxDistance, distance * scale));
                    const direction = new THREE.Vector3().subVectors(camera.position, this.target).normalize();
                    camera.position.copy(this.target).add(direction.multiplyScalar(newDistance));
                };
                
                domElement.addEventListener('mousedown', onMouseDown);
                domElement.addEventListener('mousemove', onMouseMove);
                domElement.addEventListener('mouseup', onMouseUp);
                domElement.addEventListener('wheel', onWheel);
                
                this.update = function() {
                    // Damping would go here if needed
                };
                
                this.dispose = function() {
                    domElement.removeEventListener('mousedown', onMouseDown);
                    domElement.removeEventListener('mousemove', onMouseMove);
                    domElement.removeEventListener('mouseup', onMouseUp);
                    domElement.removeEventListener('wheel', onWheel);
                };
            };
            
            console.log('Minimal OrbitControls fallback created');
        }
    }, 2000);
})();


