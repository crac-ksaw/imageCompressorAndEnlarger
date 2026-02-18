const fileInput = document.getElementById("fileInput");
const browseBtn = document.getElementById("browseBtn");
const dropZone = document.getElementById("dropZone");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const originalPreview = document.getElementById("originalPreview");
const processedPreview = document.getElementById("processedPreview");
const originalSizeLabel = document.getElementById("originalSizeLabel");
const processedSizeLabel = document.getElementById("processedSizeLabel");
const deltaLabel = document.getElementById("deltaLabel");
const processBtn = document.getElementById("processBtn");
const downloadBtn = document.getElementById("downloadBtn");
const statusMessage = document.getElementById("statusMessage");
const compressTargetSizeInput = document.getElementById("compressTargetSize");
const compressTargetUnit = document.getElementById("compressTargetUnit");
const outputFormat = document.getElementById("outputFormat");
const pdfImageInput = document.getElementById("pdfImageInput");
const imageToPdfBtn = document.getElementById("imageToPdfBtn");
const imageToPdfStatus = document.getElementById("imageToPdfStatus");
const pdfInput = document.getElementById("pdfInput");
const pdfToImagesBtn = document.getElementById("pdfToImagesBtn");
const pdfToImagesStatus = document.getElementById("pdfToImagesStatus");
const pdfThumbs = document.getElementById("pdfThumbs");
const targetSizeInput = document.getElementById("targetSize");
const targetUnit = document.getElementById("targetUnit");
const compressControls = document.getElementById("compressControls");
const enlargeControls = document.getElementById("enlargeControls");
const modeTabs = document.querySelectorAll(".tab");

const state = {
  file: null,
  originalUrl: "",
  processedUrl: "",
  processedBlob: null,
  processedExtension: "",
  mode: "compress",
};

const textEncoder = new TextEncoder();
const placeholderSrc =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="520" height="320" viewBox="0 0 520 320"><rect width="520" height="320" rx="18" fill="#f6f2ed"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9c927f" font-family="Space Grotesk, sans-serif" font-size="18">No preview yet</text></svg>'
  );

const PDFJS_CDNS = [
  "vendor/pdf.min.js",
  "https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js",
];
const PDFJS_WORKER_CDNS = [
  "vendor/pdf.worker.min.js",
  "https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js",
];

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve(src);
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });

const ensurePdfJs = async () => {
  if (window.pdfjsLib && window.pdfjsLib.getDocument) {
    return true;
  }
  let loaded = false;
  let loadedSrc = "";
  for (const src of PDFJS_CDNS) {
    try {
      await loadScript(src);
      if (window.pdfjsLib && window.pdfjsLib.getDocument) {
        loaded = true;
        loadedSrc = src;
        break;
      }
    } catch (err) {
      // try next CDN
    }
  }
  if (loaded) {
    let workerSrc = PDFJS_WORKER_CDNS[0];
    if (loadedSrc.includes("cdnjs")) {
      workerSrc = PDFJS_WORKER_CDNS.find((src) => src.includes("cdnjs"));
    } else if (loadedSrc.includes("unpkg")) {
      workerSrc = PDFJS_WORKER_CDNS.find((src) => src.includes("unpkg"));
    }
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      workerSrc || PDFJS_WORKER_CDNS[0];
  }
  return loaded;
};

const getOutputConfig = (file) => {
  const choice = outputFormat.value;
  if (choice === "original") {
    const type = getMimeType(file);
    const ext = file.name.split(".").pop() || "image";
    return { type, ext, isOriginal: true };
  }
  if (choice === "jpg")
    return { type: "image/jpeg", ext: "jpg", isOriginal: false };
  if (choice === "png")
    return { type: "image/png", ext: "png", isOriginal: false };
  if (choice === "webp")
    return { type: "image/webp", ext: "webp", isOriginal: false };
  return { type: "application/pdf", ext: "pdf", isOriginal: false };
};

