import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// Your line data
const lineData = {
  lines: [
    {
      points: [
        { "x": -1, "y": 0, "z": 0, 'angle': 0 },
        { "x": 0, "y": 0, "z": 0, 'angle': 0 },
        { "x": 1, "y": 0, "z": 0, 'angle': 0 },
        // { "x": 1.3, "y": 0.3, "z": 0 },
      ],
      width: 0.2,
      depth: 0.5,
      show: true,
    },
    {
      points: [
        { "x": -1, "y": 1, "z": 0, 'angle': 0 },
        { "x": 0, "y": 1, "z": 0, 'angle': 0 },
        { "x": 1, "y": 1, "z": 0, 'angle': 0 },
        { "x": 1, "y": 0, "z": 0, 'angle': 0 },
        // { "x": 1.3, "y": 0.3, "z": 0 },
      ],
      width: 0.2,
      depth: 0.5,
      show: true,
    },
  ],
  connections: [
    [0, 2, 1, 3],
  ],
  showIntersectionPoints: false,
  showVertices: false,
  showRectangles: true,
  showLabels: false,
  showExtrusion: false
};

let camera, scene, renderer;

let objects = [];

// Function to plot points as spheres
function plotPoints(points) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
  const radius = 0.03;

  points.forEach(point => {
    const geometry = new THREE.CircleGeometry(radius, 32);
    const circle = new THREE.Mesh(geometry, material);
    // Make the circle looking up
    circle.rotation.x = Math.PI / 2;
    circle.position.set(point.x, point.z, -point.y);
    group.add(circle);
  });

  objects.push(group);
  return group;
}

function drawFinalPoint(point) {
  if (!lineData.showIntersectionPoints) return
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const radius = 0.015;

  const geometry = new THREE.CircleGeometry(radius);
  const circle = new THREE.Mesh(geometry, material);
  circle.position.set(point.x, point.z, -point.y);
  circle.rotation.x = Math.PI / 2;

  objects.push(circle);
  scene.add(circle)

  // Numbering
  // if (!lineData.showLabels) return
  // const label = createLabel(`(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`);
  // label.position.set(point.x, point.z, -point.y);
  // objects.push(label);
  // scene.add(label)
}

function getIntersectionPoint(p0, p1, p2, p3, intersectionPoint) {
  const s1_x = p1.x - p0.x;
  const s1_y = p1.y - p0.y;
  const s2_x = p3.x - p2.x;
  const s2_y = p3.y - p2.y;

  const d = (-s2_x * s1_y + s1_x * s2_y);
  if (d === 0) return false; // Collinear

  const s = (-s1_y * (p0.x - p2.x) + s1_x * (p0.y - p2.y)) / d;
  const t = (s2_x * (p0.y - p2.y) - s2_y * (p0.x - p2.x)) / d;

  if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
    // Collision detected
    intersectionPoint.x = p0.x + (t * s1_x);
    intersectionPoint.y = p0.y + (t * s1_y);
    intersectionPoint.z = 0
    return true;
  }

  return false; // No collision
}

