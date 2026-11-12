Obsidian Ink document converter

All file contents are processed in the visitor's browser. No document upload, remote conversion API, analytics event, or account is used by this module. Vendor scripts, fonts, PDF CMaps and worker files are served from this website and loaded only when needed.

Supported text conversions:
TXT / MD -> PDF, DOCX (MD can also become TXT)
DOCX -> PDF, TXT
PDF -> TXT, DOCX

These conversions extract/reflow text. Images, original page layout, advanced formatting and scanned-page OCR are not preserved. Markdown is treated as literal plain text. Password-protected files are not supported. Limit: 20 MB per input, 500,000 extracted characters, 250 PDF pages. DOCX archive size limits guard against unexpectedly large expanded files.

Versions bundled:
- Mammoth 1.13.0 (BSD-2-Clause)
- docx 9.15.3 (MIT)
- pdf-lib 1.17.1 (MIT)
- @pdf-lib/fontkit 1.1.1 (MIT)
- PDF.js / pdfjs-dist 6.5.438 (Apache-2.0; legacy build includes browser compatibility polyfills)
- Lora font from the existing licensed website font assets (SIL Open Font License; see Lora-OFL.txt). Lora-Regular.ttf is the original variable font used at its default regular weight.

Full library dependency notices: THIRD-PARTY-LICENSES.txt
Additional PDF CMap and standard-font licenses are retained inside their respective subdirectories. Original PDF.js license notices are retained in its JavaScript files.

Source/rebuild recipe: ../../build-src/documents/
The browser entry module is ../../converter-documents.js.

Supplementary upstream notices retained: fontkit-LICENSE.txt (https://github.com/foliojs/fontkit/blob/master/LICENSE) and core-js-LICENSE.txt (https://github.com/zloirock/core-js/blob/v3.51.0/LICENSE).