const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value < 10 && index > 0 ? 2 : 1)} ${units[index]}`;
};

const setStatus = (message, isError = false) => {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? "#b83b25" : "#606c80";
  statusMessage.style.background = isError ? "#ffe8e3" : "#fff3e7";
};

const resetOutput = () => {
  processedPreview.src = placeholderSrc;
  processedSizeLabel.textContent = "0 KB";
  deltaLabel.textContent = "Waiting for file";
  downloadBtn.disabled = true;
  state.processedBlob = null;
  state.processedExtension = "";
  if (state.processedUrl) URL.revokeObjectURL(state.processedUrl);
  state.processedUrl = "";
};

const setMode = (mode) => {
  state.mode = mode;
  modeTabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.mode === mode);
  });
  compressControls.classList.toggle("hidden", mode !== "compress");
  enlargeControls.classList.toggle("hidden", mode !== "enlarge");
  resetOutput();
  setStatus(
    mode === "compress"
      ? "Adjust compression level, then process."
      : "Set a target size to safely pad the file."
  );
};

const updateFileMeta = (file) => {
  fileName.textContent = file ? file.name : "No file selected";
  fileSize.textContent = file ? formatBytes(file.size) : "0 KB";
  originalSizeLabel.textContent = file ? formatBytes(file.size) : "0 KB";
};

const loadPreview = (file) => {
  if (state.originalUrl) URL.revokeObjectURL(state.originalUrl);
  state.originalUrl = URL.createObjectURL(file);
  originalPreview.src = state.originalUrl;
};

const ensureImageElement = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load image"));
    img.src = src;
  });

const getMimeType = (file) => {
  if (file.type) return file.type;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
};

const reencodeImage = async (file, quality, outputType = "") => {
  const src = URL.createObjectURL(file);
  try {
    const img = await ensureImageElement(src);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { alpha: true });
    ctx.drawImage(img, 0, 0);

    const type = outputType || getMimeType(file);
    const blob = await new Promise((resolve) => {
      if (type === "image/png") {
        canvas.toBlob((b) => resolve(b), "image/png");
        return;
      }
      canvas.toBlob((b) => resolve(b), type, quality);
    });
    return blob;
  } finally {
    URL.revokeObjectURL(src);
  }
};

const buildPdfFromJpeg = (jpegBytes, width, height) => {
  const chunks = [];
  const offsets = [];
  let offset = 0;

  const addBytes = (bytes) => {
    chunks.push(bytes);
    offset += bytes.length;
  };

  const addStr = (str) => {
    addBytes(textEncoder.encode(str));
  };

  addStr("%PDF-1.4\n");

  offsets[1] = offset;
  addStr("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  offsets[2] = offset;
  addStr("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  offsets[3] = offset;
  addStr(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );

  offsets[4] = offset;
  addStr(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  addBytes(jpegBytes);
  addStr("\nendstream\nendobj\n");

  const content = `q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`;
  const contentBytes = textEncoder.encode(content);
  offsets[5] = offset;
  addStr(`5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
  addBytes(contentBytes);
  addStr("\nendstream\nendobj\n");

  const xrefOffset = offset;
  addStr("xref\n0 6\n0000000000 65535 f \n");
  for (let i = 1; i <= 5; i += 1) {
    const entry = String(offsets[i] || 0).padStart(10, "0");
    addStr(`${entry} 00000 n \n`);
  }
  addStr(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const pdfBytes = new Uint8Array(total);
  let pointer = 0;
  chunks.forEach((chunk) => {
    pdfBytes.set(chunk, pointer);
    pointer += chunk.length;
  });
  return new Blob([pdfBytes], { type: "application/pdf" });
};

const convertToPdf = async (file, quality) => {
  const src = URL.createObjectURL(file);
  try {
    const img = await ensureImageElement(src);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.drawImage(img, 0, 0);
    const jpegBlob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
    });
    const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
    return buildPdfFromJpeg(jpegBytes, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(src);
  }
};

const createOutputBlob = async (file, quality, outputType) => {
  if (outputType === "application/pdf") {
    return convertToPdf(file, quality);
  }
  return reencodeImage(file, quality, outputType);
};

const renderPdfToImages = async (file) => {
  const ready = await ensurePdfJs();
  if (!ready) {
    throw new Error(
      "PDF engine failed to load. Check your internet connection and retry."
    );
  }
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await window.pdfjsLib.getDocument({ data }).promise;
  const pages = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    );
    pages.push({ pageNum, blob });
  }
  return pages;
};

const compressToTargetSize = async (file, targetBytes, outputType) => {
  const type = outputType || getMimeType(file);
  if (type === "image/png") {
    const lossless = await reencodeImage(file, 1, "image/png");
    return lossless || file;
  }
  let low = 0.05;
  let high = 0.98;
  let bestUnder = null;
  let bestAny = null;
  for (let i = 0; i < 10; i += 1) {
    const mid = (low + high) / 2;
    const blob = await createOutputBlob(file, mid, type);
    if (!blob) break;
    if (!bestAny || blob.size < bestAny.size) {
      bestAny = blob;
    }
    if (blob.size > targetBytes) {
      high = mid;
    } else {
      bestUnder = blob;
      low = mid;
    }
  }
  return bestUnder || bestAny || file;
};

