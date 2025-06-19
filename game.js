// Game variables
let scene, camera, renderer;
let player, enemies = [], bullets = [], enemyBullets = [];
let walls = [];
let spawnPoints = [];
let lamps = [];
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let canJump = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let health = 100;
let score = 0;
let gameRunning = false;
let clock = new THREE.Clock();
let lastShot = 0;
let lastEnemyShot = {};
let lastSpawnTime = {};
let cameraPitch = 0; // Store camera pitch separately
let minimapCanvas, minimapCtx; // Minimap variables

// Audio variables
let audioContext;
let backgroundMusic;
let backgroundAudio; // HTML5 Audio element for MP3
let sounds = {};
let lastFootstep = 0;
let lastGrowl = {};

// Level generation variables
let levelGrid = [];
let gridSize = 50;
let cellSize = 2;
let levelSeed = Math.floor(Math.random() * 1000000);
let seedString = "";

// Initialize the game
function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 0, 100);

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 5);
    camera.rotation.order = 'YXZ'; // Important for FPS camera

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x202020); // Darker ambient
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5); // Dimmer directional
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);

    // Create player (invisible in first person)
    const playerGeometry = new THREE.BoxGeometry(0.8, 1.6, 0.8);
    const playerMaterial = new THREE.MeshBasicMaterial({ visible: false });
    player = new THREE.Mesh(playerGeometry, playerMaterial);
    scene.add(player);

    // Generate level and create spawn points
    const levelData = generateLevel();
    createSpawnPointsFromData(levelData.spawnPoints);
    createLamps();
    
    // Don't create initial enemies - they'll spawn from spawn points

    // Event listeners
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Pointer lock
    renderer.domElement.addEventListener('click', () => {
        if (gameRunning && document.pointerLockElement !== renderer.domElement) {
            renderer.domElement.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === renderer.domElement) {
            document.addEventListener('mousemove', onPointerMove);
            document.addEventListener('click', onMouseClick);
        } else {
            document.removeEventListener('mousemove', onPointerMove);
            document.removeEventListener('click', onMouseClick);
        }
    });

    // Window resize
    window.addEventListener('resize', onWindowResize);
    
    // Initialize minimap
    minimapCanvas = document.getElementById('minimap');
    minimapCtx = minimapCanvas.getContext('2d');
    
    // Initialize audio
    initAudio();
}

// Audio System
function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        createSounds();
        loadBackgroundMusic();
    } catch (e) {
        console.log('Web Audio API not supported');
    }
}

function loadBackgroundMusic() {
    // Create HTML5 Audio element for MP3 background music
    backgroundAudio = new Audio();
    backgroundAudio.src = 'assets/video-game-boss-fiight-259885.mp3';
    backgroundAudio.loop = true;
    backgroundAudio.volume = 0.4; // Good volume for boss fight music
    
    backgroundAudio.addEventListener('canplaythrough', () => {
        console.log('Background music loaded: video-game-boss-fiight-259885.mp3');
    }, { once: true });
    
    backgroundAudio.addEventListener('error', () => {
        console.log('MP3 background music failed to load, using generated audio');
        // Fall back to generated music
        createBackgroundMusic();
    }, { once: true });
}

function createSounds() {
    // Create shooting sound
    sounds.shoot = createShootSound();
    sounds.enemyHit = createHitSound();
    sounds.enemyDeath = createDeathSound();
    sounds.monsterGrowl = createGrowlSound();
    sounds.playerHit = createPlayerHitSound();
    sounds.spawnDestroy = createExplosionSound();
    sounds.footstep = createFootstepSound();
}

function createShootSound() {
    return function() {
        if (!audioContext) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Sharp, quick laser-like sound
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.type = 'square';
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    };
}

function createHitSound() {
    return function() {
        if (!audioContext) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.type = 'square';
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    };
}

function createDeathSound() {
    return function() {
        if (!audioContext) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.8);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.8);
        
        gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
        
        oscillator.type = 'sawtooth';
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.8);
    };
}

function createGrowlSound() {
    return function() {
        if (!audioContext) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Low, menacing growl
        oscillator.frequency.setValueAtTime(80 + Math.random() * 40, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(60 + Math.random() * 30, audioContext.currentTime + 0.5);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.0);
        
        oscillator.type = 'sawtooth';
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 1.0);
    };
}

function createPlayerHitSound() {
    return function() {
        if (!audioContext) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.type = 'triangle';
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    };
}

function createExplosionSound() {
    return function() {
        if (!audioContext) return;
        
        // White noise explosion
        const bufferSize = audioContext.sampleRate * 0.5;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        
        const whiteNoise = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        whiteNoise.buffer = buffer;
        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        whiteNoise.start(audioContext.currentTime);
        whiteNoise.stop(audioContext.currentTime + 0.5);
    };
}

function createFootstepSound() {
    return function() {
        if (!audioContext) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(50 + Math.random() * 50, audioContext.currentTime);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.type = 'square';
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    };
}

function createBackgroundMusic() {
    if (!audioContext) return;
    
    // Dark ambient background music
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode1 = audioContext.createGain();
    const gainNode2 = audioContext.createGain();
    const masterGain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    
    oscillator1.connect(gainNode1);
    oscillator2.connect(gainNode2);
    gainNode1.connect(filter);
    gainNode2.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(audioContext.destination);
    
    // Low drone frequencies
    oscillator1.frequency.setValueAtTime(55, audioContext.currentTime); // A1
    oscillator2.frequency.setValueAtTime(82.4, audioContext.currentTime); // E2
    
    oscillator1.type = 'sawtooth';
    oscillator2.type = 'triangle';
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, audioContext.currentTime);
    filter.Q.setValueAtTime(1, audioContext.currentTime);
    
    gainNode1.gain.setValueAtTime(0.05, audioContext.currentTime);
    gainNode2.gain.setValueAtTime(0.03, audioContext.currentTime);
    masterGain.gain.setValueAtTime(0, audioContext.currentTime);
    
    backgroundMusic = {
        oscillators: [oscillator1, oscillator2],
        masterGain: masterGain,
        filter: filter
    };
}

