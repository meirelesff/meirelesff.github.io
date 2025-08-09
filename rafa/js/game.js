//COLORS
var Colors = {
    red:0xf25346,
    white:0xd8d0d1,
    brown:0x59332e,
    brownDark:0x23190f,
    pink:0xF5986E,
    yellow:0xf4ce93,
    blue:0x68c3c0,
  purple:0x6d4b8e,
  darkPurple:0x3e2a52,

};

///////////////

// GAME VARIABLES
var game;
var deltaTime = 0;
var newTime = new Date().getTime();
var oldTime = new Date().getTime();
var ennemiesPool = [];
var particlesPool = [];
var particlesInUse = [];
// Holder for math answer boxes
var answerBoxesHolder;

function resetGame(){
  game = {speed:0,
          initSpeed:.0002,
          baseSpeed:.0002,
          targetBaseSpeed:.0002,
          incrementSpeedByTime:.0000015,
          incrementSpeedByLevel:.000003,
          distanceForSpeedUpdate:100,
          speedLastUpdate:0,

          distance:0,
          ratioSpeedDistance:50,
          energy:100,
          ratioSpeedEnergy:3,

          level:1,
          levelLastUpdate:0,
          distanceForLevelUpdate:1000,

          planeDefaultHeight:100,
          planeAmpHeight:80,
          planeAmpWidth:75,
          planeMoveSensivity:0.005,
          planeRotXSensivity:0.0008,
          planeRotZSensivity:0.0004,
          planeFallSpeed:.001,
          planeMinSpeed:1.2,
          planeMaxSpeed:1.6,
          planeSpeed:0,
          planeCollisionDisplacementX:0,
          planeCollisionSpeedX:0,

          planeCollisionDisplacementY:0,
          planeCollisionSpeedY:0,

          seaRadius:600,
          seaLength:800,
          //seaRotationSpeed:0.006,
          wavesMinAmp : 5,
          wavesMaxAmp : 20,
          wavesMinSpeed : 0.001,
          wavesMaxSpeed : 0.003,

          cameraFarPos:500,
          cameraNearPos:150,
          cameraSensivity:0.002,

          coinDistanceTolerance:15,
          coinValue:3,
          coinsSpeed:.35,
          coinLastSpawn:0,
          distanceForCoinsSpawn:100,

          ennemyDistanceTolerance:10,
          ennemyValue:10,
          ennemiesSpeed:.6,
          ennemyLastSpawn:0,
          distanceForEnnemiesSpawn:50,

    // Blue pill spawn control
    bluePillLastSpawn:0,
    distanceForBluePillSpawn:500,
    bluePillValue:15,

    // Time limit (15 minutes)
    sessionStartTime: Date.now(),
    timeLimitDuration: 900000,

          status : "playing",
          currentQuestion:null,
          correctAnswer:null,
         };
  fieldLevel.innerHTML = Math.floor(game.level);
  if (typeof timeLimitMessage !== 'undefined' && timeLimitMessage) timeLimitMessage.style.display = 'none';
}

//THREEJS RELATED VARIABLES

var scene,
    camera, fieldOfView, aspectRatio, nearPlane, farPlane,
    renderer,
    container,
    controls;

//SCREEN & MOUSE VARIABLES

var HEIGHT, WIDTH,
    mousePos = { x: 0, y: 0 };

//INIT THREE JS, SCREEN AND MOUSE EVENTS

function createScene() {

  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;

  scene = new THREE.Scene();
  aspectRatio = WIDTH / HEIGHT;
  fieldOfView = 50;
  nearPlane = .1;
  farPlane = 10000;
  camera = new THREE.PerspectiveCamera(
    fieldOfView,
    aspectRatio,
    nearPlane,
    farPlane
    );
  scene.fog = new THREE.Fog(0xf7d9aa, 100,950);
  camera.position.x = 0;
  camera.position.z = 200;
  camera.position.y = game.planeDefaultHeight;
  //camera.lookAt(new THREE.Vector3(0, 400, 0));

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(WIDTH, HEIGHT);
  // Improve crispness on retina iPad while capping for perf
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  renderer.shadowMap.enabled = true;

  container = document.getElementById('world');
  container.appendChild(renderer.domElement);

  window.addEventListener('resize', handleWindowResize, false);

  /*
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.minPolarAngle = -Math.PI / 2;
  controls.maxPolarAngle = Math.PI ;

  //controls.noZoom = true;
  //controls.noPan = true;
  //*/
}

// MOUSE AND SCREEN EVENTS

function handleWindowResize() {
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;
  renderer.setSize(WIDTH, HEIGHT);
  camera.aspect = WIDTH / HEIGHT;
  camera.updateProjectionMatrix();
}

function handleMouseMove(event) {
  var tx = -1 + (event.clientX / WIDTH)*2;
  var ty = 1 - (event.clientY / HEIGHT)*2;
  mousePos = {x:tx, y:ty};
}