function createOuterLine(rectangles) {
  let vertices = []
  const geometry = new THREE.BufferGeometry();
  const v0 = rectangles[0][0]
  const v3 = rectangles[0][3]
  drawFinalPoint(v3)
  vertices.push([v3.x, v3.z, -v3.y])
  drawFinalPoint(v0)
  vertices.push([v0.x, v0.z, -v0.y])

  for (let i = 0; i < rectangles.length; i++) {
    const v0 = rectangles[i][0]
    const v1 = rectangles[i][1]
    const v2 = rectangles[i][2]

    if (i < rectangles.length - 1) {
      const v0_next = rectangles[i + 1][0]
      const v1_next = rectangles[i + 1][1]
      let intersectionPoint = new THREE.Vector3()
      let isIntersecting = getIntersectionPoint(v0, v1, v0_next, v1_next, intersectionPoint)
      if (isIntersecting) {
        drawFinalPoint(intersectionPoint)
        vertices.push([intersectionPoint.x, intersectionPoint.z, -intersectionPoint.y])
      } else {
        const v3_next = rectangles[i + 1][3]
        isIntersecting = getIntersectionPoint(v0, v1, v3_next, v0_next, intersectionPoint)
        if (isIntersecting) {
          drawFinalPoint(intersectionPoint)
          vertices.push([intersectionPoint.x, intersectionPoint.z, -intersectionPoint.y])
          isIntersecting = getIntersectionPoint(intersectionPoint, v0_next, v1, v2, intersectionPoint)
          if (isIntersecting) {
            drawFinalPoint(intersectionPoint)
            vertices.push([intersectionPoint.x, intersectionPoint.z, -intersectionPoint.y])
            isIntersecting = getIntersectionPoint(v1, v2, v0_next, v1_next, intersectionPoint)
            if (isIntersecting) {
              drawFinalPoint(intersectionPoint)
              vertices.push([intersectionPoint.x, intersectionPoint.z, -intersectionPoint.y])
            }
            else {
              // drawFinalPoint(v1)
              // vertices.push([v1.x, v1.z, -v1.y])
            }
          }
          // drawFinalPoint(v0_next)
          // vertices.push([v0_next.x, v0_next.z, -v0_next.y])
        }
        // vertices.push([v1.x, v1.z, -v1.y])
      }
    }
    else {
      drawFinalPoint(v1)
      vertices.push([v1.x, v1.z, -v1.y])
      drawFinalPoint(v2)
      vertices.push([v2.x, v2.z, -v2.y])
    }
  }

  for (let i = rectangles.length - 1; i >= 0; i--) {
    const v0 = rectangles[i][0]
    const v2 = rectangles[i][2]
    const v3 = rectangles[i][3]
    if (i > 0) {
      const v1_prev = rectangles[i - 1][1]
      const v2_prev = rectangles[i - 1][2]
      const v3_prev = rectangles[i - 1][3]
      let intersectionPoint = new THREE.Vector3()
      let isIntersecting = getIntersectionPoint(v2, v3, v2_prev, v3_prev, intersectionPoint)
      if (isIntersecting) {
        drawFinalPoint(intersectionPoint)
        vertices.push([intersectionPoint.x, intersectionPoint.z, -intersectionPoint.y])
      } else {
        let isIntersecting = getIntersectionPoint(v2, v3, v1_prev, v2_prev, intersectionPoint)
        if (isIntersecting) {
          drawFinalPoint(intersectionPoint)
          vertices.push([intersectionPoint.x, intersectionPoint.z, -intersectionPoint.y])
          isIntersecting = getIntersectionPoint(v3, v0, v2_prev, v1_prev, intersectionPoint) ////
          if (isIntersecting) {
            drawFinalPoint(intersectionPoint)
            vertices.push([intersectionPoint.x, intersectionPoint.z, -intersectionPoint.y])
            isIntersecting = getIntersectionPoint(v3, v0, v2_prev, v3_prev, intersectionPoint)
            if (isIntersecting) {
              drawFinalPoint(intersectionPoint)
              vertices.push([intersectionPoint.x, intersectionPoint.z, -intersectionPoint.y])
              isIntersecting = getIntersectionPoint(v3, v0, v2_prev, v3_prev, intersectionPoint)
            }
          }
        }
      }
    }
    else {
      drawFinalPoint(v3)
      vertices.push([v3.x, v3.z, -v3.y])
    }
  }

  vertices = vertices.flat()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

  const material = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 5 });
  const line = new THREE.Line(geometry, material);
  scene.add(line)
  objects.push(line);

  return vertices
}

