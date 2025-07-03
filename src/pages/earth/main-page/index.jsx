import React, { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import './style.scss';

function Sun() {
  const sunTexture = new THREE.TextureLoader().load('/2k_sun.jpg');

  return (
    <mesh position={[10, 5, 5]}>
      <sphereGeometry args={[0.6, 64, 64]} />
      <meshBasicMaterial map={sunTexture} />
    </mesh>
  );
}

function StarBackground() {
  const texture = new THREE.TextureLoader().load('/8k_stars_milky_way.jpg');

  return (
    <mesh>
      <sphereGeometry args={[90, 64, 64]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
}

function EarthSphere() {
  const loader = new THREE.TextureLoader();

  const colorMap = loader.load('/earth-texture.jpg');      // Base earth texture
  const bumpMap = loader.load('/earth-topo.png');          // Using topo map as bump
  const specMap = loader.load('/earth-spec.jpg');          // For ocean reflection

  return (
    <mesh>
    <sphereGeometry args={[2, 128, 128]} />
    <meshPhongMaterial
        map={colorMap}
        // bumpMap={bumpMap}
        bumpScale={0.1}
        specularMap={specMap}
        specular={new THREE.Color('lightblue')}
        shininess={20}
    />
    </mesh>

  );
}

export default function Earth() {
  return (
    <div className="earth-container">
      <Canvas>
        {/* Ambient light for soft fill */}
        <ambientLight intensity={0.2} />
        
        {/* Strong directional light simulating sun */}
        <directionalLight
          position={[10, 5, 5]}
          intensity={1.5}
          color="white"
        />

        <OrbitControls enableZoom={true} />
        <StarBackground />
        <Sun />
        <EarthSphere />
        {/* <audio src="/space.mp3" autoPlay loop volume="0.5"/> */}
      </Canvas>
    </div>
  );
}