function startBackgroundMusic() {
    // Try to play MP3 first
    if (backgroundAudio) {
        backgroundAudio.currentTime = 0;
        const playPromise = backgroundAudio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('Background music started');
            }).catch(error => {
                console.log('MP3 background music failed, using generated audio');
                startGeneratedMusic();
            });
        }
    } else {
        // Fall back to generated music
        startGeneratedMusic();
    }
}

function startGeneratedMusic() {
    if (!backgroundMusic || !audioContext) return;
    
    backgroundMusic.oscillators.forEach(osc => osc.start());
    backgroundMusic.masterGain.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 2);
    
    // Add some variation to the music
    setInterval(() => {
        if (gameRunning && backgroundMusic) {
            const variation = Math.random() * 0.1 - 0.05;
            backgroundMusic.filter.frequency.setValueAtTime(
                400 + variation * 100, 
                audioContext.currentTime
            );
        }
    }, 5000);
}

function stopBackgroundMusic() {
    // Stop MP3 if playing
    if (backgroundAudio) {
        backgroundAudio.pause();
        backgroundAudio.currentTime = 0;
    }
    
    // Stop generated music if playing
    if (backgroundMusic && audioContext) {
        backgroundMusic.masterGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1);
    }
}

// String to seed hash function
function hashStringToSeed(str) {
    if (!str || str.trim() === '') {
        return Math.floor(Math.random() * 1000000);
    }
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Ensure positive number and reasonable range
    return Math.abs(hash) % 1000000;
}

// Seeded random number generator
function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// Level generation system
function generateLevel() {
    console.log(`Generating level with seed: ${levelSeed}`);
    
    // Initialize grid (0 = empty, 1 = wall, 2 = player start, 3 = spawn point)
    levelGrid = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
    
    // Create border walls
    for (let x = 0; x < gridSize; x++) {
        for (let z = 0; z < gridSize; z++) {
            if (x === 0 || x === gridSize - 1 || z === 0 || z === gridSize - 1) {
                levelGrid[x][z] = 1;
            }
        }
    }
    
    // Generate rooms and corridors
    generateRoomsAndCorridors();
    
    // Place player start (center of grid)
    const playerStartX = Math.floor(gridSize / 2);
    const playerStartZ = Math.floor(gridSize / 2);
    levelGrid[playerStartX][playerStartZ] = 2;
    
    // Clear area around player start
    for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
            const x = playerStartX + dx;
            const z = playerStartZ + dz;
            if (x >= 0 && x < gridSize && z >= 0 && z < gridSize) {
                if (levelGrid[x][z] === 1) levelGrid[x][z] = 0;
            }
        }
    }
    
    // Generate spawn points with reachability check
    const spawnPoints = generateReachableSpawnPoints(playerStartX, playerStartZ);
    
    // Build the 3D level
    buildLevelGeometry(spawnPoints);
    
    return { playerStart: { x: playerStartX, z: playerStartZ }, spawnPoints };
}

function generateRoomsAndCorridors() {
    let seed = levelSeed;
    
    // Generate random rooms
    const numRooms = 8 + Math.floor(seededRandom(seed++) * 8);
    const rooms = [];
    
    for (let i = 0; i < numRooms; i++) {
        let attempts = 0;
        while (attempts < 50) {
            const width = 4 + Math.floor(seededRandom(seed++) * 8);
            const height = 4 + Math.floor(seededRandom(seed++) * 8);
            const x = 3 + Math.floor(seededRandom(seed++) * (gridSize - width - 6));
            const z = 3 + Math.floor(seededRandom(seed++) * (gridSize - height - 6));
            
            // Check if room overlaps with existing rooms
            let overlaps = false;
            for (const room of rooms) {
                if (x < room.x + room.width + 2 && x + width + 2 > room.x &&
                    z < room.z + room.height + 2 && z + height + 2 > room.z) {
                    overlaps = true;
                    break;
                }
            }
            
            if (!overlaps) {
                rooms.push({ x, z, width, height });
                
                // Carve out room (set to empty)
                for (let rx = x; rx < x + width; rx++) {
                    for (let rz = z; rz < z + height; rz++) {
                        if (rx > 0 && rx < gridSize - 1 && rz > 0 && rz < gridSize - 1) {
                            levelGrid[rx][rz] = 0;
                        }
                    }
                }
                break;
            }
            attempts++;
        }
    }
    
    // Connect rooms with corridors
    for (let i = 0; i < rooms.length - 1; i++) {
        const roomA = rooms[i];
        const roomB = rooms[i + 1];
        
        // Get center points of rooms
        const centerA = {
            x: Math.floor(roomA.x + roomA.width / 2),
            z: Math.floor(roomA.z + roomA.height / 2)
        };
        const centerB = {
            x: Math.floor(roomB.x + roomB.width / 2),
            z: Math.floor(roomB.z + roomB.height / 2)
        };
        
        // Create L-shaped corridor
        carveCorridor(centerA.x, centerA.z, centerB.x, centerA.z);
        carveCorridor(centerB.x, centerA.z, centerB.x, centerB.z);
    }
    
    // Add some random walls for complexity
    seed = levelSeed + 1000;
    const numWalls = 15 + Math.floor(seededRandom(seed++) * 20);
    for (let i = 0; i < numWalls; i++) {
        const length = 2 + Math.floor(seededRandom(seed++) * 6);
        const startX = 3 + Math.floor(seededRandom(seed++) * (gridSize - 6));
        const startZ = 3 + Math.floor(seededRandom(seed++) * (gridSize - 6));
        const horizontal = seededRandom(seed++) > 0.5;
        
        for (let j = 0; j < length; j++) {
            const x = horizontal ? startX + j : startX;
            const z = horizontal ? startZ : startZ + j;
            
            if (x >= 2 && x < gridSize - 2 && z >= 2 && z < gridSize - 2) {
                if (levelGrid[x][z] === 0) {
                    levelGrid[x][z] = 1;
                }
            }
        }
    }
}

