import "./style.css";
import { createPlaqueWithMagnetPocket, loadPlaque } from "./plaque-loader.ts";
import { loadFont, generateTextGeometry, generateOvalRing } from "./text-generator.ts";
import type { TextSettings } from "./text-generator.ts";
import { PlaqueViewer } from "./viewer.ts";
import { exportModel } from "./exporter.ts";
import type { ExportFormat } from "./exporter.ts";
import { computeDimensionsFromGeometry, FONT_OPTIONS, MAGNET_OPTIONS } from "./plaque-config.ts";
import type { FontOptionId, MagnetSizeId } from "./plaque-config.ts";

const DEFAULT_TEXT_SETTINGS: TextSettings = {
  textDepth: 1,
  useOvalDeform: true,
};

const app = document.getElementById("app")!;
const viewportEl = document.getElementById("viewport")!;
const textInput = document.getElementById("text-input") as HTMLInputElement;
const submitBtn = document.getElementById("submit-btn")!;
const textInputEditor = document.getElementById("text-input-editor") as HTMLInputElement;
const magnetSelectEditor = document.getElementById("magnet-size-editor") as HTMLSelectElement;
const fontSelect = document.getElementById("font-select") as HTMLSelectElement;
const textDepthInput = document.getElementById("text-depth-input") as HTMLInputElement;
const ovalDeformCheckbox = document.getElementById("oval-deform-checkbox") as HTMLInputElement;
const exportBtn = document.getElementById("export-btn") as HTMLButtonElement;
const exportCaretBtn = document.getElementById("export-dropdown-btn") as HTMLButtonElement;
const exportMenu = document.getElementById("export-menu")!;
const errorEl = document.getElementById("error-msg")!;

let viewer: PlaqueViewer | null = null;
let currentText = "";
let exportFormat: ExportFormat = "stl";
let currentMagnetSizeId: MagnetSizeId = MAGNET_OPTIONS[0].id;
let currentFontId: FontOptionId = FONT_OPTIONS[0].id;
let currentTextSettings: TextSettings = { ...DEFAULT_TEXT_SETTINGS };
let sidebarTextUpdateTimer: number | null = null;

