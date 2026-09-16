<?php
$srcPath = "C:\\Users\\Pugal Gokul\\.gemini\\antigravity-ide\\brain\\030ca918-56de-48fe-8692-adadea78c7fe\\.user_uploaded\\media_1789467926179.png";
$outDir = "C:\\Users\\Pugal Gokul\\.gemini\\antigravity-ide\\brain\\030ca918-56de-48fe-8692-adadea78c7fe";

$src = imagecreatefrompng($srcPath);
$width = imagesx($src);
$height = imagesy($src);

echo "Total dimensions: {$width} x {$height}\n";

$panelWidth = (int)($width / 8);

for ($i = 0; $i < 8; $i++) {
    $x = $i * $panelWidth;
    $dst = imagecreatetruecolor($panelWidth, $height);
    imagecopy($dst, $src, 0, 0, $x, 0, $panelWidth, $height);
    $outPath = $outDir . "\\panel_" . ($i + 1) . ".png";
    imagepng($dst, $outPath);
    imagedestroy($dst);
    echo "Saved panel " . ($i + 1) . " to $outPath\n";
}

imagedestroy($src);
