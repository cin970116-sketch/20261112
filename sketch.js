// 宣告各個圖片精靈圖檔與對應的動畫圖格陣列
let stopSheet, walkSheet, magicSheet, jumpSheet, effectSheet;
let stopAnimation = [];
let walkAnimation = [];
let magicAnimation = [];
let jumpAnimation = [];
let effectAnimation = [];

// 定義各個精靈圖的原始總寬度、總高度與總格數
const STOP_W = 1385, STOP_H = 212, STOP_FRAMES = 10;
const WALK_W = 1246, WALK_H = 198, WALK_FRAMES = 9;
const MAGIC_W = 1039, MAGIC_H = 146, MAGIC_FRAMES = 4;
const JUMP_W = 1502, JUMP_H = 188, JUMP_FRAMES = 11;
const EFFECT_W = 740, EFFECT_H = 19, EFFECT_FRAMES = 5;

// 動畫播放進度與位置變數
let stopFrame = 0;
let walkFrame = 0;
let magicFrame = 0;
let jumpFrame = 0;
let posX;
let posY;               // 角色目前的 Y 座標（中心點）
let groundY;            // 地面（畫布底部對齊點）的 Y 座標
let velocityY = 0;      // 垂直速度（重力與跳躍用）
let gravity = 1.2;      // 重力加速度
let jumpForce = -20;    // 起跳瞬間的向上速度
let speed = 8;          // 角色左右移動速度
let facingRight = true; // 記錄角色面向：true 為向右，false 為向左

// 狀態控制變數
let isMagicPlaying = false; // 是否正在施放魔法
let isJumping = false;      // 是否正在跳躍空中

// 特效物件陣列（支援同時發射多個特效）
let effects = [];

// 載入圖片並加上安全錯誤捕捉
function preload() {
  stopSheet = loadImage('1/stop/stop.png', 
    () => console.log('stop.png 載入成功'), 
    () => console.error('找不到 1/stop/stop.png')
  );
  walkSheet = loadImage('1/walk/walk.png', 
    () => console.log('walk.png 載入成功'), 
    () => console.error('找不到 1/walk/walk.png')
  );
  magicSheet = loadImage('1/magic/magic.png', 
    () => console.log('magic.png 載入成功'), 
    () => console.error('找不到 1/magic/magic.png')
  );
  jumpSheet = loadImage('1/jump/jump.png', 
    () => console.log('jump.png 載入成功'), 
    () => console.error('找不到 1/jump/jump.png')
  );
  effectSheet = loadImage('1/特效/特效.png', 
    () => console.log('特效.png 載入成功'), 
    () => console.error('找不到 1/特效/特效.png')
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60); // 60 影格率，確保動畫極度絲滑
  
  posX = width * (2 / 3); // 初始角色位置在畫布 2/3 處
  let displayHeight = height / 3;
  groundY = height - (displayHeight / 2); // 計算地面 Y 座標
  posY = groundY;

  // 1. 切割站立動畫圖格
  let sw = STOP_W / STOP_FRAMES;
  for (let i = 0; i < STOP_FRAMES; i++) {
    stopAnimation.push(stopSheet.get(i * sw, 0, sw, STOP_H));
  }

  // 2. 切割走路動畫圖格
  let ww = WALK_W / WALK_FRAMES;
  for (let i = 0; i < WALK_FRAMES; i++) {
    walkAnimation.push(walkSheet.get(i * ww, 0, ww, WALK_H));
  }

  // 3. 切割魔法動畫圖格
  let mw = MAGIC_W / MAGIC_FRAMES;
  for (let i = 0; i < MAGIC_FRAMES; i++) {
    magicAnimation.push(magicSheet.get(i * mw, 0, mw, MAGIC_H));
  }

  // 4. 切割跳躍動畫圖格 (11張，寬 1502，高 188)
  let jw = JUMP_W / JUMP_FRAMES;
  for (let i = 0; i < JUMP_FRAMES; i++) {
    jumpAnimation.push(jumpSheet.get(i * jw, 0, jw, JUMP_H));
  }

  // 5. 切割特效動畫圖格
  let ew = EFFECT_W / EFFECT_FRAMES;
  for (let i = 0; i < EFFECT_FRAMES; i++) {
    effectAnimation.push(effectSheet.get(i * ew, 0, ew, EFFECT_H));
  }
}

