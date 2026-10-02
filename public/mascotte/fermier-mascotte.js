/*!
 * fermier-mascotte.js — mascotte fermier 3D animée pour chatbot.
 * Dépendance : three.js (testé avec r128, chargé avant ce fichier, ou passé via options.THREE).
 *
 *   const m = FermierMascotte.create(element, { framing: 'bust' });
 *   m.setState('thinking');   // 'idle' | 'listening' | 'thinking' | 'talking' | 'happy'
 *   m.cheer();                // saute et lève le pouce
 *   m.setFraming('full');     // 'bust' (tête et épaules) ou 'full' (en pied)
 *   m.destroy();
 */
(function(root){
'use strict';
function create(container,options){
  const o=Object.assign({framing:'bust',decor:false,shadows:false,followPointer:true,autoCheer:false,THREE:null},options||{});
  const THREE=o.THREE||root.THREE;
  if(!THREE) throw new Error('FermierMascotte : three.js doit être chargé avant fermier-mascotte.js');
  const reduce=root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const modern=parseInt(THREE.REVISION,10)>=155, L=modern?Math.PI:1;

  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(root.devicePixelRatio||1,2));
  if('outputColorSpace' in renderer) renderer.outputColorSpace='srgb'; else renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.25;
  renderer.shadowMap.enabled=!!o.shadows; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const canvas=renderer.domElement;
  canvas.style.cssText='display:block;width:100%;height:100%';
  canvas.setAttribute('aria-hidden','true');
  container.appendChild(canvas);

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(30,1,0.1,100);

  /* ---------- lumières ---------- */
  scene.add(new THREE.HemisphereLight(0xffffff,0x8f8062,0.85*L));
  const key=new THREE.DirectionalLight(0xfff4e0,1.15*L); key.position.set(3.5,7,5.5);
  if(o.shadows){ key.castShadow=true; key.shadow.mapSize.set(1024,1024);
    Object.assign(key.shadow.camera,{left:-3.5,right:3.5,top:5,bottom:-1.5,near:1,far:20});
    key.shadow.camera.updateProjectionMatrix(); key.shadow.bias=-0.0006; }
  scene.add(key);
  const rim=new THREE.DirectionalLight(0xffe2b0,0.55*L); rim.position.set(-4,4,-5); scene.add(rim);
  const fill=new THREE.DirectionalLight(0xdfeaff,0.3*L); fill.position.set(-5,2,4); scene.add(fill);

  /* ---------- matières ---------- */
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const std=(color,rough,extra)=>new THREE.MeshStandardMaterial(Object.assign({color:color,roughness:rough},extra||{}));
  const DS=THREE.DoubleSide;
  const M={
    skin:std(0x96552f,0.55), cream:std(0xf3e2b3,0.8), green:std(0x9d4f36,0.85),
    green2:std(0xd87750,0.85), black:std(0x151515,0.6), white:std(0xffffff,0.35),
    iris:std(0x4a2a14,0.4), mouth:std(0x6b1f1f,0.6,{side:DS}), teeth:std(0xffffff,0.35,{side:DS}),
    lips:std(0x7a4124,0.6), wood:std(0xb5723c,0.7),
    metal:std(0x9aa0a6,0.35,{metalness:0.85}), steel:std(0x5d6268,0.4,{metalness:0.9}),
    sole:std(0x1a1d1a,0.9), soil:std(0x5a3b24,1), sprout:std(0xd79a33,0.7),
    greenDS:std(0x9d4f36,0.85,{side:DS}), green2DS:std(0xd87750,0.85,{side:DS}),
    boot:new THREE.MeshPhysicalMaterial({color:0x343960,roughness:0.35,clearcoat:0.6,clearcoatRoughness:0.3})
  };
  function strawTexture(rx,ry){
    const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d');
    g.fillStyle='#dba23a'; g.fillRect(0,0,128,128);
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){
      const ox=x*16+(y%2?8:0), oy=y*16;
      g.fillStyle=(x+y)%2?'#e9b955':'#c98a26';
      g.beginPath(); g.ellipse(ox+8,oy+8,7.2,5,(y%2?0.5:-0.5),0,Math.PI*2); g.fill();
      g.strokeStyle='rgba(120,70,10,.55)'; g.lineWidth=1.2; g.stroke();
    }
    const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rx,ry);
    if('colorSpace' in t) t.colorSpace='srgb'; else t.encoding=THREE.sRGBEncoding;
    return t;
  }
  const strawA=strawTexture(14,3), strawB=strawTexture(22,4);
  M.strawCrown=new THREE.MeshStandardMaterial({map:strawA,bumpMap:strawA,bumpScale:0.02,roughness:0.85,side:DS});
  M.strawBrim=new THREE.MeshStandardMaterial({map:strawB,bumpMap:strawB,bumpScale:0.02,roughness:0.85,side:DS});

  /* ---------- aides ---------- */
  const UP=V(0,1,0);
  function mesh(geo,mat,parent,pos,scale){
    const m=new THREE.Mesh(geo,mat); if(pos)m.position.copy(pos); if(scale)m.scale.copy(scale); parent.add(m); return m;
  }
  function limb(parent,a,b,r1,r2,mat){
    const d=b.clone().sub(a), len=d.length();
    const c=mesh(new THREE.CylinderGeometry(r2,r1,len,24,1,true),mat,parent,a.clone().add(b).multiplyScalar(0.5));
    c.quaternion.setFromUnitVectors(UP,d.normalize());
    mesh(new THREE.SphereGeometry(r1,24,16),mat,parent,a);
    mesh(new THREE.SphereGeometry(r2,24,16),mat,parent,b);
  }
  function tube(parent,pts,r,mat,closed){
    const curve=new THREE.CatmullRomCurve3(pts,!!closed);
    mesh(new THREE.TubeGeometry(curve,48,r,10,!!closed),mat,parent);
    if(!closed){ mesh(new THREE.SphereGeometry(r,10,8),mat,parent,pts[0]); mesh(new THREE.SphereGeometry(r,10,8),mat,parent,pts[pts.length-1]); }
  }
  const lathe=(pts,seg)=>new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])),seg||40);

  const farmer=new THREE.Group(); scene.add(farmer);

  /* ---------- décor facultatif : parcelle, pousses, papillons ---------- */
  const sprouts=[], flies=[];
  if(o.decor){
    const plot=mesh(new THREE.CylinderGeometry(2.25,2.35,0.16,64),M.soil,scene,V(0.15,-0.08,0)); plot.receiveShadow=true;
    for(let i=0;i<5;i++){ const f=mesh(new THREE.TorusGeometry(0.45+i*0.4,0.035,8,64),M.soil,scene,V(0.15,0,0)); f.rotation.x=Math.PI/2; f.receiveShadow=true; }
    [[-1.55,0.75],[-1.2,1.3],[-1.75,0.1],[0.2,1.75],[-0.55,1.65]].forEach((p,i)=>{
      const s=new THREE.Group(); s.position.set(p[0],0,p[1]); s.rotation.y=i*1.3; scene.add(s); sprouts.push(s);
      limb(s,V(0,0,0),V(0,0.16,0),0.018,0.014,M.sprout);
      [-1,1].forEach(k=>{ const l=mesh(new THREE.SphereGeometry(0.09,12,8),M.sprout,s,V(k*0.08,0.19,0),V(1,0.25,0.55)); l.rotation.z=k*0.5; });
    });
    [[0xff9f1c,1.9,2.6,1,0],[0x3fb6e8,1.55,1.5,-1,2.4],[0xf25c8a,2.1,3.4,1,4.4]].forEach(d=>{
      const g=new THREE.Group(); scene.add(g);
      limb(g,V(0,0,-0.05),V(0,0,0.05),0.012,0.012,M.black);
      const wm=new THREE.MeshStandardMaterial({color:d[0],roughness:0.6,side:DS});
      const wings=[-1,1].map(k=>{ const p=new THREE.Group(); g.add(p);
        const geo=new THREE.CircleGeometry(0.085,14); geo.rotateX(-Math.PI/2); geo.scale(1,1,1.25); geo.translate(k*0.085,0,0);
        p.add(new THREE.Mesh(geo,wm)); return {p:p,k:k}; });
      flies.push({g:g,wings:wings,R:d[1],h:d[2],dir:d[3],ph:d[4]});
    });
  }
  function moveFlies(t){
    flies.forEach(f=>{
      const a=f.dir*t*0.55+f.ph, R=f.R+Math.sin(t*0.7+f.ph)*0.3;
      f.g.position.set(0.15+R*Math.cos(a),f.h+Math.sin(t*1.3+f.ph)*0.35,R*Math.sin(a));
      f.g.rotation.y=-a+(f.dir>0?0:Math.PI);
      const flap=0.15+Math.abs(Math.sin(t*16+f.ph))*1.1;
      f.wings.forEach(w=>{ w.p.rotation.z=w.k*flap; });
    });
  }
  moveFlies(0);

  /* ---------- bottes et jambes ---------- */
  [-1,1].forEach(s=>{
    const b=new THREE.Group(); b.position.set(s*0.37,0,0); b.rotation.y=s*0.28; farmer.add(b);
    mesh(new THREE.SphereGeometry(1,24,16),M.sole,b,V(0,0.075,0.17),V(0.3,0.075,0.47));
    mesh(new THREE.SphereGeometry(1,24,16),M.boot,b,V(0,0.24,0.17),V(0.28,0.2,0.44));
    mesh(new THREE.CylinderGeometry(0.275,0.235,0.82,28),M.boot,b,V(0,0.6,0));
    mesh(new THREE.TorusGeometry(0.275,0.032,10,32),M.boot,b,V(0,1.0,0)).rotation.x=Math.PI/2;
    limb(farmer,V(s*0.27,1.68,0),V(s*0.36,0.95,0),0.3,0.25,M.green);
  });

  /* ---------- salopette et chemise ---------- */
  mesh(lathe([[0,1.48],[0.4,1.5],[0.55,1.68],[0.56,1.95],[0.545,2.14]]),M.greenDS,farmer,null,V(1,1,0.85));
  mesh(new THREE.CylinderGeometry(0.565,0.565,0.09,40),M.green2,farmer,V(0,2.06,0),V(1,1,0.85));
  mesh(lathe([[0,1.75],[0.45,1.8],[0.5,2.0],[0.53,2.4],[0.5,2.7],[0.36,2.88],[0.2,2.95],[0,2.96]]),M.cream,farmer,null,V(1,1,0.82));
  mesh(new THREE.CylinderGeometry(0.545,0.56,0.58,28,1,true,-0.85,1.7),M.greenDS,farmer,V(0,2.38,0),V(1,1,0.84));
  mesh(new THREE.CylinderGeometry(0.565,0.575,0.27,14,1,true,-0.34,0.68),M.green2DS,farmer,V(0,2.36,0),V(1,1,0.84));
  mesh(new THREE.CylinderGeometry(0.57,0.572,0.05,14,1,true,-0.36,0.72),M.greenDS,farmer,V(0,2.5,0),V(1,1,0.84));
  [-1,1].forEach(s=>{
    tube(farmer,[V(s*0.33,2.58,0.385),V(s*0.35,2.8,0.3),V(s*0.34,2.92,0.02),V(s*0.28,2.74,-0.37),V(s*0.16,2.2,-0.46)],0.05,M.green);
    mesh(new THREE.BoxGeometry(0.1,0.12,0.035),M.metal,farmer,V(s*0.33,2.62,0.39)).rotation.y=s*0.55;
    mesh(new THREE.SphereGeometry(0.038,14,10),M.metal,farmer,V(s*0.325,2.5,0.39),V(1,1,0.5));
    mesh(new THREE.SphereGeometry(0.03,12,8),M.metal,farmer,V(s*0.545,1.96,0.1),V(0.5,1,1));
    mesh(new THREE.SphereGeometry(0.03,12,8),M.metal,farmer,V(s*0.55,1.84,0.1),V(0.5,1,1));
    mesh(new THREE.SphereGeometry(0.23,24,16),M.cream,farmer,V(s*0.56,2.72,0.01));
    mesh(new THREE.SphereGeometry(1,16,10),M.cream,farmer,V(s*0.15,2.93,0.2),V(0.15,0.045,0.14)).rotation.set(0.75,0,-s*0.45);
  });
  mesh(new THREE.TorusGeometry(0.2,0.06,10,28),M.cream,farmer,V(0,2.96,0)).rotation.x=Math.PI/2;
  [2.72,2.56].forEach(y=>mesh(new THREE.SphereGeometry(0.022,10,8),M.cream,farmer,V(0,y,0.445)));
  limb(farmer,V(0,2.9,0),V(0,3.06,0),0.17,0.17,M.skin);

  /* ---------- bras gauche posé sur la houe ---------- */
  (function(){
    const S=V(0.58,2.7,0.02),E=V(0.9,2.24,0.02),W=V(1.04,2.0,0.3),H=V(1.07,1.88,0.37);
    limb(farmer,S,E,0.2,0.19,M.cream);
    limb(farmer,E,E.clone().lerp(W,0.3),0.2,0.2,M.cream);
    limb(farmer,E,W,0.15,0.13,M.skin);
    mesh(new THREE.SphereGeometry(0.19,24,16),M.skin,farmer,H,V(1.05,0.9,1));
    for(let i=0;i<4;i++){ const x=H.x-0.115+i*0.078; limb(farmer,V(x,H.y+0.03,H.z+0.15),V(x,H.y-0.1,H.z+0.13),0.045,0.042,M.skin); }
    limb(farmer,V(H.x-0.17,H.y+0.02,H.z+0.02),V(H.x-0.12,H.y-0.08,H.z+0.12),0.05,0.045,M.skin);
    const T=V(1.06,1.9,0.37),B=V(1.32,0.12,0.5);
    limb(farmer,T,B,0.052,0.052,M.wood);
    limb(farmer,B.clone().lerp(T,0.14),B,0.07,0.075,M.steel);
    const sh=new THREE.Shape(); sh.moveTo(0,-0.13); sh.lineTo(0.5,-0.3); sh.lineTo(0.56,0.22); sh.lineTo(0,0.13); sh.closePath();
    mesh(new THREE.ExtrudeGeometry(sh,{depth:0.035,bevelEnabled:true,bevelSize:0.012,bevelThickness:0.012,bevelSegments:2}),M.metal,farmer,V(1.3,0.03,0.5))
      .rotation.set(-Math.PI/2,-0.1,-0.12);
  })();

  /* ---------- bras droit, pouce levé ---------- */
  const S_R=V(-0.58,2.7,0.02);
  const armPivot=new THREE.Group(); armPivot.position.copy(S_R); farmer.add(armPivot);
  const arm=new THREE.Group(); arm.position.copy(S_R).negate(); armPivot.add(arm);
  (function(){
    const E=V(-0.93,2.3,0.2),W=V(-0.9,2.6,0.7),H=V(-0.9,2.68,0.84);
    limb(arm,S_R,E,0.2,0.19,M.cream);
    limb(arm,E,E.clone().lerp(W,0.28),0.2,0.2,M.cream);
    limb(arm,E,W,0.15,0.135,M.skin);
    mesh(new THREE.SphereGeometry(0.2,24,16),M.skin,arm,H,V(1,1.05,0.95));
    for(let i=0;i<4;i++){ const y=H.y+0.11-i*0.082; limb(arm,V(H.x-0.11,y,H.z+0.14),V(H.x+0.07,y,H.z+0.15),0.047,0.047,M.skin); }
    limb(arm,V(H.x+0.09,H.y+0.12,H.z+0.02),V(H.x+0.1,H.y+0.42,H.z-0.02),0.07,0.062,M.skin);
  })();

  /* ---------- tête ---------- */
  const headPivot=new THREE.Group(); headPivot.position.set(0,3.0,0); farmer.add(headPivot);
  const head=new THREE.Group(); head.position.set(0,-3.0,0); headPivot.add(head);
  const C={x:0,y:3.45,z:0.02,rx:0.52,ry:0.58,rz:0.52};
  const surf=(x,y,off)=>C.z+C.rz*Math.sqrt(Math.max(0,1-Math.pow(x/C.rx,2)-Math.pow((y-C.y)/C.ry,2)))+(off||0);
  const P=(x,y,off)=>V(x,y,surf(x,y,off));
  mesh(new THREE.SphereGeometry(1,48,32),M.skin,head,V(C.x,C.y,C.z),V(C.rx,C.ry,C.rz));
  const eyes=[], pupils=[], brows=[];
  [-1,1].forEach(s=>{
    mesh(new THREE.SphereGeometry(1,20,14),M.skin,head,V(s*0.53,3.42,0),V(0.07,0.15,0.11)).rotation.y=-s*0.35;
    const eye=new THREE.Group(); eye.position.set(s*0.2,3.53,0); head.add(eye); eyes.push(eye);
    const ez=surf(s*0.2,3.53);
    mesh(new THREE.SphereGeometry(1,24,16),M.white,eye,V(0,0,ez-0.03),V(0.125,0.135,0.06));
    [mesh(new THREE.CircleGeometry(0.068,24),M.iris,eye,V(-s*0.012,-0.005,ez+0.031)),
     mesh(new THREE.CircleGeometry(0.036,20),M.black,eye,V(-s*0.012,-0.005,ez+0.033)),
     mesh(new THREE.CircleGeometry(0.017,12),M.white,eye,V(-s*0.012+0.025,0.022,ez+0.035))
    ].forEach(p=>{ p.userData.bx=p.position.x; p.userData.by=p.position.y; pupils.push(p); });
    const brow=new THREE.Group(); head.add(brow); brows.push(brow);
    tube(brow,[P(s*0.08,3.705,0.02),P(s*0.2,3.76,0.02),P(s*0.34,3.71,0.02)],0.028,M.black);
    tube(head,[P(s*0.26,3.2,0.012),P(s*0.24,3.1,0.012),P(s*0.13,2.99,0.012)],0.02,M.black);
  });
  mesh(new THREE.SphereGeometry(1,20,14),M.skin,head,V(0,3.38,surf(0,3.38)+0.02),V(0.125,0.085,0.09));
  // bouche : groupe à part pour l'animer quand il parle
  const MY=3.2, mouth=new THREE.Group(); mouth.position.set(0,MY,0); head.add(mouth);
  const bend=(x,y)=>V(x,y,surf(0,MY)+0.02+0.5*y-0.85*x*x);
  function mouthPart(ctrlY,mat,dz){
    const s=new THREE.Shape(); s.moveTo(-0.2,0.045); s.quadraticCurveTo(0,-0.035,0.2,0.045); s.quadraticCurveTo(0,ctrlY,-0.2,0.045);
    const g=new THREE.ShapeGeometry(s,24), p=g.attributes.position;
    for(let i=0;i<p.count;i++){ const v=bend(p.getX(i),p.getY(i)); p.setXYZ(i,v.x,v.y,v.z+dz); }
    g.computeVertexNormals(); mesh(g,mat,mouth); return s;
  }
  const mShape=mouthPart(-0.27,M.mouth,0); mouthPart(-0.115,M.teeth,0.006);
  tube(mouth,mShape.getPoints(20).slice(0,-1).map(p=>bend(p.x,p.y)),0.016,M.lips,true);
  tube(head,[P(-0.27,3.2,0.012),P(-0.2,3.275,0.012),P(0,3.25,0.012),P(0.2,3.275,0.012),P(0.27,3.2,0.012)],0.02,M.black);
  tube(head,[P(-0.5,3.6,0.01),P(-0.5,3.44,0.01),P(-0.44,3.22,0.01),P(-0.34,3.05,0.01),P(-0.2,2.95,0.01),P(0,2.91,0.01),P(0.2,2.95,0.01),P(0.34,3.05,0.01),P(0.44,3.22,0.01),P(0.5,3.44,0.01),P(0.5,3.6,0.01)],0.035,M.black);
  mesh(new THREE.SphereGeometry(1,16,12),M.black,head,V(0,2.98,surf(0,2.98)),V(0.11,0.09,0.07));
  mesh(new THREE.SphereGeometry(1,40,20,0,Math.PI*2,0,Math.PI*0.4),M.black,head,V(C.x,C.y,C.z),V(C.rx*1.035,C.ry*1.035,C.rz*1.035)).rotation.x=-0.45;
  const hat=new THREE.Group(); hat.position.set(0,3.86,-0.05); hat.rotation.set(-0.25,0,0.06); head.add(hat);
  mesh(lathe([[0,0.5],[0.3,0.495],[0.45,0.43],[0.52,0.28],[0.56,0]],48),M.strawCrown,hat);
  mesh(lathe([[0.55,0],[0.85,-0.03],[1.0,0.02],[1.06,0.1],[1.03,0.03],[0.86,-0.08],[0.55,-0.06]],64),M.strawBrim,hat);
  mesh(new THREE.TorusGeometry(1.05,0.03,8,64),M.strawBrim,hat,V(0,0.08,0)).rotation.x=Math.PI/2;

  if(o.shadows) farmer.traverse(n=>{ if(n.isMesh){ n.castShadow=true; n.receiveShadow=true; } });

  /* ---------- cadrage ---------- */
  const FRAMES={
    bust:{target:V(-0.1,3.5,0),h:2.25,w:2.5,dir:V(0.06,0.04,1)},
    full:{target:V(0.15,2.25,0),h:5.2,w:4.5,dir:V(0.2,0.08,1)}
  };
  let framing=FRAMES[o.framing]?o.framing:'bust';
  function resize(){
    const w=container.clientWidth,h=container.clientHeight; if(!w||!h)return;
    renderer.setSize(w,h,false); camera.aspect=w/h;
    const f=FRAMES[framing], t=Math.tan(camera.fov*Math.PI/360);
    const d=Math.max(f.h/(2*t),f.w/(2*t*camera.aspect));
    camera.position.copy(f.dir).normalize().multiplyScalar(d).add(f.target);
    camera.lookAt(f.target); camera.updateProjectionMatrix();
    if(!running) renderer.render(scene,camera);
  }

  /* ---------- états et animation ---------- */
  const STATES={
    idle:     {yaw:0,    pitch:0,     tilt:0,     brow:0,    eyeX:0,    eyeY:0,   follow:1,   talk:0, speed:1},
    listening:{yaw:0,    pitch:0.07,  tilt:0.13,  brow:0.03, eyeX:0,    eyeY:0,   follow:1,   talk:0, speed:0.7},
    thinking: {yaw:0.28, pitch:-0.14, tilt:-0.08, brow:0.045,eyeX:0.9,  eyeY:-0.9,follow:0,   talk:0, speed:0.5},
    talking:  {yaw:0,    pitch:0,     tilt:0,     brow:0.015,eyeX:0,    eyeY:0,   follow:0.6, talk:1, speed:1.2}
  };
  let state='idle', cheer=-1, running=false, raf=0, visible=true, destroyed=false;
  const cur=Object.assign({},STATES.idle), look={x:0,y:0}, tgt={x:0,y:0};
  let time=0, last=0, nextBlink=2, blinkEye=-1, nextCheer=5;

  function onPointer(e){
    const r=container.getBoundingClientRect();
    tgt.x=Math.max(-1,Math.min(1,(e.clientX-(r.left+r.width/2))/420));
    tgt.y=Math.max(-1,Math.min(1,(e.clientY-(r.top+r.height/2))/420));
  }
  if(o.followPointer) root.addEventListener('pointermove',onPointer,{passive:true});

  function frame(now){
    raf=0; if(destroyed) return;
    const dt=Math.min((now-last)/1000||0.016,0.05); last=now; time+=dt; const t=time;
    const S=STATES[state], q=Math.min(1,dt*6);
    Object.keys(S).forEach(k=>{ cur[k]+=(S[k]-cur[k])*q; });
    look.x+=(tgt.x*cur.follow-look.x)*q; look.y+=(tgt.y*cur.follow-look.y)*q;
    let armX=0, headX=0, browUp=0, hop=0, squash=0;
    if(cheer<0&&o.autoCheer&&state==='idle'&&t>nextCheer) cheer=0;
    if(cheer>=0){
      cheer+=dt; const k=Math.min(cheer/1.6,1), env=Math.sin(k*Math.PI);
      armX=-0.4*env+Math.sin(cheer*15)*0.13*env; headX=-0.12*env; browUp=0.04*env;
      hop=Math.abs(Math.sin(k*Math.PI*2))*0.16*env; squash=Math.cos(k*Math.PI*4)*0.03*env;
      if(k>=1){ cheer=-1; nextCheer=t+7+Math.random()*5; }
    }
    const sp=cur.speed, talk=cur.talk;
    farmer.position.y=hop;
    farmer.rotation.z=Math.sin(t*1.1)*0.02;
    farmer.scale.y=1+Math.sin(t*2.2)*0.008-squash;
    headPivot.rotation.set(
      Math.sin(t*1.3*sp)*0.03+look.y*0.13+cur.pitch+headX+Math.sin(t*7)*0.025*talk,
      Math.sin(t*0.6*sp)*0.1+look.x*0.32+cur.yaw,
      Math.sin(t*0.9*sp)*0.05+cur.tilt);
    armPivot.rotation.set(Math.sin(t*2.2)*0.07+armX+Math.sin(t*4.5)*0.09*talk,0,Math.sin(t*1.6)*0.05);
    hat.rotation.x=-0.25+Math.sin(t*1.3+0.8)*0.025-hop*0.5;
    const ex=look.x+cur.eyeX, ey=look.y+cur.eyeY;
    pupils.forEach(p=>{ p.position.x=p.userData.bx+ex*0.024; p.position.y=p.userData.by-ey*0.018; });
    const idleBrow=Math.max(0,Math.sin(t*0.8)-0.8)*0.15;
    brows.forEach((b,i)=>{ b.position.y=browUp+idleBrow+cur.brow*(state==='thinking'&&i===0?0.3:1); });
    mouth.scale.y=1+talk*(-0.3+0.5*Math.abs(Math.sin(t*11))*(0.65+0.35*Math.sin(t*3.1)));
    const b=t-nextBlink, dur=blinkEye>=0?0.45:0.16;
    const sy=(b>0&&b<dur)?Math.max(0.08,Math.abs(b-dur/2)/(dur/2)):1;
    eyes.forEach((e,i)=>{ e.scale.y=(blinkEye<0||blinkEye===i)?sy:1; });
    if(b>dur){ nextBlink=t+1.8+Math.random()*2.8; blinkEye=(state==='idle'&&Math.random()<0.2)?(Math.random()<0.5?0:1):-1; }
    sprouts.forEach((s,i)=>{ s.rotation.z=Math.sin(t*1.7+i*1.1)*0.14; });
    moveFlies(t);
    renderer.render(scene,camera);
    if(running) raf=root.requestAnimationFrame(frame);
  }
  function start(){ if(running||destroyed||reduce||!visible||document.hidden) return; running=true; last=performance.now(); raf=root.requestAnimationFrame(frame); }
  function stop(){ running=false; if(raf){ root.cancelAnimationFrame(raf); raf=0; } }
  const onVis=()=>{ if(document.hidden) stop(); else start(); };
  document.addEventListener('visibilitychange',onVis);
  const ro=new ResizeObserver(resize); ro.observe(container);
  let io=null;
  if('IntersectionObserver' in root){ io=new IntersectionObserver(en=>{ visible=en[0].isIntersecting; if(visible) start(); else stop(); }); io.observe(container); }
  resize(); start();

  // avec « réduire les animations », l'image reste fixe mais suit les changements d'état
  function still(){ if(!running&&!destroyed){ Object.assign(cur,STATES[state]); last=performance.now(); frame(last); } }
  if(reduce) still();

  return {
    canvas:canvas,
    get state(){ return state; },
    setState(name){
      if(name==='happy'){ state='idle'; if(cheer<0) cheer=0; }
      else if(STATES[name]) state=name;
      still(); return this;
    },
    cheer(){ if(cheer<0) cheer=0; return this; },
    setFraming(name){ if(FRAMES[name]){ framing=name; resize(); } return this; },
    destroy(){
      destroyed=true; stop(); ro.disconnect(); if(io) io.disconnect();
      document.removeEventListener('visibilitychange',onVis);
      root.removeEventListener('pointermove',onPointer);
      scene.traverse(n=>{ if(n.geometry) n.geometry.dispose(); });
      Object.keys(M).forEach(k=>M[k].dispose()); strawA.dispose(); strawB.dispose();
      renderer.dispose(); if(canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
  };
}
const api={create:create};
if(typeof module==='object'&&module.exports) module.exports=api;
root.FermierMascotte=api;
})(typeof window!=='undefined'?window:this);
