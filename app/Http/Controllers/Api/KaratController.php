<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Karat;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class KaratController extends Controller
{
    /**
     * Normalize redundant codes (e.g. code "24" for karat "24k") so they don't produce awkward dropdown labels.
     */
    protected function cleanRedundantCode(?string $name, ?string $code): ?string
    {
        if (empty($code) || empty($name)) {
            return null;
        }
        $normName = strtolower(trim(preg_replace('/k$/i', '', $name)));
        $normCode = strtolower(trim(preg_replace('/k$/i', '', $code)));
        if ($normName === $normCode || strcasecmp(trim($code), trim($name)) === 0) {
            return null;
        }
        return trim($code);
    }

    public function index()
    {
        $items = Cache::remember('masters_karats_all_v2', 300, function () {
            $karats = Karat::orderBy('sort_order')->orderBy('name')->get();
            foreach ($karats as $karat) {
                if ($karat->code) {
                    $karat->code = $this->cleanRedundantCode($karat->name, $karat->code);
                }
            }
            return $karats;
        });
        return response()->json($items);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:karats,name',
            'code' => 'nullable|string|max:100',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        if (isset($validated['code'])) {
            $validated['code'] = $this->cleanRedundantCode($validated['name'] ?? null, $validated['code']);
        }

        if (!isset($validated['sort_order']) || $validated['sort_order'] === null || $validated['sort_order'] === '') {
            $maxOrder = Karat::max('sort_order') ?? 0;
            $validated['sort_order'] = $maxOrder + 1;
        } else {
            $validated['sort_order'] = (int)$validated['sort_order'];
        }

        $karat = Karat::create($validated);
        Cache::forget('masters_karats_all');
        Cache::forget('masters_karats_all_v2');

        return response()->json([
            'message' => 'Karat created successfully.',
            'data' => $karat,
        ], 201);
    }

    public function show(Karat $karat)
    {
        return response()->json($karat);
    }

    public function update(Request $request, Karat $karat)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:karats,name,' . $karat->id,
            'code' => 'nullable|string|max:100',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        if (isset($validated['code'])) {
            $validated['code'] = $this->cleanRedundantCode($validated['name'] ?? null, $validated['code']);
        }

        if (!isset($validated['sort_order']) || $validated['sort_order'] === null || $validated['sort_order'] === '') {
            $validated['sort_order'] = $karat->sort_order ?? ((Karat::max('sort_order') ?? 0) + 1);
        } else {
            $validated['sort_order'] = (int)$validated['sort_order'];
        }

        $karat->update($validated);
        Cache::forget('masters_karats_all');
        Cache::forget('masters_karats_all_v2');

        return response()->json([
            'message' => 'Karat updated successfully.',
            'data' => $karat,
        ]);
    }

    public function destroy(Karat $karat)
    {
        $karat->delete();
        Cache::forget('masters_karats_all');
        Cache::forget('masters_karats_all_v2');

        return response()->json([
            'message' => 'Karat deleted successfully.',
        ]);
    }
}