function draw() {
  background(255, 218, 224); // 淺粉色背景

  let displayHeight = height / 3;
  groundY = height - (displayHeight / 2); // 動態更新地面位置（適應視窗縮放）
  let walkDisplayWidth = (WALK_W / WALK_FRAMES) * (displayHeight / WALK_H);

  // --- 1. 鍵盤左右移動控制（空中也能左右移動）---
  if (!isMagicPlaying) {
    if (keyIsDown(RIGHT_ARROW)) {
      facingRight = true;
      if (posX < width - walkDisplayWidth / 2) {
        posX += speed;
      } else {
        posX = width - walkDisplayWidth / 2;
      }
    } else if (keyIsDown(LEFT_ARROW)) {
      facingRight = false;
      if (posX > walkDisplayWidth / 2) {
        posX -= speed;
      } else {
        posX = walkDisplayWidth / 2;
      }
    }
  }

  // --- 2. 跳躍物理模擬 ---
  if (isJumping) {
    posY += velocityY;      // 套用垂直速度改變位置
    velocityY += gravity;   // 受到重力影響，速度向下遞增

    // 判斷是否落地
    if (posY >= groundY) {
      posY = groundY;       // 貼齊地面
      isJumping = false;    // 結束跳躍狀態
      velocityY = 0;
      jumpFrame = 0;        // 重置跳躍動畫影格
    }
  }

  // --- 3. 更新與繪製特效 ---
  let effectDisplayHeight = displayHeight / 3;
  let effectDisplayWidth = (EFFECT_W / EFFECT_FRAMES) * (effectDisplayHeight / EFFECT_H);

  for (let i = effects.length - 1; i >= 0; i--) {
    let ef = effects[i];

    push();
    translate(ef.x, ef.y);
    if (!ef.facingRight) {
      scale(-1, 1);
    }
    imageMode(CENTER);
    
    let eIndex = Math.floor(ef.frame) % EFFECT_FRAMES;
    if (effectAnimation[eIndex]) {
      image(effectAnimation[eIndex], 0, 0, effectDisplayWidth, effectDisplayHeight);
    }
    pop();

    if (ef.facingRight) {
      ef.x += 16;
    } else {
      ef.x -= 16;
    }
    ef.frame += 0.25;

    if (ef.x > width + effectDisplayWidth || ef.x < -effectDisplayWidth) {
      effects.splice(i, 1);
    }
  }

  // --- 4. 繪製角色本體 ---
  push();
  translate(posX, posY);
  if (!facingRight) {
    scale(-1, 1);
  }
  imageMode(CENTER);

  if (isJumping) {
    // 播放跳躍動畫（11張，依據空中高度或固定速度播放）
    let jw = JUMP_W / JUMP_FRAMES;
    let jdWidth = jw * (displayHeight / JUMP_H);
    
    // 讓跳躍動畫在起跳到落地的過程中完整播放一次，或依影格累加
    let jIndex = Math.min(Math.floor(jumpFrame), JUMP_FRAMES - 1);
    if (jumpAnimation[jIndex]) {
      image(jumpAnimation[jIndex], 0, 0, jdWidth, displayHeight);
    }
    jumpFrame += 0.3; // 控制跳躍動畫播放速度
    if (jumpFrame >= JUMP_FRAMES) {
      jumpFrame = JUMP_FRAMES - 1; // 停在最後一格直到落地
    }
  } else if (isMagicPlaying) {
    let mw = MAGIC_W / MAGIC_FRAMES;
    let mdWidth = mw * (displayHeight / MAGIC_H);
    let mIndex = Math.min(Math.floor(magicFrame), MAGIC_FRAMES - 1);
    
    if (magicAnimation[mIndex]) {
      image(magicAnimation[mIndex], 0, 0, mdWidth, displayHeight);
    }

    magicFrame += 0.25;
    
    if (magicFrame >= MAGIC_FRAMES) {
      magicFrame = 0;
      isMagicPlaying = false;

      effects.push({
        x: posX,
        y: posY,
        facingRight: facingRight,
        frame: 0
      });
    }
  } else if (keyIsDown(RIGHT_ARROW) || keyIsDown(LEFT_ARROW)) {
    let dw = (WALK_W / WALK_FRAMES) * (displayHeight / WALK_H);
    let wIndex = Math.floor(walkFrame) % WALK_FRAMES;
    if (walkAnimation[wIndex]) {
      image(walkAnimation[wIndex], 0, 0, dw, displayHeight);
    }
    walkFrame += 0.2;
  } else {
    let dw = (STOP_W / STOP_FRAMES) * (displayHeight / STOP_H);
    let sIndex = Math.floor(stopFrame) % STOP_FRAMES;
    if (stopAnimation[sIndex]) {
      image(stopAnimation[sIndex], 0, 0, dw, displayHeight);
    }
    stopFrame += 0.12;
  }

  pop();
}

function keyPressed() {
  // 向上鍵 (UP_ARROW) 觸發跳躍（必須在地面上才能起跳）
  if (keyCode === UP_ARROW && !isJumping && !isMagicPlaying) {
    isJumping = true;
    velocityY = jumpForce; // 給予向上初速度
    jumpFrame = 0;
  }

  // 空白鍵觸發魔法
  if ((key === ' ' || keyCode === 32) && !isMagicPlaying && !isJumping) {
    isMagicPlaying = true;
    magicFrame = 0;
  }

  // 阻止瀏覽器空白鍵與上下方向鍵預設的頁面捲動行為
  return false; 
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}