import "./style.css";
import { createPlaqueWithMagnetPocket, loadPlaque } from "./plaque-loader.ts";
import { loadFont, generateTextGeometry, generateOvalRing } from "./text-generator.ts";
import { PlaqueViewer } from "./viewer.ts";
import { exportModel } from "./exporter.ts";
import type { ExportFormat } from "./exporter.ts";
import { computeDimensionsFromGeometry, MAGNET_OPTIONS } from "./plaque-config.ts";
import type { MagnetSizeId } from "./plaque-config.ts";

const app = document.getElementById("app")!;
const viewportEl = document.getElementById("viewport")!;
const textInput = document.getElementById("text-input") as HTMLInputElement;
const submitBtn = document.getElementById("submit-btn")!;
const textInputEditor = document.getElementById("text-input-editor") as HTMLInputElement;
const submitBtnEditor = document.getElementById("submit-btn-editor")!;
const magnetSelect = document.getElementById("magnet-size") as HTMLSelectElement;
const magnetSelectEditor = document.getElementById("magnet-size-editor") as HTMLSelectElement;
const exportBtn = document.getElementById("export-btn") as HTMLButtonElement;
const exportCaretBtn = document.getElementById("export-dropdown-btn") as HTMLButtonElement;
const exportMenu = document.getElementById("export-menu")!;
const errorEl = document.getElementById("error-msg")!;

let viewer: PlaqueViewer | null = null;
let currentText = "";
let exportFormat: ExportFormat = "stl";
let currentMagnetSizeId: MagnetSizeId = MAGNET_OPTIONS[0].id;

async function init() {
  try {
    populateMagnetSelect(magnetSelect);
    populateMagnetSelect(magnetSelectEditor);
    syncMagnetSelects(currentMagnetSizeId);

    const [basePlaqueGeo, font] = await Promise.all([
      loadPlaque("empty.stl"),
      loadFont("helvetiker_bold.typeface.json"),
    ]);

    // Compute all dimensions from the actual loaded STL
    computeDimensionsFromGeometry(basePlaqueGeo);

    const applyMagnetPocket = (magnetSizeId: MagnetSizeId) => {
      currentMagnetSizeId = magnetSizeId;
      syncMagnetSelects(magnetSizeId);
      const plaqueGeo = createPlaqueWithMagnetPocket(basePlaqueGeo, magnetSizeId);
      viewer!.setPlaque(plaqueGeo);
    };

    const initialPlaqueGeo = createPlaqueWithMagnetPocket(basePlaqueGeo, currentMagnetSizeId);
    viewer = new PlaqueViewer(viewportEl, initialPlaqueGeo);
    viewer.setPlaque(initialPlaqueGeo);

    // Pre-generate the oval ring (same for all text)
    const ovalRingGeo = generateOvalRing();
    viewer.setOvalRing(ovalRingGeo);

    const generatePlaque = (text: string) => {
      if (!text) return;
      currentText = text;

      textInput.value = text;
      textInputEditor.value = text;

      // Switch to editor mode — this makes the viewport visible
      app.classList.add("editor-mode");

      // Force the viewer to size itself now that the container is visible
      viewer!.ensureSized();

      const textGeo = generateTextGeometry(text, font);
      viewer!.setTextGeometry(textGeo);
      const hasText = viewer!.hasText();
      exportBtn.disabled = !hasText;
      exportCaretBtn.disabled = !hasText;
    };

    const handleMagnetSelection = (value: string) => {
      if (!isMagnetSizeId(value)) return;
      applyMagnetPocket(value);
    };

    textInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") generatePlaque(textInput.value.trim());
    });
    submitBtn.addEventListener("click", () => generatePlaque(textInput.value.trim()));

    textInputEditor.addEventListener("keydown", (e) => {
      if (e.key === "Enter") generatePlaque(textInputEditor.value.trim());
    });
    submitBtnEditor.addEventListener("click", () => generatePlaque(textInputEditor.value.trim()));
    magnetSelect.addEventListener("change", (e) => {
      handleMagnetSelection((e.target as HTMLSelectElement).value);
    });
    magnetSelectEditor.addEventListener("change", (e) => {
      handleMagnetSelection((e.target as HTMLSelectElement).value);
    });

    // Export button — downloads in current format
    exportBtn.addEventListener("click", () => {
      if (!viewer) return;
      const combined = viewer.getCombinedGeometry();
      if (combined) {
        exportModel(combined, currentText, exportFormat);
      }
    });

    // Dropdown caret — toggles format menu
    exportCaretBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      exportMenu.classList.toggle("open");
    });

    // Format selection from dropdown
    exportMenu.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const format = target.dataset.format as ExportFormat | undefined;
      if (!format) return;
      exportFormat = format;
      exportBtn.textContent = `Download ${format.toUpperCase()}`;
      exportMenu.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      target.classList.add("active");
      exportMenu.classList.remove("open");
    });

    // Close dropdown when clicking elsewhere
    document.addEventListener("click", () => {
      exportMenu.classList.remove("open");
    });
  } catch (err) {
    errorEl.textContent = `Failed to initialize: ${err}`;
    errorEl.style.display = "block";
  }
}

init();

function populateMagnetSelect(select: HTMLSelectElement) {
  select.replaceChildren(
    ...MAGNET_OPTIONS.map((option) => {
      const element = document.createElement("option");
      element.value = option.id;
      element.textContent = option.label;
      return element;
    }),
  );
}

function syncMagnetSelects(magnetSizeId: MagnetSizeId) {
  magnetSelect.value = magnetSizeId;
  magnetSelectEditor.value = magnetSizeId;
}

function isMagnetSizeId(value: string): value is MagnetSizeId {
  return MAGNET_OPTIONS.some((option) => option.id === value);
}
