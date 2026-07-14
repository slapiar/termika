#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * TermikaXC - Wind Focus Manifest validator (v1)
 *
 * Usage:
 *   php tools/validate-wind-focus-manifest.php <manifest.json>
 *
 * Exit codes:
 *   0 = valid
 *   1 = invalid manifest
 *   2 = runtime/input error
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This validator must run in CLI mode.\n");
    exit(2);
}

$argvCount = $_SERVER['argc'] ?? 0;
$argvVals = $_SERVER['argv'] ?? [];

if ($argvCount < 2) {
    fwrite(STDERR, "Usage: php tools/validate-wind-focus-manifest.php <manifest.json>\n");
    exit(2);
}

$manifestPath = $argvVals[1];
if (!is_file($manifestPath)) {
    fwrite(STDERR, "Manifest file not found: {$manifestPath}\n");
    exit(2);
}

$raw = file_get_contents($manifestPath);
if ($raw === false) {
    fwrite(STDERR, "Cannot read manifest file: {$manifestPath}\n");
    exit(2);
}

try {
    $manifest = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
    fwrite(STDERR, "Invalid JSON: " . $e->getMessage() . "\n");
    exit(1);
}

if (!is_array($manifest)) {
    fwrite(STDERR, "Manifest root must be an object.\n");
    exit(1);
}

$errors = [];

validateTopLevel($manifest, $errors);
validateSpatial($manifest['spatial'] ?? null, $errors);
validateProvenance($manifest['provenance'] ?? null, $errors);
validateModel($manifest['model'] ?? null, $errors);
validateInputs($manifest['inputs'] ?? null, $errors);
validateLayers($manifest['layers'] ?? null, $errors, $manifest);

if (count($errors) > 0) {
    fwrite(STDERR, "Manifest INVALID (" . count($errors) . " issue(s)):\n");
    foreach ($errors as $idx => $error) {
        $n = $idx + 1;
        fwrite(STDERR, "  {$n}. {$error}\n");
    }
    exit(1);
}

fwrite(STDOUT, "Manifest OK: {$manifestPath}\n");
exit(0);

function validateTopLevel(array $m, array &$errors): void
{
    $required = [
        'schema_version',
        'focus_id',
        'created_at',
        'valid_from',
        'valid_to',
        'spatial',
        'provenance',
        'model',
        'inputs',
        'layers',
    ];

    foreach ($required as $key) {
        if (!array_key_exists($key, $m)) {
            $errors[] = "Missing required field: {$key}";
        }
    }

    if (($m['schema_version'] ?? null) !== 'wind-focus-manifest.v1') {
        $errors[] = "schema_version must be 'wind-focus-manifest.v1'.";
    }

    if (!isStringPattern($m['focus_id'] ?? null, '/^[A-Za-z0-9._:-]{6,128}$/')) {
        $errors[] = 'focus_id must match /^[A-Za-z0-9._:-]{6,128}$/.';
    }

    validateDateOrder(
        $m['valid_from'] ?? null,
        $m['valid_to'] ?? null,
        'valid_from',
        'valid_to',
        $errors
    );

    if (!isIsoDateTime($m['created_at'] ?? null)) {
        $errors[] = 'created_at must be valid ISO date-time.';
    }
}

function validateSpatial($spatial, array &$errors): void
{
    if (!is_array($spatial)) {
        $errors[] = 'spatial must be an object.';
        return;
    }

    if (!is_string($spatial['crs'] ?? null) || trim((string)$spatial['crs']) === '') {
        $errors[] = 'spatial.crs must be a non-empty string.';
    }

    $bbox = $spatial['bbox'] ?? null;
    if (!is_array($bbox) || count($bbox) !== 6) {
        $errors[] = 'spatial.bbox must have 6 numeric values.';
    } else {
        foreach ($bbox as $idx => $val) {
            if (!is_numeric($val)) {
                $errors[] = "spatial.bbox[{$idx}] must be numeric.";
            }
        }
        if (count($bbox) === 6 && allNumeric($bbox)) {
            [$minLon, $minLat, $minAlt, $maxLon, $maxLat, $maxAlt] = array_map('floatval', $bbox);
            if ($minLon > $maxLon) {
                $errors[] = 'spatial.bbox minLon must be <= maxLon.';
            }
            if ($minLat > $maxLat) {
                $errors[] = 'spatial.bbox minLat must be <= maxLat.';
            }
            if ($minAlt > $maxAlt) {
                $errors[] = 'spatial.bbox minAltM must be <= maxAltM.';
            }
        }
    }

    if (array_key_exists('focus_resolution_m', $spatial)) {
        $val = $spatial['focus_resolution_m'];
        if (!is_numeric($val) || (float)$val <= 0) {
            $errors[] = 'spatial.focus_resolution_m must be a positive number.';
        }
    }
}

