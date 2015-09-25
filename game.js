var BACKGROUND_COLOR = 0x0066aa;
var PACMAN_SPEED = 2;
var CAMERA_MOVE_SPEED = 2, CAMERA_ROTATE_SPEED = 1;
var PLANE_OFFSET = 0.01;

var renderer, scene, camera;
var blockGeometry, blockMaterial;
var pacmanGeometry, pacmanMaterial;
var spriteMaterial;

var grid, pacman, pacmanPlane, pacmanSlideUpPlane, pacmanSlideDownPlane;
var tempVector = new THREE.Vector3();
var turn = null;

function init() {
    initCore();

    initResources();

    initEvents();

    pacmanPlane = new THREE.Mesh(pacmanGeometry, pacmanMaterial[0]);
    pacmanSlideUpPlane = new THREE.Mesh(pacmanGeometry, pacmanMaterial[1]);
    pacmanSlideDownPlane = new THREE.Mesh(pacmanGeometry, pacmanMaterial[2]);
    // Make hidden by default.
    pacmanSlideUpPlane.material.map.offset.x = 1;
    pacmanSlideDownPlane.material.map.offset.x = 1;

    pacman = new THREE.Object3D();
    pacman.faceNormal = new THREE.Vector3(0, 1, 0);
    pacman.direction = new THREE.Vector3(1, 0, 0);
    pacman.slidePosition = 0;
    pacman.position.set(0, 2, 0);

    pacman.add(pacmanPlane);
    pacman.add(pacmanSlideDownPlane);
    pacman.add(pacmanSlideUpPlane);
    scene.add(pacman);

    createGrid();

    render();
}

// Create the renderer, scene, camera, and main lighting.
function initCore() {
    // Create renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(BACKGROUND_COLOR, 1.0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Create scene
    scene = new THREE.Scene();
    scene.add(new THREE.AxisHelper(100));

    // Create camera
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 0);
    camera.lookAt(scene.position);

    // Create main light
    //var light = new THREE.DirectionalLight('white', 1.0);
    var light = new THREE.DirectionalLight('white', 0.5);
    light.position.set(50, 100, 50);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x888888));
}

function initResources() {
    blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    blockMaterial = new THREE.MeshLambertMaterial({color: 0x000088});
    /*blockMaterial.transparent = true;
    blockMaterial.opacity = 0;*/

    pacmanGeometry = new THREE.PlaneGeometry(1, 1);
    // Make copies of the pacman material so that each surface can have
    // different texture offsets in order to implement sliding effect.
    pacmanMaterial = [];
    for (var i = 0; i < 3; i++) {
        pacmanMaterial[i] = new THREE.MeshBasicMaterial({map: THREE.ImageUtils.loadTexture('pacman.png')});
        pacmanMaterial[i].transparent = true;
        pacmanMaterial[i].side = THREE.DoubleSide;
        // Because THREE.WebGLRenderer warning told me to (due to non-power-of-two texture).
        pacmanMaterial[i].map.minFilter = THREE.LinearFilter;
        // Make pacman texture hard-pixeled instead of fuzzy.
        pacmanMaterial[i].map.magFilter = THREE.NearestFilter;
    }
}

function initEvents() {
    document.body.addEventListener('keydown', function (event) {
        // Left arrow.
        if (event.keyCode == '37') {
            //pacman.direction.applyAxisAngle(pacman.faceNormal, Math.PI / 2);
            turn = 'left';
        }
        // Right arrow.
        if (event.keyCode == '39') {
            //pacman.direction.applyAxisAngle(pacman.faceNormal, -Math.PI / 2);
            turn = 'right';
        }
    });
}

function addBlock(x, y, z) {
    var block = new THREE.Mesh(blockGeometry, blockMaterial);
    block.position.set(x, y, z);
    scene.add(block);

    var edges = new THREE.EdgesHelper(block, 0x000000);
    scene.add(edges);

    return block;
}

function createGrid() {
    grid = {};

    var remove = [
        [0, 2, 2],
        [0, 0, 2],
        [0, 1, 2]
    ];

    // Create cube made up of cubes.
    var size = 2;
    for (var x = -size; x <= size; x++) {
        grid[x] = {};

        for (var y = -size; y <= size; y++) {
            grid[x][y] = {};

            for (var z = -size; z <= size; z++) {
                var skip = false;
                for (var i = 0; i < remove.length; i++) {
                    if (remove[i][0] === x && remove[i][1] === y && remove[i][2] === z) {
                        skip = true;
                        break;
                    }
                }
                if (skip) continue;

                grid[x][y][z] = addBlock(x, y, z);
            }
        }
    }

    grid.xMin = -size; grid.xMax = size;
    grid.yMin = -size; grid.yMax = size;
    grid.zMin = -size; grid.zMax = size;
}

