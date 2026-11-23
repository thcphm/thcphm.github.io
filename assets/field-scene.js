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
  function resize(width, height, mobile) {
    w = width;
    h = height;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.05 : 1.4, 1800 / w));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
  }
  function orbit(key, degrees, tilt, width, height) {
    if (width < 1 || height < 1) return false;
    if (width !== w || height !== h) resize(width, height, width < 700);
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
    const resized = w !== width || h !== height;
    if (!resized && p === lastP && survey === lastSurvey && key === chapter && mobile === portrait) return;
    if (resized) resize(width, height, mobile);
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
  return { draw, orbit };
}
const tour = document.querySelector(".tour");
if (tour) tour.dispatchEvent(new CustomEvent("field-engine", { detail: createFieldScene }));
