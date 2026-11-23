import { createLabModel } from "./lab-model.js";

/** The same focal rail drives the live landscape, chapter plates and reduced-capability journey. */
export const fieldPoses = {
  profile: { eye: [4.15, 3.6, 10.55], look: [-0.94, 1.11, -6.0], fov: 38.2 },
  code: { eye: [1.08, 3.08, 4.05], look: [0.74, 2.28, -4.12], fov: 36.2 },
  hardware: { eye: [7.22, 2.5, -0.59], look: [4.8, 2.6, -3.56], fov: 39.0 },
};
export const fieldMobilePoses = {
  profile: { eye: [6.45, 3.85, 9.6], look: [3.54, 3.64, -3.18], fov: 42.5 },
  code: { eye: [3.02, 3.18, 3.64], look: [2.29, 3.64, -3.6], fov: 49.4 },
  hardware: { eye: [6.99, 2.76, 0.09], look: [5.36, 3.21, -3.41], fov: 48.2 },
};
export function sampleFieldPose(progress, mobile = false) {
  const v = mobile ? fieldMobilePoses : fieldPoses;
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0)) * 2;
  const index = Math.min(1, Math.floor(p)),
    t = p - index,
    t2 = t * t,
    t3 = t * t * t;
  function rail(a, b, c) {
    const middle = (c - a) * 0.4;
    const v0 = index ? b : a,
      v1 = index ? c : b,
      m0 = index ? middle : (b - a) * 0.86,
      m1 = index ? (c - b) * 0.86 : middle;
    return (2 * t3 - 3 * t2 + 1) * v0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * v1 + (t3 - t2) * m1;
  }
  const arr = (k) => v.profile[k].map((a, i) => rail(a, v.code[k][i], v.hardware[k][i]));
  return { eye: arr("eye"), look: arr("look"), fov: rail(v.profile.fov, v.code.fov, v.hardware.fov) };
}
function seeded(s) {
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function makeCanvas(w, h, fn) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  fn(cv.getContext("2d"), w, h);
  return cv;
}
function mapOf(T, img, color = true) {
  const tx = new T.CanvasTexture(img);
  if (color) tx.encoding = T.sRGBEncoding;
  tx.anisotropy = 4;
  return tx;
}
function line(c, ps, col, width = 1) {
  c.beginPath();
  ps.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = col;
  c.lineWidth = width;
  c.stroke();
}
function boardMap(T) {
  const rand = seeded(42903);
  const cv = makeCanvas(1024, 1024, (c, w, h) => {
    const pixels = c.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const grain = (rand() - 0.5) * 6.3 + 1.6 * Math.sin(x * 0.019) * Math.sin(y * 0.015);
        const i = (y * w + x) * 4;
        pixels.data[i] = 19 + grain;
        pixels.data[i + 1] = 41 + grain;
        pixels.data[i + 2] = 34 + grain;
        pixels.data[i + 3] = 255;
      }
    c.putImageData(pixels, 0, 0);
    c.lineJoin = "round";
    for (let i = 0; i < 186; i++) {
      const x = Math.round(rand() * 107) * 10 - 20,
        y = Math.round(rand() * 107) * 10 - 20;
      const sx = rand() > 0.5 ? 1 : -1,
        sy = rand() > 0.5 ? 1 : -1;
      const a = 18 + rand() * 84,
        b = 8 + rand() * 43,
        d = 18 + rand() * 120;
      const k = rand(),
        ink = k > 0.91 ? "#536756" : k > 0.66 ? "#3b5546" : "#2c4638";
      const p = [
        [x, y],
        [x + sx * a, y],
        [x + sx * (a + b), y + sy * b],
        [x + sx * (a + b), y + sy * (b + d)],
      ];
      line(c, p, "#172c26", k > 0.7 ? 5 : 3.1);
      line(c, p, ink, k > 0.7 ? 2.8 : 1.6);
      if (i % 2 === 0) {
        c.beginPath();
        c.fillStyle = ink;
        c.arc(x, y, 3.7, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.fillStyle = "#1c2b24";
        c.arc(x, y, 1.8, 0, Math.PI * 2);
        c.fill();
      }
    }
    for (const [xx, yy, dir, count] of [
      [46, 310, 1, 14],
      [575, 60, 1, 10],
      [842, 846, -1, 11],
      [352, 830, -1, 9],
      [885, 425, -1, 7],
    ]) {
      for (let i = 0; i < count; i++) {
        const off = i * 6.6;
        line(
          c,
          [
            [xx + dir * off, yy],
            [xx + dir * (off + 98), yy + 98],
            [xx + dir * (off + 188), yy + 98],
            [xx + dir * (off + 243), yy + 153],
            [xx + dir * (off + 243), yy + 234],
          ],
          i % 5 === 0 ? "#6e7660" : "#3b5445",
          2.0,
        );
      }
    }
    for (let i = 0; i < 37; i++) {
      const x = rand() * 995,
        y = rand() * 995,
        w0 = 20 + rand() * 65,
        h0 = 14 + rand() * 32;
      c.strokeStyle = i % 3 ? "#405445" : "#66725b";
      c.lineWidth = 1.3;
      c.strokeRect(x, y, w0, h0);
      for (let k = 0; k < 4; k++) {
        c.fillStyle = "#71806b";
        c.fillRect(x + 3 + (k * w0) / 4, y - 4, 2, 3);
      }
    }
    for (let i = 0; i < 280; i++) {
      const x = rand() * 1024,
        y = rand() * 1024;
      c.strokeStyle = "#4d5946";
      c.lineWidth = 0.8;
      c.beginPath();
      c.arc(x, y, 2.0 + rand() * 1.4, 0, 2 * Math.PI);
      c.stroke();
    }
  });
  const tex = mapOf(T, cv);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  return tex;
}
function etchedPanel(T) {
  const rand = seeded(21908);
  const cv = makeCanvas(640, 640, (c, w, h) => {
    c.fillStyle = "#41504b";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) {
      const y = rand() * h;
      c.strokeStyle = i % 3 ? "rgba(222,225,201,.032)" : "rgba(12,30,23,.045)";
      c.beginPath();
      const x = rand() * w;
      c.moveTo(x, y);
      c.lineTo(x + 13 + rand() * 118, y + rand() * 0.4);
      c.stroke();
    }
    c.strokeStyle = "#5d6860";
    c.lineWidth = 2;
    c.strokeRect(26, 26, w - 52, h - 52);
    c.strokeRect(43, 43, w - 86, h - 86);
    for (let i = 0; i < 12; i++) {
      const xx = 63 + i * 18;
      line(
        c,
        [
          [xx, 93],
          [xx + 16, 109],
          [xx + 16, 136],
        ],
        "#6c7566",
        2,
      );
    }
    for (let i = 0; i < 8; i++) {
      const x = 447 + i * 13;
      line(
        c,
        [
          [x, 506],
          [x + 20, 486],
          [x + 20, 467],
        ],
        "#61726a",
        2,
      );
    }
  });
  return mapOf(T, cv);
}

