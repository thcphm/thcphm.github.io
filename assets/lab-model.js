/** Hand-built IT workstation study. Geometry units, framing and lighting are shared with its turntable. */
export const labPoses = {
  profile:  {eye:[3.94,3.23,7.95],look:[-.03,1.01,.12],fov:30.4},
  code:     {eye:[-.28,2.58,5.26],look:[-1.24,1.81,-.16],fov:29.8},
  hardware: {eye:[3.59,2.55,5.23],look:[1.70,1.36,.15],fov:29.0}
};

function drawCanvas(width,height,draw) {
  const canvas=document.createElement("canvas");
  canvas.width=width;canvas.height=height;
  draw(canvas.getContext("2d"),width,height);
  return canvas;
}
function canvasMap(T,canvas) {
  const map=new T.CanvasTexture(canvas);
  map.encoding=T.sRGBEncoding;
  map.anisotropy=4;
  return map;
}

function roundPath(c,x,y,w,h,r) {
  c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);
  c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);
  c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);
  c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();
}
function text(c,word,x,baseline,size,color,weight="400",face="monospace") {
  c.fillStyle=color;c.font=weight+" "+size+"px "+face;c.fillText(word,x,baseline);
}
function path(c,coords,color,width=1) {
  c.strokeStyle=color;c.lineWidth=width;c.beginPath();
  coords.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
}

function workshopViewport(c,x,y,w,h) {
  c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
  const grad=c.createLinearGradient(x,y,x+w,y+h);
  grad.addColorStop(0,"#213340");grad.addColorStop(1,"#13202a");c.fillStyle=grad;c.fillRect(x,y,w,h);
  const unit=Math.min(w/8.4,h/6.7),ox=x+w*.51,oy=y+h*.67;
  function project(a,b,z) {return [ox+unit*(a*.86-b*.83),oy+unit*(a*.30+b*.35-z*.94)];}
  function line(vertices,col,lineWidth=2){path(c,vertices.map(v=>project(...v)),col,lineWidth);}
  function face(points,fill,edge){
    c.beginPath();points.map(p=>project(...p)).forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();
    c.fillStyle=fill;c.fill();c.strokeStyle=edge;c.lineWidth=2.3;c.stroke();
  }
  for(let i=-8;i<=8;i++){line([[i,-8,0],[i,8,0]],"#31444f",1);line([[-8,i,0],[8,i,0]],"#31444f",1);}
  const solid="#7fd0e0",far="#448297",fine="#5ca0b3";
  const bx=-1.48,ex=1.43,by=-.99,ey=1.10,eave=1.55,top=2.65,mid=(bx+ex)/2;
  face([[bx,by,0],[ex,by,0],[ex,ey,0],[bx,ey,0]],"#203c48",far);
  face([[ex,by,0],[ex,ey,0],[ex,ey,eave],[ex,by,eave]],"#294855",solid);
  face([[bx,ey,0],[ex,ey,0],[ex,ey,eave],[mid,ey,top],[bx,ey,eave]],"#213c48",solid);
  face([[bx,by,eave],[mid,by,top],[mid,ey,top],[bx,ey,eave]],"#284653",solid);
  face([[mid,by,top],[ex,by,eave],[ex,ey,eave],[mid,ey,top]],"#365563",solid);
  for(let s=1;s<6;s++){
    const localY=by+(ey-by)*s/6;
    line([[mid,localY,top],[ex,localY,eave]],fine,1.35);
    line([[bx,localY,eave],[mid,localY,top]],fine,1.15);
  }
  line([[bx,ey,eave],[ex,ey,eave]],solid,2.2);
  const doorX=.14;
  line([[doorX,ey+.008,0],[doorX,ey+.008,1.14],[doorX+.57,ey+.008,1.14],[doorX+.57,ey+.008,0]],"#efc981",3);
  line([[-1.10,ey+.01,.50],[-1.10,ey+.01,1.08],[-.42,ey+.01,1.08],[-.42,ey+.01,.50],[-1.10,ey+.01,.50]],solid,2);
  line([[ex+.015,-.51,.49],[ex+.015,-.51,1.12],[ex+.015,.48,1.12],[ex+.015,.48,.49],[ex+.015,-.51,.49]],solid,2);
  for(const [a,b] of [[bx,ey],[ex,by],[ex,ey]])line([[a,b,0],[a,b,eave]],solid,2);
  line([[bx-.18,ey+.28,-.04],[ex+.18,ey+.28,-.04],[ex+.18,by-.18,-.04]],"#526f7a",1.6);
  text(c,"PERSPECTIVE",x+18,y+33,17,"#a9c9d3","500");
  const axisX=x+w-40,axisY=y+h-25;
  path(c,[[axisX,axisY],[axisX+18,axisY-7]],"#e2aa70",2.2);
  path(c,[[axisX,axisY],[axisX-17,axisY-7]],"#75c7c8",2.2);
  path(c,[[axisX,axisY],[axisX,axisY-21]],"#92addb",2.2);
  c.restore();
}