function handleTouchMove(event) {
    event.preventDefault();
    var tx = -1 + (event.touches[0].pageX / WIDTH)*2;
    var ty = 1 - (event.touches[0].pageY / HEIGHT)*2;
    mousePos = {x:tx, y:ty};
}

function handleTouchStart(event){
  if(!event.touches || !event.touches.length) return;
  handleTouchMove(event);
}

function handleMouseUp(event){
  if (game.status == "waitingReplay"){
    resetGame();
    hideReplay();
  }
}


function handleTouchEnd(event){
  if (game.status == "waitingReplay"){
    resetGame();
    hideReplay();
  }
}

// LIGHTS

var ambientLight, hemisphereLight, shadowLight;

function createLights() {

  hemisphereLight = new THREE.HemisphereLight(0xaaaaaa,0x000000, .9)

  ambientLight = new THREE.AmbientLight(0xdc8874, .5);

  shadowLight = new THREE.DirectionalLight(0xffffff, .9);
  shadowLight.position.set(150, 350, 350);
  shadowLight.castShadow = true;
  shadowLight.shadow.camera.left = -400;
  shadowLight.shadow.camera.right = 400;
  shadowLight.shadow.camera.top = 400;
  shadowLight.shadow.camera.bottom = -400;
  shadowLight.shadow.camera.near = 1;
  shadowLight.shadow.camera.far = 1000;
  shadowLight.shadow.mapSize.width = 4096;
  shadowLight.shadow.mapSize.height = 4096;

  var ch = new THREE.CameraHelper(shadowLight.shadow.camera);

  //scene.add(ch);
  scene.add(hemisphereLight);
  scene.add(shadowLight);
  scene.add(ambientLight);

}


// Wizard avatar replacing the original pilot (reuses hair animation as scarf flutter)
var Pilot = function(){
  this.mesh = new THREE.Object3D();
  this.mesh.name = "wizard";
  this.angleHairs=0; // reused for scarf oscillation

  // Robe (tapered by stacking boxes)
  var robeMat = new THREE.MeshPhongMaterial({color:Colors.purple, shading:THREE.FlatShading});
  for (var i=0;i<3;i++){
    var seg = new THREE.Mesh(new THREE.BoxGeometry(14 - i*2, 8, 14 - i*2), robeMat);
    seg.position.set(0,-10 - i*6,0);
    seg.castShadow = true; seg.receiveShadow = true;
    this.mesh.add(seg);
  }

  // Torso / shoulders
  var torso = new THREE.Mesh(new THREE.BoxGeometry(12,12,12), robeMat);
  torso.position.set(0,-2,0);
  torso.castShadow = true; torso.receiveShadow = true;
  this.mesh.add(torso);

  // Head
  var faceGeom = new THREE.BoxGeometry(9,9,9);
  var faceMat = new THREE.MeshLambertMaterial({color:Colors.pink});
  var face = new THREE.Mesh(faceGeom, faceMat);
  face.position.set(0,6,0);
  this.mesh.add(face);

  // Hat (cone + brim via cylinders)
  var brim = new THREE.Mesh(new THREE.CylinderGeometry(10,10,2,12,1), new THREE.MeshPhongMaterial({color:Colors.darkPurple, shading:THREE.FlatShading}));
  brim.position.set(0,12,0);
  brim.castShadow = true; brim.receiveShadow = true;
  this.mesh.add(brim);
  var hat = new THREE.Mesh(new THREE.CylinderGeometry(0,8,18,8,1), new THREE.MeshPhongMaterial({color:Colors.purple, shading:THREE.FlatShading}));
  hat.position.set(0,22,0);
  hat.castShadow = true; hat.receiveShadow = true;
  this.mesh.add(hat);

  // Scarf segments (reuse hair structure & animation)
  var scarfSegmentGeom = new THREE.BoxGeometry(3,3,3);
  var scarfMat = new THREE.MeshLambertMaterial({color:Colors.yellow});
  this.hairsTop = new THREE.Object3D();
  for (var s=0; s<10; s++){
    var seg = new THREE.Mesh(scarfSegmentGeom, scarfMat);
    seg.position.set(-6 - s*3, 2, 0); // trail behind
    this.hairsTop.add(seg);
  }
  this.mesh.add(this.hairsTop);
}

Pilot.prototype.updateHairs = function(){
  var segments = this.hairsTop.children;
  for (var i=0;i<segments.length;i++){
    var seg = segments[i];
    // wave motion
    seg.position.y = 2 + Math.cos(this.angleHairs + i*0.3)*1.5;
  }
  this.angleHairs += game.speed*deltaTime*25;
}