function validateProvenance($prov, array &$errors): void
{
    if (!is_array($prov)) {
        $errors[] = 'provenance must be an object.';
        return;
    }

    if (!is_string($prov['author'] ?? null) || trim((string)$prov['author']) === '') {
        $errors[] = 'provenance.author must be a non-empty string.';
    }

    if (!isHash64($prov['source_temp_hash'] ?? null)) {
        $errors[] = 'provenance.source_temp_hash must be a 64-char hex SHA-256.';
    }

    if (!is_string($prov['terrain_version'] ?? null) || trim((string)$prov['terrain_version']) === '') {
        $errors[] = 'provenance.terrain_version must be a non-empty string.';
    }
}

function validateModel($model, array &$errors): void
{
    if (!is_array($model)) {
        $errors[] = 'model must be an object.';
        return;
    }

    if (!is_string($model['model_version'] ?? null) || trim((string)$model['model_version']) === '') {
        $errors[] = 'model.model_version must be a non-empty string.';
    }

    $allowed = ['float32', 'float16', 'int16-scaled'];
    if (!in_array($model['precision_mode'] ?? null, $allowed, true)) {
        $errors[] = 'model.precision_mode must be one of: float32, float16, int16-scaled.';
    }
}

function validateInputs($inputs, array &$errors): void
{
    if (!is_array($inputs)) {
        $errors[] = 'inputs must be an object.';
        return;
    }

    if (!is_string($inputs['temp_path'] ?? null) || trim((string)$inputs['temp_path']) === '') {
        $errors[] = 'inputs.temp_path must be a non-empty string.';
    }

    if (!is_string($inputs['terrain_ref_path'] ?? null) || trim((string)$inputs['terrain_ref_path']) === '') {
        $errors[] = 'inputs.terrain_ref_path must be a non-empty string.';
    }
}

function validateLayers($layers, array &$errors, array $manifest): void
{
    if (!is_array($layers) || count($layers) < 1) {
        $errors[] = 'layers must be a non-empty array.';
        return;
    }

    $layerIds = [];
    $manifestFrom = $manifest['valid_from'] ?? null;
    $manifestTo = $manifest['valid_to'] ?? null;

    foreach ($layers as $i => $layer) {
        $prefix = "layers[{$i}]";
        if (!is_array($layer)) {
            $errors[] = "{$prefix} must be an object.";
            continue;
        }

        $required = [
            'layer_id',
            'kind',
            'vertical_level',
            'valid_from',
            'valid_to',
            'field_path',
            'field_hash_sha256',
            'encoding',
        ];
        foreach ($required as $key) {
            if (!array_key_exists($key, $layer)) {
                $errors[] = "{$prefix} missing required field: {$key}";
            }
        }

        if (!isStringPattern($layer['layer_id'] ?? null, '/^[A-Za-z0-9._:-]{3,128}$/')) {
            $errors[] = "{$prefix}.layer_id is invalid.";
        } else {
            $layerId = (string)$layer['layer_id'];
            if (isset($layerIds[$layerId])) {
                $errors[] = "{$prefix}.layer_id duplicates '{$layerId}'.";
            }
            $layerIds[$layerId] = true;
        }

        $allowedKinds = ['wind_uv', 'thermo', 'derived', 'confidence'];
        if (!in_array($layer['kind'] ?? null, $allowedKinds, true)) {
            $errors[] = "{$prefix}.kind must be one of: wind_uv, thermo, derived, confidence.";
        }

        validateVerticalLevel($layer['vertical_level'] ?? null, $errors, $prefix . '.vertical_level');
        validateDateOrder($layer['valid_from'] ?? null, $layer['valid_to'] ?? null, $prefix . '.valid_from', $prefix . '.valid_to', $errors);

        if (!is_string($layer['field_path'] ?? null) || trim((string)$layer['field_path']) === '') {
            $errors[] = "{$prefix}.field_path must be a non-empty string.";
        }

        if (!isHash64($layer['field_hash_sha256'] ?? null)) {
            $errors[] = "{$prefix}.field_hash_sha256 must be 64-char hex SHA-256.";
        }

        validateEncoding($layer['encoding'] ?? null, $errors, $prefix . '.encoding');

        if (isset($layer['render_cache'])) {
            validateRenderCache($layer['render_cache'], $errors, $prefix . '.render_cache', $layer['field_hash_sha256'] ?? null);
        }

        if (isIsoDateTime($manifestFrom) && isIsoDateTime($manifestTo) && isIsoDateTime($layer['valid_from'] ?? null) && isIsoDateTime($layer['valid_to'] ?? null)) {
            $mFromTs = strtotime((string)$manifestFrom);
            $mToTs = strtotime((string)$manifestTo);
            $lFromTs = strtotime((string)$layer['valid_from']);
            $lToTs = strtotime((string)$layer['valid_to']);
            if ($lFromTs < $mFromTs || $lToTs > $mToTs) {
                $errors[] = "{$prefix} validity must stay inside manifest [valid_from, valid_to].";
            }
        }
    }
}