function editorCanvas(close) {
  return drawCanvas(1400,766,(c,w,h)=>{
    c.fillStyle="#111b24";c.fillRect(0,0,w,h);
    c.fillStyle="#1d2b36";c.fillRect(0,0,w,82);
    c.fillStyle="#111b24";roundPath(c,46,18,408,82,14);c.fill();
    c.fillStyle="#92d3e1";c.fillRect(65,24,5,43);
    text(c,"workshop.ts",91,62,39,"#e2e3d9","500");
    for(let i=0;i<3;i++){c.beginPath();c.fillStyle=["#586c77","#6a7e87","#c79f69"][i];c.arc(w-116+i*34,41,6,0,Math.PI*2);c.fill();}
    const split=close?838:748;
    c.fillStyle="#34424b";c.fillRect(split,102,2,h-188);
    const syntax=[
      [["import ","#92c4e5"],["* as ","#b5b4d8"],["THREE ","#c4dee5"]],
      [["  from ","#bbacd2"],["'three'","#d9bd89"],[";","#cbd4d3"]],
      null,
      [["const ","#99bbd1"],["scene ","#d6e1db"],["=","#a5b2bc"]],
      [["  new ","#bbacd2"],["THREE.Scene","#9dd2d1"],["();","#d6e1db"]],
      null,
      [["const ","#99bbd1"],["workshop ","#e7dfc3"],["=","#a5b2bc"]],
      [["  new ","#bbacd2"],["THREE.Group","#9dd2d1"],["();","#d6e1db"]],
      [["scene.","#d6e1db"],["add","#8dd0da"],["(workshop);","#d6e1db"]]
    ];
    const gutter=close?98:88;
    const font=close?39:36;const first=151,spacing=57;
    syntax.forEach((parts,i)=>{
      const by=first+i*spacing;
      if(i===8){c.fillStyle="#253945";c.fillRect(23,by-37,split-44,51);c.fillStyle="#65aabe";c.fillRect(23,by-37,4,51);}
      text(c,String(i+1).padStart(2,"0"),33,by,21,"#728996");
      if(!parts)return;
      let tx=gutter;
      parts.forEach(([word,col])=>{text(c,word,tx,by,font,col,"500");tx+=c.measureText(word).width;});
    });
    const left=split+22,top=112,vw=w-left-26,vh=h-top-111;
    workshopViewport(c,left,top,vw,vh);
    c.fillStyle="#25333e";c.fillRect(0,h-67,w,67);c.fillStyle="#3b5662";c.fillRect(0,h-68,w,2);
    text(c,"TypeScript",44,h-23,24,"#a9d0db","500");text(c,"Three.js",w-176,h-23,24,"#bfcdc9","500");
  });
}