var AirPlane = function(){
  // Re-themed as wizard on broom but keep name for game logic compatibility
  this.mesh = new THREE.Object3D();
  this.mesh.name = "wizardBroom";

  // Broom handle
  var handleGeom = new THREE.CylinderGeometry(2,2,140,6,1);
  var handleMat = new THREE.MeshPhongMaterial({color:Colors.brown, shading:THREE.FlatShading});
  var handle = new THREE.Mesh(handleGeom, handleMat);
  handle.rotation.z = Math.PI/2;
  handle.position.set(0,10,0);
  handle.castShadow = true; handle.receiveShadow = true;
  this.mesh.add(handle);

  // Bristles (cluster of boxes / cones at rear)
  var bristleMat = new THREE.MeshPhongMaterial({color:Colors.yellow, shading:THREE.FlatShading});
  for (var i=0;i<8;i++){
    var bristle = new THREE.Mesh(new THREE.BoxGeometry(4,10,4), bristleMat);
    bristle.position.set(-70,5 + (Math.random()*4-2), (Math.random()*12-6));
    bristle.rotation.z = Math.random()*0.5 - 0.25;
    bristle.castShadow = true; bristle.receiveShadow = true;
    this.mesh.add(bristle);
  }

  // Front magic orb (acts like propeller for existing rotation logic)
  var orbGeom = new THREE.SphereGeometry(8,8,8);
  var orbMat = new THREE.MeshPhongMaterial({color:Colors.blue, emissive:0x224444, shading:THREE.FlatShading});
  this.propeller = new THREE.Mesh(orbGeom, orbMat); // keep property name
  this.propeller.position.set(70,15,0);
  this.propeller.castShadow = true; this.propeller.receiveShadow = true;
  this.mesh.add(this.propeller);

  // Small ring around orb to visualize spin more clearly
  var ringGeom = new THREE.TorusGeometry(12,1.5,8,16);
  var ringMat = new THREE.MeshPhongMaterial({color:Colors.white, shading:THREE.FlatShading});
  var ring = new THREE.Mesh(ringGeom, ringMat);
  ring.rotation.x = Math.PI/2;
  this.propeller.add(ring);

  // Attach wizard avatar
  this.pilot = new Pilot();
  this.pilot.mesh.position.set(-10,30,0);
  this.mesh.add(this.pilot.mesh);

  this.mesh.castShadow = true;
  this.mesh.receiveShadow = true;
};

Sky = function(){
  this.mesh = new THREE.Object3D();
  this.nClouds = 20;
  this.clouds = [];
  var stepAngle = Math.PI*2 / this.nClouds;
  for(var i=0; i<this.nClouds; i++){
    var c = new Cloud();
    this.clouds.push(c);
    var a = stepAngle*i;
    var h = game.seaRadius + 150 + Math.random()*200;
    c.mesh.position.y = Math.sin(a)*h;
    c.mesh.position.x = Math.cos(a)*h;
    c.mesh.position.z = -300-Math.random()*500;
    c.mesh.rotation.z = a + Math.PI/2;
    var s = 1+Math.random()*2;
    c.mesh.scale.set(s,s,s);
    this.mesh.add(c.mesh);
  }
}

Sky.prototype.moveClouds = function(){
  for(var i=0; i<this.nClouds; i++){
    var c = this.clouds[i];
    c.rotate();
  }
  this.mesh.rotation.z += game.speed*deltaTime;

}

Sea = function(){
  var geom = new THREE.CylinderGeometry(game.seaRadius,game.seaRadius,game.seaLength,40,10);
  geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
  geom.mergeVertices();
  var l = geom.vertices.length;

  this.waves = [];

  for (var i=0;i<l;i++){
    var v = geom.vertices[i];
    //v.y = Math.random()*30;
    this.waves.push({y:v.y,
                     x:v.x,
                     z:v.z,
                     ang:Math.random()*Math.PI*2,
                     amp:game.wavesMinAmp + Math.random()*(game.wavesMaxAmp-game.wavesMinAmp),
                     speed:game.wavesMinSpeed + Math.random()*(game.wavesMaxSpeed - game.wavesMinSpeed)
                    });
  };
  var mat = new THREE.MeshPhongMaterial({
    color:Colors.blue,
    transparent:true,
    opacity:.8,
    shading:THREE.FlatShading,

  });

  this.mesh = new THREE.Mesh(geom, mat);
  this.mesh.name = "waves";
  this.mesh.receiveShadow = true;

}

Sea.prototype.moveWaves = function (){
  var verts = this.mesh.geometry.vertices;
  var l = verts.length;
  for (var i=0; i<l; i++){
    var v = verts[i];
    var vprops = this.waves[i];
    v.x =  vprops.x + Math.cos(vprops.ang)*vprops.amp;
    v.y = vprops.y + Math.sin(vprops.ang)*vprops.amp;
    vprops.ang += vprops.speed*deltaTime;
    this.mesh.geometry.verticesNeedUpdate=true;
  }
}