function validateVerticalLevel($vl, array &$errors, string $path): void
{
    if (!is_array($vl)) {
        $errors[] = "{$path} must be an object.";
        return;
    }

    $allowed = ['agl_m', 'msl_m', 'pressure_hpa', 'model_layer'];
    if (!in_array($vl['type'] ?? null, $allowed, true)) {
        $errors[] = "{$path}.type must be one of: agl_m, msl_m, pressure_hpa, model_layer.";
    }

    if (!array_key_exists('value', $vl) || !is_numeric($vl['value'])) {
        $errors[] = "{$path}.value must be numeric.";
    }
}

function validateEncoding($enc, array &$errors, string $path): void
{
    if (!is_array($enc)) {
        $errors[] = "{$path} must be an object.";
        return;
    }

    $formats = ['txwf-bin.v1'];
    if (!in_array($enc['format'] ?? null, $formats, true)) {
        $errors[] = "{$path}.format must be txwf-bin.v1.";
    }

    $compressions = ['none', 'gzip', 'zstd'];
    if (!in_array($enc['compression'] ?? null, $compressions, true)) {
        $errors[] = "{$path}.compression must be one of: none, gzip, zstd.";
    }
}

function validateRenderCache($cache, array &$errors, string $path, $fieldHash): void
{
    if (!is_array($cache)) {
        $errors[] = "{$path} must be an object.";
        return;
    }

    if (!is_string($cache['webm_path'] ?? null) || trim((string)$cache['webm_path']) === '') {
        $errors[] = "{$path}.webm_path must be a non-empty string.";
    }

    if (!isHash64($cache['source_field_hash_sha256'] ?? null)) {
        $errors[] = "{$path}.source_field_hash_sha256 must be 64-char hex SHA-256.";
    }

    if (is_string($fieldHash) && is_string($cache['source_field_hash_sha256'] ?? null)) {
        if (strcasecmp($fieldHash, $cache['source_field_hash_sha256']) !== 0) {
            $errors[] = "{$path}.source_field_hash_sha256 must match layer field_hash_sha256.";
        }
    }
}

function validateDateOrder($from, $to, string $fromPath, string $toPath, array &$errors): void
{
    if (!isIsoDateTime($from)) {
        $errors[] = "{$fromPath} must be valid ISO date-time.";
        return;
    }

    if (!isIsoDateTime($to)) {
        $errors[] = "{$toPath} must be valid ISO date-time.";
        return;
    }

    $fromTs = strtotime((string)$from);
    $toTs = strtotime((string)$to);
    if ($fromTs === false || $toTs === false || $fromTs > $toTs) {
        $errors[] = "{$fromPath} must be <= {$toPath}.";
    }
}

function isIsoDateTime($value): bool
{
    if (!is_string($value) || trim($value) === '') {
        return false;
    }

    // Accept RFC3339 / ISO-8601 format with timezone, e.g. 2026-07-14T12:30:00Z
    if (preg_match('/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+\\-]\\d{2}:\\d{2})$/', $value) !== 1) {
        return false;
    }

    $ts = strtotime($value);
    return $ts !== false;
}

function isHash64($value): bool
{
    return is_string($value) && preg_match('/^[A-Fa-f0-9]{64}$/', $value) === 1;
}

function isStringPattern($value, string $pattern): bool
{
    return is_string($value) && preg_match($pattern, $value) === 1;
}

function allNumeric(array $values): bool
{
    foreach ($values as $v) {
        if (!is_numeric($v)) {
            return false;
        }
    }
    return true;
}
