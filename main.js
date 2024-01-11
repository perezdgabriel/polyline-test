import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import union from '@turf/union';
import * as turf from '@turf/helpers';

// Your line data
let lineData = {
  lines: [
    {
      points: [
        { "x": -1, "y": 0, "z": 0, 'angle': 0 },
        {
          "x": -1.15,
          "y": -1,
          "z": 0,
          "angle": -98.64
        },
        { "x": 1, "y": 0, "z": 0, 'angle': 0 }
      ],
      width: 0.2,
      depth: 0.5,
      show: true,
      color: 0xff0000,
    },
    // {
    //   points: [
    //     { "x": 0, "y": -1.5, "z": 0, 'angle': 0 },
    //     { "x": 0, "y": -1, "z": 0, 'angle': 0 },
    //     { "x": 0, "y": 0, "z": 0, 'angle': 0 },
    //   ],
    //   width: 0.2,
    //   depth: 0.5,
    //   show: true,
    //   color: 0x0000ff,
    // },
  ],
  connections: [],
  showIntersectionPoints: true,
  showVertices: false,
  showRectangles: true,
  showLabels: false,
  showExtrusion: false,
  showUnion: false,
  chaflan: false
};

let textArea
let camera, scene, renderer, controls;
let gui = new GUI();
let objects = [];

// Function to plot points as spheres
function drawPoints(points, show) {
  if (!show) return
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

  addToScene(group);
}

function addToScene(object) {
  scene.add(object);
  objects.push(object);
}