Cloud = function(){
  this.mesh = new THREE.Object3D();
  this.mesh.name = "cloud";
  var geom = new THREE.CubeGeometry(20,20,20);
  var mat = new THREE.MeshPhongMaterial({
    color:Colors.white,

  });

  //*
  var nBlocs = 3+Math.floor(Math.random()*3);
  for (var i=0; i<nBlocs; i++ ){
    var m = new THREE.Mesh(geom.clone(), mat);
    m.position.x = i*15;
    m.position.y = Math.random()*10;
    m.position.z = Math.random()*10;
    m.rotation.z = Math.random()*Math.PI*2;
    m.rotation.y = Math.random()*Math.PI*2;
    var s = .1 + Math.random()*.9;
    m.scale.set(s,s,s);
    this.mesh.add(m);
    m.castShadow = true;
    m.receiveShadow = true;

  }
  //*/
}

Cloud.prototype.rotate = function(){
  var l = this.mesh.children.length;
  for(var i=0; i<l; i++){
    var m = this.mesh.children[i];
    m.rotation.z+= Math.random()*.005*(i+1);
    m.rotation.y+= Math.random()*.002*(i+1);
  }
}

Ennemy = function(){
  var geom = new THREE.TetrahedronGeometry(8,2);
  var mat = new THREE.MeshPhongMaterial({
    color:Colors.red,
    shininess:0,
    specular:0xffffff,
    shading:THREE.FlatShading
  });
  this.mesh = new THREE.Mesh(geom,mat);
  this.mesh.castShadow = true;
  this.angle = 0;
  this.dist = 0;
}

EnnemiesHolder = function (){
  this.mesh = new THREE.Object3D();
  this.ennemiesInUse = [];
}

EnnemiesHolder.prototype.spawnEnnemies = function(){
  var nEnnemies = game.level;

  for (var i=0; i<nEnnemies; i++){
    var ennemy;
    if (ennemiesPool.length) {
      ennemy = ennemiesPool.pop();
    }else{
      ennemy = new Ennemy();
    }

    ennemy.angle = - (i*0.1);
    ennemy.distance = game.seaRadius + game.planeDefaultHeight + (-1 + Math.random() * 2) * (game.planeAmpHeight-20);
    ennemy.mesh.position.y = -game.seaRadius + Math.sin(ennemy.angle)*ennemy.distance;
    ennemy.mesh.position.x = Math.cos(ennemy.angle)*ennemy.distance;

    this.mesh.add(ennemy.mesh);
    this.ennemiesInUse.push(ennemy);
  }
}

EnnemiesHolder.prototype.rotateEnnemies = function(){
  for (var i=0; i<this.ennemiesInUse.length; i++){
    var ennemy = this.ennemiesInUse[i];
    ennemy.angle += game.speed*deltaTime*game.ennemiesSpeed;

    if (ennemy.angle > Math.PI*2) ennemy.angle -= Math.PI*2;

    ennemy.mesh.position.y = -game.seaRadius + Math.sin(ennemy.angle)*ennemy.distance;
    ennemy.mesh.position.x = Math.cos(ennemy.angle)*ennemy.distance;
    ennemy.mesh.rotation.z += Math.random()*.1;
    ennemy.mesh.rotation.y += Math.random()*.1;

    //var globalEnnemyPosition =  ennemy.mesh.localToWorld(new THREE.Vector3());
    var diffPos = airplane.mesh.position.clone().sub(ennemy.mesh.position.clone());
    var d = diffPos.length();
    if (d<game.ennemyDistanceTolerance){
      particlesHolder.spawnParticles(ennemy.mesh.position.clone(), 15, Colors.red, 3);

      ennemiesPool.unshift(this.ennemiesInUse.splice(i,1)[0]);
      this.mesh.remove(ennemy.mesh);
      game.planeCollisionSpeedX = 100 * diffPos.x / d;
      game.planeCollisionSpeedY = 100 * diffPos.y / d;
      ambientLight.intensity = 2;

      removeEnergy();
      i--;
    }else if (ennemy.angle > Math.PI){
      ennemiesPool.unshift(this.ennemiesInUse.splice(i,1)[0]);
      this.mesh.remove(ennemy.mesh);
      i--;
    }
  }
}

Particle = function(){
  var geom = new THREE.TetrahedronGeometry(3,0);
  var mat = new THREE.MeshPhongMaterial({
    color:0x009999,
    shininess:0,
    specular:0xffffff,
    shading:THREE.FlatShading
  });
  this.mesh = new THREE.Mesh(geom,mat);
}

Particle.prototype.explode = function(pos, color, scale){
  var _this = this;
  var _p = this.mesh.parent;
  this.mesh.material.color = new THREE.Color( color);
  this.mesh.material.needsUpdate = true;
  this.mesh.scale.set(scale, scale, scale);
  var targetX = pos.x + (-1 + Math.random()*2)*50;
  var targetY = pos.y + (-1 + Math.random()*2)*50;
  var speed = .6+Math.random()*.2;
  TweenMax.to(this.mesh.rotation, speed, {x:Math.random()*12, y:Math.random()*12});
  TweenMax.to(this.mesh.scale, speed, {x:.1, y:.1, z:.1});
  TweenMax.to(this.mesh.position, speed, {x:targetX, y:targetY, delay:Math.random() *.1, ease:Power2.easeOut, onComplete:function(){
      if(_p) _p.remove(_this.mesh);
      _this.mesh.scale.set(1,1,1);
      particlesPool.unshift(_this);
    }});
}

