import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let camera, scene, renderer, stats, object, loader, guiMorphsFolder;
const clock = new THREE.Clock();

let mixer;

const params = {
    asset: 'Samba Dancing',
};

const assets = [
    'Samba Dancing',
    'p3hero',
    'morph_test'
];

init();

function init() {

    const container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(100, 200, 300);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x148c1c);
    scene.fog = new THREE.Fog(0x148c1c, 200, 1000);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(0, 200, 100);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 180;
    dirLight.shadow.camera.bottom = -100;
    dirLight.shadow.camera.left = -120;
    dirLight.shadow.camera.right = 120;
    scene.add(dirLight);

    // Ground
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false }));
    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const grid = new THREE.GridHelper(2000, 20, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);

    loader = new FBXLoader();
    loadAsset(params.asset);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 100, 0);
    controls.update();

    window.addEventListener('resize', onWindowResize);

    // Stats
    stats = new Stats();
    container.appendChild(stats.dom);

    const gui = new GUI();
    gui.add(params, 'asset', assets).onChange(function (value) {
        loadAsset(value);
    });

    guiMorphsFolder = gui.addFolder('Morphs').hide();
}

function loadAsset(asset) {
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('models/fbx/textures/p3hero.png', () => {
        loader.load('models/fbx/' + asset + '.fbx', function (group) {

            if (object) {
                object.traverse(function (child) {
                    if (child.material) child.material.dispose();
                    if (child.material && child.material.map) child.material.map.dispose();
                    if (child.geometry) child.geometry.dispose();
                });

                scene.remove(object);
            }

            object = group;

            if (object.animations && object.animations.length) {
                mixer = new THREE.AnimationMixer(object);
                const action = mixer.clipAction(object.animations[0]);
                action.play();
            } else {
                mixer = null;
            }

            guiMorphsFolder.children.forEach((child) => child.destroy());
            guiMorphsFolder.hide();

            if (asset === 'p3hero') {
                object.traverse(function (child) {
                    if (child.isMesh) {
                        child.material = new THREE.MeshPhongMaterial({ map: texture });
                        child.material.needsUpdate = true;
                    }
                });

                // Elevate p3hero model
                object.position.y += 50; // Elevate the model by 50 units

                // Add a cross behind p3hero
                const crossMaterial = new THREE.MeshBasicMaterial({ color: 0x4b3621 });
                const verticalRect = new THREE.Mesh(new THREE.BoxGeometry(20, 350, 20), crossMaterial);
                const horizontalRect = new THREE.Mesh(new THREE.BoxGeometry(150, 20, 20), crossMaterial);

                verticalRect.position.set(0, 50, -20); // Position the vertical part of the cross
                horizontalRect.position.set(0, 180, -20); // Position the horizontal part of the cross

                scene.add(verticalRect);
                scene.add(horizontalRect);
            }

            object.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    if (child.morphTargetDictionary) {
                        guiMorphsFolder.show();
                        const meshFolder = guiMorphsFolder.addFolder(child.name || child.uuid);
                        Object.keys(child.morphTargetDictionary).forEach((key) => {
                            meshFolder.add(child.morphTargetInfluences, child.morphTargetDictionary[key], 0, 1, 0.01);
                        });
                    }
                }
            });

            scene.add(object);
        });
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    renderer.render(scene, camera);
    stats.update();
}