function carveCorridor(x1, z1, x2, z2) {
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);
    const startZ = Math.min(z1, z2);
    const endZ = Math.max(z1, z2);
    
    for (let x = startX; x <= endX; x++) {
        for (let z = startZ; z <= endZ; z++) {
            if (x > 0 && x < gridSize - 1 && z > 0 && z < gridSize - 1) {
                levelGrid[x][z] = 0;
                // Also clear adjacent cells for wider corridors
                if (x > 1 && levelGrid[x-1][z] === 1) levelGrid[x-1][z] = 0;
                if (x < gridSize - 2 && levelGrid[x+1][z] === 1) levelGrid[x+1][z] = 0;
                if (z > 1 && levelGrid[x][z-1] === 1) levelGrid[x][z-1] = 0;
                if (z < gridSize - 2 && levelGrid[x][z+1] === 1) levelGrid[x][z+1] = 0;
            }
        }
    }
}

function generateReachableSpawnPoints(playerX, playerZ) {
    const spawnPoints = [];
    let seed = levelSeed + 5000;
    const numSpawnPoints = 3 + Math.floor(seededRandom(seed++) * 3);
    
    let attempts = 0;
    while (spawnPoints.length < numSpawnPoints && attempts < 100) {
        const x = 5 + Math.floor(seededRandom(seed++) * (gridSize - 10));
        const z = 5 + Math.floor(seededRandom(seed++) * (gridSize - 10));
        
        // Check if position is empty and far from player start
        const distanceFromPlayer = Math.sqrt((x - playerX) ** 2 + (z - playerZ) ** 2);
        
        if (levelGrid[x][z] === 0 && distanceFromPlayer > 8) {
            // Check if reachable from player start
            if (isReachable(playerX, playerZ, x, z)) {
                levelGrid[x][z] = 3;
                spawnPoints.push({ x, z });
                
                // Clear area around spawn point
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dz = -1; dz <= 1; dz++) {
                        const nx = x + dx;
                        const nz = z + dz;
                        if (nx >= 0 && nx < gridSize && nz >= 0 && nz < gridSize) {
                            if (levelGrid[nx][nz] === 1) levelGrid[nx][nz] = 0;
                        }
                    }
                }
            }
        }
        attempts++;
    }
    
    return spawnPoints;
}

function isReachable(startX, startZ, targetX, targetZ) {
    // Simple breadth-first search pathfinding
    const visited = Array(gridSize).fill().map(() => Array(gridSize).fill(false));
    const queue = [{ x: startX, z: startZ }];
    visited[startX][startZ] = true;
    
    const directions = [
        { x: 0, z: 1 }, { x: 1, z: 0 }, { x: 0, z: -1 }, { x: -1, z: 0 }
    ];
    
    while (queue.length > 0) {
        const current = queue.shift();
        
        if (current.x === targetX && current.z === targetZ) {
            return true;
        }
        
        for (const dir of directions) {
            const newX = current.x + dir.x;
            const newZ = current.z + dir.z;
            
            if (newX >= 0 && newX < gridSize && newZ >= 0 && newZ < gridSize &&
                !visited[newX][newZ] && levelGrid[newX][newZ] !== 1) {
                visited[newX][newZ] = true;
                queue.push({ x: newX, z: newZ });
            }
        }
    }
    
    return false;
}

