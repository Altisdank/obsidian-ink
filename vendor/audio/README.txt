Obsidian Ink – ljudkonvertering / tredjepartsprogram

MP3-kodning använder LAME genom lamejs 1.2.1 av Alex Zhukov och bidragsgivare.
LAME: https://lame.sourceforge.io/
lamejs: https://github.com/zhuker/lamejs
Publicerat paket: https://registry.npmjs.org/lamejs/-/lamejs-1.2.1.tgz

lame.min.js och lame.all.js är oförändrade filer från npm-paketet lamejs 1.2.1.
Biblioteket är separat och kan ersättas. lame.all.js är den läsbara källkoden
till samma bibliotek. Licens: GNU Lesser General Public License version 3.
Se lamejs-LICENSE.txt, LGPL-3.0.txt och GPL-3.0.txt i denna katalog.

converter-audio.js och encoder-worker.js är Obsidian Inks egna kopplingskod.
Konverteringen körs lokalt i besökarens webbläsare. Inga ljudfiler laddas upp.

API:
audioOutputs(extension) => [{value, label}]
convertAudio(file, format, {onProgress, signal}) => {blob, filename, warnings}
onProgress(fraction, statusText): fraction 0–1, svensk statusText.

In: MP3, WAV/WAVE, M4A, AAC, OGG/OGA, FLAC när webbläsaren kan avkoda filen.
Ut: MP3 192 kbit/s eller WAV PCM 16 bit. Utljudet är 44,1 kHz, mono/stereo.
Högst 50 MB per indatafil och högst 10 minuter ljud. Metadata/omslag kopieras
inte. MP3 innebär förstörande komprimering. Avkodningens codec-stöd beror på
webbläsaren och enheten. Fler än två ljudkanaler avvisas tydligt.

Biblioteket laddas först när MP3-konvertering startas. En separat worker gör
att kodningen inte låser sidans gränssnitt och kan avbrytas direkt. Webbläsarens
inbyggda avkodning kan inte stoppas mitt i arbetet, men dess resultat ignoreras
om besökaren avbryter. Ingen fil sparas förrän besökaren hämtar resultatet.