function boardPatterns(){
  const lines=drawCanvas(768,966,()=>{});
  const q=lines.getContext("2d");
  let seed=37571;
  function random(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
  for(let k=0;k<155;k++){
    const x=40+Math.floor(random()*69)*10,y=40+Math.floor(random()*87)*10;
    const u=(random()<.5?-1:1),v=(random()<.5?-1:1),a=12+random()*75,b=10+random()*42,l=10+random()*60;
    path(q,[[x,y],[x+u*a,y],[x+u*(a+b),y+v*b],[x+u*(a+b),y+v*(b+l)]],k%6===0?"#8cb9ad":"#558b85",k%8===0?3:1.9);
    q.strokeStyle="#9ab7a0";q.lineWidth=1.6;q.beginPath();q.arc(x,y,2.5,0,2*Math.PI);q.stroke();
  }
  for(let i=0;i<11;i++){
    const b=10+i*9;path(q,[[465+b,82],[465+b,228],[445+b,248],[445+b,470]],"#81a592",2.7);
    path(q,[[91,681+b],[329,681+b],[378,632+b],[468,632+b]],"#81aba0",2.3);
  }
  const base=drawCanvas(768,966,(c,w,h)=>{
    c.fillStyle="#244044";c.fillRect(0,0,w,h);
    c.drawImage(lines,0,0);c.strokeStyle="#6c847a";c.lineWidth=4;c.strokeRect(18,18,w-36,h-36);
    for(const [x,y,tag] of [[55,107,"SYS_FAN"],[538,124,"DIMM"],[59,575,"USB"],[64,831,"PCI_E1"],[509,824,"M.2"],[573,908,"PWR"]]){
      text(c,tag,x,y,18,"#b3c0ab","500");
    }
    for(const x of [48,w-48])for(const y of [47,h-47]){c.strokeStyle="#bba781";c.lineWidth=4;c.beginPath();c.arc(x,y,11,0,2*Math.PI);c.stroke();}
  });
  return {base,lines};
}

function keyLayout() {
  return [
    [["Esc",1],...Array.from("1234567890-=").map(k=>[k,1]),["⌫",1.75]],
    [["Tab",1.5],...Array.from("QWERTYUIOP").map(k=>[k,1]),["[",1],["]",1],["\\",1.25]],
    [["Caps",1.75],...Array.from("ASDFGHJKL").map(k=>[k,1]),[";",1],["'",1],["Enter",2]],
    [["Shift",2.2],...Array.from("ZXCVBNM").map(k=>[k,1]),[",",1],[".",1],["/",1],["↑",1],["Fn",1.55]],
    [["Ctrl",1.25],["Alt",1.2],["",1.2],["",5.80],["Alt",1.15],["Fn",1.10],["←",1],["↓",1],["→",1]]
  ];
}

export function createLabModel(T) {
  T.ColorManagement.legacyMode=false;
  const root=new T.Group();root.name="Developer workstation";
  function matte(hex,rough=.58,metal=.14) {return new T.MeshStandardMaterial({color:hex,roughness:rough,metalness:metal,envMapIntensity:.82});}
  const graphite=matte(0x353e45,.47,.34),black=matte(0x131c23,.66,.15),ink=matte(0x202c35,.50,.27);
  const slate=matte(0x53616b,.45,.40),titanium=matte(0x929998,.37,.68),silv=matte(0xc2c4b8,.32,.66);
  const vent=matte(0x18232b,.76,.12),rubber=matte(0x20262b,.85,.02),cable=matte(0x29323b,.61,.11);
  const blue=matte(0x66a3b6,.36,.36),copper=matte(0xb68159,.31,.68),bone=matte(0xcfcdc0,.57,.23);
  const pcb=matte(0x30484a,.56,.22), chip=matte(0x23303a,.51,.24),contact=matte(0xb29f74,.34,.60);
  const ice=new T.MeshStandardMaterial({color:0x89cad6,emissive:0x5a99ac,emissiveIntensity:.28,metalness:.2,roughness:.37});
  const amber=new T.MeshStandardMaterial({color:0xe5b47c,emissive:0xbf8347,emissiveIntensity:.22,roughness:.49});
  const cache=new Map();
  function geometry(w,h,d,r=0) {
    const key=[w,h,d,r].join(":");if(cache.has(key))return cache.get(key);
    let g;
    if(!r)g=new T.BoxGeometry(w,h,d);
    else{
      const b=Math.min(r*.39,d*.22,w*.15,h*.15),hx=w*.5-b,hy=h*.5-b,arc=Math.min(r,hx*.8,hy*.8);
      const s=new T.Shape();
      s.moveTo(-hx+arc,-hy);s.lineTo(hx-arc,-hy);s.quadraticCurveTo(hx,-hy,hx,-hy+arc);s.lineTo(hx,hy-arc);s.quadraticCurveTo(hx,hy,hx-arc,hy);s.lineTo(-hx+arc,hy);s.quadraticCurveTo(-hx,hy,-hx,hy-arc);s.lineTo(-hx,-hy+arc);s.quadraticCurveTo(-hx,-hy,-hx+arc,-hy);
      g=new T.ExtrudeGeometry(s,{depth:d-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:r<.026?1:3,curveSegments:r<.026?2:4});g.translate(0,0,-d*.5+b);
    }
    cache.set(key,g);return g;
  }
  function node(parent,name,x=0,y=0,z=0,yaw=0) {const n=new T.Group();n.name=name;n.position.set(x,y,z);n.rotation.y=yaw;parent.add(n);return n;}
  function mesh(p,g,m,x=0,y=0,z=0) {const n=new T.Mesh(g,m);n.position.set(x,y,z);n.castShadow=true;n.receiveShadow=true;p.add(n);return n;}
  function block(p,x,y,z,w,h,d,m,r=0){return mesh(p,geometry(w,h,d,r),m,x,y,z);}
  function slab(p,x,y,z,w,d,h,m,r=.05){const n=block(p,x,y,z,w,d,h,m,r);n.rotation.x=-Math.PI/2;return n;}
  function cylinderZ(p,x,y,z,r,h,m,segments=36) {const n=mesh(p,new T.CylinderGeometry(r,r,h,segments),m,x,y,z);n.rotation.x=Math.PI/2;return n;}
  function ring(p,x,y,z,r,t,m){return mesh(p,new T.TorusGeometry(r,t,8,52),m,x,y,z);}
  function instances(p,g,m,locations) {
    if(!locations.length)return;
    const batch=new T.InstancedMesh(g,m,locations.length);batch.castShadow=true;batch.receiveShadow=true;
    const transform=new T.Object3D();
    locations.forEach((a,i)=>{transform.position.set(a[0],a[1],a[2]);transform.rotation.set(a[3]||0,a[4]||0,a[5]||0);transform.updateMatrix();batch.setMatrixAt(i,transform.matrix);});
    p.add(batch);return batch;
  }
  function tube(p,pts,r,m,segments=24){
    const curve=new T.CatmullRomCurve3(pts.map(v=>new T.Vector3(...v)));
    return mesh(p,new T.TubeGeometry(curve,segments,r,7,false),m);
  }
  function flat(p,x,y,z,w,h,mat){
    const o=mesh(p,new T.PlaneGeometry(w,h),mat,x,y,z);o.castShadow=false;return o;
  }
  function decal(p,x,y,z,w,h,cnv,cut=false){
    const m=new T.MeshBasicMaterial({map:canvasMap(T,cnv),toneMapped:false,transparent:cut,depthWrite:!cut});return flat(p,x,y,z,w,h,m);
  }
  function screws(p,places,r=.044,depth=.018) {
    const cg=new T.CylinderGeometry(r,r,depth,12);cg.rotateX(Math.PI/2);
    instances(p,cg,titanium,places);instances(p,geometry(r*1.12,r*.23,.003),ink,places.map(([x,y,z])=>[x,y,z+depth*.52,0,0,-.52]));
  }
  function vents(p,x,y,z,w,h,rows,cols,orientation=0) {
    const sw=w/cols,sh=h/rows;
    const hw=(orientation?sw*.39:sw*.73)*.5,hh=(orientation?sh*.72:sh*.32)*.5,r=Math.min(hw*.65,hh*.65,.012);
    const contour=[[-hw+r,-hh],[hw-r,-hh],[hw,-hh+r],[hw,hh-r],[hw-r,hh],[-hw+r,hh],[-hw,hh-r],[-hw,-hh+r]];
    const positions=[0,0,0],indices=[];
    contour.forEach(([cx,cy],i)=>{positions.push(cx,cy,0);indices.push(0,i+1,1+(i+1)%8);});
    const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
    const ps=[];for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)ps.push([x+(i-(cols-1)/2)*sw,y+(j-(rows-1)/2)*sh,z]);
    const slots=instances(p,g,vent,ps);slots.castShadow=false;
  }

  // Display and cantilever stand. The mounting plate has a genuine cable opening.
  const display=node(root,"Slim developer display",-1.30,0,-.46,.115);
  slab(display,0,.061,.045,1.50,.96,.102,graphite,.105);
  slab(display,0,.128,.045,1.51,.97,.075,titanium,.105);
  const neck=node(display,"Floating stand",0,.49,-.04);
  neck.rotation.x=-.135;
  const standShape=new T.Shape();standShape.moveTo(-.232,-.34);standShape.lineTo(.232,-.34);standShape.lineTo(.178,1.20);standShape.quadraticCurveTo(.178,1.24,.128,1.24);standShape.lineTo(-.128,1.24);standShape.quadraticCurveTo(-.178,1.24,-.178,1.20);standShape.closePath();
  const hole=new T.Path();hole.absellipse(0,.40,.084,.166,0,2*Math.PI,true,0);standShape.holes.push(hole);
  const ng=new T.ExtrudeGeometry(standShape,{depth:.060,steps:1,bevelThickness:.016,bevelSize:.014,bevelSegments:3,curveSegments:14});ng.translate(0,0,-.11);mesh(neck,ng,titanium);
  const monitor=node(display,"Editing monitor",0,1.94,-.015);monitor.rotation.x=-.060;
  block(monitor,0,0,-.050,3.83,2.15,.122,slate,.082);
  block(monitor,0,0,.014,3.850,2.166,.067,graphite,.083);
  block(monitor,0,.005,.051,3.780,2.096,.021,black,.053);
  const mainScreen=decal(monitor,0,.011,.0635,3.735,2.037,editorCanvas(false));
  const profileMap=mainScreen.material.map;let codeMap;
  // Tiny warm standby light and tactile bottom edge on the display.
  block(monitor,1.760,-1.034,.059,.049,.012,.007,amber,.003);
  const rear=node(monitor,"Display rear",0,0,-.115,Math.PI);
  block(rear,0,-.08,.015,1.89,1.04,.095,graphite,.14);
  block(rear,0,-.105,.068,.64,.635,.075,slate,.07);
  screws(rear,[[-.235,.124,.109],[.235,.124,.109],[-.235,-.341,.109],[.235,-.341,.109]],.031,.013);
  vents(rear,0,.69,.006,2.38,.21,3,30,true);
  block(rear,.585,-.44,.070,.38,.096,.018,black,.018);
  block(rear,.585,-.438,.082,.23,.026,.013,slate,.005);

  // Compact mechanical keyboard. Caps and legends share the same local pitch.
  const keyboard=node(root,"Compact mechanical keyboard",-1.08,.047,1.19,.050);keyboard.rotation.x=.060;
  const pitch=.180,rowStep=.170,keys=keyLayout(),kw=2.90,kd=.960;
  slab(keyboard,0,.061,0,kw,kd,.116,graphite,.078);
  slab(keyboard,0,.116,0,kw-.037,kd-.034,.046,slate,.060);
  slab(keyboard,0,.142,0,kw-.100,kd-.085,.026,black,.042);
  const keyGroups=new Map();
  function capGeom(units){
    const w=units*pitch-.021,d=rowStep-.025;
    const rim=(hw,hd,z,rc)=>{
      const pts=[];for(let k=0;k<4;k++){
        const sx=k===0||k===3?1:-1,sy=k<2?1:-1,xx=sx*(hw-rc),yy=sy*(hd-rc);
        for(let i=0;i<4;i++){const a=(k*Math.PI/2)+(i/3*Math.PI/2);pts.push([xx+Math.cos(a)*rc,z,yy+Math.sin(a)*rc]);}
      }return pts;
    };
    const layers=[rim(w/2,d/2,0,.016),rim(w*.49,d*.48,.049,.015),rim(w*.43,d*.40,.080,.014)];
    const v=[],idx=[];layers.forEach(row=>row.forEach(p=>v.push(...p)));
    const n=layers[0].length;
    for(let l=0;l<2;l++)for(let i=0;i<n;i++){const a=l*n+i,b=l*n+(i+1)%n;idx.push(a,a+n,b,b,a+n,b+n);}
    for(let i=1;i<n-1;i++)idx.push(2*n,2*n+i+1,2*n+i);
    const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();return g;
  }
  const legend=[];
  keys.forEach((row,k)=>{
    let total=row.reduce((s,e)=>s+e[1],0),x=-total*pitch/2;const z=(k-2)*rowStep;
    row.forEach(([letter,units],column)=>{
      const cx=x+units*pitch/2;x+=units*pitch;
      const variant=letter==="Esc"?"warm":(["Enter","↑","↓","←","→"].includes(letter)?"blue":(units>1.2?"mod":"base"));
      const key=units+"-"+variant;
      if(!keyGroups.has(key))keyGroups.set(key,{units,variant,ps:[]});
      keyGroups.get(key).ps.push([cx,.155,z]);if(letter)legend.push([letter,cx,z,variant,column]);
    });
  });
  const caps={base:matte(0x586671,.61,.13),mod:matte(0x465461,.60,.19),blue:matte(0x7297a7,.55,.18),warm:matte(0xb59e7f,.58,.18)};
  keyGroups.forEach(o=>instances(keyboard,capGeom(o.units),caps[o.variant],o.ps));
  const keyLegend=drawCanvas(1160,384,(c,w,h)=>{
    c.textAlign="center";c.textBaseline="middle";
    legend.forEach(([s,x,z,variant])=>{
      c.font="600 "+(s.length>2?18:23)+"px sans-serif";c.fillStyle=variant==="warm"?"#29343e":"#e2e4da";c.fillText(s,(x/kw+.5)*w,(z/kd+.5)*h);
    });
  });
  const legends=decal(keyboard,0,.2363,0,kw,kd,keyLegend,true);legends.rotation.x=-Math.PI/2;
  block(keyboard,1.341,.149,-.405,.047,.013,.025,ice,.003);

  // Open side faces +Z; the narrow titanium front panel faces +X.
  const tower=node(root,"Open SFF tower",1.73,0,-.06,-.09);
  const cw=1.98,cd=1.17,ch=2.64;
  for(const x of [-.765,.765])for(const z of [-.438,.438]){
    slab(tower,x,.051,z,.27,.21,.098,rubber,.03);
  }
  slab(tower,0,.150,0,cw,cd,.125,graphite,.092);
  slab(tower,0,.204,0,cw-.048,cd-.045,.050,slate,.065);
  slab(tower,0,ch-.036,0,cw,cd,.112,titanium,.089);
  slab(tower,0,ch-.104,0,cw-.041,cd-.034,.043,graphite,.049);
  const roof=node(tower,"Slotted roof",0,ch+.022,0);
  roof.rotation.x=-Math.PI/2;
  block(roof,0,0,.007,1.73,.931,.022,slate,.075);
  vents(roof,0,0,.022,1.50,.700,6,21,true);
  // Back skin and rear chassis face.
  block(tower,0,1.42,-.545,cw-.075,2.41,.090,slate,.046);
  const closed=node(tower,"Service-side panel",0,1.38,-.594,Math.PI);
  block(closed,0,0,.016,1.893,2.405,.049,graphite,.068);
  vents(closed,-.01,.07,.044,1.44,1.60,19,8,false);
  screws(closed,[[-.831,-1.06,.045],[-.831,1.06,.045],[.831,1.06,.045],[.831,-1.06,.045]],.034,.014);
  // Near-side slender frame members leave the complete motherboard exposed.
  for(const x of [-.945,.945]){
    block(tower,x,1.42,.483,.079,2.44,.145,titanium,.019);
    block(tower,x,1.42,.409,.094,2.44,.042,ink,.012);
  }
  block(tower,0,.225,.490,1.89,.075,.138,titanium,.022);
  block(tower,0,2.532,.490,1.89,.069,.138,titanium,.019);
  const front=node(tower,"Front I/O",cw/2-.023,1.40,0,Math.PI/2);
  block(front,0,0,0,cd-.080,2.47,.079,titanium,.078);
  block(front,0,-.233,.044,cd-.162,1.906,.029,ink,.055);
  const ribs=[];for(let i=0;i<13;i++)ribs.push([-.445+i*.074,-.24,.068]);
  instances(front,geometry(.036,1.802,.037,.013),slate,ribs);
  cylinderZ(front,.295,.922,.052,.068,.023,graphite);ring(front,.295,.922,.071,.046,.005,ice);
  block(front,-.268,.926,.055,.201,.068,.019,black,.012);
  block(front,-.268,.920,.066,.139,.016,.007,blue,.004);
  block(front,-.023,.926,.055,.116,.047,.018,ink,.017);
  block(front,.007,.779,.046,.049,.013,.015,amber,.005);
  const back=node(tower,"Rear I/O shield",-cw/2+.023,1.40,0,-Math.PI/2);
  block(back,0,0,0,cd-.095,2.46,.070,graphite,.061);
  block(back,-.225,.290,.041,.368,1.62,.033,titanium,.019);
  for(let i=0;i<4;i++) {
    block(back,-.227,.88-i*.193,.066,.187,.092,.023,black,.012);
    block(back,-.227,.867-i*.193,.080,.129,.029,.009,blue,.004);
  }
  block(back,-.225,-.028,.068,.206,.169,.022,ink,.014);
  vents(back,.198,.43,.045,.396,1.30,13,3);
  for(let i=0;i<3;i++){
    block(back,.036,-.729+i*.126,.047,.819,.094,.020,slate,.018);
    vents(back,.036,-.729+i*.126,.062,.717,.051,1,9);
  }
  screws(back,[[-.411,-1.05,.044],[.416,1.07,.044]],.037,.012);

  const board=node(tower,"Layered motherboard",0,1.405,-.455);
  block(board,0,0,.029,1.732,2.227,.065,pcb,.044);
  const pattern=boardPatterns(),baseMap=canvasMap(T,pattern.base);
  const boardMat=new T.MeshStandardMaterial({map:baseMap,roughness:.72,metalness:.22,envMapIntensity:.65});
  flat(board,0,0,.0631,1.699,2.189,boardMat);
  screws(board,[[-.785,-1.012,.079],[.785,-1.012,.079],[-.785,1.012,.079],[.785,1.012,.079]],.044,.017);
  const tracesMap=canvasMap(T,pattern.lines);
  const surveyMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.FrontSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
    uniforms:{maskMap:{value:tracesMap},progress:{value:-1}},
    vertexShader:"varying vec2 st; void main(){st=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader:"varying vec2 st;uniform sampler2D maskMap;uniform float progress;void main(){float dist=abs((st.x+0.13*(st.y-0.5))-mix(-0.12,1.12,progress));float band=1.0-smoothstep(0.012,0.080,dist);float a=texture2D(maskMap,st).a*band;if(a<0.025)discard;gl_FragColor=vec4(0.50,0.91,0.98,a*0.94);}"});
  const survey=flat(board,0,0,.066,1.699,2.189,surveyMat);survey.visible=false;
  // Board components behind the CPU cooler.
  const components=[];for(let i=0;i<6;i++)components.push([-.552+i*.137,.748,.097]);
  for(let i=0;i<5;i++)components.push([-.537+i*.207,-.481,.097]);
  instances(board,geometry(.092,.117,.064,.010),chip,components);
  const pads=[];for(let i=0;i<24;i++)pads.push([-.731+i*.061,-.780,.078]);
  instances(board,geometry(.024,.094,.017,.003),contact,pads);
  const cans=[];for(let i=0;i<4;i++)cans.push([-.632,-.279+i*.305,.145]);
  const canGeom=new T.CylinderGeometry(.052,.060,.125,16);canGeom.rotateX(Math.PI/2);instances(board,canGeom,titanium,cans);
  const small=[];for(let i=0;i<18;i++)small.push([-.647+(i%6)*.119,-.906+Math.floor(i/6)*.085,.085]);instances(board,geometry(.051,.024,.021),silv,small);
  // Twin DIMM modules: dark slots, gold fingers, ribbed metal spreaders and blue clips.
  for(let i=0;i<2;i++){
    const xx=.412+i*.183;
    block(board,xx,.326,.097,.127,1.050,.110,black,.017);
    block(board,xx,.326,.180,.066,.961,.175,pcb,.012);
    block(board,xx,.326,.255,.084,.891,.088,slate,.010);
    block(board,xx,.326,.307,.070,.800,.021,blue,.007);
    const slots=[];for(let j=0;j<9;j++)slots.push([xx,.326+(j-4)*.078,.321]);
    instances(board,geometry(.075,.017,.014,.004),titanium,slots);
    for(const yy of [-.165,.821]){block(board,xx,yy,.234,.114,.062,.132,ice,.012);}
  }
  // CPU heat sink, bent heat pipes and a nine-blade axial fan. The open frame keeps the fins visible.
  const cooler=node(board,"CPU cooler",-.156,.262,.067);
  block(cooler,0,0,.056,.807,.815,.114,titanium,.054);
  for(const px of [-.34,-.22,.23,.34])tube(cooler,[[px,-.47,.014],[px,-.55,.096],[px,-.535,.233],[px,-.420,.344]],.029,copper,18);
  const fins=[];for(let j=0;j<19;j++)fins.push([0,-.43+j*.047,.207]);
  instances(cooler,geometry(.980,.021,.326,.012),titanium,fins);
  block(cooler,0,0,.331,.913,.885,.054,black,.104);
  cylinderZ(cooler,0,0,.368,.427,.044,ink,64);
  ring(cooler,0,0,.405,.419,.026,graphite);ring(cooler,0,0,.423,.435,.010,silv);
  const fanBlade=()=>{
    const v=[],idx=[];const n=13;
    for(let j=0;j<=n;j++){
      const t=j/n,r=.116+t*.284,lead=.24-.51*t,trail=-.14-.69*t;
      for(const [ang,depth] of [[lead,.018+.036*t],[trail,-.011+.014*t]]){
        v.push(Math.cos(ang)*r,Math.sin(ang)*r,.412+depth);
      }
      if(j){const a=(j-1)*2;idx.push(a,a+2,a+1,a+2,a+3,a+1);}
    }
    const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();return g;
  };
  const bladeMat=matte(0x6b818b,.41,.48);bladeMat.side=T.DoubleSide;
  instances(cooler,fanBlade(),bladeMat,Array.from({length:9},(_,i)=>[0,0,0,0,0,i*2*Math.PI/9]));
  cylinderZ(cooler,0,0,.442,.137,.057,slate);
  ring(cooler,0,0,.475,.104,.011,ice);
  cylinderZ(cooler,0,0,.477,.064,.013,titanium);
  screws(cooler,[[-.377,.377,.405],[.377,.377,.405],[-.377,-.377,.405],[.377,-.377,.405]],.033,.019);
  // PCIe expansion module, rear bracket, power loom and fine layered edge.
  block(board,-.035,-.651,.155,1.503,.146,.131,black,.023);
  block(board,-.028,-.630,.249,1.497,.187,.204,graphite,.030);
  block(board,-.021,-.607,.357,1.470,.151,.039,slate,.023);
  const cardFins=[];for(let i=0;i<23;i++)cardFins.push([-.603+i*.057,-.621,.379]);
  instances(board,geometry(.023,.108,.025,.006),titanium,cardFins);
  block(board,.586,-.606,.394,.130,.051,.014,ice,.009);
  block(board,-.736,-.650,.259,.070,.284,.329,titanium,.010);
  for(let i=0;i<3;i++){
    const dx=i*.034;
    tube(board,[[.625+dx,-.520,.265],[.774+dx,-.425,.350],[.765+dx,-.134,.390],[.704+dx,.007,.240],[.726+dx,.195,.110]],.019,i===1?slate:cable,26);
  }
  block(board,-.715,.412,.145,.170,.666,.136,titanium,.020);
  for(let i=0;i<3;i++){
    block(board,-.717,.210+i*.168,.221,.126,.079,.027,black,.010);
    block(board,-.717,.202+i*.168,.239,.090,.020,.007,blue,.004);
  }
  const silk=drawCanvas(430,58,(c)=>{text(c,"PCIe",13,43,34,"#e1dfcc","500");text(c,"M.2",333,43,30,"#bad9d5","500");});
  decal(board,.005,-.364,.070,1.245,.169,silk,true);
  // Cables are part of the scene, including at rear angles of the turntable.
  tube(root,[[-1.31,.45,-.58],[-1.50,.12,-.76],[-.76,.052,-1.21],[.35,.046,-1.17],[.674,.245,-.89],[.72,.672,-.485]],.026,cable,35);
  tube(root,[[-1.18,.123,.742],[-1.46,.058,.591],[-1.44,.031,.301],[-.204,.031,.289],[.765,.051,-.454],[.816,.412,-.530]],.018,cable,33);

  // Batch rigid opaque parts by material; atlas cards and instanced details keep their own draws.
  root.updateMatrixWorld(true);
  const buckets=new Map();
  root.traverse(o=>{
    if(!o.isMesh||o.isInstancedMesh||o.material.transparent||o===mainScreen||o.geometry.groups.length>1&&Array.isArray(o.material))return;
    const key=o.material.uuid+" "+o.castShadow+" "+o.receiveShadow;
    if(!buckets.has(key))buckets.set(key,[]);
    buckets.get(key).push(o);
  });
  buckets.forEach(parts=>{
    if(parts.length<2)return;
    const ps=[],ns=[],us=[];
    parts.forEach(o=>{
      const geo=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone());geo.applyMatrix4(o.matrixWorld);
      if(!geo.attributes.normal)geo.computeVertexNormals();
      const pos=geo.attributes.position.array,nor=geo.attributes.normal.array,uv=geo.attributes.uv?.array;
      for(let i=0;i<pos.length;i++){ps.push(pos[i]);ns.push(nor[i]);}
      if(uv)for(const u of uv)us.push(u);else for(let i=0;i<pos.length/3*2;i++)us.push(0);
      geo.dispose();o.removeFromParent();
    });
    const merged=new T.BufferGeometry();merged.setAttribute("position",new T.Float32BufferAttribute(ps,3));merged.setAttribute("normal",new T.Float32BufferAttribute(ns,3));merged.setAttribute("uv",new T.Float32BufferAttribute(us,2));merged.computeBoundingSphere();
    const o=new T.Mesh(merged,parts[0].material);o.castShadow=parts[0].castShadow;o.receiveShadow=parts[0].receiveShadow;root.add(o);
  });
  function setView(view){
    if(view==="code" && !codeMap)codeMap=canvasMap(T,editorCanvas(true));
    const map=view==="code"?codeMap:profileMap;
    if(mainScreen.material.map!==map){mainScreen.material.map=map;mainScreen.material.needsUpdate=true;}
  }
  function setSurvey(progress){
    const on=Number.isFinite(progress)&&progress>=0&&progress<=1;
    survey.visible=on;if(on)surveyMat.uniforms.progress.value=progress;
  }
  return {root,setView,setSurvey};
}