function buildLevelGeometry(spawnPointPositions) {
    // Create textures
    const textureLoader = new THREE.TextureLoader();
    
    // Create floor texture
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 256;
    floorCanvas.height = 256;
    const floorCtx = floorCanvas.getContext('2d');
    
    // Draw floor pattern
    floorCtx.fillStyle = '#333333';
    floorCtx.fillRect(0, 0, 256, 256);
    floorCtx.strokeStyle = '#444444';
    floorCtx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
        floorCtx.beginPath();
        floorCtx.moveTo(i * 32, 0);
        floorCtx.lineTo(i * 32, 256);
        floorCtx.moveTo(0, i * 32);
        floorCtx.lineTo(256, i * 32);
        floorCtx.stroke();
    }
    
    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(20, 20);
    
    // Create wall texture
    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = 128;
    wallCanvas.height = 256;
    const wallCtx = wallCanvas.getContext('2d');
    
    // Draw brick pattern
    wallCtx.fillStyle = '#8B4513';
    wallCtx.fillRect(0, 0, 128, 256);
    wallCtx.strokeStyle = '#654321';
    wallCtx.lineWidth = 2;
    for (let row = 0; row < 16; row++) {
        for (let col = 0; col < 4; col++) {
            const x = col * 32 + (row % 2 === 0 ? 0 : 16);
            const y = row * 16;
            wallCtx.strokeRect(x, y, 32, 16);
        }
    }
    
    const wallTexture = new THREE.CanvasTexture(wallCanvas);
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;

    // Floor
    const levelSize = gridSize * cellSize;
    const floorGeometry = new THREE.PlaneGeometry(levelSize, levelSize);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        map: floorTexture,
        roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Ceiling
    const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const ceiling = new THREE.Mesh(floorGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4;
    scene.add(ceiling);

    // Wall material with texture
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        map: wallTexture,
        roughness: 0.7
    });
    
    const wallHeight = 4;
    
    // Convert grid to 3D walls
    for (let x = 0; x < gridSize; x++) {
        for (let z = 0; z < gridSize; z++) {
            if (levelGrid[x][z] === 1) {
                const worldX = (x - gridSize / 2) * cellSize;
                const worldZ = (z - gridSize / 2) * cellSize;
                
                const geometry = new THREE.BoxGeometry(cellSize, wallHeight, cellSize);
                const wall = new THREE.Mesh(geometry, wallMaterial);
                wall.position.set(worldX, wallHeight / 2, worldZ);
                wall.castShadow = true;
                wall.receiveShadow = true;
                
                // Store wall bounds for collision
                wall.userData = {
                    minX: worldX - cellSize / 2,
                    maxX: worldX + cellSize / 2,
                    minZ: worldZ - cellSize / 2,
                    maxZ: worldZ + cellSize / 2
                };
                
                scene.add(wall);
                walls.push(wall);
            }
        }
    }
    
    // Update player position
    const worldPlayerX = (Math.floor(gridSize / 2) - gridSize / 2) * cellSize;
    const worldPlayerZ = (Math.floor(gridSize / 2) - gridSize / 2) * cellSize;
    player.position.set(worldPlayerX, 0.8, worldPlayerZ);
    
    return spawnPointPositions.map(sp => ({
        x: (sp.x - gridSize / 2) * cellSize,
        z: (sp.z - gridSize / 2) * cellSize
    }));
}

function createLevel() {
    return generateLevel();
}

function createMonster(x, z) {
    const monsterGroup = new THREE.Group();
    
    // Body (red cube with scaled proportions)
    const bodyGeometry = new THREE.BoxGeometry(1.2, 1.5, 0.8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xaa0000,
        roughness: 0.7
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.75;
    monsterGroup.add(body);
    
    // Head (smaller dark red cube)
    const headGeometry = new THREE.BoxGeometry(0.8, 0.6, 0.6);
    const headMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x660000,
        roughness: 0.6
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.8;
    monsterGroup.add(head);
    
    // Eyes (glowing yellow spheres)
    const eyeGeometry = new THREE.SphereGeometry(0.1, 6, 6);
    const eyeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,
        emissive: 0xffff00
    });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2, 1.8, 0.3);
    monsterGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.2, 1.8, 0.3);
    monsterGroup.add(rightEye);
    
    // Arms (thin rectangles)
    const armGeometry = new THREE.BoxGeometry(0.3, 1, 0.3);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0x880000 });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.75, 0.75, 0);
    monsterGroup.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.75, 0.75, 0);
    monsterGroup.add(rightArm);
    
    // Claws (small orange spheres)
    const clawGeometry = new THREE.SphereGeometry(0.15, 4, 4);
    const clawMaterial = new THREE.MeshStandardMaterial({ color: 0xff4400 });
    
    const leftClaw = new THREE.Mesh(clawGeometry, clawMaterial);
    leftClaw.position.set(-0.75, 0.25, 0);
    monsterGroup.add(leftClaw);
    
    const rightClaw = new THREE.Mesh(clawGeometry, clawMaterial);
    rightClaw.position.set(0.75, 0.25, 0);
    monsterGroup.add(rightClaw);
    
    // Set position and properties
    monsterGroup.position.set(x, 0, z);
    monsterGroup.castShadow = true;
    monsterGroup.receiveShadow = true;
    
    // Add properties for game logic
    monsterGroup.health = 3;
    monsterGroup.id = Date.now() + Math.random(); // Unique ID
    
    return monsterGroup;
}

function createSpawnPointsFromData(spawnPositions) {
    spawnPositions.forEach((pos, index) => {
        const spawnGroup = new THREE.Group();
        
        // Base (glowing purple pentagram)
        const baseGeometry = new THREE.CylinderGeometry(2, 2, 0.2, 5);
        const baseMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x9900ff,
            emissive: 0x440088,
            emissiveIntensity: 0.5
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.1;
        spawnGroup.add(base);
        
        // Energy core (floating sphere)
        const coreGeometry = new THREE.SphereGeometry(0.5, 12, 12);
        const coreMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff00ff,
            emissive: 0xff00ff,
            emissiveIntensity: 0.8
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.position.y = 1.5;
        spawnGroup.add(core);
        
        // Rotating rings
        const ringGeometry = new THREE.TorusGeometry(1, 0.1, 8, 20);
        const ringMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff00ff,
            emissive: 0xff00ff,
            emissiveIntensity: 0.5
        });
        
        const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
        ring1.position.y = 1.5;
        spawnGroup.add(ring1);
        
        const ring2 = new THREE.Mesh(ringGeometry, ringMaterial);
        ring2.position.y = 1.5;
        ring2.rotation.x = Math.PI / 2;
        spawnGroup.add(ring2);
        
        // Position and properties
        spawnGroup.position.set(pos.x, 0, pos.z);
        spawnGroup.userData = {
            type: 'spawnPoint',
            health: 10,
            id: index,
            nextSpawnTime: Date.now() + 2000,
            roomName: `Spawn Point ${index + 1}`,
            rings: [ring1, ring2],
            core: core
        };
        
        scene.add(spawnGroup);
        spawnPoints.push(spawnGroup);
        lastSpawnTime[index] = Date.now();
    });
}

