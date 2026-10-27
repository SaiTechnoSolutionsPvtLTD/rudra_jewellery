/**
 * Universal Print Helper for Rudra ERP
 * Guarantees 1:1 exact visual parity between report Preview, Print, and Save as PDF
 * preserving colors, headers, KPI cards, tables, logos, and layout structures.
 */
export const printElement = (elementId, documentTitle = 'Document', options = {}) => {
  const elem = document.getElementById(elementId);
  if (!elem) {
    window.print();
    return;
  }

  // Clone element content
  const content = elem.outerHTML;

  // Gather all style elements and stylesheets from the main page
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((s) => s.outerHTML)
    .join('\n');

  // Base URL for resolving assets/CSS links cleanly
  const baseUrl = window.location.origin + '/';
  const pageOrientation = options.orientation === 'landscape' ? 'landscape' : 'portrait';

  // Open clean isolated print window
  const printWindow = window.open('', '_blank', 'width=1100,height=900');

  if (!printWindow) {
    // Fallback if popup is blocked
    window.print();
    return;
  }

  const pageMargin = options.margin || '10mm 12mm';
  const bodyPadding = options.bodyPadding || '0';

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <base href="${baseUrl}">
        <title></title>
        ${styles}
        <style>
          @page {
            size: A4 ${pageOrientation};
            margin: ${pageMargin} !important;
          }
          *, *::before, *::after, body, div, table, tr, th, td, span, strong, header, footer, [class*="bg-"], [class*="border-"], [class*="text-"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          @media print {
            @page {
              size: A4 ${pageOrientation};
              margin: ${pageMargin} !important;
            }
            *, *::before, *::after, body, div, table, tr, th, td, span, strong, header, footer, [class*="bg-"], [class*="border-"], [class*="text-"] {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .watermark,
            .print-watermark,
            .company-watermark,
            .report-watermark,
            div[class*="watermark"],
            div[class*="pointer-events-none"][class*="opacity-"],
            div[class*="pointer-events-none"][class*="rotate-"] {
              display: none !important;
              opacity: 0 !important;
              visibility: hidden !important;
            }
            body {
              margin: 0 !important;
              padding: ${bodyPadding} !important;
              background: #ffffff !important;
              color: #000000 !important;
            }
            table {
              width: 100% !important;
              max-width: 100% !important;
            }
            .overflow-x-auto, div {
              overflow: visible !important;
            }
          }
          .watermark,
          .print-watermark,
          .company-watermark,
          .report-watermark,
          div[class*="watermark"],
          div[class*="pointer-events-none"][class*="opacity-"],
          div[class*="pointer-events-none"][class*="rotate-"] {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 100% !important;
            box-sizing: border-box !important;
            overflow: visible !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, .print\\:hidden, button, .btn {
            display: none !important;
          }
          #${elementId} {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
          tr, .avoid-break, .print-break-inside-avoid, .invoice-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          /* Explicit multi-column grid preservation on print */
          .grid-cols-2 { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .grid-cols-3 { display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          .grid-cols-4 { display: grid !important; grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
          .grid-cols-8 { display: grid !important; grid-template-columns: repeat(8, minmax(0, 1fr)) !important; }
          .grid-cols-12 { display: grid !important; grid-template-columns: repeat(12, minmax(0, 1fr)) !important; }
          .col-span-7 { grid-column: span 7 / span 7 !important; }
          .col-span-5 { grid-column: span 5 / span 5 !important; }

          /* Retain exact header background colors & card backgrounds */
          .bg-\\[\\#b01622\\], th.bg-\\[\\#b01622\\], tr.bg-\\[\\#b01622\\] {
            background-color: #b01622 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .text-\\[\\#b01622\\] { color: #b01622 !important; }
          .border-\\[\\#b01622\\] { border-color: #b01622 !important; }
          .bg-stone-50, .bg-stone-50\\/80, .bg-stone-50\\/50 {
            background-color: #fafaf9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bg-stone-100 {
            background-color: #f5f5f4 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bg-stone-700 {
            background-color: #44403c !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bg-amber-50\\/20, .bg-amber-50\\/10, .bg-amber-50\\/30 {
            background-color: #fffdf5 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .border-amber-200\\/60, .border-amber-200 {
            border-color: #fde68a !important;
          }
          .bg-emerald-50\\/60, .bg-emerald-50 {
            background-color: #ecfdf5 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .border-emerald-200 {
            border-color: #a7f3d0 !important;
          }
          .bg-red-50\\/50, .bg-red-50 {
            background-color: #fef2f2 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .border-red-200 {
            border-color: #fecaca !important;
          }
        </style>
      </head>
      <body>
        ${content}
        <script>
          window.onload = function() {
            try {
              document.title = "";
            } catch (e) {}
            setTimeout(function() {
              window.focus();
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            }, 350);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
