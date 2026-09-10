import * as pdfjsLib from 'pdfjs-dist';

// Configure worker using CDN or bundled worker URL
try {
  if (typeof window !== 'undefined') {
    // Use unpkg or cdnjs corresponding to the installed version
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
} catch (e) {
  console.warn('PDF.js worker setup warning:', e);
}

export interface RenderedPdfPage {
  pageNumber: number;
  dataUrl: string; // JPEG base64 data URL
  width: number;
  height: number;
}

export interface PdfProcessingProgress {
  currentPage: number;
  totalPages: number;
  stage: 'reading' | 'rendering' | 'ocr' | 'completed' | 'error';
  message: string;
}

/**
 * Converts a PDF File into an array of rendered JPEG images (one per page).
 */
export async function renderPdfToPageImages(
  file: File,
  onProgress?: (progress: PdfProcessingProgress) => void,
  maxPages: number = 50
): Promise<RenderedPdfPage[]> {
  const arrayBuffer = await file.arrayBuffer();

  onProgress?.({
    currentPage: 0,
    totalPages: 0,
    stage: 'reading',
    message: `กำลังเปิดไฟล์ PDF: ${file.name}...`,
  });

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = Math.min(pdfDoc.numPages, maxPages);
  const renderedPages: RenderedPdfPage[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    onProgress?.({
      currentPage: pageNum,
      totalPages: numPages,
      stage: 'rendering',
      message: `กำลังแปลงหน้าเอกสาร ${pageNum} จาก ${numPages}...`,
    });

    const page = await pdfDoc.getPage(pageNum);
    
    // Scale 1.75 delivers crisp handwriting readability for Gemini OCR without excessive memory
    const viewport = page.getViewport({ scale: 1.75 });
    
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error(`Cannot get 2d context for page ${pageNum}`);
    }

    // White background in case PDF has transparent areas
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext: any = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    };

    await page.render(renderContext).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    renderedPages.push({
      pageNumber: pageNum,
      dataUrl,
      width: viewport.width,
      height: viewport.height,
    });
  }

  onProgress?.({
    currentPage: numPages,
    totalPages: numPages,
    stage: 'completed',
    message: `แปลงเอกสารสำเร็จทั้งหมด ${numPages} หน้า`,
  });

  return renderedPages;
}

/**
 * Helper to convert file to Base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}
