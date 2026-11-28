import { createFieldWorld, sampleFieldPose } from "./field-world.js";

import { labPoses } from "./lab-model.js";

export function createFieldScene(T, canvas, lost) {
  T.ColorManagement.legacyMode = false;
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "low-power" });
  renderer.physicallyCorrectLights = true;
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  const scene = new T.Scene();
  const world = createFieldWorld(T, scene);
  const camera = new T.PerspectiveCamera(38, 1, 0.06, 180);
  const target = new T.Vector3();
  const station = new T.Vector3().fromArray(world.station);
  const eye = new T.Vector3();
  const sphere = new T.Spherical();
  let inspected = null;
  let w = 0,
    h = 0,
    chapter = "",
    lastP = -1,
    lastSurvey = -2,
    portrait;
  canvas.addEventListener(
    "webglcontextlost",
    function (e) {
      e.preventDefault();
      lost();
    },
    { once: true },
  );
  // quality < 1 while the visitor is scrolling: fewer pixels to shade per frame, sharp again at rest.
  let quality = 1;
  function resize(width, height, mobile, scale) {
    w = width;
    h = height;
    quality = scale || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.05 : 1.4, 1800 / w) * quality);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
  }
  function orbit(key, degrees, tilt, width, height) {
    if (width < 1 || height < 1) return false;
    if (width !== w || height !== h || quality !== 1) resize(width, height, width < 700, 1);
    if (inspected !== key) {
      world.inspect(key);
      inspected = key;
      renderer.shadowMap.needsUpdate = true;
    }
    const pose = labPoses[key];
    target.fromArray(pose.look);
    eye.fromArray(pose.eye).sub(target);
    sphere.setFromVector3(eye);
    sphere.theta -= (degrees * Math.PI) / 180;
    sphere.phi = T.MathUtils.clamp(sphere.phi + tilt, 0.33, 1.48);
    target.add(station);
    camera.position.setFromSpherical(sphere).add(target);
    camera.lookAt(target);
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    return true;
  }
  function draw(p, key, mobile, width, height, survey) {
    if (width < 1 || height < 1) return;
    if (inspected !== null) {
      inspected = null;
      world.inspect(null);
      renderer.shadowMap.needsUpdate = true;
      chapter = "";
      lastP = -1;
    }
    const scale = survey >= 0 ? 0.7 : 1;
    const resized = w !== width || h !== height || scale !== quality;
    if (!resized && p === lastP && survey === lastSurvey && key === chapter && mobile === portrait) return;
    if (resized) resize(width, height, mobile, scale);
    if (key !== chapter) {
      chapter = key;
      world.setChapter(key);
    }
    const pose = sampleFieldPose(p, mobile);
    camera.position.fromArray(pose.eye);
    target.fromArray(pose.look);
    camera.lookAt(target);
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    world.setSurvey(survey);
    renderer.render(scene, camera);
    lastP = p;
    lastSurvey = survey;
    portrait = mobile;
  }
  // Compile every shader in the background (KHR_parallel_shader_compile) and wait until all are linked
  // before the first frame. Otherwise the GPU compiles them during that frame and the whole page,
  // not just this canvas, stops for a third of a second or more.
  async function prepare(p, key, mobile, width, height) {
    if (width < 1 || height < 1) return;
    const gl = renderer.getContext();
    const ext = gl.getExtension("KHR_parallel_shader_compile");
    if (!ext) return;
    resize(width, height, mobile, 1);
    chapter = key;
    world.setChapter(key);
    const pose = sampleFieldPose(p, mobile);
    camera.position.fromArray(pose.eye);
    target.fromArray(pose.look);
    camera.lookAt(target);
    camera.fov = pose.fov;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    scene.updateMatrixWorld(true);
    // Reading the link log right after linking would wait for the compiler, which defeats the purpose.
    renderer.debug.checkShaderErrors = false;
    renderer.compile(scene, camera);
    renderer.debug.checkShaderErrors = true;
    const programs = renderer.info.programs.map((entry) => entry.program);
    const deadline = performance.now() + 8000;
    while (
      performance.now() < deadline &&
      programs.some((program) => !gl.getProgramParameter(program, ext.COMPLETION_STATUS_KHR))
    )
      await new Promise((resolve) => setTimeout(resolve, 16));
  }
  return { draw, orbit, prepare };
}
const tour = document.querySelector(".tour");
if (tour) tour.dispatchEvent(new CustomEvent("field-engine", { detail: createFieldScene }));