function createLamps() {
    // Generate lamp positions in open areas
    const lampPositions = [];
    let seed = levelSeed + 10000;
    
    // Place lamps in open areas
    for (let attempts = 0; attempts < 30; attempts++) {
        const gridX = 5 + Math.floor(seededRandom(seed++) * (gridSize - 10));
        const gridZ = 5 + Math.floor(seededRandom(seed++) * (gridSize - 10));
        
        // Check if position is empty and not too close to other lamps
        if (levelGrid[gridX][gridZ] === 0) {
            const worldX = (gridX - gridSize / 2) * cellSize;
            const worldZ = (gridZ - gridSize / 2) * cellSize;
            
            // Check distance from other lamps
            let tooClose = false;
            for (const existing of lampPositions) {
                const distance = Math.sqrt((worldX - existing.x) ** 2 + (worldZ - existing.z) ** 2);
                if (distance < 8) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                lampPositions.push({ x: worldX, z: worldZ });
            }
        }
    }
    
    lampPositions.forEach(pos => {
        const lampGroup = new THREE.Group();
        
        // Lamp post
        const postGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3);
        const postMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.y = 1.5;
        lampGroup.add(post);
        
        // Lamp shade
        const shadeGeometry = new THREE.ConeGeometry(0.5, 0.5, 6);
        const shadeMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
        const shade = new THREE.Mesh(shadeGeometry, shadeMaterial);
        shade.position.y = 3;
        shade.rotation.z = Math.PI;
        lampGroup.add(shade);
        
        // Light bulb (glowing)
        const bulbGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const bulbMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffcc,
            emissive: 0xffffcc
        });
        const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
        bulb.position.y = 2.8;
        lampGroup.add(bulb);
        
        // Add point light
        const pointLight = new THREE.PointLight(0xffffcc, 1, 15);
        pointLight.position.y = 2.8;
        pointLight.castShadow = true;
        pointLight.shadow.camera.near = 0.5;
        pointLight.shadow.camera.far = 15;
        lampGroup.add(pointLight);
        
        lampGroup.position.set(pos.x, 0, pos.z);
        scene.add(lampGroup);
        lamps.push(lampGroup);
    });
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space': if (canJump) velocity.y += 10; canJump = false; break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
    }
}

function onPointerMove(event) {
    if (!gameRunning) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    // Horizontal rotation (turn the player)
    player.rotation.y -= movementX * 0.002;

    // Vertical rotation (look up/down - camera pitch only)
    cameraPitch -= movementY * 0.002;
    cameraPitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraPitch));
}

function onMouseClick(event) {
    if (!gameRunning) return;
    if (event.button === 0 && document.pointerLockElement === renderer.domElement) { // Left click only when locked
        shoot();
    }
}

function shoot() {
    const currentTime = Date.now();
    if (currentTime - lastShot < 200) return; // Fire rate limit
    lastShot = currentTime;

    // Play shooting sound
    if (sounds.shoot) sounds.shoot();

    const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

    // Position bullet at camera position
    bullet.position.copy(camera.position);

    // Get shooting direction based on where camera is looking
    const vector = new THREE.Vector3(0, 0, -1);
    vector.applyEuler(new THREE.Euler(cameraPitch, player.rotation.y, 0, 'YXZ'));
    
    bullet.velocity = vector.multiplyScalar(50);
    bullet.lifetime = 100;

    scene.add(bullet);
    bullets.push(bullet);
}

function enemyShoot(enemy) {
    const currentTime = Date.now();
    if (currentTime - lastEnemyShot[enemy.id] < 2000) return; // Enemy fire rate
    lastEnemyShot[enemy.id] = currentTime;

    const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff8800 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

    bullet.position.copy(enemy.position);
    bullet.position.y += 1;

    // Direction towards player
    const direction = new THREE.Vector3();
    direction.subVectors(player.position, bullet.position).normalize();
    bullet.velocity = direction.multiplyScalar(20);
    bullet.lifetime = 150;

    scene.add(bullet);
    enemyBullets.push(bullet);
}

