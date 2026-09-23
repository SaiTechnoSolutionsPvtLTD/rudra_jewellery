/**
 * Universal Print Helper for Rudra ERP
 * Guarantees 1:1 exact visual parity between report Preview, Print, and Save as PDF
 * preserving colors, headers, KPI cards, tables, logos, and layout structures.
 */
export const printElement = (elementId, documentTitle = 'Document') => {
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

  // Open clean isolated print window
  const printWindow = window.open('', '_blank', 'width=1100,height=900');

  if (!printWindow) {
    // Fallback if popup is blocked
    window.print();
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <base href="${baseUrl}">
        <title>${documentTitle}</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        ${styles}
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          *, *::before, *::after, body, div, table, tr, th, td, span, strong, header, footer, [class*="bg-"], [class*="border-"], [class*="text-"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          @media print {
            *, *::before, *::after, body, div, table, tr, th, td, span, strong, header, footer, [class*="bg-"], [class*="border-"], [class*="text-"] {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 8px !important;
            width: 100% !important;
            height: auto !important;
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
          /* Retain exact header background colors & card backgrounds */
          thead, thead tr, thead th, .bg-\\[\\#b01622\\], [style*="background-color: #b01622"] {
            background-color: #b01622 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bg-stone-50 {
            background-color: #f9fafb !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bg-emerald-50\\/70, .bg-emerald-50 {
            background-color: #ecfdf5 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bg-red-50 {
            background-color: #fef2f2 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
      </head>
      <body>
        ${content}
        <script>
          window.onload = function() {
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
