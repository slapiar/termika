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

  function addEntity(modelId, options = {}) {
    const viewer = options.viewer || defaultViewer;
    if (!viewer || !viewer.entities || typeof viewer.entities.add !== 'function') {
      throw new Error('Cesium viewer is required. Pass options.viewer or call attachViewer(viewer).');
    }

    const lat = Number(options.lat ?? 46.43);
    const lon = Number(options.lon ?? 11.85);
    const height = Number(options.height ?? 1500);
    const headingDeg = Number(options.headingDeg ?? 0);
    const pitchDeg = Number(options.pitchDeg ?? 0);
    const rollDeg = Number(options.rollDeg ?? 0);
    const uri = resolveUri(modelId, options);

    const position = Cesium.Cartesian3.fromDegrees(lon, lat, height);
    const hpr = new Cesium.HeadingPitchRoll(
      Cesium.Math.toRadians(headingDeg),
      Cesium.Math.toRadians(pitchDeg),
      Cesium.Math.toRadians(rollDeg)
    );
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);

    const entity = viewer.entities.add({
      name: options.name || modelId,
      position,
      orientation,
      model: {
        uri,
        minimumPixelSize: Number(options.minimumPixelSize ?? 64),
        maximumScale: Number(options.maximumScale ?? 20000),
        scale: Number(options.scale ?? 1),
      },
    });

    if (options.flyTo === true && typeof viewer.flyTo === 'function') {
      viewer.flyTo(entity, { duration: Number(options.flyDuration ?? 0.9) });
    }

    return entity;
  }

  function removeEntity(entity, viewer = defaultViewer) {
    if (!entity || !viewer || !viewer.entities) return false;
    return viewer.entities.remove(entity);
  }

  const api = Object.freeze({
    id: 'three-d-object-loader',
    list,
    resolveUri,
    attachViewer,
    addEntity,
    removeEntity,
  });

  window.TermikaCC3DObjectLoader = api;
  window.TermikaHostContext?.provide('three-d-object-loader', api);
})();