function updateBullets(delta) {
    // Player bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.position.add(bullet.velocity.clone().multiplyScalar(delta));
        bullet.lifetime--;

        // Check collision with enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (bullet.position.distanceTo(enemy.position) < 1.5) {
                scene.remove(bullet);
                bullets.splice(i, 1);
                
                enemy.health--;
                
                // Play hit sound
                if (sounds.enemyHit) sounds.enemyHit();
                
                if (enemy.health <= 0) {
                    // Play death sound
                    if (sounds.enemyDeath) sounds.enemyDeath();
                    
                    scene.remove(enemy);
                    delete lastEnemyShot[enemy.id];
                    enemies.splice(j, 1);
                    score += 100;
                    updateHUD();
                    
                    // Check win condition
                    checkWinCondition();
                }
                break;
            }
        }
        
        // Check collision with spawn points
        for (let j = spawnPoints.length - 1; j >= 0; j--) {
            const spawn = spawnPoints[j];
            if (spawn.userData.health > 0 && bullet.position.distanceTo(spawn.position) < 2.5) {
                scene.remove(bullet);
                bullets.splice(i, 1);
                
                spawn.userData.health--;
                
                // Visual feedback
                spawn.userData.core.material.emissiveIntensity = 0.8 - (0.6 * (1 - spawn.userData.health / 10));
                
                if (spawn.userData.health <= 0) {
                    // Play explosion sound
                    if (sounds.spawnDestroy) sounds.spawnDestroy();
                    
                    // Destroy spawn point
                    scene.remove(spawn);
                    score += 500;
                    updateHUD();
                    
                    // Check win condition
                    checkWinCondition();
                }
                break;
            }
        }

        // Check collision with walls
        for (const wall of walls) {
            if (bullet.position.distanceTo(wall.position) < 1.5) {
                scene.remove(bullet);
                bullets.splice(i, 1);
                break;
            }
        }

        // Remove old bullets
        if (bullet.lifetime <= 0) {
            scene.remove(bullet);
            bullets.splice(i, 1);
        }
    }

    // Enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        bullet.position.add(bullet.velocity.clone().multiplyScalar(delta));
        bullet.lifetime--;

        // Check collision with player
        if (bullet.position.distanceTo(player.position) < 1) {
            scene.remove(bullet);
            enemyBullets.splice(i, 1);
            health -= 10;
            
            // Play player hit sound
            if (sounds.playerHit) sounds.playerHit();
            
            updateHUD();
            
            if (health <= 0) {
                gameOver();
            }
        }

        // Check collision with walls
        for (const wall of walls) {
            if (bullet.position.distanceTo(wall.position) < 1.5) {
                scene.remove(bullet);
                enemyBullets.splice(i, 1);
                break;
            }
        }

        // Remove old bullets
        if (bullet.lifetime <= 0) {
            scene.remove(bullet);
            enemyBullets.splice(i, 1);
        }
    }
}

function updateEnemies(delta) {
    enemies.forEach(enemy => {
        // Simple AI - move towards player
        const direction = new THREE.Vector3();
        direction.subVectors(player.position, enemy.position).normalize();
        
        // Check distance to player
        const distance = enemy.position.distanceTo(player.position);
        
        if (distance > 3) {
            // Store old position
            const oldPos = enemy.position.clone();
            
            // Move towards player
            enemy.position.add(direction.multiplyScalar(5 * delta));
            
            // Check collision with walls
            const enemyRadius = 0.5;
            let collided = false;
            
            for (const wall of walls) {
                if (wall.userData) {
                    const bounds = wall.userData;
                    
                    if (enemy.position.x - enemyRadius < bounds.maxX &&
                        enemy.position.x + enemyRadius > bounds.minX &&
                        enemy.position.z - enemyRadius < bounds.maxZ &&
                        enemy.position.z + enemyRadius > bounds.minZ) {
                        
                        // Collision detected, revert to old position
                        enemy.position.copy(oldPos);
                        collided = true;
                        break;
                    }
                }
            }
        }
        
        // Make enemy face player
        enemy.lookAt(new THREE.Vector3(player.position.x, enemy.position.y, player.position.z));
        
        // Shoot at player if in range and has line of sight
        if (distance < 20) {
            // Simple line of sight check
            const rayDirection = new THREE.Vector3();
            rayDirection.subVectors(player.position, enemy.position).normalize();
            
            const ray = new THREE.Raycaster(enemy.position, rayDirection);
            const intersects = ray.intersectObjects(walls);
            
            if (intersects.length === 0 || intersects[0].distance > distance) {
                enemyShoot(enemy);
            }
            
            // Random growl sounds during combat
            const currentTime = Date.now();
            if (!lastGrowl[enemy.id] || currentTime > lastGrowl[enemy.id] + 8000 + Math.random() * 5000) {
                if (sounds.monsterGrowl && Math.random() < 0.1) {
                    sounds.monsterGrowl();
                    lastGrowl[enemy.id] = currentTime;
                }
            }
        }
    });
}

