import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface PetOrbProps {
  state: "idle" | "thinking" | "speaking";
  modelUrl?: string | null;
}

const palette = {
  idle: "#6ee7b7",
  thinking: "#fbbf24",
  speaking: "#60a5fa"
};

export default function PetOrb({ state, modelUrl }: PetOrbProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.7, 3.1);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    const light1 = new THREE.DirectionalLight(0xffffff, 1.15);
    light1.position.set(3, 4, 3);
    scene.add(light1);

    const light2 = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(light2);

    const root = new THREE.Group();
    scene.add(root);

    const fallbackGeometry = new THREE.IcosahedronGeometry(0.85, 4);
    const fallbackMaterial = new THREE.MeshStandardMaterial({
      color: palette[state],
      roughness: 0.2,
      metalness: 0.4
    });
    const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);

    let activeObject: THREE.Object3D = fallbackMesh;
    root.add(activeObject);

    // Simple procedural eyes so we can animate blink even without rigged model.
    const eyeGeo = new THREE.SphereGeometry(0.038, 14, 10);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.85, metalness: 0.0 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.72, 0.28, -0.1);
    rightEye.position.set(0.72, 0.28, 0.1);
    root.add(leftEye);
    root.add(rightEye);

    const loader = new GLTFLoader();
    loader.load(
      modelUrl || "/models/dog.gltf",
      (gltf) => {
        root.remove(activeObject);
        activeObject = gltf.scene;

        const box = new THREE.Box3().setFromObject(activeObject);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = 1.8 / maxDim;
        activeObject.scale.setScalar(scale);

        // Center the model in view and slightly raise it.
        activeObject.position.set(-center.x * scale, -center.y * scale - 0.18, -center.z * scale);
        root.add(activeObject);

        // Reposition eyes relative to scaled dog head.
        leftEye.position.set(0.74, 0.30, -0.1);
        rightEye.position.set(0.74, 0.30, 0.1);
      },
      undefined,
      () => {
        // Keep fallback mesh if model load fails.
      }
    );

    let frame = 0;
    let raf = 0;

    const animate = () => {
      frame += 1;
      const t = frame;

      // Base breathing/sway.
      root.rotation.y = Math.sin(t * 0.018) * 0.22;
      root.position.y = Math.sin(t * 0.04) * 0.03;

      // Blinking: mostly open, short close intervals.
      const blinkWave = Math.sin(t * 0.035);
      const blink = blinkWave > 0.96 ? 0.12 : 1;
      leftEye.scale.set(1, blink, 1);
      rightEye.scale.set(1, blink, 1);

      if (state === "thinking") {
        // More obvious head tilt + subtle pondering motion.
        root.rotation.z = -0.22 + Math.sin(t * 0.05) * 0.05;
        root.rotation.x = Math.sin(t * 0.03) * 0.09;
        root.scale.setScalar(1 + Math.sin(t * 0.06) * 0.03);
      } else if (state === "speaking") {
        // Distinct nodding while speaking.
        root.rotation.z = 0;
        root.rotation.x = Math.sin(t * 0.22) * 0.20;
        root.scale.setScalar(1 + Math.sin(t * 0.18) * 0.015);
      } else {
        root.rotation.z = 0;
        root.rotation.x = 0;
        root.scale.setScalar(1);
      }

      if (activeObject === fallbackMesh) {
        fallbackMaterial.color.set(palette[state]);
        fallbackMesh.rotation.x += 0.006;
        fallbackMesh.rotation.y += 0.009;
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      fallbackGeometry.dispose();
      fallbackMaterial.dispose();
      eyeGeo.dispose();
      eyeMat.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [modelUrl, state]);

  return <div className="pet-orb" ref={mountRef} />;
}
