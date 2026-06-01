<script>
  import { onMount, onDestroy } from 'svelte'
  import { SvelteMap } from 'svelte/reactivity'
  import * as THREE from 'three'
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
  import { io } from 'socket.io-client'

  // --- Constants ---
  const SCALE = 1e-12
  const DECAY_TIME = 300_000
  const DECAY_INTERVAL = 10_000

  const PALETTE = {
    bg: 0x08090f,
    sec: {
      hi: new THREE.Color(0x9ecae1),
      low: new THREE.Color(0xfdae6b),
      nul: new THREE.Color(0xe6735c),
    },
    activity: [
      new THREE.Color(0xffc857),
      new THREE.Color(0xff8c42),
      new THREE.Color(0xff5c39),
      new THREE.Color(0xff3030),
    ],
  }

  // --- DOM refs ---
  let canvasEl

  // --- Reactive state ---
  let systems = $state([])
  let heatmap = new SvelteMap()
  let connectionStatus = $state('connecting')
  let hoveredSystem = $state(null)
  let tooltipPos = $state({ x: 0, y: 0 })
  let loaded = $state(false)
  let loadingMsg = $state('Loading system coordinates…')

  // --- Three.js internals (non-reactive) ---
  let scene, camera, renderer, controls, raycaster, mouse, systemPoints
  const activeMeshes = new Map()
  let animationId, socket, decayTimer

  // --- Derived ---
  let activeCount = $derived(heatmap.size)
  let totalKills = $derived([...heatmap.values()].reduce((s, d) => s + d.count, 0))
  let totalIskB = $derived(
    ([...heatmap.values()].reduce((s, d) => s + d.value, 0) / 1e9).toFixed(1)
  )
  let hottest = $derived.by(() => {
    let max = 0, name = null
    for (const [id, d] of heatmap) {
      if (d.count > max) {
        max = d.count
        name = systems.find(s => s.id === id)?.name ?? null
      }
    }
    return name
  })

  onMount(async () => {
    try {
      const res = await fetch('/map/data/systems.json')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      systems = await res.json()
      loadingMsg = `${systems.length.toLocaleString()} systems loaded`
    } catch (err) {
      console.error('Failed to load systems', err)
      loadingMsg = 'Failed to load system data'
      return
    }

    initScene()

    socket = io('https://ws.socketkill.com')
    socket.on('connect', () => (connectionStatus = 'connected'))
    socket.on('disconnect', () => (connectionStatus = 'disconnected'))
    socket.on('raw-kill', handleKill)

    decayTimer = setInterval(decay, DECAY_INTERVAL)
    loaded = true
  })

  onDestroy(() => {
    socket?.disconnect()
    if (animationId) cancelAnimationFrame(animationId)
    if (decayTimer) clearInterval(decayTimer)
    activeMeshes.forEach(m => { m.geometry.dispose(); m.material.dispose() })
    activeMeshes.clear()
    systemPoints?.geometry?.dispose()
    systemPoints?.material?.dispose()
    controls?.dispose()
    renderer?.dispose()
    window.removeEventListener('resize', onResize)
  })

  function initScene() {
    scene = new THREE.Scene()
    scene.background = new THREE.Color(PALETTE.bg)
    scene.fog = new THREE.FogExp2(PALETTE.bg, 1e-9)

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1e15)
    camera.position.set(200_000, 200_000, 200_000)
    camera.lookAt(0, 0, 0)

    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.rotateSpeed = 0.5
    controls.zoomSpeed = 1.2
    controls.minDistance = 50_000
    controls.maxDistance = 1_000_000

    raycaster = new THREE.Raycaster()
    raycaster.params.Points = { threshold: 1500 }
    mouse = new THREE.Vector2()

    renderSystems()

    window.addEventListener('resize', onResize)
    canvasEl.addEventListener('pointermove', onPointerMove)
    canvasEl.addEventListener('click', onCanvasClick)

    animate()
  }

  function renderSystems() {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(systems.length * 3)
    const colors = new Float32Array(systems.length * 3)

    for (let i = 0; i < systems.length; i++) {
      const s = systems[i]
      positions[i * 3] = s.x * SCALE
      positions[i * 3 + 1] = s.y * SCALE
      positions[i * 3 + 2] = s.z * SCALE
      const c = securityColor(s.security)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 1800,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    })

    systemPoints = new THREE.Points(geometry, material)
    scene.add(systemPoints)
  }

  function securityColor(sec) {
    if (sec >= 0.5) return PALETTE.sec.hi
    if (sec > 0) {
      return new THREE.Color().lerpColors(PALETTE.sec.nul, PALETTE.sec.low, sec / 0.5)
    }
    return PALETTE.sec.nul
  }

  function activityColor(count) {
    if (count <= 2) return PALETTE.activity[0]
    if (count <= 5) return PALETTE.activity[1]
    if (count <= 10) return PALETTE.activity[2]
    return PALETTE.activity[3]
  }

  function handleKill(kill) {
    if (!kill?.system) return
    const system = systems.find(s => s.name === kill.system)
    if (!system) return

    const current = heatmap.get(system.id) ?? { count: 0, value: 0, lastKill: 0 }
    current.count++
    current.value += kill.val ?? 0
    current.lastKill = Date.now()
    heatmap.set(system.id, current)

    updateMarker(system, current)
  }

  function updateMarker(system, data) {
    let mesh = activeMeshes.get(system.id)
    const intensity = Math.min(data.count / 10, 1)

    if (!mesh) {
      const geometry = new THREE.SphereGeometry(4500, 16, 16)
      const material = new THREE.MeshBasicMaterial({
        color: activityColor(data.count),
        transparent: true,
        opacity: 0.7,
      })
      mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(system.x * SCALE, system.y * SCALE, system.z * SCALE)
      mesh.userData = { systemId: system.id, system, pulse: 0, targetScale: 1 }
      scene.add(mesh)
      activeMeshes.set(system.id, mesh)
    }

    mesh.material.color.copy(activityColor(data.count))
    mesh.material.opacity = 0.4 + intensity * 0.5
    mesh.userData.targetScale = 1 + data.count * 0.2
  }

  function decay() {
    const now = Date.now()
    const toRemove = []

    for (const [id, data] of heatmap) {
      const age = now - data.lastKill
      if (age <= DECAY_TIME) continue

      const decaySteps = Math.floor((age - DECAY_TIME) / DECAY_INTERVAL) + 1
      const newCount = Math.max(0, data.count - decaySteps)

      if (newCount === 0) {
        toRemove.push(id)
        continue
      }

      data.count = newCount
      const sys = systems.find(s => s.id === id)
      if (sys) updateMarker(sys, data)
    }

    for (const id of toRemove) {
      heatmap.delete(id)
      const mesh = activeMeshes.get(id)
      if (mesh) {
        scene.remove(mesh)
        mesh.geometry.dispose()
        mesh.material.dispose()
        activeMeshes.delete(id)
      }
    }
  }

  function animate() {
    animationId = requestAnimationFrame(animate)
    controls.update()
    for (const mesh of activeMeshes.values()) {
      mesh.userData.pulse += 0.04
      const pulse = 1 + Math.sin(mesh.userData.pulse) * 0.12
      mesh.scale.setScalar(mesh.userData.targetScale * pulse)
    }
    renderer.render(scene, camera)
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }

  function onPointerMove(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(mouse, camera)

    const meshHits = raycaster.intersectObjects([...activeMeshes.values()])
    if (meshHits.length > 0) {
      const sys = meshHits[0].object.userData.system
      const data = heatmap.get(sys.id)
      hoveredSystem = { ...sys, kills: data?.count, isk: data?.value, active: true }
      tooltipPos = { x: e.clientX + 16, y: e.clientY + 16 }
      return
    }

    const ptHits = raycaster.intersectObject(systemPoints)
    if (ptHits.length > 0) {
      const sys = systems[ptHits[0].index]
      if (sys) {
        hoveredSystem = { ...sys, active: false }
        tooltipPos = { x: e.clientX + 16, y: e.clientY + 16 }
        return
      }
    }

    hoveredSystem = null
  }

  function onCanvasClick() {
    if (!hoveredSystem?.active) return
    window.location.href = `/?system=${encodeURIComponent(hoveredSystem.name)}`
  }
