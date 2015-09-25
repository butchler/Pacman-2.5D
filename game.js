var BACKGROUND_COLOR = 0x0066aa;
var PACMAN_SPEED = 2;

var renderer, scene, camera;
var blockGeometry, blockMaterial;
var pacmanGeometry, pacmanMaterial;
var spriteMaterial;

var grid, pacman, pacmanBox;
var tempVector = new THREE.Vector3();
var turn = null;

function init() {
    initCore();

    initResources();

    initEvents();

    pacmanBox = new THREE.Mesh(pacmanGeometry, pacmanMaterial);
    pacmanBox.rotateY(Math.PI / 2);
    pacman = new THREE.Object3D();
    pacman.faceNormal = new THREE.Vector3(0, 1, 0);
    pacman.direction = new THREE.Vector3(1, 0, 0);
    pacman.slidePosition = 0;
    pacman.position.set(0, 2, 0);

    pacman.add(pacmanBox);
    scene.add(pacman);

    //scene.add(new THREE.EdgesHelper(pacmanBox, 0xff0000));

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
    //scene.add(new THREE.AxisHelper(100));

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
    //blockMaterial.transparent = true; blockMaterial.opacity = 0;
    //pacmanGeometry = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    pacmanGeometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    //pacmanMaterial = new THREE.MeshBasicMaterial({map: THREE.ImageUtils.loadTexture('F-sprite.png')});
    pacmanMaterial = new THREE.MeshBasicMaterial({map: THREE.ImageUtils.loadTexture('pacman.png')});
    pacmanMaterial.transparent = true;
    pacmanMaterial.side = THREE.DoubleSide;
    // Because THREE.WebGLRenderer warning told me to.
    pacmanMaterial.map.minFilter = THREE.LinearFilter;
    pacmanMaterial.map.magFilter = THREE.NearestFilter;

    // Make only the top-facing (positive y facing) face of the cube be texture mapped.
    var zero = new THREE.Vector2(0, 0);
    for (var i = 0; i < pacmanGeometry.faceVertexUvs[0].length; i++) {
        pacmanGeometry.faceVertexUvs[0][i] = [zero.clone(), zero.clone(), zero.clone()];
    }
    // Positive y face.
    //var x = -0.5, y = 0.5;
    var x = 0, y = 0;
    var topLeft = new THREE.Vector2(-x, 1 - y);
    var bottomLeft = new THREE.Vector2(-x, -y);
    var bottomRight = new THREE.Vector2(1 - x, -y);
    var topRight = new THREE.Vector2(1 - x, 1 - y);
    pacmanGeometry.faceVertexUvs[0][4] = [topLeft, bottomLeft, topRight];
    pacmanGeometry.faceVertexUvs[0][5] = [bottomLeft.clone(), bottomRight, topRight.clone()];

    //var b = grid[2][2][2];
    /*var b = grid[-2][2][-2];
    b.material = spriteMaterial;

    // Make only the top-facing (positive y facing) face of the cube be texture mapped.
    var zero = new THREE.Vector2(0, 0);
    for (var i = 0; i < b.geometry.faceVertexUvs[0].length; i++) {
        b.geometry.faceVertexUvs[0][i] = [zero, zero, zero];
    }

    // Positive y face.
    //var x = 0.5, y = -0.5;
    var x = -0.5, y = 0.5;
    var topLeft = new THREE.Vector2(-x, 1 - y);
    var bottomLeft = new THREE.Vector2(-x, -y);
    var bottomRight = new THREE.Vector2(1 - x, -y);
    var topRight = new THREE.Vector2(1 - x, 1 - y);
    b.geometry.faceVertexUvs[0][4] = [topLeft, bottomLeft, topRight];
    b.geometry.faceVertexUvs[0][5] = [bottomLeft.clone(), bottomRight, topRight.clone()];

    //Positive x face.
    topLeft = new THREE.Vector2(1 - x, 1 - y);
    bottomLeft = new THREE.Vector2(1 - x, -y);
    bottomRight = new THREE.Vector2(2 - x, -y);
    topRight = new THREE.Vector2(2 - x, 1 - y);
    b.geometry.faceVertexUvs[0][0] = [bottomLeft, bottomRight, topLeft];
    b.geometry.faceVertexUvs[0][1] = [bottomRight.clone(), topRight, topLeft.clone()];

    // Positive z face.
    topLeft = new THREE.Vector2(-x, -y);
    bottomLeft = new THREE.Vector2(-x, -y - 1);
    bottomRight = new THREE.Vector2(1 - x, -y - 1);
    topRight = new THREE.Vector2(1 - x, -y);
    b.geometry.faceVertexUvs[0][8] = [topLeft, bottomLeft, topRight];
    b.geometry.faceVertexUvs[0][9] = [bottomLeft.clone(), bottomRight, topRight.clone()];

    b.geometry.uvsNeedUpdate = true;*/
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

    // Create cube made up of cubes.
    var size = 2;
    for (var x = -size; x <= size; x++) {
        grid[x] = {};

        for (var y = -size; y <= size; y++) {
            grid[x][y] = {};

            for (var z = -size; z <= size; z++) {
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
    if (!nextBlock) {
        // Snap to the current block along axis that pacman is moving, so that
        // it doesn't move off edge of grid.
        if (Math.abs(pacman.direction.x) === 1) pacman.position.x = currentBlock.position.x;
        if (Math.abs(pacman.direction.y) === 1) pacman.position.y = currentBlock.position.y;
        if (Math.abs(pacman.direction.z) === 1) pacman.position.z = currentBlock.position.z;

        // Sliding is done when we've slided one full block width;
        if (pacman.slidePosition > 1) {
            // Rotate pacman's direction 90 degrees around the cross product of the
            // current direction and the face normal. This makes it so that the new
            // face normal should be the previous direction vector.
            tempVector.crossVectors(pacman.faceNormal, pacman.direction);
            pacman.faceNormal.copy(pacman.direction);
            pacman.direction.applyAxisAngle(tempVector, Math.PI / 2);

            // Even though direction and face normal should only contain 0 and 1
            // components, sometimes floating point error is introduced, so round
            // the components to make sure that they are clean unit vectors.
            pacman.direction.round();
            pacman.faceNormal.round();

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

        // Update UV mapping to make it look like texture is sliding from one
        // face of the cube to the other.

        // Positive y face.
        var textureOffset = pacman.slidePosition;
        var topLeft     = new THREE.Vector2(-textureOffset,    1);
        var bottomLeft  = new THREE.Vector2(-textureOffset,    0);
        var bottomRight = new THREE.Vector2(1 - textureOffset, 0);
        var topRight    = new THREE.Vector2(1 - textureOffset, 1);
        pacmanGeometry.faceVertexUvs[0][4][0].copy(topLeft);
        pacmanGeometry.faceVertexUvs[0][4][1].copy(bottomLeft);
        pacmanGeometry.faceVertexUvs[0][4][2].copy(topRight);
        pacmanGeometry.faceVertexUvs[0][5][0].copy(bottomLeft);
        pacmanGeometry.faceVertexUvs[0][5][1].copy(bottomRight);
        pacmanGeometry.faceVertexUvs[0][5][2].copy(topRight);

        // Positive x face. Rotate texture counter clockwise so that it is in
        // the same direction as the positive y face.
        textureOffset = pacman.slidePosition - 1;
        topLeft     = new THREE.Vector2(-textureOffset,    0);
        bottomLeft  = new THREE.Vector2(1 - textureOffset, 0);
        bottomRight = new THREE.Vector2(1 - textureOffset, 1);
        topRight    = new THREE.Vector2(-textureOffset,    1);
        pacmanGeometry.faceVertexUvs[0][0][0].copy(topLeft);
        pacmanGeometry.faceVertexUvs[0][0][1].copy(bottomLeft);
        pacmanGeometry.faceVertexUvs[0][0][2].copy(topRight);
        pacmanGeometry.faceVertexUvs[0][1][0].copy(bottomLeft);
        pacmanGeometry.faceVertexUvs[0][1][1].copy(bottomRight);
        pacmanGeometry.faceVertexUvs[0][1][2].copy(topRight);

        pacmanGeometry.uvsNeedUpdate = true;
    }

    // Rotate cube so that the positive y face points in the direction of
    // pacman.faceNormal and the positive x face points in the direction of
    // pacman.direction.
    var m = new THREE.Matrix4();
    m.makeBasis(pacman.direction, pacman.faceNormal, tempVector.crossVectors(pacman.direction, pacman.faceNormal));
    pacmanBox.quaternion.setFromRotationMatrix(m);

    // Position camera to point at pacman. Look at an angle if pacman is currently sliding between sides.
    var nextFaceNormal = pacman.direction;
    var faceNormalOffset = new THREE.Vector3().lerpVectors(pacman.faceNormal, nextFaceNormal, pacman.slidePosition).normalize();
    tempVector.crossVectors(pacman.faceNormal, pacman.direction);
    var nextDirection = pacman.direction.clone().applyAxisAngle(tempVector, Math.PI / 2).round();
    var directionOffset = new THREE.Vector3().lerpVectors(pacman.direction, nextDirection, pacman.slidePosition).normalize();
    var targetPosition = pacman.position.clone().addScaledVector(faceNormalOffset, 7).addScaledVector(directionOffset, 3);

    // Smoothly move camera to the target position.
    var difference = targetPosition.clone().sub(camera.position);
    camera.position.addScaledVector(difference, 2 * 1/60);
    // Make sure camera is a constant distance away from pacman.
    difference = camera.position.clone().sub(pacman.position).normalize();
    camera.position.copy(pacman.position).addScaledVector(difference, 7);

    // Rotate camera. Smoothly move the up direction of the camera so that pacman is facing towards the right in the view.
    difference.copy(camera.up).sub(directionOffset.applyAxisAngle(camera.getWorldDirection(), Math.PI / 2));
    camera.up.addScaledVector(difference, 1 * 1/60).normalize();
    camera.lookAt(pacman.position);

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