async function init() {
  try {
    populateMagnetSelect(magnetSelectEditor);
    populateFontSelect(fontSelect);
    magnetSelectEditor.value = currentMagnetSizeId;
    fontSelect.value = currentFontId;
    syncSettingsInputs(currentTextSettings);

    const basePlaqueGeo = await loadPlaque("empty.stl");

    computeDimensionsFromGeometry(basePlaqueGeo);

    const initialPlaqueGeo = createPlaqueWithMagnetPocket(basePlaqueGeo, currentMagnetSizeId);
    viewer = new PlaqueViewer(viewportEl, initialPlaqueGeo);
    viewer.setPlaque(initialPlaqueGeo);
    viewer.setOvalRing(generateOvalRing(currentTextSettings));

    const applyMagnetPocket = (magnetSizeId: MagnetSizeId) => {
      currentMagnetSizeId = magnetSizeId;
      magnetSelectEditor.value = magnetSizeId;
      const plaqueGeo = createPlaqueWithMagnetPocket(basePlaqueGeo, magnetSizeId);
      viewer!.setPlaque(plaqueGeo);
    };

    const renderCurrentPlaque = async () => {
      if (!currentText) {
        viewer!.setTextGeometry(null);
        viewer!.setOvalRing(currentTextSettings.useOvalDeform ? generateOvalRing(currentTextSettings) : null);
        exportBtn.disabled = true;
        exportCaretBtn.disabled = true;
        return;
      }

      const font = await loadFont(getFontUrl(currentFontId));
      const textGeo = generateTextGeometry(currentText, font, currentTextSettings);
      viewer!.setTextGeometry(textGeo);
      viewer!.setOvalRing(currentTextSettings.useOvalDeform ? generateOvalRing(currentTextSettings) : null);

      const hasText = viewer!.hasText();
      exportBtn.disabled = !hasText;
      exportCaretBtn.disabled = !hasText;
    };

    const updateTextSettings = () => {
      currentTextSettings = {
        textDepth: clampNumber(textDepthInput.value, DEFAULT_TEXT_SETTINGS.textDepth, 0.4, 4),
        useOvalDeform: ovalDeformCheckbox.checked,
      };
      syncSettingsInputs(currentTextSettings);
    };

    const openEditorWithText = async (text: string) => {
      if (!text) return;
      currentText = text;
      textInput.value = text;
      textInputEditor.value = text;
      updateTextSettings();
      app.classList.add("editor-mode");
      viewer!.ensureSized();
      await renderCurrentPlaque();
    };

    const applySidebarChanges = async () => {
      currentText = textInputEditor.value.trim();
      textInput.value = currentText;
      updateTextSettings();
      applyMagnetPocket(currentMagnetSizeId);
      await renderCurrentPlaque();
    };

    const queueSidebarTextRender = () => {
      if (sidebarTextUpdateTimer !== null) {
        window.clearTimeout(sidebarTextUpdateTimer);
      }

      sidebarTextUpdateTimer = window.setTimeout(async () => {
        sidebarTextUpdateTimer = null;
        await applySidebarChanges();
      }, 120);
    };

    const handleMagnetSelection = async (value: string) => {
      if (!isMagnetSizeId(value)) return;
      applyMagnetPocket(value);
      if (app.classList.contains("editor-mode")) {
        await renderCurrentPlaque();
      }
    };

    const handleFontSelection = async (value: string) => {
      if (!isFontOptionId(value)) return;
      currentFontId = value;
      if (app.classList.contains("editor-mode") && currentText) {
        await renderCurrentPlaque();
      }
    };

    textInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") await openEditorWithText(textInput.value.trim());
    });
    submitBtn.addEventListener("click", async () => {
      await openEditorWithText(textInput.value.trim());
    });

    textInputEditor.addEventListener("input", () => {
      if (!app.classList.contains("editor-mode")) return;
      queueSidebarTextRender();
    });
    textInputEditor.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (sidebarTextUpdateTimer !== null) {
          window.clearTimeout(sidebarTextUpdateTimer);
          sidebarTextUpdateTimer = null;
        }
        await applySidebarChanges();
      }
    });

    magnetSelectEditor.addEventListener("change", async (e) => {
      await handleMagnetSelection((e.target as HTMLSelectElement).value);
    });
    fontSelect.addEventListener("change", async (e) => {
      await handleFontSelection((e.target as HTMLSelectElement).value);
    });

    textDepthInput.addEventListener("input", async () => {
      updateTextSettings();
      if (app.classList.contains("editor-mode")) {
        await renderCurrentPlaque();
      }
    });

    ovalDeformCheckbox.addEventListener("change", async () => {
      updateTextSettings();
      if (app.classList.contains("editor-mode")) {
        await renderCurrentPlaque();
      }
    });

    exportBtn.addEventListener("click", () => {
      if (!viewer) return;
      const combined = viewer.getCombinedGeometry();
      if (combined) {
        exportModel(combined, currentText, exportFormat);
      }
    });

    exportCaretBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      exportMenu.classList.toggle("open");
    });

    exportMenu.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const format = target.dataset.format as ExportFormat | undefined;
      if (!format) return;
      exportFormat = format;
      exportBtn.textContent = `Download ${format.toUpperCase()}`;
      exportMenu.querySelectorAll("button").forEach((button) => button.classList.remove("active"));
      target.classList.add("active");
      exportMenu.classList.remove("open");
    });

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

function populateFontSelect(select: HTMLSelectElement) {
  select.replaceChildren(
    ...FONT_OPTIONS.map((option) => {
      const element = document.createElement("option");
      element.value = option.id;
      element.textContent = option.label;
      return element;
    }),
  );
}

function syncSettingsInputs(settings: TextSettings) {
  textDepthInput.value = `${settings.textDepth}`;
  ovalDeformCheckbox.checked = settings.useOvalDeform;
}

function isMagnetSizeId(value: string): value is MagnetSizeId {
  return MAGNET_OPTIONS.some((option) => option.id === value);
}

function isFontOptionId(value: string): value is FontOptionId {
  return FONT_OPTIONS.some((option) => option.id === value);
}

function getFontUrl(fontId: FontOptionId) {
  const option = FONT_OPTIONS.find((font) => font.id === fontId);
  if (!option) {
    throw new Error(`Unsupported font: ${fontId}`);
  }

  return option.url;
}

function clampNumber(value: string, fallback: number, min: number, max: number) {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
