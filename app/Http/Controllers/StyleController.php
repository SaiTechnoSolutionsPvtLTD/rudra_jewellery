<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\Style;

class StyleController extends Controller
{
    public function index()
    {
        $styles = Style::all();
        return view('settings-style', compact('styles'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'color' => 'nullable|string|max:50',
        ]);

        // Default to a random color if not provided or simply assign later based on UI requirements
        $colors = ['amber', 'red', 'orange', 'slate', 'purple', 'green', 'blue', 'pink'];
        if (empty($validated['color'])) {
            $validated['color'] = $colors[array_rand($colors)];
        }

        Style::create($validated);

        return redirect()->route('settings.style')->with('success', 'Style created successfully.');
    }

    public function update(Request $request, Style $style)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'color' => 'nullable|string|max:50',
        ]);

        $style->update($validated);

        return redirect()->route('settings.style')->with('success', 'Style updated successfully.');
    }

    public function destroy(Style $style)
    {
        $style->delete();

        return redirect()->route('settings.style')->with('success', 'Style deleted successfully.');
    }
}