// Function to create a 2D line with constant width
function create2DLine(lineData) {
  const points = lineData.points;
  const width = lineData.width;

  const circles = new THREE.Group();
  const rectanglesToShow = new THREE.Group()
  const rectangles = []
  for (let i = 0; i < points.length - 1; i++) {
    let vertices = [];
    const geometry = new THREE.BufferGeometry();
    const currentPoint = points[i];
    const nextPoint = points[i + 1];

    const direction = new THREE.Vector2().subVectors(new THREE.Vector2(nextPoint.x, nextPoint.y), new THREE.Vector2(currentPoint.x, currentPoint.y)).normalize();

    const perpendicular = new THREE.Vector2(-direction.y, direction.x).multiplyScalar(width / 2);

    const v0 = new THREE.Vector3(currentPoint.x + perpendicular.x, currentPoint.y + perpendicular.y, currentPoint.z)
    const v1 = new THREE.Vector3(nextPoint.x + perpendicular.x, nextPoint.y + perpendicular.y, nextPoint.z)
    const v2 = new THREE.Vector3(nextPoint.x - perpendicular.x, nextPoint.y - perpendicular.y, nextPoint.z)
    const v3 = new THREE.Vector3(currentPoint.x - perpendicular.x, currentPoint.y - perpendicular.y, currentPoint.z)


    // Calculate the extension vectors
    const extension0 = direction.clone().multiplyScalar(-width / 2);
    const extension1 = direction.clone().multiplyScalar(width / 2);


    // Extend the vertices
    const v0e = new THREE.Vector3().addVectors(v0, extension0);
    const v1e = new THREE.Vector3().addVectors(v1, extension1);
    const v2e = new THREE.Vector3().addVectors(v2, extension1);
    const v3e = new THREE.Vector3().addVectors(v3, extension0);

    v0e.z = 0
    v1e.z = 0
    v2e.z = 0
    v3e.z = 0

    rectangles.push([v0e, v1e, v2e, v3e])

    addVertex(v0e.x, v0e.y, v0e.z, `r${i}_v0`, circles)
    addVertex(v1e.x, v1e.y, v1e.z, `r${i}_v1`, circles)
    addVertex(v2e.x, v2e.y, v2e.z, `r${i}_v2`, circles)
    addVertex(v3e.x, v3e.y, v3e.z, `r${i}_v3`, circles)

    // Vertices for the current segment
    vertices.push(
      v0e.x, v0e.z, -v0e.y,
      v1e.x, v1e.z, -v1e.y,
      v2e.x, v2e.z, -v2e.y,
      v3e.x, v3e.z, -v3e.y,
      v0e.x, v0e.z, -v0e.y,
    );
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const line = new THREE.Line(geometry, material);
    rectanglesToShow.add(line)
  }

  if (lineData.showRectangles) {
    scene.add(rectanglesToShow)
    scene.add(circles)
    objects.push(circles);
    objects.push(rectanglesToShow);
  }
  return rectangles
}

function addVertex(x, y, z, text, group) {
  if (!lineData.showVertices) return
  // Create circles at each vertex position and number them
  const geometry = new THREE.CircleGeometry(0.015);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
  const circle = new THREE.Mesh(geometry, material);
  circle.position.set(x, z, -y);
  circle.rotation.x = -Math.PI / 2;
  group.add(circle)
  objects.push(circle);

  // Numbering
  if (!lineData.showLabels) return
  const label = createLabel(`${text}`);
  label.position.set(x, z, -y);
  group.add(label)
  objects.push(label);
}

// Function to create labels for numbering vertices
function createLabel(text) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = 'Bold 20px Arial';
  context.fillStyle = 'rgba(255,255,255,0.95)';
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(0.5, 0.25, 0.75);

  return sprite;
}