function updatePlayer(delta) {
    // Apply gravity
    velocity.y -= 30 * delta;

    // Rotation with A/D keys
    const rotationSpeed = 2;
    if (moveLeft) {
        player.rotation.y += rotationSpeed * delta;
    }
    if (moveRight) {
        player.rotation.y -= rotationSpeed * delta;
    }

    // Movement with W/S keys
    const moveSpeed = 10;
    
    if (moveForward || moveBackward) {
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(player.quaternion);
        
        if (moveForward) {
            velocity.x = forward.x * moveSpeed;
            velocity.z = forward.z * moveSpeed;
        } else if (moveBackward) {
            velocity.x = -forward.x * moveSpeed;
            velocity.z = -forward.z * moveSpeed;
        }
    } else {
        velocity.x *= 0.9;
        velocity.z *= 0.9;
    }

    // Store old position
    const oldPosition = player.position.clone();
    
    // Update position
    player.position.x += velocity.x * delta;
    player.position.y += velocity.y * delta;
    player.position.z += velocity.z * delta;

    // Ground collision
    if (player.position.y < 0.8) {
        velocity.y = 0;
        player.position.y = 0.8;
        canJump = true;
    }

    // Check wall collisions
    const playerRadius = 0.5; // Player collision radius
    let collided = false;
    
    for (const wall of walls) {
        if (wall.userData) {
            const bounds = wall.userData;
            
            // Check if player overlaps with wall bounds (AABB collision)
            if (player.position.x - playerRadius < bounds.maxX &&
                player.position.x + playerRadius > bounds.minX &&
                player.position.z - playerRadius < bounds.maxZ &&
                player.position.z + playerRadius > bounds.minZ) {
                
                collided = true;
                
                // Calculate push-back direction
                const centerX = (bounds.minX + bounds.maxX) / 2;
                const centerZ = (bounds.minZ + bounds.maxZ) / 2;
                
                const distX = player.position.x - centerX;
                const distZ = player.position.z - centerZ;
                
                const halfWidth = (bounds.maxX - bounds.minX) / 2;
                const halfDepth = (bounds.maxZ - bounds.minZ) / 2;
                
                const overlapX = halfWidth + playerRadius - Math.abs(distX);
                const overlapZ = halfDepth + playerRadius - Math.abs(distZ);
                
                // Push player out of wall along the axis with smallest overlap
                if (overlapX < overlapZ) {
                    player.position.x = centerX + (distX > 0 ? 1 : -1) * (halfWidth + playerRadius);
                    velocity.x = 0;
                } else {
                    player.position.z = centerZ + (distZ > 0 ? 1 : -1) * (halfDepth + playerRadius);
                    velocity.z = 0;
                }
            }
        }
    }
    
    // Boundary collision
    const levelBoundary = (gridSize / 2 - 1) * cellSize;
    if (Math.abs(player.position.x) > levelBoundary) {
        player.position.x = Math.sign(player.position.x) * levelBoundary;
        velocity.x = 0;
    }
    if (Math.abs(player.position.z) > levelBoundary) {
        player.position.z = Math.sign(player.position.z) * levelBoundary;
        velocity.z = 0;
    }

    // Play footstep sounds
    const currentTime = Date.now();
    const isMoving = moveForward || moveBackward || moveLeft || moveRight;
    if (isMoving && currentTime > lastFootstep + 500) {
        if (sounds.footstep) sounds.footstep();
        lastFootstep = currentTime;
    }

    // Update camera position and rotation
    camera.position.copy(player.position);
    camera.position.y = player.position.y + 0.8;
    
    // Apply camera rotations
    camera.rotation.y = player.rotation.y;
    camera.rotation.x = cameraPitch;
}

function updateHUD() {
    document.getElementById('health').textContent = health;
    document.getElementById('score').textContent = score;
    
    // Update seed display
    if (seedString) {
        document.getElementById('seedDisplay').textContent = `Seed: "${seedString}"`;
    } else {
        document.getElementById('seedDisplay').textContent = `Seed: ${levelSeed}`;
    }
    
    // Update spawn point status
    const activeSpawns = spawnPoints.filter(spawn => spawn.userData.health > 0);
    const totalSpawns = spawnPoints.length;
    document.getElementById('spawnStatus').textContent = 
        `Spawn Points: ${totalSpawns - activeSpawns.length}/${totalSpawns} destroyed | Enemies: ${enemies.length}`;
}

function renderMinimap() {
    const mapSize = 200;
    const centerX = mapSize / 2;
    const centerY = mapSize / 2;
    const scale = 2; // Zoom level
    
    // Clear canvas
    minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    minimapCtx.fillRect(0, 0, mapSize, mapSize);
    
    // Save context state
    minimapCtx.save();
    
    // Translate to center and rotate based on player rotation
    minimapCtx.translate(centerX, centerY);
    minimapCtx.rotate(-player.rotation.y - Math.PI / 2);
    
    // Draw grid
    minimapCtx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
    minimapCtx.lineWidth = 1;
    for (let i = -100; i <= 100; i += 10) {
        minimapCtx.beginPath();
        minimapCtx.moveTo(i * scale, -100 * scale);
        minimapCtx.lineTo(i * scale, 100 * scale);
        minimapCtx.stroke();
        minimapCtx.beginPath();
        minimapCtx.moveTo(-100 * scale, i * scale);
        minimapCtx.lineTo(100 * scale, i * scale);
        minimapCtx.stroke();
    }
    
    // Draw walls (simplified)
    minimapCtx.fillStyle = 'rgba(100, 100, 100, 0.8)';
    walls.forEach(wall => {
        if (wall.userData) {
            const relX = (wall.position.x - player.position.x) * scale;
            const relZ = (wall.position.z - player.position.z) * scale;
            const width = (wall.userData.maxX - wall.userData.minX) * scale;
            const depth = (wall.userData.maxZ - wall.userData.minZ) * scale;
            
            minimapCtx.fillRect(
                relX - width / 2,
                relZ - depth / 2,
                width,
                depth
            );
        }
    });
    
    // Draw spawn points
    minimapCtx.strokeStyle = 'rgba(255, 0, 255, 1)';
    minimapCtx.fillStyle = 'rgba(255, 0, 255, 0.5)';
    minimapCtx.lineWidth = 2;
    spawnPoints.forEach(spawn => {
        if (spawn.userData.health > 0) {
            const relX = (spawn.position.x - player.position.x) * scale;
            const relZ = (spawn.position.z - player.position.z) * scale;
            
            // Draw spawn point as a star
            minimapCtx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
                const x = relX + Math.cos(angle) * 8;
                const y = relZ + Math.sin(angle) * 8;
                if (i === 0) {
                    minimapCtx.moveTo(x, y);
                } else {
                    minimapCtx.lineTo(x, y);
                }
                const innerAngle = angle + Math.PI / 5;
                const innerX = relX + Math.cos(innerAngle) * 4;
                const innerY = relZ + Math.sin(innerAngle) * 4;
                minimapCtx.lineTo(innerX, innerY);
            }
            minimapCtx.closePath();
            minimapCtx.fill();
            minimapCtx.stroke();
        }
    });
    
    // Draw enemies
    minimapCtx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    enemies.forEach(enemy => {
        const relX = (enemy.position.x - player.position.x) * scale;
        const relZ = (enemy.position.z - player.position.z) * scale;
        
        // Only draw if within minimap range
        if (Math.abs(relX) < centerX && Math.abs(relZ) < centerY) {
            minimapCtx.beginPath();
            minimapCtx.arc(relX, relZ, 4, 0, Math.PI * 2);
            minimapCtx.fill();
        }
    });
    
    // Restore context state
    minimapCtx.restore();
    
    // Draw player (always at center)
    minimapCtx.fillStyle = 'rgba(0, 255, 0, 1)';
    minimapCtx.strokeStyle = 'rgba(0, 255, 0, 1)';
    minimapCtx.lineWidth = 2;
    
    // Player triangle pointing up (forward direction)
    minimapCtx.beginPath();
    minimapCtx.moveTo(centerX, centerY - 8);
    minimapCtx.lineTo(centerX - 6, centerY + 6);
    minimapCtx.lineTo(centerX + 6, centerY + 6);
    minimapCtx.closePath();
    minimapCtx.fill();
    minimapCtx.stroke();
    
    // Draw compass directions
    minimapCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    minimapCtx.font = '12px Arial';
    minimapCtx.textAlign = 'center';
    
    // Calculate rotated positions for N, S, E, W
    const compassDist = 90;
    const directions = [
        { label: 'N', angle: 0 },
        { label: 'E', angle: Math.PI / 2 },
        { label: 'S', angle: Math.PI },
        { label: 'W', angle: 3 * Math.PI / 2 }
    ];
    
    directions.forEach(dir => {
        const rotatedAngle = dir.angle - player.rotation.y - Math.PI / 2;
        const x = centerX + Math.cos(rotatedAngle) * compassDist;
        const y = centerY + Math.sin(rotatedAngle) * compassDist;
        
        if (x > 10 && x < mapSize - 10 && y > 10 && y < mapSize - 10) {
            minimapCtx.fillText(dir.label, x, y);
        }
    });
}