var lastRenderTime = 0;
function render() {
    var delta = (window.performance.now() - lastRenderTime) / 1000;
    lastRenderTime = window.performance.now();

    var currentBlock = getBlock(pacman.position);
    if (!currentBlock) {
        // TODO: Recover from error by moving pacman to position of outermost
        // block underneath pacman's face normal.
        alert('Error: No block.');
        return;
    }

    // Move pacman.
    var previousBlock = getBlock(tempVector.copy(pacman.position).addScaledVector(pacman.direction, 0.5));
    pacman.translateOnAxis(pacman.direction, PACMAN_SPEED * 1/60);
    var nextBlock = getBlock(tempVector.copy(pacman.position).addScaledVector(pacman.direction, 0.5));
    var nextBlockAbove = getBlock(tempVector.copy(pacman.position).add(pacman.faceNormal).addScaledVector(pacman.direction, 0.5));

    // Turn if the user has pressed a turn key and we're about to go into a new cube.
    // If pacman is sliding between faces, wait until the sliding is done to turn.
    if (turn && pacman.slidePosition === 0 && nextBlock !== previousBlock) {
        // Snap to cube.
        pacman.position.copy(currentBlock.position);

        if (turn === 'left') {
            pacman.direction.applyAxisAngle(pacman.faceNormal, Math.PI / 2);
        } else if (turn === 'right') {
            pacman.direction.applyAxisAngle(pacman.faceNormal, -Math.PI / 2);
        }

        turn = null;
        pacman.slidePosition = 0;
    }

    // Change direction of pacman block when there are no more blocks for it to slide along.
    if (nextBlockAbove) {
        pacman.position.copy(currentBlock.position);

        if (pacman.slidePosition > 1) {
            // Move to block above when done sliding up.
            pacman.position.copy(nextBlockAbove.position);

            var newDirection = pacman.faceNormal.clone();
            var newFaceNormal = pacman.direction.clone().negate();
            pacman.direction.copy(newDirection);
            pacman.faceNormal.copy(newFaceNormal);

            pacman.translateOnAxis(pacman.direction, pacman.slidePosition - 1);
            pacman.slidePosition = 0;

            // Apply any turns only after sliding is done.
            if (turn) {
                if (turn === 'left') {
                    pacman.direction.applyAxisAngle(pacman.faceNormal, Math.PI / 2);
                } else if (turn === 'right') {
                    pacman.direction.applyAxisAngle(pacman.faceNormal, -Math.PI / 2);
                }
                turn = null;
            }
        } else {
            pacman.slidePosition += PACMAN_SPEED * 1/60;
        }

        // Create slide effect by changing texture offsets.
        pacmanPlane.material.map.offset.x = -pacman.slidePosition;
        pacmanSlideUpPlane.material.map.offset.x = 1 - pacman.slidePosition;
    } else if (!nextBlock) {
        // Snap to the current block while sliding.
        pacman.position.copy(currentBlock.position);

        // Sliding is done when we've slided one full block width;
        if (pacman.slidePosition > 1) {
            // Slide down
            var newDirection = pacman.faceNormal.clone().negate();
            var newFaceNormal = pacman.direction.clone();
            pacman.direction.copy(newDirection);
            pacman.faceNormal.copy(newFaceNormal);

            pacman.translateOnAxis(pacman.direction, pacman.slidePosition - 1);
            pacman.slidePosition = 0;

            // Apply any turns only after sliding is done.
            if (turn) {
                if (turn === 'left') {
                    pacman.direction.applyAxisAngle(pacman.faceNormal, Math.PI / 2);
                } else if (turn === 'right') {
                    pacman.direction.applyAxisAngle(pacman.faceNormal, -Math.PI / 2);
                }
                turn = null;
            }
        } else {
            pacman.slidePosition += PACMAN_SPEED * 1/60;
        }

        // Create slide effect by changing texture offsets.
        pacmanPlane.material.map.offset.x = -pacman.slidePosition;
        pacmanSlideDownPlane.material.map.offset.x = 1 - pacman.slidePosition;
    }

    // Rotate pacman plane so that pacman's mouth (the plane's positive x axis)
    // faces in the direction of pacman.direction and the plane's normal faces
    // in the direction of pacman.faceNormal.
    pacmanPlane.up.copy(pacman.direction).applyAxisAngle(pacman.faceNormal, Math.PI / 2);
    // Move plane to just above surface of cubes.
    pacmanPlane.position.copy(pacman.faceNormal).multiplyScalar(0.5 + PLANE_OFFSET).addScaledVector(pacman.direction, PLANE_OFFSET);
    pacmanPlane.lookAt(pacmanPlane.position.clone().add(pacman.faceNormal));

    // Move just above the face of the cube in the direction of pacman.direction.
    var slideDownDirection = pacman.faceNormal.clone().negate();
    var slideDownFaceNormal = pacman.direction.clone();
    pacmanSlideDownPlane.up.copy(slideDownDirection).applyAxisAngle(slideDownFaceNormal, Math.PI / 2);
    pacmanSlideDownPlane.position.copy(slideDownFaceNormal).multiplyScalar(0.5 + PLANE_OFFSET).addScaledVector(pacman.faceNormal, PLANE_OFFSET);
    pacmanSlideDownPlane.lookAt(pacmanSlideDownPlane.position.clone().add(slideDownFaceNormal));

    // Move just above the face of the cube forward and above the current position.
    var slideUpDirection = pacman.faceNormal.clone();
    var slideUpFaceNormal = pacman.direction.clone().negate();
    pacmanSlideUpPlane.up.copy(slideUpDirection).applyAxisAngle(slideUpFaceNormal, Math.PI / 2);
    pacmanSlideUpPlane.position.copy(pacman.direction).multiplyScalar(0.5 - PLANE_OFFSET).addScaledVector(pacman.faceNormal, 1);
    pacmanSlideUpPlane.lookAt(pacmanSlideUpPlane.position.clone().add(slideUpFaceNormal));

    // Position camera to point at pacman. Look at an angle if pacman is currently sliding between sides.
    var nextFaceNormal, nextDirection, pacmanTexturePosition;
    if (nextBlockAbove) {
        // Sliding up
        nextFaceNormal = pacman.direction.clone().negate();
        nextDirection = pacman.faceNormal.clone();
        // Center of texture, after taking the sliding into account.
        pacmanTexturePosition = pacman.position.clone().addScaledVector(pacman.direction, Math.min(pacman.slidePosition, 0.5)).addScaledVector(pacman.faceNormal, 0.5 + Math.max(0, pacman.slidePosition - 0.5));
    } else {
        // Sliding down
        nextFaceNormal = pacman.direction.clone();
        nextDirection = pacman.faceNormal.clone().negate();
        // Center of texture, after taking the sliding into account.
        pacmanTexturePosition = pacman.position.clone().addScaledVector(pacman.direction, Math.min(pacman.slidePosition, 0.5)).addScaledVector(pacman.faceNormal, 0.5 - Math.max(0, pacman.slidePosition - 0.5));
    }

    var faceNormalOffset = new THREE.Vector3().lerpVectors(pacman.faceNormal, nextFaceNormal, pacman.slidePosition).normalize();
    tempVector.crossVectors(pacman.faceNormal, pacman.direction);
    var directionOffset = new THREE.Vector3().lerpVectors(pacman.direction, nextDirection, pacman.slidePosition).normalize();
    var targetPosition = pacman.position.clone().addScaledVector(faceNormalOffset, 5).addScaledVector(directionOffset, 5);

    // Smoothly move camera to the target position.
    var difference = targetPosition.clone().sub(camera.position);
    camera.position.addScaledVector(difference, CAMERA_MOVE_SPEED * 1/60);
    // Make sure camera is a constant distance away from pacman.
    difference = camera.position.clone().sub(pacman.position).normalize();
    camera.position.copy(pacman.position).addScaledVector(difference, 7);

    // Rotate camera. Smoothly move the up direction of the camera so that pacman is facing towards the right in the view.
    difference.copy(camera.up).sub(directionOffset.applyAxisAngle(camera.getWorldDirection(), Math.PI / 2));
    camera.up.addScaledVector(difference, CAMERA_ROTATE_SPEED * 1/60).normalize();
    camera.lookAt(pacmanTexturePosition);

    requestAnimationFrame(render);
    renderer.render(scene, camera);
}

function getBlock(position) {
    var x = Math.round(position.x);
    var y = Math.round(position.y);
    var z = Math.round(position.z);

    return grid[x] && grid[x][y] && grid[x][y][z];
}

function interpolate(low, high, interpolationFactor) {
    return low + (high - low) * interpolationFactor;
}