function createExtrusion(vertices) {
  if (!lineData.showExtrusion) return
  const depth = lineData.depth
  const shape = new THREE.Shape();
  shape.moveTo(vertices[0], -vertices[2]);
  for (let i = 3; i < vertices.length; i += 3) {
    shape.lineTo(vertices[i], -vertices[i + 2]);
  }
  shape.lineTo(vertices[0], -vertices[2]);

  const extrudeSettings = {
    steps: 1,
    depth: depth,
    bevelEnabled: false,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const material = new THREE.MeshBasicMaterial({ color: 'orange' });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.set(-Math.PI / 2, 0, 0)
  const edges = new THREE.EdgesGeometry(geometry);
  const lineColor = 0
  const lineMaterial = new THREE.LineDashedMaterial({
    color: lineColor,
    linewidth: 1,
    scale: 1,
    dashSize: 0.3,
    gapSize: 0,
  });
  const line = new THREE.LineSegments(edges, lineMaterial);
  line.computeLineDistances();
  line.rotation.set(-Math.PI / 2, 0, 0)
  scene.add(line);
  objects.push(line);
  scene.add(mesh);
  objects.push(mesh);
}

function drawPolyline() {
  lineData.lines.forEach(line => {
    if (!line.show) return
    const pointsGroup = plotPoints(line.points);
    scene.add(pointsGroup);
    const rectangles = create2DLine(line);
    const vertices = createOuterLine(rectangles)
    createExtrusion(vertices)
  })
}

function deletePolyline() {
  objects.forEach(object => {
    scene.remove(object)
  })
  objects = []
}

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 200);
  camera.position.set(- 1.5, 2.5, 3.0);

  const light = new THREE.HemisphereLight(0xffffff, 0x080808, 4.5);
  light.position.set(- 1.25, 1, 1.25);
  scene.add(light);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener('change', render); // use only if there is no animation loop
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.enablePan = true;
  controls.enableZoom = true;
  // controls.zoomSpeed = 0.1;

  // Show a grid
  const gridHelper = new THREE.GridHelper(10, 10);
  scene.add(gridHelper);

  // Have a light grey backgroud
  scene.background = new THREE.Color(0x22222);

  const gui = new GUI();
  for (let i = 0; i < lineData.lines.length; i++) {
    const folder = gui.addFolder(`Linea ${i + 1}`);
    folder.add(lineData.lines[i], 'width', 0.1, 5).name('width').onChange(function (value) {
      render();
    });
    folder.add(lineData.lines[i], 'depth', 0.1, 5).name('depth').onChange(function (value) {
      render();
    });
    folder.add(lineData.lines[i], 'show').name('Mostrar').onChange(function (value) {
      render();
    });
    for (let j = 0; j < lineData.lines[i].points.length; j++) {
      const folder = gui.addFolder(`Punto ${j + 1}`);
      const line = lineData.lines[i]
      folder.add(line.points[j], 'x', -5, 5).name('x').onChange(function (value) {
        render();
      });
      folder.add(line.points[j], 'y', -5, 5).name('y').onChange(function (value) {
        render();
      });
      if (j > 0) {
        folder.add(line.points[j], 'angle', -180, 180).name('ángulo').onChange(function (value) {
          // Change x and y of the current point to achieve the desired angle respect to the previous point
          const currentPoint = line.points[j]
          const previousPoint = line.points[j - 1]
          const angle = value * Math.PI / 180
          const distance = Math.sqrt(Math.pow(currentPoint.x - previousPoint.x, 2) + Math.pow(currentPoint.y - previousPoint.y, 2))
          const x = previousPoint.x + distance * Math.cos(angle)
          const y = previousPoint.y + distance * Math.sin(angle)
          currentPoint.x = x
          currentPoint.y = y

          render();
        });
      }
    }
  }

  gui.add(lineData, 'showRectangles').name('Ver rectangulos').onChange(function (value) {
    render();
  });
  gui.add(lineData, 'showIntersectionPoints').name('Ver intersecciones').onChange(function (value) {
    render();
  });
  gui.add(lineData, 'showVertices').name('Ver vertices').onChange(function (value) {
    render();
  });
  gui.add(lineData, 'showLabels').name('Ver etiquetas').onChange(function (value) {
    render();
  });
  gui.add(lineData, 'showExtrusion').name('Ver extrusión').onChange(function (value) {
    render();
  });

  // Add camera z position to gui
  gui.add(camera.position, 'y', 0, 10).name('camera y').onChange(function (value) {
    controls.update()
    render();
  })

  drawPolyline()

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  render();

}

function render() {
  deletePolyline()
  drawPolyline()
  renderer.render(scene, camera);
}

init();
render();