export function createFieldWorld(T, scene) {
  T.ColorManagement.legacyMode = false;
  const world = new T.Group();
  world.name = "Circuit field";
  scene.add(world);
  const random = seeded(617472);
  const traceTexture = boardMap(T),
    panelTexture = etchedPanel(T);
  function standard(color, rough = 0.67, metal = 0.23, extra = {}) {
    return new T.MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMapIntensity: 0.84, ...extra });
  }
  const earth = standard(0x80a699, 0.72, 0.29, { map: traceTexture });
  const resin = standard(0x273b35, 0.7, 0.26),
    seam = standard(0x172621, 0.78, 0.12),
    laminate = standard(0x424f40, 0.7, 0.32);
  const packageMat = standard(0x33403a, 0.65, 0.37),
    deepPackage = standard(0x283731, 0.74, 0.25),
    lid = standard(0xb1b9a6, 0.49, 0.54, { map: panelTexture });
  const fin = standard(0x505e54, 0.46, 0.59),
    brightMetal = standard(0x849487, 0.39, 0.62),
    nearBlack = standard(0x162320, 0.76, 0.21);
  const tarnish = standard(0x815139, 0.47, 0.67),
    bronze = standard(0xc1844e, 0.34, 0.68),
    paleCopper = standard(0xb28763, 0.4, 0.69);
  const ceramic = standard(0x938578, 0.62, 0.25),
    nickel = standard(0x909d99, 0.42, 0.68);
  const warm = new T.MeshStandardMaterial({
    color: 0xe6b476,
    emissive: 0xed8c3e,
    emissiveIntensity: 1.0,
    metalness: 0.22,
    roughness: 0.4,
  });
  const ice = new T.MeshStandardMaterial({
    color: 0x85bda3,
    emissive: 0x559682,
    emissiveIntensity: 0.65,
    metalness: 0.26,
    roughness: 0.46,
  });
  const instGroups = new Map(),
    geoms = new Map();
  function slabUnit() {
    if (geoms.has("slab")) return geoms.get("slab");
    const s = new T.Shape(),
      a = 0.473,
      r = 0.037;
    s.moveTo(-a + r, -a);
    s.lineTo(a - r, -a);
    s.quadraticCurveTo(a, -a, a, -a + r);
    s.lineTo(a, a - r);
    s.quadraticCurveTo(a, a, a - r, a);
    s.lineTo(-a + r, a);
    s.quadraticCurveTo(-a, a, -a, a - r);
    s.lineTo(-a, -a + r);
    s.quadraticCurveTo(-a, -a, -a + r, -a);
    const g = new T.ExtrudeGeometry(s, {
      depth: 0.946,
      bevelEnabled: true,
      bevelThickness: 0.027,
      bevelSize: 0.027,
      bevelSegments: 1,
      curveSegments: 2,
    });
    g.translate(0, 0, -0.473);
    g.rotateX(-Math.PI / 2);
    geoms.set("slab", g);
    return g;
  }
  function geo(kind) {
    if (geoms.has(kind)) return geoms.get(kind);
    const g =
      kind === "slab"
        ? slabUnit()
        : kind === "round"
          ? new T.CylinderGeometry(0.5, 0.5, 1, 16)
          : new T.BoxGeometry(1, 1, 1);
    geoms.set(kind, g);
    return g;
  }
  function part(kind, m, x, y, z, w, h, d, angle = 0) {
    const k = kind + m.uuid;
    if (!instGroups.has(k)) instGroups.set(k, { kind, m, data: [] });
    instGroups.get(k).data.push([x, y, z, w, h, d, angle]);
  }
  function box(m, x, y, z, w, h, d, angle = 0) {
    part("box", m, x, y, z, w, h, d, angle);
  }
  function slab(m, x, y, z, w, h, d, angle = 0) {
    part("slab", m, x, y, z, w, h, d, angle);
  }
  function round(m, x, y, z, dia, h) {
    part("round", m, x, y, z, dia, h, dia);
  }
  function groundAt(x, z) {
    return (
      -0.31 +
      0.105 * Math.sin(x * 0.224 + Math.cos(z * 0.147)) +
      0.07 * Math.cos(z * 0.26 - x * 0.058) +
      0.053 * Math.sin(z * 0.493 + x * 0.193)
    );
  }
  // A continuous solder-mask substrate joins the larger cut and laminated plateaus.
  const terrainGeo = new T.PlaneGeometry(114, 104, 134, 118);
  terrainGeo.rotateX(-Math.PI / 2);
  const pv = terrainGeo.attributes.position,
    uv = terrainGeo.attributes.uv;
  for (let i = 0; i < pv.count; i++) {
    const x = pv.getX(i),
      z = pv.getZ(i) - 30;
    pv.setXYZ(i, x, groundAt(x, z), z);
    uv.setXY(i, x / 9.6, z / 9.6);
  }
  terrainGeo.computeVertexNormals();
  const terrain = new T.Mesh(terrainGeo, earth);
  terrain.receiveShadow = true;
  world.add(terrain);

  // Soft studio sky with an atmospheric horizon directed into the far right of the field.
  const skyMat = new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    uniforms: {
      zen: { value: new T.Color(0x071215) },
      base: { value: new T.Color(0x142827) },
      mist: { value: new T.Color(0x6d958a) },
      sourceLight: { value: new T.Color(0xa5b5a1) },
    },
    vertexShader:
      "varying vec3 ray;void main(){vec4 p=modelMatrix*vec4(position,1.0);ray=p.xyz-cameraPosition;gl_Position=projectionMatrix*viewMatrix*p;}",
    fragmentShader: `varying vec3 ray;uniform vec3 zen;uniform vec3 base;uniform vec3 mist;uniform vec3 sourceLight;
      float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h2(i),h2(i+vec2(1.,0.)),f.x),mix(h2(i+vec2(0.,1.)),h2(i+vec2(1.)),f.x),f.y);}
      void main(){vec3 d=normalize(ray);float altitude=max(0.,d.y);
        float az=atan(d.x,-d.z);vec3 sun=normalize(vec3(.21,.105,-1.));
        float beam=max(dot(d,sun),0.);float haze=pow(beam,15.0)*exp(-abs(d.y-.065)*4.85);
        float cloud=noise2(vec2(az*4.1,d.y*16.7+1.0))*.52+noise2(vec2(az*12.2,d.y*34.0+4.7))*.31+noise2(vec2(az*27.5,d.y*63.0+9.0))*.17;
        vec3 horizon=mix(base,mist,.05+.73*haze);
        vec3 col=mix(horizon,zen,smoothstep(.0,.53,altitude))*(.72+.47*cloud);
        float shaft=pow(max(.0,sin((az-.24*d.y)*24.0+1.86)),5.)*.41+pow(max(.0,sin((az-.24*d.y)*57.0+.6)),7.)*.20;
        col+=sourceLight*pow(beam,53.)*(.10+.105*shaft)*exp(-max(0.,d.y-.16)*6.0);
        gl_FragColor=vec4(col,1.);
        #include <encodings_fragment>
      }`,
  });
  const sky = new T.Mesh(new T.SphereGeometry(102, 32, 14), skyMat);
  sky.renderOrder = -20;
  sky.frustumCulled = false;
  world.add(sky);
  scene.background = new T.Color(0x172e2a);
  scene.fog = new T.FogExp2(0x28403a, 0.031);
  const envCanvas = makeCanvas(320, 160, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#5a726b");
    g.addColorStop(0.31, "#657b72");
    g.addColorStop(0.47, "#365e55");
    g.addColorStop(0.55, "#152a26");
    g.addColorStop(0.75, "#263833");
    g.addColorStop(1, "#101e1a");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#e3d5aa";
    c.fillRect(36, 16, 27, 45);
    c.fillStyle = "#d0e6db";
    c.fillRect(184, 16, 18, 46);
    c.fillStyle = "#99917d";
    c.fillRect(281, 36, 15, 26);
  });
  const environment = mapOf(T, envCanvas);
  environment.mapping = T.EquirectangularReflectionMapping;
  scene.environment = environment;
  scene.add(new T.HemisphereLight(0xb9e0d3, 0x1e3935, 0.54));
  function sun(hex, it, pos, target) {
    const l = new T.DirectionalLight(hex, it);
    l.position.set(...pos);
    l.target.position.set(...target);
    scene.add(l, l.target);
    return l;
  }
  const key = sun(0xffcf91, 3.65, [9.4, 8.6, -12.8], [1.8, 0, -2.3]);
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -13, right: 13, top: 12, bottom: -12, near: 0.1, far: 37 });
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.00027;
  key.shadow.normalBias = 0.012;
  sun(0x9ed4ca, 0.96, [-5.2, 6.2, 3.4], [2, 0.3, -1.5]);
  sun(0x82b5c2, 0.48, [8.0, 3.4, 5.8], [2, 1, -2.5]);
  const stationLamp = new T.PointLight(0xe8d2a9, 9.5, 8, 2.0);
  stationLamp.position.set(2.8, 3.8, -0.75);
  scene.add(stationLamp);

  // Satin ceramic packages, gold gull-wing leads and extruded cooling fins form cliffs rather than a flat grid.
  function led(x, y, z, type = "warm", long = 0.1) {
    const m = type === "warm" ? warm : ice;
    box(nearBlack, x, y + 0.009, z, long * 1.48, 0.028, 0.073);
    box(m, x, y + 0.028, z, long, 0.017, 0.04);
  }
  const fieldSignal = standard(0x477a67, 0.43, 0.59, { emissive: 0x237e66, emissiveIntensity: 0.62 });
  const fieldAmber = standard(0xd4a16f, 0.37, 0.55, { emissive: 0xc56e37, emissiveIntensity: 0.62 });
  function chip(x, z, w, d, h, kind = 0, allowLed = true) {
    const y = groundAt(x, z);
    slab(resin, x, y + 0.067, z, w * 1.105, 0.155, d * 1.13);
    box(tarnish, x, y + 0.118, z, w * 1.055, 0.02, d * 1.085);
    slab(seam, x, y + 0.155, z, w * 1.06, 0.085, d * 1.075);
    slab(kind === 2 ? deepPackage : packageMat, x, y + 0.173 + h * 0.48, z, w, h, d);
    const top = y + 0.173 + h;
    slab(kind === 1 ? fin : lid, x, top + 0.031, z, w * 0.9, 0.075, d * 0.87);
    if (kind === 1) {
      const count = Math.max(4, Math.min(20, Math.round(w / 0.155)));
      for (let i = 0; i < count; i++)
        box(
          fin,
          x + ((i + 0.5) / count - 0.5) * w * 0.88,
          top + h * 0.25,
          z,
          Math.min(0.061, (w / count) * 0.29),
          h * 0.48 + 0.035,
          d * 0.82,
        );
      box(brightMetal, x, top + 0.025, z + d * 0.35, w * 0.9, 0.055, 0.055);
    } else if (kind === 2) {
      const tierH = h * 0.2;
      slab(deepPackage, x + 0.03, top + tierH * 0.5, z - 0.02, w * 0.71, tierH, d * 0.7);
      slab(fin, x + 0.03, top + tierH + 0.013, z - 0.02, w * 0.65, 0.03, d * 0.63);
    }
    if (z > -17 && w > 1.25) {
      const n = Math.max(6, Math.min(23, Math.floor(w / 0.162)));
      for (let i = 0; i < n; i++) {
        const xx = x + ((i + 0.5) / n - 0.5) * w * 0.93;
        box(nickel, xx, y + 0.131, z + d * 0.548, 0.05, 0.047, d * 0.105);
        if (z > -7) box(nickel, xx, y + 0.175, z + d * 0.503, 0.05, 0.101, 0.045);
      }
      if (allowLed && kind !== 1) {
        led(x + w * 0.28, top + 0.078, z + d * 0.3, random() > 0.74 ? "ice" : "warm", 0.105);
      }
    }
  }
  function cap(x, z, r, h) {
    const y = groundAt(x, z);
    round(seam, x, y + 0.065, z, r * 2.1, 0.14);
    round(deepPackage, x, y + h * 0.5 + 0.08, z, r * 2, h);
    round(nickel, x, y + h + 0.074, z, r * 1.98, 0.054);
    box(packageMat, x, y + h + 0.104, z, r * 0.99, 0.01, 0.032, 0.55);
    box(packageMat, x, y + h + 0.104, z, r * 0.99, 0.01, 0.025, -0.55);
  }
  // Sparse distant rows leave an atmospheric channel through the heart of the landscape.
  for (let row = 0; row < 8; row++) {
    const z = -12.5 - row * 5.15;
    for (let col = -7; col <= 7; col++) {
      const x = col * 4.3 + (row % 2) * 1.7 + (random() - 0.5) * 1.33;
      const zz = z + (random() - 0.5) * 2.3;
      const channel = -1.8 + 3.4 * Math.sin(zz * 0.09);
      if (Math.abs(x - channel) < 2.5 + random() * 0.8) continue;
      const w = 1.85 + random() * 2.62,
        d = 1.36 + random() * 2.2;
      const ridge = 0.55 + 0.62 * Math.min(1, Math.abs(x - channel) / 9);
      const h = (0.34 + random() * 2.13) * ridge + (row > 2 ? random() * 1.4 : 0);
      chip(x, zz, w, d, h, (row + col + 27) % 3, false);
      if (random() < 0.32) cap(x + w * 0.57, zz + d * 0.37, 0.13 + random() * 0.23, 0.68 + random() * 1.24);
    }
  }
  const named = [
    [-7.5, -3.7, 3.3, 2.56, 0.92, 1],
    [-6.0, -8.0, 2.84, 2.1, 0.61, 2],
    [-10.2, -1.0, 3.9, 2.4, 1.01, 1],
    [-3.8, -7.7, 1.76, 1.36, 0.29, 0],
    [-10.2, -11.0, 2.89, 2.32, 1.77, 1],
    [8.7, -5.2, 2.7, 2.42, 1.24, 1],
    [6.85, -8.3, 2.11, 1.79, 0.73, 0],
    [11.2, -0.35, 4.32, 2.47, 1.66, 2],
    [9.36, -10.21, 2.88, 2.22, 2.0, 1],
    [-5.6, 2.35, 3.85, 1.78, 0.26, 0],
    [-8.3, 5.15, 4.4, 2.9, 0.58, 1],
    [7.39, 3.36, 2.06, 1.53, 0.42, 1],
    [8.45, 1.06, 1.44, 1.07, 0.31, 0],
    [-3.54, -1.65, 1.22, 1.15, 0.16, 0],
    [-0.16, -8.95, 1.81, 1.98, 0.46, 2],
    [2.82, -9.12, 2.17, 1.43, 0.67, 0],
  ];
  named.forEach((a) => chip(...a));
  [
    [7.3, -5.66, 0.27, 1.59],
    [7.63, -5.24, 0.22, 1.43],
    [-6.1, 0.82, 0.19, 0.64],
    [-5.64, 0.68, 0.16, 0.56],
    [6.87, 2.09, 0.24, 0.77],
    [7.38, 1.88, 0.17, 0.62],
    [-5.0, -9.0, 0.26, 1.78],
  ].forEach((a) => cap(...a));

  // Wound capacitors and small pin headers break the rectangular skyline at the edge of the field.
  const jacket = standard(0x28443f, 0.46, 0.46),
    jacketMark = standard(0x607971, 0.53, 0.48);
  function can(x, z, r, h, detailed = true) {
    const b = groundAt(x, z);
    round(nearBlack, x, b + 0.07, z, r * 2.25, 0.16);
    round(jacket, x, b + h * 0.48 + 0.08, z, r * 2, h * 0.94);
    round(fin, x, b + h + 0.05, z, r * 1.93, 0.072);
    round(nickel, x, b + h + 0.088, z, r * 1.72, 0.018);
    for (let i = 0; i < 3; i++) box(jacket, x, b + h + 0.105, z, r * 1.34, 0.008, 0.02, 0.12 + (i * Math.PI) / 3);
    if (detailed) {
      for (const a of [-0.55, -0.38])
        box(
          jacketMark,
          x + r * 0.99 * Math.sin(a),
          b + h * 0.51,
          z + r * 0.99 * Math.cos(a),
          0.054,
          h * 0.77,
          0.018,
          a,
        );
      for (let i = 0; i < 4; i++)
        box(
          jacketMark,
          x + r * 0.99 * Math.sin(-0.22),
          b + h * (0.34 + 0.087 * i),
          z + r * 0.99 * Math.cos(-0.22),
          0.082,
          0.024,
          0.022,
          -0.22,
        );
      for (const dy of [0.11, 0.2, 0.78]) round(jacketMark, x, b + dy * h, z, 2.012 * r, dy === 0.2 ? 0.018 : 0.025);
    }
  }
  [
    [-4.96, 0.42, 0.55, 2.42],
    [-5.78, -0.25, 0.39, 1.86],
    [-10.6, 0.84, 0.69, 3.98],
    [-9.48, -0.53, 0.55, 3.17],
    [-11.23, -1.32, 0.62, 3.52],
    [-8.75, -5.25, 0.51, 2.5],
    [-9.68, -5.12, 0.38, 1.83],
    [9.25, -4.3, 0.54, 3.08],
    [10.17, -4.05, 0.47, 2.71],
    [10.4, -5.15, 0.47, 2.92],
    [7.7, -12.23, 0.57, 3.12],
    [8.96, -12.5, 0.62, 3.76],
    [-7.34, -16.54, 0.67, 3.59],
    [-8.45, -17.61, 0.54, 4.2],
    [-8.82, -16.16, 0.39, 2.97],
  ].forEach((a) => can(...a));
  function header(x, z, len, h) {
    const y = groundAt(x, z);
    slab(nearBlack, x, y + 0.114, z, 0.46, 0.22, len * 0.41 + 0.17);
    for (let j = 0; j < len; j++)
      for (let k = 0; k < 2; k++) {
        const xx = x + (k - 0.5) * 0.23,
          zz = z + (j - (len - 1) * 0.5) * 0.41;
        box(tarnish, xx, y + h * 0.46 + 0.19, zz, 0.074, h * 0.92, 0.082);
        box(paleCopper, xx, y + h * 0.92 + 0.16, zz, 0.06, 0.08, 0.067);
      }
  }
  [
    [-5.3, -14.74, 6, 2.55],
    [-6.04, -15.1, 5, 3.22],
    [9.12, -10.63, 6, 3.03],
    [-11.0, -8.74, 4, 3.42],
    [13.2, -15.41, 7, 4.05],
    [-7.06, -26.71, 6, 4.84],
    [6.5, -19.24, 5, 2.96],
  ].forEach((a) => header(...a));

  // SMD passives, vias and land patterns introduce a convincing macro scale near the camera.
  for (let i = 0; i < 330; i++) {
    const x = random() * 25 - 12.5,
      z = random() * 22 - 14;
    if (Math.abs(x - 3.58) < 3.99 && Math.abs(z + 3.1) < 2.17) continue;
    const y = groundAt(x, z),
      s = 0.085 + random() * 0.2,
      vertical = random() > 0.54;
    const ang = vertical ? Math.PI / 2 : 0;
    box(laminate, x, y + 0.016, z, s * 2.3, 0.036, s * 0.96, ang);
    box(i % 4 === 0 ? ceramic : deepPackage, x, y + 0.052, z, s * 1.62, 0.063, s * 0.7, ang);
    const xo = Math.cos(ang) * s * 0.8,
      zo = -Math.sin(ang) * s * 0.8;
    box(nickel, x + xo, y + 0.055, z + zo, s * 0.34, 0.063, s * 0.7, ang);
    box(nickel, x - xo, y + 0.055, z - zo, s * 0.34, 0.063, s * 0.7, ang);
    if (i % 17 === 0 && x > -0.8) led(x + 0.14, y + 0.035, z - 0.1, i % 3 ? "warm" : "ice", 0.061);
  }
  for (let i = 0; i < 88; i++) {
    const x = -8.5 + random() * 18,
      z = -10 + random() * 16;
    if (Math.abs(x - 3.58) < 4.1 && Math.abs(z + 3.1) < 2.3) continue;
    const y = groundAt(x, z);
    round(tarnish, x, y + 0.007, z, 0.071, 0.015);
    round(nearBlack, x, y + 0.018, z, 0.041, 0.009);
  }

  // The work surface is a raised, soldered chip package with castellated contacts, not a floating pedestal.
  const stationX = 3.63,
    stationZ = -3.04,
    stationY = 0.96;
  slab(seam, stationX, -0.082, stationZ, 7.68, 0.43, 4.11);
  slab(laminate, stationX, 0.12, stationZ, 7.52, 0.151, 3.99);
  box(tarnish, stationX, 0.186, stationZ, 7.47, 0.033, 3.96);
  slab(resin, stationX, 0.245, stationZ, 7.57, 0.097, 3.99);
  slab(deepPackage, stationX, 0.529, stationZ, 7.18, 0.542, 3.64);
  slab(brightMetal, stationX, 0.795, stationZ, 7.1, 0.049, 3.61);
  slab(packageMat, stationX, 0.863, stationZ, 6.98, 0.145, 3.51);
  slab(lid, stationX, 0.94, stationZ, 6.85, 0.039, 3.4);
  for (let i = 0; i < 39; i++) {
    const x = stationX - 3.355 + 0.176 * i;
    for (const side of [-1, 1]) {
      const z = stationZ + side * 1.83;
      box(nickel, x, 0.389, z, 0.084, 0.071, 0.165);
      box(nickel, x, 0.327, z + side * 0.073, 0.084, 0.144, 0.059);
      box(i % 9 === 4 ? paleCopper : nickel, x, 0.248, z + side * 0.138, 0.084, 0.043, 0.18);
    }
  }
  for (let i = 0; i < 14; i++) {
    const z = stationZ - 1.42 + i * 0.215;
    box(nickel, stationX + 3.67, 0.301, z, 0.19, 0.072, 0.071);
    box(nickel, stationX + 3.59, 0.372, z, 0.057, 0.169, 0.071);
  }
  for (const x of [stationX - 3.24, stationX + 3.24])
    for (const z of [stationZ - 1.51, stationZ + 1.51]) {
      round(nickel, x, 0.965, z, 0.091, 0.025);
      box(nearBlack, x, 0.98, z, 0.062, 0.007, 0.013, 0.62);
    }
  const workstation = createLabModel(T);
  workstation.root.position.set(stationX, stationY, stationZ);
  world.add(workstation.root);
  workstation.setView("code");
  workstation.setSurvey(-1);
  // A pilot lamp under the monitor and in the dark edges of the socket motivates local reflections.
  const pool = new T.PointLight(0x73d8bf, 6.8, 4.3, 2);
  pool.position.set(3.65, 1.89, -1.48);
  scene.add(pool);
  const copperPool = new T.PointLight(0xf1a25d, 12.5, 4.8, 2);
  copperPool.position.set(6.89, 1.39, -2.44);
  scene.add(copperPool);
  // A keyed electrical connection and two delivery cables ground the objects in the larger world.
  const pipeGroups = new Map();
  function pipe(points, r, m, steps = 40) {
    const geo = new T.TubeGeometry(
      new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
      steps,
      r,
      8,
      false,
    );
    if (!pipeGroups.has(m)) pipeGroups.set(m, []);
    pipeGroups.get(m).push(geo);
  }
  for (let i = 0; i < 3; i++) {
    const z = stationZ + 0.78 + i * 0.13;
    pipe(
      [
        [stationX + 2.26, stationY + 0.15, z],
        [stationX + 2.91, 0.99, z],
        [stationX + 3.23, 0.92, z],
        [stationX + 3.47, 0.53, z + 0.09],
        [stationX + 3.8, 0.22, z + 0.14],
        [stationX + 4.37, 0.07, z + 0.19],
      ],
      0.049,
      i === 1 ? tarnish : nearBlack,
      28,
    );
  }

  // Flat etched paths cradle an elevated set of brushed-copper busbars across the foreground.
  const stripGroups = new Map();
  function strip(points, width, mat, height = 0.012) {
    if (!stripGroups.has(mat)) stripGroups.set(mat, { v: [], idx: [] });
    const { v, idx } = stripGroups.get(mat);
    const first = v.length / 3;
    for (let i = 0; i < points.length; i++) {
      const prev = points[Math.max(0, i - 1)],
        p = points[i],
        next = points[Math.min(points.length - 1, i + 1)];
      let dx = next[0] - prev[0],
        dz = next[1] - prev[1];
      const d = Math.hypot(dx, dz) || 1;
      dx /= d;
      dz /= d;
      const nx = -dz * width * 0.5,
        nz = dx * width * 0.5;
      v.push(
        p[0] - nx,
        groundAt(p[0] - nx, p[1] - nz) + height,
        p[1] - nz,
        p[0] + nx,
        groundAt(p[0] + nx, p[1] + nz) + height,
        p[1] + nz,
      );
      if (i) {
        const a = first + 2 * (i - 1);
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  }
  function route(anchors, delta) {
    const p = anchors.map(([x, z]) => [x + delta, z + delta * 0.48]),
      q = [];
    p.forEach((a, i) => {
      if (!i) {
        q.push(a);
        return;
      }
      const b = p[i - 1],
        n = Math.ceil(Math.hypot(a[0] - b[0], a[1] - b[1]) / 0.31);
      for (let j = 1; j <= n; j++) q.push([b[0] + ((a[0] - b[0]) * j) / n, b[1] + ((a[1] - b[1]) * j) / n]);
    });
    return q;
  }
  const primary = [
    [-11.0, 8.8],
    [-6.65, 8.8],
    [-2.28, 4.43],
    [-0.76, 4.43],
    [1.28, 2.39],
    [3.0, 2.39],
    [5.05, 0.34],
    [5.05, -1.19],
  ];
  const longLane = [
    [-4.0, 7.2],
    [-2.75, 5.95],
    [-2.75, 1.75],
    [-0.99, -0.01],
    [-0.99, -3.38],
    [-2.49, -4.88],
    [-2.49, -9.7],
    [-0.1, -12.09],
    [-0.1, -17.4],
    [3.0, -20.5],
    [3.0, -30],
  ];
  for (let i = 0; i < 9; i++) {
    const p = route(primary, (i - 4) * 0.106);
    strip(p, 0.07, tarnish, 0.022);
    strip(p, i % 4 === 0 ? 0.029 : 0.019, i % 4 === 0 ? paleCopper : laminate, 0.027);
  }
  for (let i = 0; i < 12; i++) {
    const p = route(longLane, (i - 5.5) * 0.085);
    strip(p, 0.052, laminate, 0.023);
    if (i % 4 === 1) strip(p, 0.016, paleCopper, 0.027);
  }
  for (const [a, b, delta, col] of [
    [0.03, 0.2, -0.338, fieldSignal],
    [0.27, 0.48, -0.338, fieldSignal],
    [0.55, 0.78, -0.338, fieldSignal],
    [0.81, 0.95, -0.338, fieldSignal],
    [0.32, 0.43, 0.2, fieldAmber],
    [0.65, 0.79, 0.2, fieldAmber],
  ]) {
    const track = route(primary, delta);
    strip(track.slice(Math.floor(a * track.length), Math.floor(b * track.length) + 1), 0.02, col, 0.036);
  }
  for (const [a, b] of [
    [0.06, 0.21],
    [0.35, 0.49],
    [0.55, 0.68],
    [0.77, 0.88],
  ]) {
    const track = route(longLane, -0.22);
    strip(track.slice(Math.floor(a * track.length), Math.floor(b * track.length) + 1), 0.019, fieldSignal, 0.033);
  }
  for (let i = 0; i < 4; i++) {
    const p = route(
      [
        [12, -1.4],
        [9.0, -1.4],
        [7.2, -3.2],
        [7.2, -6.6],
        [4.3, -9.5],
        [4.3, -17],
        [2, -19.3],
      ],
      i * 0.12,
    );
    strip(p, 0.054, paleCopper, 0.024);
  }
  stripGroups.forEach(({ v, idx }, mat) => {
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(v, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    mat.side = T.DoubleSide;
    const m = new T.Mesh(g, mat);
    m.receiveShadow = true;
    world.add(m);
  });
  // Raised flat conductors have a rounded rectangular cross section and a shared bend radius.
  function busbar(points, offset, w, h, mat) {
    const cs = new T.CatmullRomCurve3(points.map(([x, y, z]) => new T.Vector3(x, y, z)));
    const vs = [],
      ix = [],
      segments = 90,
      section = [
        [-0.41, -0.5],
        [0.41, -0.5],
        [0.5, -0.31],
        [0.5, 0.31],
        [0.41, 0.5],
        [-0.41, 0.5],
        [-0.5, 0.31],
        [-0.5, -0.31],
      ];
    const up = new T.Vector3(0, 1, 0);
    for (let i = 0; i <= segments; i++) {
      const t = i / segments,
        p = cs.getPointAt(t),
        tan = cs.getTangentAt(t),
        side = new T.Vector3().crossVectors(up, tan).normalize(),
        normal = new T.Vector3().crossVectors(tan, side).normalize();
      p.addScaledVector(side, offset);
      section.forEach(([u, v]) => {
        const a = p
          .clone()
          .addScaledVector(side, u * w)
          .addScaledVector(normal, v * h);
        vs.push(a.x, a.y, a.z);
      });
      if (i > 0)
        for (let k = 0; k < 8; k++) {
          const a = (i - 1) * 8 + k,
            b = (i - 1) * 8 + ((k + 1) % 8);
          ix.push(a, b, a + 8, b, b + 8, a + 8);
        }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(vs, 3));
    g.setIndex(ix);
    g.computeVertexNormals();
    const m = new T.Mesh(g, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    world.add(m);
  }
  const arch = [
    [-8.7, 0.035, 5.9],
    [-5.54, 0.075, 5.17],
    [-3.47, 0.145, 4.38],
    [-2.18, 0.214, 3.57],
    [-1.46, 0.48, 3.1],
    [-0.89, 1.21, 2.83],
    [-0.25, 1.47, 2.65],
    [0.32, 1.17, 2.34],
    [1.0, 0.363, 1.9],
    [1.7, 0.208, 1.43],
    [2.43, 0.216, 0.88],
    [2.89, 0.464, 0.2],
    [3.17, 0.485, -0.7],
    [3.25, 0.42, -1.14],
  ];
  busbar(arch, -0.272, 0.206, 0.091, tarnish);
  busbar(arch, 0, 0.229, 0.093, bronze);
  busbar(arch, 0.276, 0.202, 0.088, paleCopper);
  for (let i = 0; i < 3; i++) {
    round(tarnish, 3.17 + i * 0.15, -0.037, 1.27, 0.11, 0.06);
  }
  // A set of small pilot lamps is crimped to the copper bus. Each lamp has a plated bezel and a diffused die.
  const signalSites = [];
  const hotLens = new T.MeshBasicMaterial({ color: 0xffd291, toneMapped: false });
  const greenLens = new T.MeshBasicMaterial({ color: 0x98e6c8, toneMapped: false });
  function pilot(x, y, z, length = 0.15, cool = false, axis = 0) {
    const deep = 0.083;
    box(packageMat, x, y + 0.022, z, length + 0.085, 0.056, deep + 0.057, axis);
    box(cool ? fieldSignal : tarnish, x, y + 0.053, z, length + 0.046, 0.015, deep + 0.021, axis);
    box(cool ? greenLens : hotLens, x, y + 0.066, z, length, 0.021, deep - 0.013, axis);
    signalSites.push([x, y + 0.087, z, (cool ? 0.53 : 0.63) * Math.sqrt(length / 0.14), cool]);
  }
  for (const [x, z, len, green] of [
    [-2.25, 4.98, 0.15, false],
    [-1.78, 4.46, 0.11, false],
    [0.12, 3.73, 0.12, true],
    [1.39, 2.49, 0.2, false],
    [2.85, 1.72, 0.12, false],
    [4.6, 0.42, 0.17, false],
    [5.52, -0.66, 0.13, true],
    [-2.35, -5.52, 0.1, true],
    [1.33, -7.04, 0.12, false],
  ]) {
    pilot(x, groundAt(x, z) + 0.027, z, len, green, -0.72);
  }
  for (const [x, z, len, cool, angle] of [
    [0.6, -1.55, 0.24, true, 0],
    [0.9, -1.55, 0.09, true, 0],
    [5.97, -1.55, 0.19, false, 0],
    [6.27, -1.55, 0.1, false, 0],
    [6.88, -2.29, 0.16, false, 1.57],
    [6.88, -2.61, 0.09, false, 1.57],
  ]) {
    pilot(x, 0.961, z, len, cool, angle);
  }
  // Tiny separated signals weather into bokeh in the atmospheric approach to the ridge.
  for (const [x, y, z, cool] of [
    [7.62, 1.13, -8.37, true],
    [9.6, 2.08, -10.54, false],
    [-3.78, 0.52, -7.34, false],
    [-5.45, 0.96, -7.4, false],
    [-7.59, 2.04, -11.21, true],
    [2.69, 0.71, -8.54, false],
    [-8.0, 1.89, -15.58, false],
    [9.43, 2.27, -16.15, true],
    [-4.06, 1.82, -16.6, false],
  ]) {
    pilot(x, y, z, 0.125, cool, 0);
  }
  // A travelling inspection band follows the copper-track centreline instead of crossing empty space.
  const surveyTracks = primary.map(([x, z]) => new T.Vector3(x, groundAt(x, z) + 0.044, z));
  const surveyCurve = new T.CatmullRomCurve3(surveyTracks);
  const surveyColor = new T.MeshBasicMaterial({
    color: 0xe5bc77,
    transparent: true,
    opacity: 0.91,
    depthWrite: false,
    toneMapped: false,
  });
  const pulse = new T.Mesh(new T.SphereGeometry(1, 12, 7), surveyColor);
  pulse.visible = false;
  pulse.scale.set(0.09, 0.026, 0.075);
  world.add(pulse);

  // Film-like vapor layers separate the terraces from the horizon.
  const fogTexture = mapOf(
    T,
    makeCanvas(480, 128, (c, w, h) => {
      const img = c.createImageData(w, h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const u = x / (w - 1),
            v = y / (h - 1),
            wave =
              0.44 + 0.054 * Math.sin(8.3 * u) + 0.051 * Math.sin(17 * u + 1.3) + 0.023 * Math.sin(34 * u + v * 1.4);
          const strand = Math.exp(-Math.pow((v - wave) / 0.215, 2)),
            edges = Math.pow(Math.sin(Math.PI * u), 0.7);
          const clouds =
            0.44 +
            0.25 * Math.sin(u * 11.1 + v * 3.2) +
            0.1 * Math.cos(u * 28.9 - v * 3.7) +
            0.055 * Math.sin(u * 51 + v * 12);
          const j = (y * w + x) * 4;
          img.data[j] = 195;
          img.data[j + 1] = 207;
          img.data[j + 2] = 186;
          img.data[j + 3] = 255 * Math.max(0, strand * edges * clouds);
        }
      c.putImageData(img, 0, 0);
    }),
  );
  for (const [x, y, z, w, h, o] of [
    [-7, 2.1, -42, 40, 5.0, 0.25],
    [8, 2.5, -36, 37, 5.6, 0.23],
    [2, 1.45, -25, 27, 3.72, 0.23],
    [-8, 1.52, -18, 24, 3.43, 0.16],
    [7, 1.21, -14, 20, 2.8, 0.135],
    [-1, 1.0, -8.6, 12.2, 2.01, 0.09],
  ]) {
    const mat = new T.MeshBasicMaterial({
      map: fogTexture,
      transparent: true,
      opacity: o,
      depthWrite: false,
      side: T.DoubleSide,
      toneMapped: false,
      fog: false,
    });
    const m = new T.Mesh(new T.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z);
    world.add(m);
  }
  // Soft emissive halos belong to individual signal vias and do not float over the copy column.
  const bloom = mapOf(
    T,
    makeCanvas(64, 64, (c) => {
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,202,130,.80)");
      g.addColorStop(0.12, "rgba(255,176,95,.45)");
      g.addColorStop(0.38, "rgba(238,140,61,.15)");
      g.addColorStop(1, "rgba(225,132,57,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
    }),
  );
  const greenBloom = mapOf(
    T,
    makeCanvas(64, 64, (c) => {
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(183,255,226,.80)");
      g.addColorStop(0.13, "rgba(142,245,204,.46)");
      g.addColorStop(0.41, "rgba(93,196,164,.16)");
      g.addColorStop(1, "rgba(79,175,148,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
    }),
  );
  for (const [x, y, z, size] of [
    [1.14, 0.257, -1.06, 0.27],
    [5.94, 0.285, -1.06, 0.29],
    [6.56, 0.32, -4.9, 0.3],
    [8.75, 1.63, -5.8, 0.3],
    [-3.55, 0.2, -1.3, 0.17],
    [7.34, 0.4, 3.48, 0.18],
    [-4.6, 1.2, -9.5, 0.27],
    [3.0, 0.49, -9.1, 0.26],
    [-6.1, 1.01, -7.4, 0.24],
  ]) {
    signalSites.push([x, y + 0.027, z, size, false]);
    led(x, y, z, "warm", 0.065);
  }
  // Project all local halos as two instanced camera-facing batches.
  const flarePlane = new T.PlaneGeometry(1, 1);
  for (const cool of [false, true]) {
    const halos = signalSites.filter((a) => Boolean(a[4]) === cool);
    const mat = new T.MeshBasicMaterial({
      map: cool ? greenBloom : bloom,
      transparent: true,
      opacity: cool ? 0.72 : 0.78,
      depthWrite: false,
      blending: T.AdditiveBlending,
      toneMapped: false,
      fog: true,
    });
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        `vec4 mvPosition=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
        mvPosition.xy+=transformed.xy*vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));
        gl_Position=projectionMatrix*mvPosition;`,
      );
    };
    const batch = new T.InstancedMesh(flarePlane, mat, halos.length),
      tr = new T.Object3D();
    halos.forEach(([x, y, z, size], i) => {
      tr.position.set(x, y, z);
      tr.scale.setScalar(size);
      tr.updateMatrix();
      batch.setMatrixAt(i, tr.matrix);
    });
    batch.frustumCulled = false;
    world.add(batch);
  }
  // Coalesce all repeated background packages into a small number of durable draws.
  const dummy = new T.Object3D();
  instGroups.forEach(({ kind, m, data }) => {
    const im = new T.InstancedMesh(geo(kind), m, data.length);
    data.forEach(([x, y, z, w, h, d, a], i) => {
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, a, 0);
      dummy.scale.set(w, h, d);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.castShadow = m !== warm && m !== ice;
    im.receiveShadow = true;
    world.add(im);
  });
  pipeGroups.forEach((arr, m) => {
    const v = [],
      n = [],
      uv = [];
    for (const raw of arr) {
      const g = raw.index ? raw.toNonIndexed() : raw;
      for (const val of g.attributes.position.array) v.push(val);
      for (const val of g.attributes.normal.array) n.push(val);
      for (const val of g.attributes.uv.array) uv.push(val);
      g.dispose();
      if (g !== raw) raw.dispose();
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(v, 3));
    g.setAttribute("normal", new T.Float32BufferAttribute(n, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    const ob = new T.Mesh(g, m);
    ob.castShadow = true;
    ob.receiveShadow = true;
    world.add(ob);
  });
  // A camera-space film grade deepens the frame edges and reserves the copy area as the light falls right.
  const gradeMat = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    vertexShader:
      "varying vec2 coord;varying float ar;void main(){coord=uv;ar=projectionMatrix[1][1]/projectionMatrix[0][0];gl_Position=vec4(position.xy,0.,1.);}",
    fragmentShader: `varying vec2 coord;varying float ar;
      void main(){
        float desk=smoothstep(.84,1.30,ar);
        float edge=pow(clamp(length((coord-vec2(.55,.54))*vec2(1.13,.84)),0.,1.),2.6)*.46;
        float left=(1.-smoothstep(.01,.65,coord.x))*(.36+.10*(1.-coord.y));
        float top=smoothstep(.49,1.0,coord.y)*.55;
        float opacity=clamp(edge+mix(top,left,desk),0.,.68);
        gl_FragColor=vec4(.018,.039,.036,opacity);
      }`,
  });
  const grade = new T.Mesh(new T.PlaneGeometry(2, 2), gradeMat);
  grade.frustumCulled = false;
  grade.renderOrder = 100;
  world.add(grade);
  let chapter = "profile",
    progress = -1;
  function setSurvey(p) {
    progress = Number.isFinite(p) ? p : -1;
    const on = progress >= 0 && progress <= 1;
    pulse.visible = on && chapter !== "hardware";
    if (pulse.visible) pulse.position.copy(surveyCurve.getPointAt(progress));
    workstation.setSurvey(on && chapter === "hardware" ? progress : -1);
  }
  function setChapter(v) {
    if (!Object.hasOwn(fieldPoses, v)) return;
    chapter = v;
    setSurvey(progress);
  }
  function inspect(view) {
    grade.visible = !view;
    workstation.setView(view || "code");
    setSurvey(-1);
  }
  return { setChapter, setSurvey, inspect, station: [stationX, stationY, stationZ] };
}
