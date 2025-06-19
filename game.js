// Menu Scene
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        // No assets needed for menu
    }

    create() {
        // Dark red background
        this.add.rectangle(400, 300, 800, 600, 0x440000);
        
        // Title
        this.add.text(400, 100, 'DOOM CLONE', {
            fontSize: '64px',
            fill: '#ff0000',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Start button
        const startButton = this.add.rectangle(400, 300, 200, 50, 0xff0000)
            .setInteractive()
            .on('pointerover', () => startButton.setFillStyle(0xff6666))
            .on('pointerout', () => startButton.setFillStyle(0xff0000))
            .on('pointerdown', () => this.scene.start('GameScene'));

        this.add.text(400, 300, 'START GAME', {
            fontSize: '24px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Controls
        const controlsText = [
            'CONTROLS:',
            '',
            'W, A, S, D - Move',
            'Mouse - Aim',
            'Left Click - Shoot',
            '',
            'Survive as long as possible!'
        ];

        this.add.text(400, 450, controlsText, {
            fontSize: '18px',
            fill: '#ffffff',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);
    }
}

// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.player = null;
        this.enemies = null;
        this.bullets = null;
        this.enemyBullets = null;
        this.walls = null;
        this.cursors = null;
        this.lastFired = 0;
        this.playerHealth = 100;
        this.score = 0;
    }

    preload() {
        // Create simple sprites using data URIs
        this.createSprites();
    }

    createSprites() {
        // Create colored squares as sprites
        const graphics = this.make.graphics();
        
        // Player (green square)
        graphics.fillStyle(0x00ff00);
        graphics.fillRect(0, 0, 32, 32);
        graphics.generateTexture('player', 32, 32);
        
        // Enemy (red square)
        graphics.clear();
        graphics.fillStyle(0xff0000);
        graphics.fillRect(0, 0, 32, 32);
        graphics.generateTexture('enemy', 32, 32);
        
        // Bullet (yellow circle)
        graphics.clear();
        graphics.fillStyle(0xffff00);
        graphics.fillCircle(4, 4, 4);
        graphics.generateTexture('bullet', 8, 8);
        
        // Enemy bullet (orange circle)
        graphics.clear();
        graphics.fillStyle(0xff8800);
        graphics.fillCircle(4, 4, 4);
        graphics.generateTexture('enemyBullet', 8, 8);
        
        // Wall (gray rectangle)
        graphics.clear();
        graphics.fillStyle(0x666666);
        graphics.fillRect(0, 0, 64, 64);
        graphics.generateTexture('wall', 64, 64);
        
        graphics.destroy();
    }

    create() {
        // Background
        this.add.rectangle(400, 300, 800, 600, 0x222222);

        // Create walls
        this.walls = this.physics.add.staticGroup();
        this.createLevel();

        // Create player
        this.player = this.physics.add.sprite(400, 500, 'player');
        this.player.setCollideWorldBounds(true);
        this.player.setSize(24, 24);

        // Create enemy group
        this.enemies = this.physics.add.group();
        this.spawnEnemies();

        // Create bullet groups
        this.bullets = this.physics.add.group({
            defaultKey: 'bullet',
            maxSize: 50
        });

        this.enemyBullets = this.physics.add.group({
            defaultKey: 'enemyBullet',
            maxSize: 100
        });

        // Set up controls
        this.cursors = this.input.keyboard.addKeys('W,S,A,D');
        
        // Mouse input
        this.input.on('pointerdown', this.playerShoot, this);

        // Collisions
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.enemies, this.walls);
        this.physics.add.collider(this.bullets, this.walls, this.bulletHitWall, null, this);
        this.physics.add.collider(this.enemyBullets, this.walls, this.bulletHitWall, null, this);
        this.physics.add.overlap(this.bullets, this.enemies, this.bulletHitEnemy, null, this);
        this.physics.add.overlap(this.enemyBullets, this.player, this.enemyBulletHitPlayer, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.playerHitEnemy, null, this);

        // UI
        this.healthText = this.add.text(16, 16, 'Health: 100', {
            fontSize: '20px',
            fill: '#00ff00'
        });

        this.scoreText = this.add.text(16, 50, 'Score: 0', {
            fontSize: '20px',
            fill: '#ffffff'
        });

        // Enemy shooting timer
        this.time.addEvent({
            delay: 2000,
            callback: this.enemiesShoot,
            callbackScope: this,
            loop: true
        });
    }

    createLevel() {
        // Border walls
        for (let i = 0; i < 13; i++) {
            this.walls.create(i * 64 + 32, 32, 'wall');
            this.walls.create(i * 64 + 32, 568, 'wall');
        }
        for (let i = 1; i < 9; i++) {
            this.walls.create(32, i * 64 + 32, 'wall');
            this.walls.create(768, i * 64 + 32, 'wall');
        }

        // Interior walls
        this.walls.create(200, 200, 'wall');
        this.walls.create(600, 200, 'wall');
        this.walls.create(400, 300, 'wall');
        this.walls.create(200, 400, 'wall');
        this.walls.create(600, 400, 'wall');
    }

    spawnEnemies() {
        const positions = [
            { x: 150, y: 150 },
            { x: 650, y: 150 },
            { x: 400, y: 200 },
            { x: 150, y: 350 },
            { x: 650, y: 350 }
        ];

        positions.forEach(pos => {
            const enemy = this.enemies.create(pos.x, pos.y, 'enemy');
            enemy.setSize(24, 24);
            enemy.health = 3;
            enemy.lastMove = 0;
        });
    }

    update(time) {
        if (this.playerHealth <= 0) {
            this.gameOver();
            return;
        }

        // Player movement
        const speed = 200;
        let velocityX = 0;
        let velocityY = 0;

        if (this.cursors.A.isDown) velocityX = -speed;
        if (this.cursors.D.isDown) velocityX = speed;
        if (this.cursors.W.isDown) velocityY = -speed;
        if (this.cursors.S.isDown) velocityY = speed;

        this.player.setVelocity(velocityX, velocityY);

        // Enemy AI
        this.enemies.children.entries.forEach(enemy => {
            if (time > enemy.lastMove + 1000) {
                const angle = Phaser.Math.Angle.Between(
                    enemy.x, enemy.y,
                    this.player.x, this.player.y
                );
                const speed = 50;
                enemy.setVelocity(
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed
                );
                enemy.lastMove = time;
            }
        });

        // Clean up off-screen bullets
        this.bullets.children.entries.forEach(bullet => {
            if (bullet.x < 0 || bullet.x > 800 || bullet.y < 0 || bullet.y > 600) {
                bullet.destroy();
            }
        });
        this.enemyBullets.children.entries.forEach(bullet => {
            if (bullet.x < 0 || bullet.x > 800 || bullet.y < 0 || bullet.y > 600) {
                bullet.destroy();
            }
        });
    }

    playerShoot(pointer) {
        const time = this.time.now;
        if (time > this.lastFired + 200) {
            const bullet = this.bullets.get(this.player.x, this.player.y);
            if (bullet) {
                bullet.setActive(true);
                bullet.setVisible(true);
                const angle = Phaser.Math.Angle.Between(
                    this.player.x, this.player.y,
                    pointer.worldX, pointer.worldY
                );
                bullet.setVelocity(Math.cos(angle) * 500, Math.sin(angle) * 500);
                this.lastFired = time;
            }
        }
    }

    enemiesShoot() {
        this.enemies.children.entries.forEach(enemy => {
            if (enemy.active) {
                const bullet = this.enemyBullets.get(enemy.x, enemy.y);
                if (bullet) {
                    bullet.setActive(true);
                    bullet.setVisible(true);
                    const angle = Phaser.Math.Angle.Between(
                        enemy.x, enemy.y,
                        this.player.x, this.player.y
                    );
                    bullet.setVelocity(Math.cos(angle) * 300, Math.sin(angle) * 300);
                }
            }
        });
    }

    bulletHitWall(bullet, wall) {
        bullet.destroy();
    }

    bulletHitEnemy(bullet, enemy) {
        bullet.destroy();
        enemy.health--;
        
        if (enemy.health <= 0) {
            enemy.destroy();
            this.score += 100;
            this.scoreText.setText('Score: ' + this.score);
            
            // Check if all enemies defeated
            if (this.enemies.countActive() === 0) {
                this.spawnEnemies();
                this.score += 500;
                this.scoreText.setText('Score: ' + this.score);
            }
        }
    }

    enemyBulletHitPlayer(player, bullet) {
        bullet.destroy();
        this.playerHealth -= 10;
        this.updateHealthDisplay();
    }

    playerHitEnemy(player, enemy) {
        this.playerHealth -= 20;
        this.updateHealthDisplay();
        enemy.setVelocity(-enemy.body.velocity.x * 2, -enemy.body.velocity.y * 2);
    }

    updateHealthDisplay() {
        this.healthText.setText('Health: ' + this.playerHealth);
        if (this.playerHealth <= 30) {
            this.healthText.setColor('#ff0000');
        } else if (this.playerHealth <= 60) {
            this.healthText.setColor('#ffff00');
        }
    }

    gameOver() {
        this.physics.pause();
        
        const gameOverText = this.add.text(400, 250, 'GAME OVER', {
            fontSize: '64px',
            fill: '#ff0000',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        const finalScoreText = this.add.text(400, 320, 'Final Score: ' + this.score, {
            fontSize: '32px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        const restartText = this.add.text(400, 380, 'Click to return to menu', {
            fontSize: '24px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        this.input.once('pointerdown', () => {
            this.scene.start('MenuScene');
        });
    }
}

// Game Configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [MenuScene, GameScene]
};

// Create the game
const game = new Phaser.Game(config);