ParticlesHolder = function (){
  this.mesh = new THREE.Object3D();
  this.particlesInUse = [];
}

ParticlesHolder.prototype.spawnParticles = function(pos, density, color, scale){

  var nPArticles = density;
  for (var i=0; i<nPArticles; i++){
    var particle;
    if (particlesPool.length) {
      particle = particlesPool.pop();
    }else{
      particle = new Particle();
    }
    this.mesh.add(particle.mesh);
    particle.mesh.visible = true;
    var _this = this;
    particle.mesh.position.y = pos.y;
    particle.mesh.position.x = pos.x;
    particle.explode(pos,color, scale);
  }
}

Coin = function(){
  var geom = new THREE.TetrahedronGeometry(5,0);
  var mat = new THREE.MeshPhongMaterial({
    color:0x009999,
    shininess:0,
    specular:0xffffff,

    shading:THREE.FlatShading
  });
  this.mesh = new THREE.Mesh(geom,mat);
  this.mesh.castShadow = true;
  this.angle = 0;
  this.dist = 0;
}

CoinsHolder = function (nCoins){
  this.mesh = new THREE.Object3D();
  this.coinsInUse = [];
  this.coinsPool = [];
  for (var i=0; i<nCoins; i++){
    var coin = new Coin();
    this.coinsPool.push(coin);
  }
}

CoinsHolder.prototype.spawnCoins = function(){

  var nCoins = 1 + Math.floor(Math.random()*10);
  var d = game.seaRadius + game.planeDefaultHeight + (-1 + Math.random() * 2) * (game.planeAmpHeight-20);
  var amplitude = 10 + Math.round(Math.random()*10);
  for (var i=0; i<nCoins; i++){
    var coin;
    if (this.coinsPool.length) {
      coin = this.coinsPool.pop();
    }else{
      coin = new Coin();
    }
    this.mesh.add(coin.mesh);
    this.coinsInUse.push(coin);
    coin.angle = - (i*0.02);
    coin.distance = d + Math.cos(i*.5)*amplitude;
    coin.mesh.position.y = -game.seaRadius + Math.sin(coin.angle)*coin.distance;
    coin.mesh.position.x = Math.cos(coin.angle)*coin.distance;
  }
}

CoinsHolder.prototype.rotateCoins = function(){
  for (var i=0; i<this.coinsInUse.length; i++){
    var coin = this.coinsInUse[i];
    if (coin.exploding) continue;
    coin.angle += game.speed*deltaTime*game.coinsSpeed;
    if (coin.angle>Math.PI*2) coin.angle -= Math.PI*2;
    coin.mesh.position.y = -game.seaRadius + Math.sin(coin.angle)*coin.distance;
    coin.mesh.position.x = Math.cos(coin.angle)*coin.distance;
    coin.mesh.rotation.z += Math.random()*.1;
    coin.mesh.rotation.y += Math.random()*.1;

    //var globalCoinPosition =  coin.mesh.localToWorld(new THREE.Vector3());
    var diffPos = airplane.mesh.position.clone().sub(coin.mesh.position.clone());
    var d = diffPos.length();
    if (d<game.coinDistanceTolerance){
      this.coinsPool.unshift(this.coinsInUse.splice(i,1)[0]);
      this.mesh.remove(coin.mesh);
      particlesHolder.spawnParticles(coin.mesh.position.clone(), 5, 0x009999, .8);
      addEnergy();
      i--;
    }else if (coin.angle > Math.PI){
      this.coinsPool.unshift(this.coinsInUse.splice(i,1)[0]);
      this.mesh.remove(coin.mesh);
      i--;
    }
  }
}


// 3D Models
var sea;
var airplane;

function createPlane(){
  airplane = new AirPlane();
  airplane.mesh.scale.set(.25,.25,.25);
  airplane.mesh.position.y = game.planeDefaultHeight;
  scene.add(airplane.mesh);
}

function createSea(){
  sea = new Sea();
  sea.mesh.position.y = -game.seaRadius;
  scene.add(sea.mesh);
}

function createSky(){
  sky = new Sky();
  sky.mesh.position.y = -game.seaRadius;
  scene.add(sky.mesh);
}

function createCoins(){

  coinsHolder = new CoinsHolder(20);
  scene.add(coinsHolder.mesh)
}

function createEnnemies(){
  for (var i=0; i<10; i++){
    var ennemy = new Ennemy();
    ennemiesPool.push(ennemy);
  }
  ennemiesHolder = new EnnemiesHolder();
  //ennemiesHolder.mesh.position.y = -game.seaRadius;
  scene.add(ennemiesHolder.mesh)
}

function createParticles(){
  for (var i=0; i<10; i++){
    var particle = new Particle();
    particlesPool.push(particle);
  }
  particlesHolder = new ParticlesHolder();
  //ennemiesHolder.mesh.position.y = -game.seaRadius;
  scene.add(particlesHolder.mesh)
}

