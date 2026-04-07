import './style.css';
import { loadPlaque } from './plaque-loader.ts';
import { loadFont, generateTextGeometry, generateOvalRing } from './text-generator.ts';
import { PlaqueViewer } from './viewer.ts';
import { exportSTL } from './exporter.ts';
import { computeDimensionsFromGeometry } from './plaque-config.ts';

const app = document.getElementById('app')!;
const viewportEl = document.getElementById('viewport')!;
const textInput = document.getElementById('text-input') as HTMLInputElement;
const submitBtn = document.getElementById('submit-btn')!;
const textInputEditor = document.getElementById('text-input-editor') as HTMLInputElement;
const submitBtnEditor = document.getElementById('submit-btn-editor')!;
const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
const errorEl = document.getElementById('error-msg')!;

let viewer: PlaqueViewer | null = null;
let currentText = '';

async function init() {
  try {
    const [plaqueGeo, font] = await Promise.all([
      loadPlaque('empty.stl'),
      loadFont('helvetiker_bold.typeface.json'),
    ]);

    // Compute all dimensions from the actual loaded STL
    computeDimensionsFromGeometry(plaqueGeo);

    viewer = new PlaqueViewer(viewportEl, plaqueGeo);
    viewer.setPlaque(plaqueGeo);

    // Pre-generate the oval ring (same for all text)
    const ovalRingGeo = generateOvalRing();
    viewer.setOvalRing(ovalRingGeo);

    const generatePlaque = (text: string) => {
      if (!text) return;
      currentText = text;

      textInput.value = text;
      textInputEditor.value = text;

      // Switch to editor mode — this makes the viewport visible
      app.classList.add('editor-mode');

      // Force the viewer to size itself now that the container is visible
      viewer!.ensureSized();

      const textGeo = generateTextGeometry(text, font);
      viewer!.setTextGeometry(textGeo);
      exportBtn.disabled = !viewer!.hasText();
    };

    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') generatePlaque(textInput.value.trim());
    });
    submitBtn.addEventListener('click', () => generatePlaque(textInput.value.trim()));

    textInputEditor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') generatePlaque(textInputEditor.value.trim());
    });
    submitBtnEditor.addEventListener('click', () => generatePlaque(textInputEditor.value.trim()));

    exportBtn.addEventListener('click', () => {
      if (!viewer) return;
      const combined = viewer.getCombinedGeometry();
      if (combined) {
        exportSTL(combined, currentText);
      }
    });
  } catch (err) {
    errorEl.textContent = `Failed to initialize: ${err}`;
    errorEl.style.display = 'block';
  }
}

init();
