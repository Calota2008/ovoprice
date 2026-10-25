// Run with: npx tsx tests/unit_voice.ts
import { cleanTranscript, recognitionLang, isVoiceSupported } from '../src/utils/voiceSearch';
let bad = 0;
const check = (n: string, ok: boolean) => { console.log((ok ? 'PASS ' : 'FAIL ') + n); if (!ok) bad++; };
check('language en', recognitionLang('en', 'DE') === 'en-GB');
check('language de + Germany', recognitionLang('de', 'DE') === 'de-DE');
check('language de + Austria', recognitionLang('de', 'AT') === 'de-AT');
check('language ro', recognitionLang('ro', 'AT') === 'ro-RO');
check('clean: spaces and trailing full stop', cleanTranscript('  Sony   WH-1000XM5. ') === 'Sony WH-1000XM5');
check('clean: keeps diacritics', cleanTranscript('Kaffeevollautomat für Küche') === 'Kaffeevollautomat für Küche');
check('clean: empty', cleanTranscript('  . ') === '');
check('unsupported without a browser', isVoiceSupported() === false);
process.exit(bad ? 1 : 0);