const padBlobToSize = async (blob, targetBytes) => {
  const buffer = await blob.arrayBuffer();
  if (buffer.byteLength >= targetBytes) return blob;
  const paddingNeeded = targetBytes - buffer.byteLength;
  const padded = new Uint8Array(targetBytes);
  padded.set(new Uint8Array(buffer), 0);
  const marker = textEncoder.encode("\nPixelPad metadata padding\n");
  const markerStart = buffer.byteLength;
  for (let i = 0; i < Math.min(marker.length, paddingNeeded); i += 1) {
    padded[markerStart + i] = marker[i];
  }
  return new Blob([padded], { type: blob.type || "application/octet-stream" });
};

const updateOutput = (blob, extension) => {
  if (state.processedUrl) URL.revokeObjectURL(state.processedUrl);
  state.processedUrl = URL.createObjectURL(blob);
  state.processedBlob = blob;
  state.processedExtension = extension || "";
  if (extension === "pdf") {
    if (state.originalUrl) {
      processedPreview.src = state.originalUrl;
    } else {
      processedPreview.src = placeholderSrc;
    }
  } else {
    processedPreview.src = state.processedUrl;
  }
  processedSizeLabel.textContent = formatBytes(blob.size);
  const diff = blob.size - (state.file ? state.file.size : 0);
  const diffLabel =
    diff === 0
      ? "No size change"
      : diff > 0
      ? `+${formatBytes(diff)} increase`
      : `${formatBytes(Math.abs(diff))} smaller`;
  deltaLabel.textContent = diffLabel;
  downloadBtn.disabled = false;
};

const handleFile = (file) => {
  if (!file) return;
  const type = getMimeType(file);
  if (
    !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(type)
  ) {
    setStatus("Please upload a JPG, PNG, WEBP, or PDF file.", true);
    return;
  }
  state.file = file;
  updateFileMeta(file);
  resetOutput();
  if (type === "application/pdf") {
    if (state.originalUrl) URL.revokeObjectURL(state.originalUrl);
    state.originalUrl = "";
    originalPreview.src = placeholderSrc;
    processedPreview.src = placeholderSrc;
  } else {
    loadPreview(file);
    processedPreview.src = state.originalUrl;
    processedSizeLabel.textContent = formatBytes(file.size);
    deltaLabel.textContent = "No changes yet";
  }
  if (type === "application/pdf") {
    setStatus(
      "PDF loaded. You can enlarge via safe padding. Compression is limited without re-rendering.",
      false
    );
  } else {
    setStatus("Ready to process. All changes stay in your browser.");
  }
};

fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  handleFile(file);
});

browseBtn.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("is-dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("is-dragover");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("is-dragover");
  const [file] = event.dataTransfer.files;
  handleFile(file);
});

modeTabs.forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

outputFormat.addEventListener("change", () => {
  resetOutput();
  setStatus("Output format updated. Process to apply changes.");
});

imageToPdfBtn.addEventListener("click", async () => {
  const [file] = pdfImageInput.files;
  if (!file) {
    imageToPdfStatus.textContent = "Select an image first.";
    return;
  }
  imageToPdfBtn.disabled = true;
  imageToPdfStatus.textContent = "Building PDF...";
  try {
    const ready = await ensurePdfJs();
    if (!ready) {
      throw new Error(
        "PDF engine failed to load. Check your internet connection and retry."
      );
    }
    const pdfBlob = await convertToPdf(file, 0.98);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(pdfBlob);
    link.download = `pixelpad-${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    imageToPdfStatus.textContent = "PDF created and downloaded.";
  } catch (err) {
    imageToPdfStatus.textContent = err.message || "PDF conversion failed.";
  } finally {
    imageToPdfBtn.disabled = false;
  }
});

pdfToImagesBtn.addEventListener("click", async () => {
  const [file] = pdfInput.files;
  if (!file) {
    pdfToImagesStatus.textContent = "Select a PDF first.";
    return;
  }
  pdfToImagesBtn.disabled = true;
  pdfToImagesStatus.textContent = "Rendering pages...";
  pdfThumbs.innerHTML = "";
  try {
    const pages = await renderPdfToImages(file);
    if (!pages.length) {
      pdfToImagesStatus.textContent = "No pages found.";
      return;
    }
    pages.forEach((page) => {
      const card = document.createElement("div");
      card.className = "pdf-thumb";
      const img = document.createElement("img");
      const url = URL.createObjectURL(page.blob);
      img.src = url;
      img.alt = `Page ${page.pageNum}`;
      const label = document.createElement("div");
      label.textContent = `Page ${page.pageNum}`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn--ghost";
      btn.textContent = "Download PNG";
      btn.addEventListener("click", () => {
        const link = document.createElement("a");
        link.href = url;
        link.download = `pixelpad-page-${page.pageNum}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
      card.appendChild(img);
      card.appendChild(label);
      card.appendChild(btn);
      pdfThumbs.appendChild(card);
    });
    pdfToImagesStatus.textContent = `${pages.length} page(s) rendered.`;
  } catch (err) {
    pdfToImagesStatus.textContent = err.message || "PDF rendering failed.";
  } finally {
    pdfToImagesBtn.disabled = false;
  }
});