function drawFinalPoint(point, color = 'white') {
  if (!lineData.showIntersectionPoints) return
  const material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
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

function getIntersectionPoint(p0, p1, p2, p3, intersectionPoint, findCollision = true) {
  const s1_x = p1.x - p0.x;
  const s1_y = p1.y - p0.y;
  const s2_x = p3.x - p2.x;
  const s2_y = p3.y - p2.y;

  const d = (-s2_x * s1_y + s1_x * s2_y);
  if (d === 0) return false; // Collinear

  const s = (-s1_y * (p0.x - p2.x) + s1_x * (p0.y - p2.y)) / d;
  const t = (s2_x * (p0.y - p2.y) - s2_y * (p0.x - p2.x)) / d;

  intersectionPoint.x = p0.x + (t * s1_x);
  intersectionPoint.y = p0.y + (t * s1_y);
  intersectionPoint.z = 0

  if (findCollision && !(s >= 0 && s <= 1 && t >= 0 && t <= 1)) {
    // Collision detected
    return false;
  }

  return true; // No collision
}

function createOuterLine(rectangles, show, lineColor) {
  let lineVertices = []
  let vertices = []
  const geometry = new THREE.BufferGeometry();
  const v0 = rectangles[0][0]
  const v3 = rectangles[0][3]
  drawFinalPoint(v3)
  lineVertices.push(v3)
  drawFinalPoint(v0)
  lineVertices.push(v0)

  for (let i = 0; i < rectangles.length; i++) {
    const v0 = rectangles[i][0]
    const v1 = rectangles[i][1]
    const v2 = rectangles[i][2]

    if (i < rectangles.length - 1) {
      const v0_next = rectangles[i + 1][0]
      const v1_next = rectangles[i + 1][1]
      let ip1 = new THREE.Vector3()
      let isIntersecting = getIntersectionPoint(v0, v1, v0_next, v1_next, ip1)
      if (isIntersecting) {
        drawFinalPoint(ip1)
        lineVertices.push(ip1)
      } else {
        const v3_next = rectangles[i + 1][3]
        let ip2 = new THREE.Vector3()
        isIntersecting = getIntersectionPoint(v0, v1, v3_next, v0_next, ip2)
        if (isIntersecting) {
          if (lineData.chaflan) {
            drawFinalPoint(ip2, 'yellow')
            lineVertices.push(ip2)
          }
          let ip3 = new THREE.Vector3()
          isIntersecting = getIntersectionPoint(ip2, v0_next, v1, v2, ip3)
          if (isIntersecting) {
            if (lineData.chaflan) {
              drawFinalPoint(ip3, 'blue')
              lineVertices.push(ip3)
            }
            let ip4 = new THREE.Vector3()
            isIntersecting = getIntersectionPoint(v1, v2, v0_next, v1_next, ip4)
            if (isIntersecting) {
              if (lineData.chaflan) {
                drawFinalPoint(ip4, 'orange')
                lineVertices.push(ip4)
              } else {
                // At this point we can calculate the point where v0-v1 and v1_next-v0_next would intersect
                let ip5 = new THREE.Vector3()
                isIntersecting = getIntersectionPoint(v0, v1, v1_next, v0_next, ip5, false)
                if (isIntersecting) {
                  drawFinalPoint(ip5, 'cyan')
                  lineVertices.push(ip5)
                }
              }

            }
          }
        }
      }
    }
    else {
      drawFinalPoint(v1)
      lineVertices.push(v1)
      drawFinalPoint(v2)
      lineVertices.push(v2)
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
      let ip1 = new THREE.Vector3()
      let isIntersecting = getIntersectionPoint(v2, v3, v2_prev, v3_prev, ip1)
      if (isIntersecting) {
        drawFinalPoint(ip1)
        lineVertices.push(ip1)
      } else {
        let ip2 = new THREE.Vector3()
        let isIntersecting = getIntersectionPoint(v2, v3, v1_prev, v2_prev, ip2)
        if (isIntersecting) {
          if (lineData.chaflan) {
            drawFinalPoint(ip2)
            lineVertices.push(ip2)
          }
          let ip3 = new THREE.Vector3()
          isIntersecting = getIntersectionPoint(v3, v0, v2_prev, v1_prev, ip3) ////
          if (isIntersecting) {
            if (lineData.chaflan) {
              drawFinalPoint(ip3)
              lineVertices.push(ip3)
            }
            let ip4 = new THREE.Vector3()
            isIntersecting = getIntersectionPoint(v3, v0, v2_prev, v3_prev, ip4)
            if (isIntersecting) {
              if (lineData.chaflan) {
                drawFinalPoint(ip4)
                lineVertices.push(ip4)
              } else {
                // At this point we can calculate the point where v0-v1 and v1_next-v0_next would intersect
                let ip5 = new THREE.Vector3()
                isIntersecting = getIntersectionPoint(v2, v3, v3_prev, v2_prev, ip5, false)
                if (isIntersecting) {
                  drawFinalPoint(ip5)
                  lineVertices.push(ip5)
                }
              }
            }
          }
        }
      }
    }
    else {
      drawFinalPoint(v3)
      lineVertices.push(v3)
    }
  }

  if (show) {
    lineVertices.forEach(vertex => {
      vertices.push(vertex.x, vertex.z, -vertex.y)
    })

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.LineBasicMaterial({ color: lineColor, linewidth: 5 });
    const line = new THREE.Line(geometry, material);

    addToScene(line);
  }

  return lineVertices
}

// Function to create a 2D line with constant width
function create2DLine(line, show) {
  const points = line.points;
  const width = line.width;

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

  if (show) {
    addToScene(rectanglesToShow)
    addToScene(circles)
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

function createExtrusion(vertices, depth, color, show) {
  if (!show) return
  const shape = new THREE.Shape();
  shape.moveTo(vertices[0].x, -vertices[0].y);
  for (let i = 0; i < vertices.length; i++) {
    shape.lineTo(vertices[i].x, -vertices[i].y);
  }
  shape.lineTo(vertices[0].x, -vertices[0].y);

  const extrudeSettings = {
    steps: 1,
    depth: -depth,
    bevelEnabled: false,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.set(Math.PI / 2, 0, 0)
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
  line.rotation.set(Math.PI / 2, 0, 0)
  scene.add(line);
  objects.push(line);
  scene.add(mesh);
  objects.push(mesh);
}

function drawSourroundingPolygon(polygon) {
  let vertices = []
  const geometry = new THREE.BufferGeometry();

  polygon.geometry.coordinates[0].forEach(vertex => {
    vertices.push(vertex[0], 0, -vertex[1])
  })

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

  const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 5 });
  const line = new THREE.Line(geometry, material);
  scene.add(line)
  objects.push(line);
}

function drawPolyline() {
  const polygons = []

  lineData.lines.forEach(line => {
    drawPoints(line.points, line.show || lineData.showUnion);
    const rectangles = create2DLine(line, line.show && lineData.showRectangles);
    const vertices = createOuterLine(rectangles, line.show, line.color)
    createExtrusion(vertices, line.depth, line.color, lineData.showExtrusion && line.show && !lineData.showUnion)
    const lineVertices = []
    vertices.forEach(vertex => {
      lineVertices.push([vertex.x, vertex.y])
    })
    polygons.push(turf.polygon([lineVertices]))
  })

  if (!lineData.showUnion) return
  // Calculate the union
  if (polygons.length < 2) return
  const unionPolygon = union(polygons[0], polygons[1]);
  if (unionPolygon.geometry.coordinates.length !== 1) return
  drawSourroundingPolygon(unionPolygon)
  if (lineData.showExtrusion) {
    const vertices = []
    unionPolygon.geometry.coordinates[0].forEach(vertex => {
      vertices.push(new THREE.Vector3(vertex[0], vertex[1], 0))
    })
    createExtrusion(vertices, 1, 'white', true)
  }
}

function deletePolyline() {
  objects.forEach(object => {
    scene.remove(object)
  })
  objects = []
}

function setTextArea(lineData) {
  textArea.value = JSON.stringify(lineData, null, 2)
}

function handleTextAreaChange(event) {
  try {
    const data = JSON.parse(event.target.value)
    lineData.lines = data.lines
    lineData.showIntersectionPoints = data.showIntersectionPoints
    lineData.showVertices = data.showVertices
    lineData.showRectangles = data.showRectangles
    lineData.showLabels = data.showLabels
    lineData.showExtrusion = data.showExtrusion
    lineData.showUnion = data.showUnion
    updateGUI()
    render()
  } catch (error) {
    console.error(error)
  }
}

function updateGUI() {
  gui.destroy()
  gui = new GUI();
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
          // Set x and y with 2 decimal positions
          let x = previousPoint.x + distance * Math.cos(angle)
          x = Math.round(x * 100) / 100
          let y = previousPoint.y + distance * Math.sin(angle)
          y = Math.round(y * 100) / 100
          currentPoint.x = x
          currentPoint.y = y
          setTextArea(lineData)

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
  gui.add(lineData, 'showUnion').name('Ver unión').onChange(function (value) {
    render();
  });
  gui.add(lineData, 'chaflan').name('Chaflan').onChange(function (value) {
    render();
  });

  // Add camera z position to gui
  gui.add(camera.position, 'y', 0, 10).name('camera z').onChange(function (value) {
    controls.update()
    render();
  })
}

function init() {
  textArea = document.getElementById('text-area')
  textArea.addEventListener('input', handleTextAreaChange)
  setTextArea(lineData)
  const domElement = document.getElementById('scene-canvas');
  renderer = new THREE.WebGLRenderer({ antialias: true, canvas: domElement });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 200);
  camera.position.set(- 1.5, 2.5, 3.0);

  const light = new THREE.HemisphereLight(0xffffff, 0x080808, 4.5);
  light.position.set(- 1.25, 1, 1.25);
  scene.add(light);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener('change', render); // use only if there is no animation loop
  controls.enablePan = true;
  controls.enableZoom = true;

  // Show a grid
  const gridHelper = new THREE.GridHelper(10, 10);
  scene.add(gridHelper);

  // Axes helper
  const axesHelper = new THREE.AxesHelper(1);
  scene.add(axesHelper);

  // Have a light grey backgroud
  scene.background = new THREE.Color(0x22222);

  // Add GUI
  updateGUI();

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