export function lightLab(T,scene) {
  T.ColorManagement.legacyMode=false;
  const env=drawCanvas(320,160,(c,w,h)=>{
    const g=c.createLinearGradient(0,0,0,h);
    g.addColorStop(0,"#b7c8d7");g.addColorStop(.25,"#9caeb8");g.addColorStop(.47,"#768b9b");
    g.addColorStop(.55,"#3c505e");g.addColorStop(.72,"#53636c");g.addColorStop(1,"#25313b");c.fillStyle=g;c.fillRect(0,0,w,h);
    const strips=[[36,8,48,54,"#d2d4c8"],[153,15,33,47,"#b6d6de"],[226,33,22,27,"#d1d6d1"],[301,15,12,58,"#98b7c3"]];
    for(const [x,y,sw,sh,col] of strips){c.fillStyle=col;c.fillRect(x,y,sw,sh);}
  });
  const envMap=canvasMap(T,env);envMap.mapping=T.EquirectangularReflectionMapping;scene.environment=envMap;
  scene.add(new T.HemisphereLight(0xe2eeff,0x758996,1.18));
  function sun(hex,intensity,position){
    const light=new T.DirectionalLight(hex,intensity);light.position.set(...position);scene.add(light);return light;
  }
  const key=sun(0xffefda,2.05,[-3.7,7.8,5.4]);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-5.2,right:5.2,top:4.7,bottom:-4.7,near:.1,far:18});
  key.shadow.bias=-.00024;key.shadow.normalBias=.009;
  sun(0xb3d9f3,1.05,[4.9,3.9,3.8]);sun(0xc7e6f2,1.56,[3.9,5.6,-4.7]);
  const floor=new T.Mesh(new T.PlaneGeometry(26,26),new T.ShadowMaterial({opacity:.145,depthWrite:false}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.015;floor.receiveShadow=true;scene.add(floor);
  const contactC=drawCanvas(192,192,(c)=>{
    const g=c.createRadialGradient(96,96,0,96,96,96);g.addColorStop(0,"rgba(13,24,32,.70)");g.addColorStop(.34,"rgba(13,24,32,.45)");g.addColorStop(.63,"rgba(13,24,32,.21)");g.addColorStop(1,"rgba(13,24,32,0)");c.fillStyle=g;c.fillRect(0,0,192,192);
  });
  const mt=new T.MeshBasicMaterial({map:canvasMap(T,contactC),transparent:true,depthWrite:false,toneMapped:false});
  for(const [x,z,w,d] of [[-1.28,-.37,2.18,1.51],[1.72,-.06,2.70,1.90],[-1.07,1.19,3.47,1.28]]){
    const shadow=new T.Mesh(new T.PlaneGeometry(w,d),mt);shadow.rotation.x=-Math.PI/2;shadow.position.set(x,.001,z);scene.add(shadow);
  }
}