function loop(){

  newTime = new Date().getTime();
  deltaTime = newTime-oldTime;
  oldTime = newTime;

  if (game.status=="playing"){
    // Time limit check
    if (Date.now() - game.sessionStartTime >= game.timeLimitDuration){
      game.status = 'timeup';
      game.speed = 0;
      if (timeLimitMessage) timeLimitMessage.style.display = 'block';
    }
    // Blue pill spawn (rare)
    if (bluePillHolder && !bluePillHolder.pill && (game.distance - game.bluePillLastSpawn) > game.distanceForBluePillSpawn){
      bluePillHolder.spawnPill();
    }
    // In math mode we freeze speed within a level. Only step-increase on level up.
    if (Math.floor(game.distance)%game.distanceForLevelUpdate == 0 && Math.floor(game.distance) > game.levelLastUpdate){
      game.levelLastUpdate = Math.floor(game.distance);
      game.level++;
      fieldLevel.innerHTML = Math.floor(game.level);
      // Step increase: base speed = initSpeed + increment * (level-1)
      game.targetBaseSpeed = game.initSpeed + game.incrementSpeedByLevel*(game.level-1);
    }


    updatePlane();
    updateDistance();
    updateEnergy();
  // Smooth toward target (will be constant within a level)
  game.baseSpeed += (game.targetBaseSpeed - game.baseSpeed) * deltaTime * 0.02;
    game.speed = game.baseSpeed * game.planeSpeed;

  }else if(game.status=="gameover"){
    game.speed *= .99;
    airplane.mesh.rotation.z += (-Math.PI/2 - airplane.mesh.rotation.z)*.0002*deltaTime;
    airplane.mesh.rotation.x += 0.0003*deltaTime;
    game.planeFallSpeed *= 1.05;
    airplane.mesh.position.y -= game.planeFallSpeed*deltaTime;

    if (airplane.mesh.position.y <-200){
      showReplay();
      game.status = "waitingReplay";

    }
  }else if (game.status=="waitingReplay"){

  }else if (game.status=='timeup'){
    // Frozen state
  }


  airplane.propeller.rotation.x +=.2 + game.planeSpeed * deltaTime*.005;
  sea.mesh.rotation.z += game.speed*deltaTime;//*game.seaRotationSpeed;

  if ( sea.mesh.rotation.z > 2*Math.PI)  sea.mesh.rotation.z -= 2*Math.PI;

  ambientLight.intensity += (.5 - ambientLight.intensity)*deltaTime*0.005;

  if (answerBoxesHolder) answerBoxesHolder.rotateBoxes();
  if (bluePillHolder) bluePillHolder.rotatePill();
  //coinsHolder.rotateCoins();
  //ennemiesHolder.rotateEnnemies();

  sky.moveClouds();
  sea.moveWaves();

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

function updateDistance(){
  game.distance += game.speed*deltaTime*game.ratioSpeedDistance;
  fieldDistance.innerHTML = Math.floor(game.distance);
  var d = 502*(1-(game.distance%game.distanceForLevelUpdate)/game.distanceForLevelUpdate);
  levelCircle.setAttribute("stroke-dashoffset", d);

}

var blinkEnergy=false;

function updateEnergy(){
  game.energy -= game.speed*deltaTime*game.ratioSpeedEnergy;
  game.energy = Math.max(0, game.energy);
  energyBar.style.right = (100-game.energy)+"%";
  energyBar.style.backgroundColor = (game.energy<50)? "#f25346" : "#68c3c0";

  if (game.energy<30){
    energyBar.style.animationName = "blinking";
  }else{
    energyBar.style.animationName = "none";
  }

  if (game.energy <1){
    game.status = "gameover";
  }
}

function addEnergy(){
  game.energy += game.coinValue;
  game.energy = Math.min(game.energy, 100);
}

function addEnergyBoost(){
  game.energy += game.bluePillValue;
  game.energy = Math.min(game.energy, 100);
}

function removeEnergy(){
  game.energy -= game.ennemyValue;
  game.energy = Math.max(0, game.energy);
}



function updatePlane(){

  game.planeSpeed = normalize(mousePos.x,-.5,.5,game.planeMinSpeed, game.planeMaxSpeed);
  var targetY = normalize(mousePos.y,-.75,.75,game.planeDefaultHeight-game.planeAmpHeight, game.planeDefaultHeight+game.planeAmpHeight);
  var targetX = normalize(mousePos.x,-1,1,-game.planeAmpWidth*.7, -game.planeAmpWidth);

  game.planeCollisionDisplacementX += game.planeCollisionSpeedX;
  targetX += game.planeCollisionDisplacementX;


  game.planeCollisionDisplacementY += game.planeCollisionSpeedY;
  targetY += game.planeCollisionDisplacementY;

  airplane.mesh.position.y += (targetY-airplane.mesh.position.y)*deltaTime*game.planeMoveSensivity;
  airplane.mesh.position.x += (targetX-airplane.mesh.position.x)*deltaTime*game.planeMoveSensivity;

  airplane.mesh.rotation.z = (targetY-airplane.mesh.position.y)*deltaTime*game.planeRotXSensivity;
  airplane.mesh.rotation.x = (airplane.mesh.position.y-targetY)*deltaTime*game.planeRotZSensivity;
  var targetCameraZ = normalize(game.planeSpeed, game.planeMinSpeed, game.planeMaxSpeed, game.cameraNearPos, game.cameraFarPos);
  camera.fov = normalize(mousePos.x,-1,1,40, 80);
  camera.updateProjectionMatrix ()
  camera.position.y += (airplane.mesh.position.y - camera.position.y)*deltaTime*game.cameraSensivity;

  game.planeCollisionSpeedX += (0-game.planeCollisionSpeedX)*deltaTime * 0.03;
  game.planeCollisionDisplacementX += (0-game.planeCollisionDisplacementX)*deltaTime *0.01;
  game.planeCollisionSpeedY += (0-game.planeCollisionSpeedY)*deltaTime * 0.03;
  game.planeCollisionDisplacementY += (0-game.planeCollisionDisplacementY)*deltaTime *0.01;

  airplane.pilot.updateHairs();
}

function showReplay(){
  replayMessage.style.display="block";
}

function hideReplay(){
  replayMessage.style.display="none";
}

function normalize(v,vmin,vmax,tmin, tmax){
  var nv = Math.max(Math.min(v,vmax), vmin);
  var dv = vmax-vmin;
  var pc = (nv-vmin)/dv;
  var dt = tmax-tmin;
  var tv = tmin + (pc*dt);
  return tv;
}

var fieldDistance, energyBar, replayMessage, fieldLevel, levelCircle;
var questionTextElem;
var timeLimitMessage;
var bluePillHolder;

function init(event){

  // UI

  fieldDistance = document.getElementById("distValue");
  energyBar = document.getElementById("energyBar");
  replayMessage = document.getElementById("replayMessage");
  fieldLevel = document.getElementById("levelValue");
  levelCircle = document.getElementById("levelCircleStroke");
  questionTextElem = document.getElementById("questionText");
  timeLimitMessage = document.getElementById("timeLimitMessage");

  resetGame();
  createScene();

  createLights();
  createPlane();
  createSea();
  createSky();
  //createCoins();
  //createEnnemies();
  createParticles();
  createAnswerBoxes();
  generateNewQuestion();
  createBluePillHolder();

  document.addEventListener('mousemove', handleMouseMove, false);
  document.addEventListener('touchmove', handleTouchMove, false);
  document.addEventListener('touchstart', handleTouchStart, false);
  document.addEventListener('mouseup', handleMouseUp, false);
  document.addEventListener('touchend', handleTouchEnd, false);

  loop();
}

window.addEventListener('load', init, false);

// ===================== MATH LEARNING ADDITIONS =====================
function generateNewQuestion(){
  var a,b,op,answer;
  do {
    a = Math.floor(Math.random()*10); // 0..9
    b = Math.floor(Math.random()*10);
    op = Math.random() < 0.5 ? '+' : '-';
    if (op === '-' && b > a){ var t=a; a=b; b=t; }
    answer = op==='+' ? a+b : a-b;
  } while(answer < 0 || answer > 9); // ensure result within 0..9
  game.currentQuestion = a + ' ' + op + ' ' + b + ' = ?';
  game.correctAnswer = answer;
  if (questionTextElem) questionTextElem.textContent = game.currentQuestion;
  if (answerBoxesHolder) answerBoxesHolder.spawnBoxes();
}

function createAnswerBoxes(){
  answerBoxesHolder = new AnswerBoxesHolder();
  scene.add(answerBoxesHolder.mesh);
}

function createNumberTexture(num){
  var size = 128;
  var canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,size,size);
  ctx.fillStyle = '#6d4b8e';
  ctx.font = 'bold 72px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(num.toString(), size/2, size/2);
  var tex = new THREE.Texture(canvas); tex.needsUpdate = true; return tex;
}

