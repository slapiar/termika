// js/cesium-render.js
window.CesiumRender = {
    kominEntities: [],
    p3DBodPilota: null,
    p3DObjektPilota: null,
    pilotModelId: null,
    lastPilotData: null,
    celaLetovaStopaPrimitive: null,
    prehranaStopaCollection: null,
    prehraneUseky: [],
    renderedTrailIndex: 0,
    startEntity: null,
    finishEntity: null,
    flightBoundingSphere: null,
    cameraMode: "free",
    lastHeading: null,
    followRangeM: 115,

    vyskaPreRender: function (bod) {
        return Number.isFinite(bod?.render_alt_m) ? bod.render_alt_m : bod.alt_amsl;
    },

    resetujLet: function (viewer) {
        [this.p3DBodPilota, this.startEntity, this.finishEntity].forEach((entity) => {
            if (entity) viewer.entities.remove(entity);
        });

        if (this.p3DObjektPilota) {
            if (window.TermikaCC3DObjectLoader?.removeInstance) {
                window.TermikaCC3DObjectLoader.removeInstance('flight-playback', 'pilot-live-marker', { viewer });
            } else {
                viewer.entities.remove(this.p3DObjektPilota);
            }
        }

        if (this.celaLetovaStopaPrimitive) {
            viewer.scene.primitives.remove(this.celaLetovaStopaPrimitive);
        }
        if (this.prehranaStopaCollection) {
            viewer.scene.primitives.remove(this.prehranaStopaCollection);
        }

        this.p3DBodPilota = null;
        this.p3DObjektPilota = null;
        this.lastPilotData = null;
        this.celaLetovaStopaPrimitive = null;
        this.prehranaStopaCollection = null;
        this.prehraneUseky = [];
        this.renderedTrailIndex = 0;
        this.startEntity = null;
        this.finishEntity = null;
        this.flightBoundingSphere = null;
    },

    pripravCelyLet: function (viewer, letoveBody) {
        if (!viewer || !Array.isArray(letoveBody) || letoveBody.length < 2) {
            throw new Error("Pre vykreslenie chýba viewer alebo body IGC letu.");
        }

        this.resetujLet(viewer);

        const positions = letoveBody.map((bod) =>
            Cesium.Cartesian3.fromDegrees(bod.lon, bod.lat, this.vyskaPreRender(bod))
        );
        const colors = [];

        for (let i = 0; i < letoveBody.length - 1; i += 1) {
            const segmentVario = (letoveBody[i].vario_ms + letoveBody[i + 1].vario_ms) / 2;
            colors.push(this.farbaVaria(segmentVario, 0.48));
        }

        this.flightBoundingSphere = Cesium.BoundingSphere.fromPoints(positions);

        const geometry = new Cesium.PolylineGeometry({
            positions,
            width: 2,
            colors,
            colorsPerVertex: false,
            arcType: Cesium.ArcType.NONE,
            vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT
        });

        this.celaLetovaStopaPrimitive = viewer.scene.primitives.add(new Cesium.Primitive({
            geometryInstances: new Cesium.GeometryInstance({ geometry }),
            appearance: new Cesium.PolylineColorAppearance({ translucent: true }),
            asynchronous: false
        }));

        this.prehranaStopaCollection = viewer.scene.primitives.add(new Cesium.PolylineCollection());

        const first = letoveBody[0];
        const last = letoveBody[letoveBody.length - 1];

        this.startEntity = viewer.entities.add({
            name: "Štart letu",
            position: Cesium.Cartesian3.fromDegrees(first.lon, first.lat, this.vyskaPreRender(first)),
            point: {
                pixelSize: 10,
                color: Cesium.Color.LIME,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2
            }
        });

        this.finishEntity = viewer.entities.add({
            name: "Koniec letu",
            position: Cesium.Cartesian3.fromDegrees(last.lon, last.lat, this.vyskaPreRender(last)),
            point: {
                pixelSize: 10,
                color: Cesium.Color.RED,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2
            }
        });

        viewer.scene.requestRender();
    },

    zamerajCelyLet: function (viewer) {
        if (!viewer || !this.flightBoundingSphere) {
            logStatus("Let ešte nie je načítaný, preto ho nemožno zamerať.", "error");
            return;
        }

        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        const range = Math.max(this.flightBoundingSphere.radius * 2.7, 2500);
        viewer.camera.flyToBoundingSphere(this.flightBoundingSphere, {
            duration: 1.8,
            offset: new Cesium.HeadingPitchRange(
                Cesium.Math.toRadians(18),
                Cesium.Math.toRadians(-46),
                range
            )
        });
    },

    nastavRezimKamery: function (viewer, mode, letoveBody = [], index = 0) {
        if (!viewer) return;

        const povolene = ["free", "overview", "follow", "pilot"];
        this.cameraMode = povolene.includes(mode) ? mode : "free";
        this.lastHeading = null;
        window.setCameraModeUi?.(this.cameraMode);

        if (this.cameraMode === "free") {
            viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
            window.setMapState?.("VOĽNÁ 3D KAMERA", "success");
            logStatus("Kamera je vo voľnom 3D režime. Ovládanie Cesium myšou ostáva aktívne.");
            viewer.scene.requestRender();
            return;
        }

        if (this.cameraMode === "overview") {
            this.zamerajCelyLet(viewer);
            window.setMapState?.("CELÝ LET", "success");
            return;
        }

        if (!Array.isArray(letoveBody) || letoveBody.length < 2) {
            this.cameraMode = "free";
            window.setCameraModeUi?.("free");
            logStatus("Pre zvolený režim kamery ešte nie je načítaný let.", "error");
            return;
        }

        this.aktualizujKameru(viewer, letoveBody, index, true);
        const nazov = this.cameraMode === "follow" ? "KAMERA ZA PILOTOM" : "POHĽAD PILOTA";
        window.setMapState?.(nazov, "success");
        logStatus(this.cameraMode === "follow"
            ? "Kamera bola pripnutá za pilota."
            : "Kamera bola prepnutá do pohľadu z pozície pilota.", "success");
    },

    aktualizujKameru: function (viewer, letoveBody, index, force = false) {
        if (!viewer || !Array.isArray(letoveBody) || letoveBody.length < 2) return;
        if (this.cameraMode !== "follow" && this.cameraMode !== "pilot") return;

        const safeIndex = Math.max(0, Math.min(letoveBody.length - 1, index));
        const bod = letoveBody[safeIndex];
        const smer = this.vypocitajSmerLetu(letoveBody, safeIndex);
        let heading = smer.heading;

        if (this.lastHeading !== null && !force) {
            const rozdiel = Cesium.Math.negativePiToPi(heading - this.lastHeading);
            heading = Cesium.Math.zeroToTwoPi(this.lastHeading + rozdiel * 0.28);
        }
        this.lastHeading = heading;

        if (this.cameraMode === "follow") {
            const target = Cesium.Cartesian3.fromDegrees(bod.lon, bod.lat, this.vyskaPreRender(bod) + 4);
            viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
            viewer.camera.lookAt(
                target,
                new Cesium.HeadingPitchRange(
                    Cesium.Math.zeroToTwoPi(heading + Math.PI),
                    Cesium.Math.toRadians(-18),
                    this.followRangeM
                )
            );
        } else {
            const destination = Cesium.Cartesian3.fromDegrees(bod.lon, bod.lat, this.vyskaPreRender(bod) + 1.8);
            const pitch = Math.max(Cesium.Math.toRadians(-8), Math.min(Cesium.Math.toRadians(8), smer.pitch));
            viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
            viewer.camera.setView({
                destination,
                orientation: {
                    heading,
                    pitch,
                    roll: 0
                }
            });
        }

        viewer.scene.requestRender();
    },

    vypocitajSmerLetu: function (letoveBody, index) {
        const i0 = Math.max(0, index - 2);
        const i1 = Math.min(letoveBody.length - 1, index + 5);
        const b0 = letoveBody[i0];
        const b1 = letoveBody[i1];

        const start = Cesium.Cartographic.fromDegrees(b0.lon, b0.lat, this.vyskaPreRender(b0));
        const end = Cesium.Cartographic.fromDegrees(b1.lon, b1.lat, this.vyskaPreRender(b1));
        const geodesic = new Cesium.EllipsoidGeodesic(start, end);
        const surfaceDistance = Math.max(0.1, geodesic.surfaceDistance || 0.1);
        const heading = Number.isFinite(geodesic.startHeading)
            ? Cesium.Math.zeroToTwoPi(geodesic.startHeading)
            : (this.lastHeading ?? 0);
        const pitch = Math.atan2(this.vyskaPreRender(b1) - this.vyskaPreRender(b0), surfaceDistance);

        return { heading, pitch };
    },

    vymazKominy: function (viewer) {
        if (!viewer) return;
        this.kominEntities.forEach((entity) => viewer.entities.remove(entity));
        this.kominEntities = [];
        viewer.scene.requestRender();
    },

    vykresli3DTeloKomina: function (viewer, bodyKomina) {
        if (!viewer || !Array.isArray(bodyKomina) || bodyKomina.length === 0) {
            throw new Error("Chýba viewer alebo geometria termického komína.");
        }

        this.vymazKominy(viewer);

        const h0 = bodyKomina[0];
        const hotspot = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(h0.lon, h0.lat, h0.alt),
            point: {
                pixelSize: 14,
                color: Cesium.Color.ORANGE,
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2
            }
        });
        this.kominEntities.push(hotspot);

        for (let i = 0; i < bodyKomina.length - 1; i += 1) {
            const b1 = bodyKomina[i];
            const b2 = bodyKomina[i + 1];
            const farba = b1.stav === "KOMIN"
                ? new Cesium.Color(1.0, 0.4, 0.0, 0.28)
                : new Cesium.Color(1.0, 0.85, 0.0, 0.18);

            const segment = viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(
                    (b1.lon + b2.lon) / 2,
                    (b1.lat + b2.lat) / 2,
                    (b1.alt + b2.alt) / 2
                ),
                cylinder: {
                    length: Math.max(1, b2.alt - b1.alt),
                    topRadius: b2.radius,
                    bottomRadius: b1.radius,
                    material: farba,
                    outline: true,
                    outlineColor: new Cesium.Color(1, 1, 1, 0.08)
                }
            });
            this.kominEntities.push(segment);
        }
    },

    vykresliPilotaNaIndexe: function (viewer, liveData, letoveBody, index) {
        if (!viewer) {
            throw new Error("Cesium Viewer nie je inicializovaný.");
        }

        const novaPozicia = Cesium.Cartesian3.fromDegrees(
            liveData.lon,
            liveData.lat,
            Number.isFinite(liveData.render_alt_m) ? liveData.render_alt_m : liveData.alt_amsl
        );

        const farbaPilota = this.farbaVaria(liveData.vertical_speed_ms, 1.0);
        const safeIndex = Array.isArray(letoveBody) ? Math.max(0, Math.min(letoveBody.length - 1, index)) : index;
        const smer = Array.isArray(letoveBody) && letoveBody.length > 1
            ? this.vypocitajSmerLetu(letoveBody, safeIndex)
            : { heading: this.lastHeading ?? 0 };

        this.lastPilotData = { liveData, letoveBody, index };

        if (!this.p3DBodPilota) {
            this.p3DBodPilota = viewer.entities.add({
                name: "Aktuálna poloha pilota (guľa)",
                position: novaPozicia,
                point: {
                    pixelSize: 13,
                    color: farbaPilota,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 3
                }
            });
        }

        this.p3DBodPilota.position = novaPozicia;
        this.p3DBodPilota.point.color = farbaPilota;
        this.p3DBodPilota.show = !this.pilotModelId;

        this.aktualizujObjektPilota(viewer, novaPozicia, smer.heading);

        this.nastavPrehranuStopu(viewer, letoveBody, index);
        this.aktualizujKameru(viewer, letoveBody, index);
        viewer.scene.requestRender();
    },

    // Zobrazí/aktualizuje 3D objekt pilota (namiesto gule), ak je vybraný v sekcii Zdroje.
    aktualizujObjektPilota: function (viewer, pozicia, headingRad = 0) {
        if (!this.pilotModelId) {
            if (this.p3DObjektPilota) this.p3DObjektPilota.show = false;
            return;
        }

        const uri = window.TermikaCC3DObjectLoader?.resolveUri?.(this.pilotModelId);
        if (!uri) {
            console.warn("Neznámy 3D objekt pilota:", this.pilotModelId);
            return;
        }

        const orientation = Cesium.Transforms.headingPitchRollQuaternion(
            pozicia,
            new Cesium.HeadingPitchRoll(headingRad, 0, 0)
        );

        if (window.TermikaCC3DObjectLoader?.upsertInstance) {
            this.p3DObjektPilota = window.TermikaCC3DObjectLoader.upsertInstance(this.pilotModelId, {
                viewer,
                owner: 'flight-playback',
                instanceId: 'pilot-live-marker',
                name: "Aktuálna poloha pilota (3D objekt)",
                position: pozicia,
                orientation,
                minimumPixelSize: 48,
                maximumScale: 4000,
                scale: 1,
                show: true
            });
            return;
        }

        if (!this.p3DObjektPilota || this.p3DObjektPilota.__modelId !== this.pilotModelId) {
            if (this.p3DObjektPilota) viewer.entities.remove(this.p3DObjektPilota);
            this.p3DObjektPilota = viewer.entities.add({
                name: "Aktuálna poloha pilota (3D objekt)",
                position: pozicia,
                orientation,
                model: {
                    uri,
                    minimumPixelSize: 48,
                    maximumScale: 4000,
                    scale: 1
                }
            });
            this.p3DObjektPilota.__modelId = this.pilotModelId;
        }

        this.p3DObjektPilota.position = pozicia;
        this.p3DObjektPilota.orientation = orientation;
        this.p3DObjektPilota.show = true;
    },

    // Prepne značku pilota medzi guľou (modelId = null) a zvoleným 3D objektom.
    // Ak už let beží, prekreslí pilota okamžite na jeho poslednej známej pozícii.
    setPilotModel: function (viewer, modelId) {
        this.pilotModelId = modelId || null;

        if (viewer && this.lastPilotData) {
            this.vykresliPilotaNaIndexe(viewer, this.lastPilotData.liveData, this.lastPilotData.letoveBody, this.lastPilotData.index);
            return;
        }

        if (this.p3DBodPilota) this.p3DBodPilota.show = !this.pilotModelId;
        if (this.p3DObjektPilota) this.p3DObjektPilota.show = Boolean(this.pilotModelId);
    },

    // Načíta (skrytý) 3D objekt vopred, aby bolo neskoršie prepnutie tlačidlom okamžité.
    preloadPilotModel: function (viewer, modelId) {
        if (!viewer || !modelId) return;

        const uri = window.TermikaCC3DObjectLoader?.resolveUri?.(modelId);
        if (!uri) return;
        if (this.p3DObjektPilota && this.p3DObjektPilota.__modelId === modelId) return;

        const pozicia = this.p3DBodPilota
            ? this.p3DBodPilota.position.getValue(viewer.clock.currentTime)
            : Cesium.Cartesian3.fromDegrees(11.85, 46.43, 1500);

        if (window.TermikaCC3DObjectLoader?.upsertInstance) {
            this.p3DObjektPilota = window.TermikaCC3DObjectLoader.upsertInstance(modelId, {
                viewer,
                owner: 'flight-playback',
                instanceId: 'pilot-live-marker',
                name: "Aktuálna poloha pilota (3D objekt)",
                position: pozicia,
                minimumPixelSize: 48,
                maximumScale: 4000,
                scale: 1,
                show: Boolean(this.pilotModelId)
            });
            return;
        }

        if (this.p3DObjektPilota) viewer.entities.remove(this.p3DObjektPilota);
        this.p3DObjektPilota = viewer.entities.add({
            name: "Aktuálna poloha pilota (3D objekt)",
            position: pozicia,
            model: {
                uri,
                minimumPixelSize: 48,
                maximumScale: 4000,
                scale: 1
            },
            show: Boolean(this.pilotModelId)
        });
        this.p3DObjektPilota.__modelId = modelId;
    },

    // Starší názov ponechávame ako poistku pre kompatibilitu.
    vykresliZivehoPilotaAStopu: function (viewer, liveData) {
        const body = window.PilotNetwork?.letoveBody || [];
        const index = window.PilotNetwork?.currentIndex || 0;
        this.vykresliPilotaNaIndexe(viewer, liveData, body, index);
    },

    nastavPrehranuStopu: function (viewer, letoveBody, targetIndex) {
        if (!this.prehranaStopaCollection || !Array.isArray(letoveBody)) return;

        const safeIndex = Math.max(0, Math.min(letoveBody.length - 1, targetIndex));

        // Pri plynulom prehrávaní iba dopĺňame nové segmenty. Pri veľkom skoku
        // alebo návrate dozadu stopu prebudujeme podľa zvolenej polohy na osi.
        const jeMalyPosunVpred =
            safeIndex >= this.renderedTrailIndex &&
            safeIndex - this.renderedTrailIndex <= 50;

        if (!jeMalyPosunVpred) {
            this.prebudujPrehranuStopu(letoveBody, safeIndex);
        } else {
            for (let i = this.renderedTrailIndex; i < safeIndex; i += 1) {
                this.pridajFarebnyUsek(letoveBody, i);
            }
            this.renderedTrailIndex = safeIndex;
        }

        viewer.scene.requestRender();
    },

    prebudujPrehranuStopu: function (letoveBody, targetIndex) {
        this.prehranaStopaCollection.removeAll();
        this.prehraneUseky = [];
        this.renderedTrailIndex = 0;

        for (let i = 0; i < targetIndex; i += 1) {
            this.pridajFarebnyUsek(letoveBody, i);
        }
        this.renderedTrailIndex = targetIndex;
    },

    pridajFarebnyUsek: function (letoveBody, segmentIndex) {
        if (segmentIndex < 0 || segmentIndex >= letoveBody.length - 1) return;

        const b1 = letoveBody[segmentIndex];
        const b2 = letoveBody[segmentIndex + 1];
        const segmentVario = (b1.vario_ms + b2.vario_ms) / 2;
        const bucket = this.kategoriaVaria(segmentVario);
        const p1 = Cesium.Cartesian3.fromDegrees(b1.lon, b1.lat, this.vyskaPreRender(b1));
        const p2 = Cesium.Cartesian3.fromDegrees(b2.lon, b2.lat, this.vyskaPreRender(b2));
        const posledny = this.prehraneUseky[this.prehraneUseky.length - 1];

        if (posledny && posledny.bucket === bucket) {
            posledny.positions.push(p2);
            posledny.polyline.positions = posledny.positions;
            return;
        }

        const positions = [p1, p2];
        const polyline = this.prehranaStopaCollection.add({
            positions,
            width: 4.5,
            material: this.materialVaria(segmentVario, 0.98)
        });

        this.prehraneUseky.push({ bucket, positions, polyline });
    },

    kategoriaVaria: function (vario) {
        if (vario >= 2.0) return "silne-stupanie";
        if (vario >= 0.3) return "stupanie";
        if (vario > -0.3) return "nula";
        if (vario > -1.5) return "klesanie";
        return "silne-klesanie";
    },

    farbaVaria: function (vario, alpha = 1.0) {
        switch (this.kategoriaVaria(vario)) {
            case "silne-stupanie":
                return new Cesium.Color(0.0, 1.0, 0.25, alpha);
            case "stupanie":
                return new Cesium.Color(0.45, 1.0, 0.0, alpha);
            case "nula":
                return new Cesium.Color(1.0, 0.92, 0.0, alpha);
            case "klesanie":
                return new Cesium.Color(1.0, 0.48, 0.0, alpha);
            default:
                return new Cesium.Color(1.0, 0.08, 0.08, alpha);
        }
    },

    materialVaria: function (vario, alpha = 1.0) {
        return Cesium.Material.fromType(Cesium.Material.ColorType, {
            color: this.farbaVaria(vario, alpha)
        });
    },

    vykresli3DZakazanyPriestorCTR: function (viewer, lat, lon, radiusMetre, vyskaMetre) {
        if (!viewer) {
            throw new Error("Cesium Viewer nie je inicializovaný.");
        }

        viewer.entities.add({
            name: "Orientačný priestor CTR",
            position: Cesium.Cartesian3.fromDegrees(lon, lat, vyskaMetre / 2),
            cylinder: {
                length: vyskaMetre,
                topRadius: radiusMetre,
                bottomRadius: radiusMetre,
                material: new Cesium.Color(1.0, 0.0, 0.0, 0.12),
                outline: true,
                outlineColor: Cesium.Color.RED
            }
        });
    }
};
