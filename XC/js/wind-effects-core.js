// js/wind-effects-core.js
// TermikaXC v2.6 - modulovy registrator vplyvov vetra.

window.WindEffectsCore = {
    VERSION: "2.6.12-wind-effects.1",

    effects: new Map(),

    registerEffect: function (definition) {
        if (!definition || typeof definition !== "object") {
            throw new Error("Wind effect definition must be an object.");
        }

        const id = String(definition.id || "").trim();
        if (!id) {
            throw new Error("Wind effect is missing id.");
        }
        if (typeof definition.run !== "function") {
            throw new Error("Wind effect " + id + " is missing run() function.");
        }

        this.effects.set(id, {
            id,
            title: String(definition.title || id),
            order: Number.isFinite(Number(definition.order)) ? Number(definition.order) : 100,
            run: definition.run
        });

        return this.effects.get(id);
    },

    listEffects: function () {
        return Array.from(this.effects.values())
            .sort((a, b) => a.order - b.order)
            .map((e) => ({ id: e.id, title: e.title, order: e.order }));
    },

    applyAll: function (field, context = {}) {
        if (!field || !Array.isArray(field.cells)) {
            return { applied: [], cells: field?.cells || [] };
        }

        const active = Array.isArray(context.activeEffects)
            ? context.activeEffects.map((id) => String(id).trim()).filter(Boolean)
            : this.listEffects().map((e) => e.id);

        const ordered = active
            .map((id) => this.effects.get(id))
            .filter(Boolean)
            .sort((a, b) => a.order - b.order);

        const applied = [];
        ordered.forEach((effect) => {
            effect.run(field, context);
            applied.push(effect.id);
        });

        return { applied, cells: field.cells };
    }
};