AnswerBox = function(isCorrect, value){
  this.mesh = new THREE.Object3D();
  // unified purple color for all boxes
  this.core = new THREE.Mesh(new THREE.BoxGeometry(20,20,20), new THREE.MeshPhongMaterial({color:Colors.purple}));
  this.core.castShadow = true; this.core.receiveShadow = true;
  var numMat = new THREE.MeshPhongMaterial({map:createNumberTexture(value)});
  var face = new THREE.Mesh(new THREE.PlaneGeometry(18,18), numMat);
  face.position.set(0,0,10.1);
  this.mesh.add(this.core);
  this.mesh.add(face);
  this.isCorrect = isCorrect;
  this.value = value;
  // orbital movement properties
  this.angle = 0;
  this.distance = 0;
  this.verticalOffset = 0;
}

AnswerBoxesHolder = function(){
  this.mesh = new THREE.Object3D();
  this.boxes = [];
}

AnswerBoxesHolder.prototype.clear = function(){
  while(this.boxes.length){
    var b = this.boxes.pop();
    this.mesh.remove(b.mesh);
  }
}

AnswerBoxesHolder.prototype.spawnBoxes = function(){
  this.clear();
  if (game.correctAnswer==null) return;
  // Determine wrong answer distinct within 0..9
  var wrong; do { wrong = Math.floor(Math.random()*10); } while (wrong === game.correctAnswer);
  var answers = [game.correctAnswer, wrong];
  answers.sort(function(){return Math.random()-0.5});
  var startAngle = Math.PI/2 - 0.7; // start a bit before reaching player height
  var baseDistance = game.seaRadius + game.planeDefaultHeight + 40;
  var separation = 40; // vertical separation between the two choices
  for (var i=0;i<answers.length;i++){
    var val = answers[i];
    var isCorrect = val===game.correctAnswer;
    var box = new AnswerBox(isCorrect,val);
    box.angle = startAngle; // both start together
    box.distance = baseDistance;
    // One above, one below relative to plane default height region
    box.verticalOffset = (i===0 ? separation : -separation);
    // initial placement
    box.mesh.position.y = -game.seaRadius + Math.sin(box.angle)*box.distance + box.verticalOffset;
    box.mesh.position.x = Math.cos(box.angle)*box.distance;
    this.mesh.add(box.mesh);
    this.boxes.push(box);
  }
}