function gameOver() {
    gameRunning = false;
    document.exitPointerLock();
    stopBackgroundMusic();
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').style.display = 'block';
}

function updateSpawnPoints(delta) {
    const currentTime = Date.now();
    
    spawnPoints.forEach(spawn => {
        if (spawn.userData.health > 0) {
            // Rotate rings for visual effect
            spawn.userData.rings[0].rotation.y += delta * 2;
            spawn.userData.rings[1].rotation.z += delta * 2;
            spawn.userData.core.position.y = 1.5 + Math.sin(currentTime * 0.002) * 0.1;
            
            // Spawn enemies if conditions are met
            if (currentTime > spawn.userData.nextSpawnTime && enemies.length < 30) {
                // Find a nearby position to spawn
                const angle = Math.random() * Math.PI * 2;
                const distance = 3 + Math.random() * 2;
                const x = spawn.position.x + Math.cos(angle) * distance;
                const z = spawn.position.z + Math.sin(angle) * distance;
                
                // Create and add monster
                const monster = createMonster(x, z);
                scene.add(monster);
                enemies.push(monster);
                lastEnemyShot[monster.id] = currentTime;
                
                // Play monster growl when spawning
                if (sounds.monsterGrowl) {
                    setTimeout(() => sounds.monsterGrowl(), Math.random() * 1000);
                }
                
                // Set next spawn time (3-5 seconds)
                spawn.userData.nextSpawnTime = currentTime + 3000 + Math.random() * 2000;
            }
        }
    });
}

function checkWinCondition() {
    // Check if all spawn points are destroyed
    const activeSpawns = spawnPoints.filter(spawn => spawn.userData.health > 0);
    
    if (activeSpawns.length === 0 && enemies.length === 0) {
        // Victory!
        gameRunning = false;
        document.exitPointerLock();
        stopBackgroundMusic();
        
        const victoryDiv = document.createElement('div');
        victoryDiv.id = 'victory';
        victoryDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 100, 0, 0.9);
            padding: 40px;
            border: 2px solid #00ff00;
            text-align: center;
            color: white;
            z-index: 200;
        `;
        victoryDiv.innerHTML = `
            <h2 style="color: #00ff00;">VICTORY!</h2>
            <p>All spawn points destroyed!</p>
            <p>Final Score: ${score}</p>
            <button onclick="location.reload()" style="
                padding: 15px 30px;
                font-size: 20px;
                background: #00ff00;
                color: black;
                border: none;
                cursor: pointer;
                margin: 10px;
            ">PLAY AGAIN</button>
        `;
        document.body.appendChild(victoryDiv);
    }
}

function animate() {
    if (!gameRunning) return;

    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    updatePlayer(delta);
    updateEnemies(delta);
    updateBullets(delta);
    updateSpawnPoints(delta);

    renderer.render(scene, camera);
    
    // Render minimap
    renderMinimap();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function startGame() {
    // Get seed from input field
    const seedInput = document.getElementById('seedInput');
    seedString = seedInput.value.trim();
    
    // Generate seed from string
    levelSeed = hashStringToSeed(seedString);
    
    // Display the seed being used
    if (seedString) {
        console.log(`Using custom seed: "${seedString}" (hash: ${levelSeed})`);
    } else {
        console.log(`Using random seed: ${levelSeed}`);
    }
    
    // Hide menu and show game UI
    document.getElementById('menu').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    document.getElementById('crosshair').style.display = 'block';
    document.getElementById('minimap').style.display = 'block';
    gameRunning = true;
    
    // Resume audio context and start background music
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    startBackgroundMusic();
    
    updateHUD();
    animate();
}

// Initialize when page loads
window.addEventListener('load', init);