processBtn.addEventListener("click", async () => {
  if (!state.file) {
    setStatus("Upload an image first.", true);
    return;
  }
  processBtn.disabled = true;
  setStatus("Processing locally...");
  try {
    const output = getOutputConfig(state.file);
    if (
      getMimeType(state.file) === "application/pdf" &&
      output.type !== "application/pdf" &&
      !output.isOriginal
    ) {
      throw new Error("PDF conversion to images isn't available in this build.");
    }
    if (state.mode === "compress") {
      if (getMimeType(state.file) === "application/pdf") {
        throw new Error(
          "PDF compression isn't available in-browser without re-rendering. Use Enlarge Size to pad."
        );
      }
      let blob = null;
      const targetValue = Number(compressTargetSizeInput.value);
      if (!Number.isFinite(targetValue) || targetValue <= 0) {
        throw new Error("Enter a valid target size.");
      }
      const unit = compressTargetUnit.value;
      const targetBytes =
        unit === "MB" ? targetValue * 1024 * 1024 : targetValue * 1024;
      if (targetBytes >= state.file.size) {
        blob = output.isOriginal
          ? state.file
          : await createOutputBlob(state.file, 0.98, output.type);
      } else {
        blob = await compressToTargetSize(state.file, targetBytes, output.type);
      }
      if (!blob) throw new Error("Compression failed.");
      updateOutput(blob, output.ext);
      if (blob.size === state.file.size) {
        setStatus(
          "Compression kept the original size. Enter a smaller target or try a JPEG/WEBP file."
        );
      } else if (blob.size > targetBytes) {
        setStatus(
          "Reached the smallest safe size, but the target is too small for this image.",
          true
        );
      } else {
        setStatus("Compression complete with visual parity preserved.");
      }
    } else {
      const targetValue = Number(targetSizeInput.value);
      if (!Number.isFinite(targetValue) || targetValue <= 0) {
        throw new Error("Enter a valid target size.");
      }
      const unit = targetUnit.value;
      const targetBytes =
        unit === "MB" ? targetValue * 1024 * 1024 : targetValue * 1024;
      let baseBlob = null;
      if (getMimeType(state.file) === "application/pdf") {
        baseBlob = state.file;
      } else {
        baseBlob = await createOutputBlob(state.file, 0.98, output.type);
      }
      if (targetBytes <= baseBlob.size) {
        updateOutput(baseBlob, output.ext);
        setStatus(
          "Target size is smaller than or equal to the current file. Increase the target for padding."
        );
      } else {
        const padded = await padBlobToSize(baseBlob, Math.round(targetBytes));
        updateOutput(padded, output.ext);
        setStatus("Enlarged safely using metadata padding. Pixels unchanged.");
      }
    }
  } catch (err) {
    setStatus(err.message || "Something went wrong.", true);
  } finally {
    processBtn.disabled = false;
  }
});

downloadBtn.addEventListener("click", () => {
  if (!state.processedBlob) return;
  const link = document.createElement("a");
  const extension =
    state.processedExtension ||
    (state.file ? state.file.name.split(".").pop() : "image");
  const outputName = `pixelpad-${Date.now()}.${extension}`;
  link.href = state.processedUrl;
  link.download = outputName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

originalPreview.addEventListener("error", () => {
  setStatus("Unable to preview that file.", true);
});

setMode("compress");
originalPreview.src = placeholderSrc;
processedPreview.src = placeholderSrc;
