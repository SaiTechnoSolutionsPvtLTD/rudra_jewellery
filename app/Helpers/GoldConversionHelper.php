<?php

namespace App\Helpers;

class GoldConversionHelper
{
    /**
     * Get Touch percentage for a given gold purity string or touch input.
     * e.g., '22K (916)' -> 91.66%, '18K (750)' -> 75.0%, '24K (999)' -> 99.9%
     */
    public static function getTouchPercent($purityOrTouch): float
    {
        if (is_numeric($purityOrTouch) && (float)$purityOrTouch > 0) {
            $val = (float) $purityOrTouch;
            // If passed as decimal fraction like 0.9166, convert to percentage 91.66
            if ($val <= 1.0) return round($val * 100, 2);
            return round($val, 2);
        }

        $str = strtoupper((string) $purityOrTouch);

        if (str_contains($str, '24K') || str_contains($str, '999') || str_contains($str, 'PURE')) {
            return 99.90;
        }
        if (str_contains($str, '22K') || str_contains($str, '916')) {
            return 91.66;
        }
        if (str_contains($str, '20K') || str_contains($str, '833')) {
            return 83.33;
        }
        if (str_contains($str, '18K') || str_contains($str, '750')) {
            return 75.00;
        }
        if (str_contains($str, '14K') || str_contains($str, '585')) {
            return 58.50;
        }
        if (str_contains($str, '10K') || str_contains($str, '417')) {
            return 41.70;
        }

        // Default 22K (916) touch standard
        return 91.66;
    }

    /**
     * Convert any gross gold weight to 24-Carat (24K) Fine Equivalent Weight in grams.
     */
    public static function convertTo24kFineWeight($grossWeightGrams, $purityOrTouch): float
    {
        $weight = max(0, (float) $grossWeightGrams);
        $touch = static::getTouchPercent($purityOrTouch);
        return round($weight * ($touch / 100.0), 3);
    }

    /**
     * Calculate 24K Average Rate per 10 grams based on total amount and 24K fine weight.
     */
    public static function calculate24kAverageRatePer10g($totalAmount, $totalFineWeightGrams): float
    {
        $amount = (float) $totalAmount;
        $fineGrams = (float) $totalFineWeightGrams;

        if ($fineGrams <= 0) return 0.0;
        return round(($amount / $fineGrams) * 10.0, 2);
    }

    /**
     * Calculate 24K Average Rate per 1 gram.
     */
    public static function calculate24kAverageRatePerGram($totalAmount, $totalFineWeightGrams): float
    {
        $amount = (float) $totalAmount;
        $fineGrams = (float) $totalFineWeightGrams;

        if ($fineGrams <= 0) return 0.0;
        return round($amount / $fineGrams, 2);
    }
}