AnswerBoxesHolder.prototype.rotateBoxes = function(){
  for (var i=0;i<this.boxes.length;i++){
    var box = this.boxes[i];
    box.angle += game.speed*deltaTime*game.coinsSpeed; // reuse speed
    if (box.angle > Math.PI*2) box.angle -= Math.PI*2;
    box.mesh.position.y = -game.seaRadius + Math.sin(box.angle)*box.distance + box.verticalOffset;
    box.mesh.position.x = Math.cos(box.angle)*box.distance;
    // Collision test
    var diff = airplane.mesh.position.clone().sub(box.mesh.position.clone());
    var d = diff.length();
    if (d < game.coinDistanceTolerance){
      if (box.isCorrect){
        addEnergy();
        particlesHolder.spawnParticles(box.mesh.position.clone(), 8, 0x68c3c0, 1);
        generateNewQuestion();
      } else {
        particlesHolder.spawnParticles(box.mesh.position.clone(), 15, Colors.red, 2);
        game.status = "gameover";
      }
      return;
    } else if (box.angle > Math.PI){
      // passed behind player without collision, generate new question
      generateNewQuestion();
      return;
    }
  }
}

// ===================== BLUE ENERGY PILL =====================
function createBluePillHolder(){
  bluePillHolder = new BluePillHolder();
  scene.add(bluePillHolder.mesh);
}

var BluePill = function(){
  var geom = new THREE.SphereGeometry(10, 16, 16);
  var mat = new THREE.MeshPhongMaterial({color:Colors.blue, emissive:0x113333, shading:THREE.FlatShading});
  this.mesh = new THREE.Mesh(geom, mat);
  this.mesh.castShadow = true;
  this.angle = 0;
  this.distance = 0;
};

var BluePillHolder = function(){
  this.mesh = new THREE.Object3D();
  this.pill = null;
};

BluePillHolder.prototype.spawnPill = function(){
  if (this.pill) return;
  var pill = new BluePill();
  pill.angle = Math.PI/2 - 0.65; // similar entry path
  pill.distance = game.seaRadius + game.planeDefaultHeight + 80;
  pill.mesh.position.y = -game.seaRadius + Math.sin(pill.angle)*pill.distance;
  pill.mesh.position.x = Math.cos(pill.angle)*pill.distance;
  this.mesh.add(pill.mesh);
  this.pill = pill;
};

BluePillHolder.prototype.rotatePill = function(){
  if (!this.pill || game.status!=='playing') return;
  var pill = this.pill;
  pill.angle += game.speed*deltaTime*game.coinsSpeed * 0.85;
  if (pill.angle > Math.PI*2) pill.angle -= Math.PI*2;
  pill.mesh.position.y = -game.seaRadius + Math.sin(pill.angle)*pill.distance;
  pill.mesh.position.x = Math.cos(pill.angle)*pill.distance;
  // collision
  var diff = airplane.mesh.position.clone().sub(pill.mesh.position.clone());
  var d = diff.length();
  if (d < game.coinDistanceTolerance){
    addEnergyBoost();
    particlesHolder.spawnParticles(pill.mesh.position.clone(), 12, 0x68c3c0, 1.2);
    this.mesh.remove(pill.mesh);
    this.pill = null;
    game.bluePillLastSpawn = game.distance;
  } else if (pill.angle > Math.PI){
    this.mesh.remove(pill.mesh);
    this.pill = null;
    game.bluePillLastSpawn = game.distance;
  }
};
