/* @cc-owned three-d-object-loader */
(() => {
  'use strict';

  if (window.TermikaCC3DObjectLoader) return;

  const defaultCatalog = Object.freeze([
    { id: 'cesium_air', file: 'Cesium_Air.glb' },
    { id: 'cesium_drone', file: 'CesiumDrone.glb' },
    { id: 'cesium_balloon', file: 'CesiumBalloon.glb' },
    { id: 'ground_vehicle', file: 'GroundVehicle.glb' },
    { id: 'cesium_milk_truck', file: 'CesiumMilkTruck.glb' },
  ]);

  let defaultViewer = null;
  const viewerInstances = new WeakMap();

  function normalizeBaseUrl(baseUrl = '/3D_obj/') {
    const text = String(baseUrl || '/3D_obj/').trim();
    if (text === '') return '/3D_obj/';
    return text.endsWith('/') ? text : text + '/';
  }

  function getBaseUrl() {
    return normalizeBaseUrl(window.TERMIKA_CC_CONFIG?.objectAssetBaseUrl || '/3D_obj/');
  }

  function list() {
    return defaultCatalog.map((item) => ({ ...item }));
  }

  function resolveUri(modelId, options = {}) {
    const id = String(modelId || '').trim();
    if (id === '') throw new TypeError('Model id is required.');

    const model = defaultCatalog.find((entry) => entry.id === id);
    if (!model) throw new Error('Unknown 3D model id: ' + id);

    const baseUrl = normalizeBaseUrl(options.baseUrl || getBaseUrl());
    return baseUrl + model.file;
  }

  function attachViewer(viewer) {
    defaultViewer = viewer || null;
    return defaultViewer;
  }

  function sanitizeKeyPart(value, fallback) {
    const text = String(value || '').trim().toLowerCase()
      .replace(/[^a-z0-9_.:-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return text || fallback;
  }

  function buildInstanceKey(owner, instanceId) {
    return sanitizeKeyPart(owner, 'default') + ':' + sanitizeKeyPart(instanceId, 'instance');
  }

  function getInstanceRegistry(viewer) {
    if (!viewerInstances.has(viewer)) {
      viewerInstances.set(viewer, new Map());
    }
    return viewerInstances.get(viewer);
  }

  function resolveViewer(options = {}) {
    const viewer = options.viewer || defaultViewer;
    if (!viewer || !viewer.entities || typeof viewer.entities.add !== 'function') {
      throw new Error('Cesium viewer is required. Pass options.viewer or call attachViewer(viewer).');
    }
    return viewer;
  }

  function buildPosition(options = {}) {
    if (options.position) return options.position;

    const lat = Number(options.lat ?? 46.43);
    const lon = Number(options.lon ?? 11.85);
    const height = Number(options.height ?? 1500);
    return Cesium.Cartesian3.fromDegrees(lon, lat, height);
  }

  function buildOrientation(position, options = {}) {
    if (options.orientation) return options.orientation;

    const headingDeg = Number(options.headingDeg ?? 0);
    const pitchDeg = Number(options.pitchDeg ?? 0);
    const rollDeg = Number(options.rollDeg ?? 0);
    const hpr = new Cesium.HeadingPitchRoll(
      Cesium.Math.toRadians(headingDeg),
      Cesium.Math.toRadians(pitchDeg),
      Cesium.Math.toRadians(rollDeg)
    );
    return Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
  }

  function buildModelOptions(uri, options = {}) {
    return {
      uri,
      minimumPixelSize: Number(options.minimumPixelSize ?? 64),
      maximumScale: Number(options.maximumScale ?? 20000),
      scale: Number(options.scale ?? 1),
    };
  }

  function addEntity(modelId, options = {}) {
    const viewer = resolveViewer(options);
    const uri = resolveUri(modelId, options);

    const position = buildPosition(options);
    const orientation = buildOrientation(position, options);

    const entity = viewer.entities.add({
      id: options.id,
      name: options.name || modelId,
      position,
      orientation,
      model: buildModelOptions(uri, options),
      show: options.show !== false,
    });

    entity.__modelId = String(modelId || '');
    entity.__objectOwner = options.owner || '';
    entity.__objectInstanceId = options.instanceId || '';

    if (options.flyTo === true && typeof viewer.flyTo === 'function') {
      viewer.flyTo(entity, { duration: Number(options.flyDuration ?? 0.9) });
    }

    return entity;
  }

  function upsertInstance(modelId, options = {}) {
    const viewer = resolveViewer(options);
    const owner = sanitizeKeyPart(options.owner, 'default');
    const instanceId = sanitizeKeyPart(options.instanceId, 'instance');
    const instanceKey = buildInstanceKey(owner, instanceId);
    const registry = getInstanceRegistry(viewer);
    const uri = resolveUri(modelId, options);
    const position = buildPosition(options);
    const orientation = buildOrientation(position, options);
    const name = options.name || owner + ' ' + instanceId;
    const entityId = options.id || 'tx3d:' + instanceKey;

    let entity = registry.get(instanceKey) || null;
    if (!entity && typeof viewer.entities.getById === 'function') {
      entity = viewer.entities.getById(entityId) || null;
      if (entity) registry.set(instanceKey, entity);
    }

    if (entity && entity.__modelId !== String(modelId || '')) {
      viewer.entities.remove(entity);
      registry.delete(instanceKey);
      entity = null;
    }

    if (!entity) {
      entity = viewer.entities.add({
        id: entityId,
        name,
        position,
        orientation,
        model: buildModelOptions(uri, options),
        show: options.show !== false,
      });
      registry.set(instanceKey, entity);
    } else {
      entity.name = name;
      entity.position = position;
      entity.orientation = orientation;
      entity.show = options.show !== false;
      entity.model.minimumPixelSize = Number(options.minimumPixelSize ?? 64);
      entity.model.maximumScale = Number(options.maximumScale ?? 20000);
      entity.model.scale = Number(options.scale ?? 1);
    }

    entity.__modelId = String(modelId || '');
    entity.__objectOwner = owner;
    entity.__objectInstanceId = instanceId;
    entity.__objectInstanceKey = instanceKey;

    if (options.flyTo === true && typeof viewer.flyTo === 'function') {
      viewer.flyTo(entity, { duration: Number(options.flyDuration ?? 0.9) });
    }

    return entity;
  }

  function removeEntity(entity, viewer = defaultViewer) {
    if (!entity || !viewer || !viewer.entities) return false;
    return viewer.entities.remove(entity);
  }

  function removeInstance(owner, instanceId, options = {}) {
    const viewer = options.viewer || defaultViewer;
    if (!viewer || !viewer.entities) return false;

    const instanceKey = buildInstanceKey(owner, instanceId);
    const registry = getInstanceRegistry(viewer);
    const entity = registry.get(instanceKey);
    if (!entity) return false;

    registry.delete(instanceKey);
    return viewer.entities.remove(entity);
  }

  function removeOwnerInstances(owner, options = {}) {
    const viewer = options.viewer || defaultViewer;
    if (!viewer || !viewer.entities) return 0;

    const ownerKey = sanitizeKeyPart(owner, 'default') + ':';
    const registry = getInstanceRegistry(viewer);
    let removed = 0;

    Array.from(registry.entries()).forEach(([key, entity]) => {
      if (!key.startsWith(ownerKey)) return;
      registry.delete(key);
      if (viewer.entities.remove(entity)) removed += 1;
    });

    return removed;
  }

  function listInstances(options = {}) {
    const viewer = options.viewer || defaultViewer;
    if (!viewer || !viewer.entities) return [];

    const registry = getInstanceRegistry(viewer);
    return Array.from(registry.entries()).map(([key, entity]) => ({
      key,
      owner: entity.__objectOwner || '',
      instanceId: entity.__objectInstanceId || '',
      modelId: entity.__modelId || '',
      name: entity.name,
      show: entity.show !== false,
      entity,
    }));
  }

  const api = Object.freeze({
    id: 'three-d-object-loader',
    list,
    resolveUri,
    attachViewer,
    addEntity,
    upsertInstance,
    removeEntity,
    removeInstance,
    removeOwnerInstances,
    listInstances,
  });

  window.TermikaCC3DObjectLoader = api;
  window.TermikaHostContext?.provide('three-d-object-loader', api);
})();
