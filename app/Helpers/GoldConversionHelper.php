<?php

namespace App\Helpers;

class GoldConversionHelper
{
    /**
     * Get Touch percentage for a given gold purity string or touch input.
     * e.g., '22K (916)' -> 91.6667%, '18K (750)' -> 75.0%, '24K (999)' -> 100.0%
     */
    public static function getTouchPercent($purityOrTouch): float
    {
        if (is_numeric($purityOrTouch) && (float)$purityOrTouch > 0) {
            $val = (float) $purityOrTouch;
            // If passed as decimal fraction like 0.9166, convert to percentage 91.66
            if ($val <= 1.0) return round($val * 100, 4);
            return round($val, 4);
        }

        $str = strtoupper(trim((string) $purityOrTouch));

        if (str_contains($str, '24K') || str_contains($str, '999') || str_contains($str, 'PURE')) {
            return 100.0;
        }
        if (str_contains($str, '22K') || str_contains($str, '916')) {
            return (22.0 / 24.0) * 100.0; // 91.6667%
        }
        if (str_contains($str, '20K') || str_contains($str, '833')) {
            return (20.0 / 24.0) * 100.0; // 83.3333%
        }
        if (str_contains($str, '18K') || str_contains($str, '750')) {
            return (18.0 / 24.0) * 100.0; // 75.0%
        }
        if (str_contains($str, '14K') || str_contains($str, '585')) {
            return (14.0 / 24.0) * 100.0; // 58.3333%
        }
        if (str_contains($str, '10K') || str_contains($str, '417')) {
            return (10.0 / 24.0) * 100.0; // 41.6667%
        }

        // Default 22K (916) touch standard
        return (22.0 / 24.0) * 100.0;
    }

    /**
     * Convert any purchased gold quantity into its equivalent 24K pure-gold weight.
     *
     * Formula:
     *   24K equivalent weight = Purchased weight × Purchased purity ÷ 24
     *
     * Examples:
     *   60g of 22K gold = 60 × 22 ÷ 24 = 55.000g of 24K equivalent gold.
     *   60g of 18K gold = 60 × 18 ÷ 24 = 45.000g of 24K equivalent gold.
     *   60g of 24K gold = 60 × 24 ÷ 24 = 60.000g of 24K equivalent gold.
     *   50g at 92.5% touch = 50 × 0.925 = 46.250g of 24K equivalent gold.
     */
    public static function convertTo24kPureWeight(float $weight, $purity = null, ?float $touch = null, float $wastagePercent = 0.0): float
    {
        $weight = max(0, (float) $weight);
        if ($weight <= 0) {
            return 0.0;
        }

        $purityStr = strtoupper(trim((string) $purity));

        // 1. Check if Karat is specified in purity string (e.g., '22K', '18K', '24K', '14K')
        if (preg_match('/(24|22|20|18|14|10)\s*K/i', $purityStr, $matches)) {
            $karat = (float) $matches[1];
            return round($weight * ($karat / 24.0), 3);
        }

        // 2. Check if purity is a plain Karat number ('24', '22', '18', '14', '10')
        if (in_array($purityStr, ['24', '22', '20', '18', '14', '10'])) {
            $karat = (float) $purityStr;
            return round($weight * ($karat / 24.0), 3);
        }

        // 3. If touch percentage is explicitly provided
        if ($touch !== null && (float)$touch > 0) {
            $touchVal = (float)$touch;

            // Check if touch matches standard Karat touch benchmarks:
            // 22K standard: 91.6%, 91.66%, 91.67%
            if (abs($touchVal - 91.6) < 0.2 || abs($touchVal - 91.6667) < 0.1) {
                return round($weight * (22.0 / 24.0), 3);
            }
            // 18K standard: 75.0%
            if (abs($touchVal - 75.0) < 0.1) {
                return round($weight * (18.0 / 24.0), 3);
            }
            // 24K pure bullion: 99.5% to 100%
            if ($touchVal >= 99.5) {
                return round($weight * (24.0 / 24.0), 3);
            }
            // 14K standard: 58.33% to 58.5%
            if (abs($touchVal - 58.5) < 0.3 || abs($touchVal - 58.3333) < 0.1) {
                return round($weight * (14.0 / 24.0), 3);
            }

            // Custom bullion touch percentage (e.g. 92.5%, 85.0%)
            $effectiveTouch = $touchVal + max(0, $wastagePercent);
            return round($weight * ($effectiveTouch / 100.0), 3);
        }

        // 4. Fallback: Parse from purity string or default
        $touchVal = static::getTouchPercent($purity);
        if (abs($touchVal - ((22.0 / 24.0) * 100.0)) < 0.1) {
            return round($weight * (22.0 / 24.0), 3);
        }
        return round($weight * ($touchVal / 100.0), 3);
    }

    /**
     * Backward-compatible alias for convertTo24kPureWeight.
     */
    public static function convertTo24kFineWeight($grossWeightGrams, $purityOrTouch): float
    {
        return static::convertTo24kPureWeight((float)$grossWeightGrams, $purityOrTouch);
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
