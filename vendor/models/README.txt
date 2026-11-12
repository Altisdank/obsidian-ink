Obsidian Ink – lokal 3D-konvertering

STL (ASCII/binär), 3MF och OBJ kan konverteras till binär STL, 3MF eller OBJ.
Konverteringen arbetar med triangelytor. Alla resultat använder millimeter.
STL/OBJ saknar säker måttenhet; koordinaterna antas därför vara millimeter.
3MF Core-enheter, byggplaceringar och nästlade komponenttransformationer
bevaras genom omräkning till millimeter. Spegling korrigerar ytriktningen.
Interna modelldelar med Production-path stöds. Externa URL:er öppnas aldrig.
Okända obligatoriska utökningar, kryptering, ZIP64, CAD-ytor och OBJ-polygoner
som inte är plana avvisas tydligt. Bilder, färger, material och slicerdata
följer inte med. Inget automatiskt reparations- eller booleansteg görs.

Gränser: 25 MB indata, 80 MB uppackat ZIP, 500 000 trianglar efter placering,
1 500 000 källhörn, 64 referensnivåer. Paketens CRC kontrolleras.

Tredjepartsbibliotek, oförändrade lokala filer från officiella npm-paket:

fflate 0.8.3 av Arjun Barrett – MIT.
https://github.com/101arrowz/fflate
https://registry.npmjs.org/fflate/-/fflate-0.8.3.tgz
Filen fflate.js kommer från esm/browser.js. Se fflate-LICENSE.txt.

Earcut 3.2.4 av Mapbox och bidragsgivare – ISC.
https://github.com/mapbox/earcut
https://registry.npmjs.org/earcut/-/earcut-3.2.4.tgz
Filen earcut.js kommer från src/earcut.js. Se earcut-LICENSE.txt.

Formatdefinitioner:
https://github.com/3MFConsortium/spec_core
https://github.com/3MFConsortium/spec_production

API: modelOutputs(extension); convertModel(file, format, {onProgress, signal}).
onProgress(fraction0to1, svenskText). Resultat: blob, filename, warnings,
dimensions och details {triangles, sizeMm, bounds, unit}.
All bearbetning är lokal i webbläsaren och filer laddas inte upp.