</script>

<div class="map-container">
  <canvas bind:this={canvasEl} class="map-canvas"></canvas>

  <header class="hud-top">
    <a href="/" class="back-link">← Live feed</a>
    <div class="title-block">
      <h1>Galaxy Map</h1>
      <span class="subtitle">Live combat across New Eden</span>
    </div>
    <div class="conn-status" class:online={connectionStatus === 'connected'}>
      <span class="conn-dot"></span>
      {connectionStatus === 'connected' ? 'Live' : connectionStatus}
    </div>
  </header>

  <aside class="stats-panel">
    <div class="stat">
      <div class="stat-label">Active systems</div>
      <div class="stat-value">{activeCount.toLocaleString()}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Kills tracked</div>
      <div class="stat-value">{totalKills.toLocaleString()}</div>
    </div>
    <div class="stat">
      <div class="stat-label">ISK destroyed</div>
      <div class="stat-value">{totalIskB}B</div>
    </div>
    <div class="stat">
      <div class="stat-label">Hottest zone</div>
      <div class="stat-value hottest-val">{hottest ?? '—'}</div>
    </div>
  </aside>

  <div class="legend">
    <div class="legend-section">
      <div class="legend-title">Security</div>
      <div class="legend-row"><span class="dot hisec"></span>Hisec</div>
      <div class="legend-row"><span class="dot lowsec"></span>Lowsec</div>
      <div class="legend-row"><span class="dot nullsec"></span>Nullsec</div>
    </div>
    <div class="legend-section">
      <div class="legend-title">Activity</div>
      <div class="legend-row"><span class="dot act-low"></span>Light</div>
      <div class="legend-row"><span class="dot act-mid"></span>Active</div>
      <div class="legend-row"><span class="dot act-high"></span>Heavy</div>
    </div>
  </div>

  {#if hoveredSystem}
    <div class="tooltip" style="left: {tooltipPos.x}px; top: {tooltipPos.y}px">
      <div class="tt-name">{hoveredSystem.name}</div>
      <div class="tt-line"><span class="tt-key">Security</span><span class="tt-val">{hoveredSystem.security.toFixed(1)}</span></div>
      {#if hoveredSystem.active}
        <div class="tt-line"><span class="tt-key">Kills</span><span class="tt-val">{hoveredSystem.kills}</span></div>
        <div class="tt-line"><span class="tt-key">ISK lost</span><span class="tt-val">{(hoveredSystem.isk / 1e9).toFixed(1)}B</span></div>
        <div class="tt-hint">Click to filter feed</div>
      {/if}
    </div>
  {/if}

  {#if !loaded}
    <div class="loading-overlay">
      <div class="loading-pulse"></div>
      <div class="loading-msg">{loadingMsg}</div>
    </div>
  {/if}
</div>

<style>
  .map-container {
    position: fixed; inset: 0; background: #08090f;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: #e8eaed; overflow: hidden;
  }
  .map-canvas { display: block; width: 100%; height: 100%; }

  .hud-top {
    position: absolute; top: 0; left: 0; right: 0;
    padding: 24px 32px; display: flex; align-items: center;
    justify-content: space-between; gap: 24px; pointer-events: none;
  }
  .hud-top > * { pointer-events: auto; }

  .back-link {
    color: #9aa0a6; text-decoration: none; font-size: 13px;
    letter-spacing: 0.5px; transition: color 0.15s;
  }
  .back-link:hover { color: #e8eaed; }

  .title-block { text-align: center; }
  .title-block h1 { margin: 0; font-size: 18px; font-weight: 500; letter-spacing: 1px; }
  .subtitle { font-size: 11px; color: #9aa0a6; letter-spacing: 0.5px; }

  .conn-status {
    display: flex; align-items: center; gap: 8px;
    font-size: 11px; color: #9aa0a6; text-transform: uppercase; letter-spacing: 1px;
  }
  .conn-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #e6735c; box-shadow: 0 0 8px #e6735c;
  }
  .conn-status.online .conn-dot {
    background: #7ec8e3; box-shadow: 0 0 8px #7ec8e3;
    animation: pulse 2s infinite;
  }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

  .stats-panel {
    position: absolute; top: 96px; left: 32px;
    background: rgba(20, 24, 35, 0.7); backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px;
    padding: 16px 20px; display: grid; gap: 14px; min-width: 200px;
  }
  .stat-label {
    font-size: 10px; color: #9aa0a6; text-transform: uppercase;
    letter-spacing: 1.2px; margin-bottom: 4px;
  }
  .stat-value {
    font-size: 22px; font-weight: 300; color: #e8eaed;
    font-variant-numeric: tabular-nums;
  }
  .hottest-val { font-size: 16px; }

  .legend {
    position: absolute; bottom: 24px; left: 32px;
    background: rgba(20, 24, 35, 0.7); backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px;
    padding: 14px 18px; display: flex; gap: 28px; font-size: 12px;
  }
  .legend-title {
    font-size: 10px; color: #9aa0a6; text-transform: uppercase;
    letter-spacing: 1.2px; margin-bottom: 8px;
  }
  .legend-row {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 4px; color: #c8cbd0;
  }
  .legend-row .dot { width: 8px; height: 8px; border-radius: 50%; }
  .dot.hisec { background: #9ecae1; box-shadow: 0 0 6px #9ecae1; }
  .dot.lowsec { background: #fdae6b; box-shadow: 0 0 6px #fdae6b; }
  .dot.nullsec { background: #e6735c; box-shadow: 0 0 6px #e6735c; }
  .dot.act-low { background: #ffc857; box-shadow: 0 0 8px #ffc857; }
  .dot.act-mid { background: #ff8c42; box-shadow: 0 0 8px #ff8c42; }
  .dot.act-high { background: #ff3030; box-shadow: 0 0 10px #ff3030; }

  .tooltip {
    position: fixed; pointer-events: none;
    background: rgba(15, 18, 27, 0.92); backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 6px;
    padding: 12px 14px; font-size: 12px; min-width: 180px; z-index: 100;
  }
  .tt-name { font-size: 14px; font-weight: 500; margin-bottom: 8px; color: #e8eaed; }
  .tt-line { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .tt-key { color: #9aa0a6; }
  .tt-val { color: #e8eaed; font-variant-numeric: tabular-nums; }
  .tt-hint {
    margin-top: 8px; padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 10px; color: #7ec8e3;
    text-transform: uppercase; letter-spacing: 0.8px;
  }

  .loading-overlay {
    position: absolute; inset: 0; background: #08090f;
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 24px; z-index: 200;
  }
  .loading-pulse {
    width: 60px; height: 60px; border-radius: 50%;
    background: radial-gradient(circle, #7ec8e3 0%, transparent 70%);
    animation: loading-pulse 1.5s ease-in-out infinite;
  }
  @keyframes loading-pulse {
    0%, 100% { transform: scale(0.8); opacity: 0.4; }
    50% { transform: scale(1.2); opacity: 1; }
  }
  .loading-msg { font-size: 13px; color: #9aa0a6; letter-spacing: 0.5px; }

  @media (max-width: 768px) {
    .hud-top { padding: 16px; }
    .title-block h1 { font-size: 15px; }
    .subtitle { display: none; }
    .stats-panel {
      top: 72px; left: 16px; right: 16px;
      padding: 12px 16px; grid-template-columns: 1fr 1fr; min-width: 0;
    }
    .stat-value { font-size: 18px; }
    .hottest-val { font-size: 14px; }
    .legend {
      bottom: 16px; left: 16px; right: 16px;
      padding: 10px 14px; font-size: 11px;
    }
  }
</style>