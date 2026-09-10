import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  UploadCloud,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Save,
  Trash2,
  Plus,
  Layers,
  Sparkles,
  Eye,
  CheckSquare,
  Square,
  FileCheck,
  Calendar,
  User,
  Hash,
  Stethoscope,
  CreditCard,
  Banknote,
  Activity,
} from 'lucide-react';
import {
  DentureRecord,
  DOCTORS_LIST,
  COVERAGE_CATEGORIES,
  resolveCoverage,
  normalizeDoctorName,
} from '../types';
import { renderPdfToPageImages, RenderedPdfPage, PdfProcessingProgress } from '../lib/pdfHelper';

interface PdfBatchUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchSaved: (savedCount: number) => void;
  onSaveRecord: (record: Partial<DentureRecord>) => Promise<void>;
}

interface PageBatchItem {
  pageNumber: number;
  fileName: string;
  dataUrl: string;
  included: boolean;
  status: 'pending' | 'processing' | 'success' | 'error';
  errorMessage?: string;
  records: Partial<DentureRecord>[];
}

export const PdfBatchUploadModal: React.FC<PdfBatchUploadModalProps> = ({
  isOpen,
  onClose,
  onBatchSaved,
  onSaveRecord,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<PdfProcessingProgress | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'review'>('upload');

  // Multi-page batch items
  const [batchItems, setBatchItems] = useState<PageBatchItem[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  // Zoom & Image Viewer state
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when opened/closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setIsProcessing(false);
      setProgress(null);
      setCurrentStep('upload');
      setBatchItems([]);
      setActivePageIndex(0);
      setZoomLevel(1);
      setRotation(0);
      setIsSaving(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        startProcessingPdf(file);
      } else {
        alert('กรุณาเลือกไฟล์เอกสารนามสกุล .pdf');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        startProcessingPdf(file);
      } else {
        alert('กรุณาเลือกไฟล์เอกสารนามสกุล .pdf');
      }
    }
  };

  // Process the selected PDF file
  const startProcessingPdf = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);
    setCurrentStep('processing');
    setProgress({
      currentPage: 0,
      totalPages: 0,
      stage: 'reading',
      message: `กำลังเปิดและแยกหน้าเอกสาร PDF: ${file.name}...`,
    });

    try {
      // 1. Render PDF pages to high-res JPEG images
      const renderedPages = await renderPdfToPageImages(file, (p) => {
        setProgress(p);
      });

      if (renderedPages.length === 0) {
        throw new Error('ไม่พบหน้าเอกสารในไฟล์ PDF นี้');
      }

      // Initialize batch items
      const initialItems: PageBatchItem[] = renderedPages.map((page) => ({
        pageNumber: page.pageNumber,
        fileName: file.name,
        dataUrl: page.dataUrl,
        included: true,
        status: 'pending',
        records: [],
      }));

      setBatchItems(initialItems);

      // 2. Perform OCR on each page sequentially with live updates
      const updatedItems = [...initialItems];

      for (let i = 0; i < renderedPages.length; i++) {
        const page = renderedPages[i];
        updatedItems[i].status = 'processing';
        setBatchItems([...updatedItems]);

        setProgress({
          currentPage: i + 1,
          totalPages: renderedPages.length,
          stage: 'ocr',
          message: `กำลังวิเคราะห์ข้อมูลด้วย AI Gemini (หน้า ${i + 1} จาก ${renderedPages.length})...`,
        });

        try {
          // Call /api/ocr for this page image
          const res = await fetch('/api/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: page.dataUrl,
              mimeType: 'image/jpeg',
            }),
          });

          if (!res.ok) {
            throw new Error(`เซิร์ฟเวอร์ตอบกลับรหัส ${res.status}`);
          }

          const resData = await res.json();
          const parsedData = resData.data || {};
          const pageRecords = Array.isArray(parsedData.records) && parsedData.records.length > 0
            ? parsedData.records
            : [
                // Fallback blank record if OCR found no patients on this page
                {
                  hn: '',
                  patientName: `ผู้ป่วย หน้าที่ ${page.pageNumber}`,
                  date: new Date().toISOString().split('T')[0],
                  doctor: 'กนกวรรณ',
                  dentureType: 'CD',
                  denturePosition: 'บนและล่าง',
                  coverage: '30 บาท',
                  coverageGroup: 'UC',
                  labCost: 0,
                  treatmentFee: 0,
                  status: 'เสร็จสิ้น (Completed)',
                  note: parsedData.rawSummary || 'เอกสารจาก PDF',
                },
              ];

          // Normalize each record from OCR
          const normalizedRecords: Partial<DentureRecord>[] = pageRecords.map(
            (r: any, rIdx: number) => {
              const resCov = resolveCoverage(r.coverage || r.coverageGroup);
              const cleanDoctor = normalizeDoctorName(r.doctor);
              return {
                id: `pdf-${Date.now()}-${page.pageNumber}-${rIdx}`,
                hn: r.hn ? String(r.hn).trim() : '',
                patientName: r.patientName ? String(r.patientName).trim() : '',
                age: r.age ? String(r.age) : '',
                gender: r.gender || 'ไม่ระบุ',
                date: r.date || new Date().toISOString().split('T')[0],
                doctor: cleanDoctor,
                dentureType: r.dentureType || 'CD',
                denturePosition: r.denturePosition || 'บนและล่าง',
                coverageGroup: resCov.group,
                coverage: resCov.subItem,
                labCost: Number(r.labCost) || 0,
                treatmentFee: Number(r.treatmentFee) || (Number(r.labCost) ? Number(r.labCost) * 2 : 4000),
                diagnosis: r.diagnosis || 'K081 Loss of teeth due to accident, extraction or local periodontal disease',
                status: 'เสร็จสิ้น (Completed)',
                note: r.note || parsedData.rawSummary || `สแกนจาก PDF ${file.name} หน้า ${page.pageNumber}`,
                source: `PDF Multi-Page (${file.name} p.${page.pageNumber})`,
                createdAt: new Date().toISOString(),
              };
            }
          );

          updatedItems[i].records = normalizedRecords;
          updatedItems[i].status = 'success';
        } catch (err: any) {
          console.warn(`OCR error on page ${page.pageNumber}:`, err);
          updatedItems[i].status = 'error';
          updatedItems[i].errorMessage = err?.message || 'ไม่สามารถวิเคราะห์หน้านี้ได้';
          // Create default editable record so user can still enter details manually
          updatedItems[i].records = [
            {
              id: `pdf-${Date.now()}-${page.pageNumber}-0`,
              hn: '',
              patientName: '',
              date: new Date().toISOString().split('T')[0],
              doctor: 'กนกวรรณ',
              dentureType: 'CD',
              denturePosition: 'บนและล่าง',
              coverageGroup: 'UC',
              coverage: '30 บาท',
              labCost: 0,
              treatmentFee: 0,
              status: 'เสร็จสิ้น (Completed)',
              note: `หน้า ${page.pageNumber} จาก PDF`,
              source: `PDF Multi-Page (${file.name} p.${page.pageNumber})`,
              createdAt: new Date().toISOString(),
            },
          ];
        }

        setBatchItems([...updatedItems]);
      }

      // Completed processing! Transition to review step
      setIsProcessing(false);
      setCurrentStep('review');
      setActivePageIndex(0);
      setZoomLevel(1);
      setRotation(0);
    } catch (err: any) {
      console.error('Fatal PDF processing error:', err);
      alert(`เกิดข้อผิดพลาดในการประมวลผล PDF: ${err?.message || 'ไม่สามารถอ่านไฟล์ได้'}`);
      setIsProcessing(false);
      setCurrentStep('upload');
    }
  };

  // Helper to update field in current active page's record
  const updateCurrentRecord = (recordIndex: number, field: keyof DentureRecord, value: any) => {
    setBatchItems((prev) => {
      const next = [...prev];
      const pageItem = { ...next[activePageIndex] };
      const records = [...pageItem.records];
      if (records[recordIndex]) {
        records[recordIndex] = {
          ...records[recordIndex],
          [field]: value,
        };

        // If coverageGroup or coverage changes, resolve properly
        if (field === 'coverageGroup') {
          const cat = COVERAGE_CATEGORIES.find((c) => c.name === value);
          if (cat && cat.items.length > 0) {
            records[recordIndex].coverage = cat.items[0];
          }
        }
      }
      pageItem.records = records;
      next[activePageIndex] = pageItem;
      return next;
    });
  };

  // Toggle inclusion of current page
  const togglePageInclusion = (pageIdx: number) => {
    setBatchItems((prev) => {
      const next = [...prev];
      next[pageIdx] = {
        ...next[pageIdx],
        included: !next[pageIdx].included,
      };
      return next;
    });
  };

  // Add another patient record to the current page
  const addRecordToCurrentPage = () => {
    setBatchItems((prev) => {
      const next = [...prev];
      const pageItem = { ...next[activePageIndex] };
      const currentDoc = pageItem.records[0]?.doctor || 'กนกวรรณ';
      const currentDate = pageItem.records[0]?.date || new Date().toISOString().split('T')[0];
      const newRec: Partial<DentureRecord> = {
        id: `pdf-${Date.now()}-${pageItem.pageNumber}-${pageItem.records.length}`,
        hn: '',
        patientName: '',
        date: currentDate,
        doctor: currentDoc,
        dentureType: 'CD',
        denturePosition: 'ล่าง',
        coverageGroup: 'UC',
        coverage: '30 บาท',
        labCost: 0,
        treatmentFee: 0,
        status: 'เสร็จสิ้น (Completed)',
        note: `เคสเพิ่มเติม หน้าที่ ${pageItem.pageNumber}`,
        source: `PDF Multi-Page (${selectedFile?.name || ''} p.${pageItem.pageNumber})`,
        createdAt: new Date().toISOString(),
      };
      pageItem.records = [...pageItem.records, newRec];
      next[activePageIndex] = pageItem;
      return next;
    });
  };

  // Remove a record from the current page
  const removeRecordFromCurrentPage = (recordIdx: number) => {
    setBatchItems((prev) => {
      const next = [...prev];
      const pageItem = { ...next[activePageIndex] };
      if (pageItem.records.length > 1) {
        pageItem.records = pageItem.records.filter((_, idx) => idx !== recordIdx);
        next[activePageIndex] = pageItem;
      }
      return next;
    });
  };

  // Count total records ready for batch saving
  const includedPages = batchItems.filter((item) => item.included);
  const totalRecordsToSave = includedPages.reduce(
    (count, item) => count + item.records.filter((r) => r.patientName || r.hn).length,
    0
  );

  // Execute Batch Save to Database / Firestore
  const handleSaveAllRecords = async () => {
    if (totalRecordsToSave === 0) {
      alert('ยังไม่มีข้อมูลผู้ป่วยที่เลือกสำหรับบันทึก กรุณาตรวจสอบหรือใส่ชื่อผู้ป่วยอย่างน้อย 1 รายการ');
      return;
    }

    setIsSaving(true);
    let savedCount = 0;

    try {
      for (const item of batchItems) {
        if (!item.included) continue;

        for (const rec of item.records) {
          // Only save records that have patientName or HN
          if (rec.patientName?.trim() || rec.hn?.trim()) {
            const cleanDoc = normalizeDoctorName(rec.doctor);
            const covRes = resolveCoverage(rec.coverage || rec.coverageGroup);

            const completeRecord: Partial<DentureRecord> = {
              ...rec,
              doctor: cleanDoc,
              coverageGroup: covRes.group,
              coverage: covRes.subItem,
              treatmentFee: Number(rec.treatmentFee) || (Number(rec.labCost) || 0),
              labCost: Number(rec.labCost) || 0,
              updatedAt: new Date().toISOString(),
            };

            await onSaveRecord(completeRecord);
            savedCount++;
          }
        }
      }

      onBatchSaved(savedCount);
      onClose();
    } catch (err: any) {
      console.error('Error during batch saving:', err);
      alert(`บันทึกข้อมูลไม่สำเร็จบางส่วน: ${err?.message || 'ข้อผิดพลาดเครือข่าย'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const activeItem = batchItems[activePageIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-7xl h-[92vh] max-h-[900px] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  อัปโหลด PDF เวชระเบียน (หลายหน้า / รวมผู้ป่วยหลายคน)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40">
                  AI Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                โรงพยาบาลพยุหะคีรี • สแกนจากเครื่องถ่ายเอกสาร แปลงหน้าและสกัดข้อมูลคนไข้ทุกหน้าอัตโนมัติ
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {currentStep === 'review' && (
              <button
                onClick={() => setCurrentStep('upload')}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>เลือกไฟล์ใหม่</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STEP 1: Upload Dropzone View */}
        {currentStep === 'upload' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full max-w-2xl p-8 sm:p-12 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 scale-[1.01]'
                  : 'border-zinc-300 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500 bg-zinc-50/50 dark:bg-zinc-900/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="p-4 rounded-3xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mb-4 shadow-sm">
                <UploadCloud className="w-10 h-10 animate-bounce" />
              </div>

              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                ลากไฟล์ PDF มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mb-6 leading-relaxed">
                เหมาะสำหรับไฟล์ PDF ที่สแกนจากเครื่องถ่ายเอกสารที่มีแบบฟอร์มการรักษาฟันปลอมหลายๆ หน้าในไฟล์เดียว
                ระบบจะแยกอ่านทีละหน้าและสกัดข้อมูลคนไข้ทุกหน้าให้อัตโนมัติ
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> รองรับ 1 ไฟล์มีได้หลายสิบหน้า
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  <Sparkles className="w-3.5 h-3.5 mr-1" /> แยกแยะสิทธิการรักษา 7 หมวด
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  <Stethoscope className="w-3.5 h-3.5 mr-1" /> แมปชื่อทันตแพทย์ 5 ท่าน
                </span>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full text-left">
              <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-700/50">
                <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-200 mb-1 flex items-center">
                  <Layers className="w-4 h-4 mr-1.5 text-blue-600" /> 1. แตกหน้าอัตโนมัติ
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  ระบบแปลงหน้า PDF เป็นรูปภาพความละเอียดสูงเพื่อให้อ่านลายมือชัดเจน
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-700/50">
                <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-200 mb-1 flex items-center">
                  <Sparkles className="w-4 h-4 mr-1.5 text-amber-500" /> 2. AI Gemini OCR
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  แกะ HN, ชื่อ-สกุล, ค่าแลป, วันที่, ชนิดฟันปลอม และสิทธิการรักษา
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-700/50">
                <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-200 mb-1 flex items-center">
                  <FileCheck className="w-4 h-4 mr-1.5 text-emerald-600" /> 3. ตรวจทาน & บันทึก
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  มีหน้าจอเทียบต้นฉบับกับข้อมูล ปรับแก้ได้ก่อนกดยืนยันบันทึกทั้งหมด
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Processing Live Progress View */}
        {currentStep === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
            <div className="w-full max-w-md p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-center shadow-lg">
              <div className="relative mx-auto w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-900/40 animate-ping opacity-25" />
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                กำลังประมวลผลไฟล์ PDF
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 truncate font-medium">
                {selectedFile?.name}
              </p>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2.5 rounded-full overflow-hidden mb-3">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                  style={{
                    width: progress?.totalPages
                      ? `${Math.max(5, (progress.currentPage / progress.totalPages) * 100)}%`
                      : '20%',
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-4 font-mono">
                <span>
                  {progress?.totalPages
                    ? `หน้า ${progress.currentPage} จาก ${progress.totalPages}`
                    : 'กำลังเตรียมการ...'}
                </span>
                <span>
                  {progress?.totalPages
                    ? `${Math.round((progress.currentPage / progress.totalPages) * 100)}%`
                    : '...'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 text-xs text-left flex items-start space-x-2">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                <p className="leading-relaxed font-medium">
                  {progress?.message || 'กำลังอ่านข้อมูลเอกสาร...'}
                </p>
              </div>

              {/* Live page thumbnails during processing */}
              {batchItems.length > 0 && (
                <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2 font-medium">
                    สถานะการอ่านข้อมูลแต่ละหน้า:
                  </p>
                  <div className="flex items-center justify-center gap-1.5 flex-wrap max-h-24 overflow-y-auto p-1">
                    {batchItems.map((item, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'success'
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                            : item.status === 'processing'
                            ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 animate-pulse'
                            : item.status === 'error'
                            ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300'
                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        P.{item.pageNumber}
                        {item.status === 'success' && ' ✓'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Multi-Page Batch Review & Editing View */}
        {currentStep === 'review' && activeItem && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Top Review Bar Summary */}
            <div className="px-5 py-2.5 bg-zinc-100/80 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-3">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  📄 {selectedFile?.name} ({batchItems.length} หน้า)
                </span>
                <span className="hidden sm:inline text-zinc-400">•</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
                  ✓ พร้อมนำเข้า {totalRecordsToSave} รายการ
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-zinc-500 dark:text-zinc-400 text-xs">
                  หน้าที่ {activePageIndex + 1} จาก {batchItems.length}
                </span>
                <button
                  onClick={() => togglePageInclusion(activePageIndex)}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl font-semibold transition-colors ${
                    activeItem.included
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                  }`}
                  title={activeItem.included ? 'คลิกเพื่อข้ามหน้านี้' : 'คลิกเพื่อเลือกหน้านี้'}
                >
                  {activeItem.included ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  <span>{activeItem.included ? 'นำเข้าหน้านี้' : 'ข้ามหน้านี้'}</span>
                </button>
              </div>
            </div>

            {/* Split Screen: Left (Scanned Document Viewer) / Right (Editable Fields) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
              {/* Left Panel: Scanned Page Image (cols 6 on desktop) */}
              <div className="lg:col-span-6 bg-zinc-950 flex flex-col min-h-0 border-r border-zinc-800 relative">
                {/* Image Toolbar */}
                <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between bg-zinc-900/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-zinc-800/80 text-white text-xs shadow-lg">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-zinc-300">
                      หน้า {activeItem.pageNumber}
                    </span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-400 text-[11px]">
                      ต้นฉบับสแกน PDF
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                      className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                      title="ซูมออก"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] font-mono px-1 text-zinc-400">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                      className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                      title="ซูมเข้า"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors ml-1"
                      title="หมุน 90 องศา"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setZoomLevel(1);
                        setRotation(0);
                      }}
                      className="px-2 py-0.5 rounded-lg text-[10px] bg-zinc-800 text-zinc-300 hover:text-white transition-colors ml-1"
                    >
                      รีเซ็ต
                    </button>
                  </div>
                </div>

                {/* Scanned Image Container (Scrollable & Zoomable) */}
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center pt-16">
                  <div
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.15s ease-out',
                    }}
                    className="max-w-full shadow-2xl rounded-lg overflow-hidden border border-zinc-800 bg-white"
                  >
                    <img
                      src={activeItem.dataUrl}
                      alt={`หน้า ${activeItem.pageNumber}`}
                      className="max-h-[70vh] object-contain select-none"
                      draggable={false}
                    />
                  </div>
                </div>
              </div>

              {/* Right Panel: Editable Patient Records (cols 6 on desktop) */}
              <div className="lg:col-span-6 bg-white dark:bg-zinc-900 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center">
                      <FileCheck className="w-4 h-4 mr-1.5 text-blue-600" />
                      ข้อมูลเวชระเบียนที่สกัดได้ (หน้า {activeItem.pageNumber})
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      AI ถอดรหัสและจับคู่สิทธิให้แล้ว สามารถตรวจทานและแก้ไขได้ทันที
                    </p>
                  </div>

                  <button
                    onClick={addRecordToCurrentPage}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มเคสในหน้านี้</span>
                  </button>
                </div>

                {/* Patient Record Cards */}
                <div className="space-y-4 flex-1">
                  {activeItem.records.map((rec, rIdx) => (
                    <div
                      key={rec.id || rIdx}
                      className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 space-y-3"
                    >
                      {/* Record Card Header */}
                      <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-700/80 pb-2">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center">
                          <User className="w-3.5 h-3.5 mr-1 text-blue-600" />
                          ผู้ป่วยรายการที่ {rIdx + 1}
                        </span>

                        {activeItem.records.length > 1 && (
                          <button
                            onClick={() => removeRecordFromCurrentPage(rIdx)}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs flex items-center space-x-1"
                            title="ลบรายการนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>ลบ</span>
                          </button>
                        )}
                      </div>

                      {/* Fields Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* HN */}
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                            เลข HN (Hospital No.) *
                          </label>
                          <div className="relative">
                            <Hash className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                            <input
                              type="text"
                              value={rec.hn || ''}
                              onChange={(e) => updateCurrentRecord(rIdx, 'hn', e.target.value)}
                              placeholder="เช่น 580012345"
                              className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 font-mono"
                            />
                          </div>
                        </div>

                        {/* Patient Name */}
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                            ชื่อ - สกุล ผู้ป่วย *
                          </label>
                          <div className="relative">
                            <User className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                            <input
                              type="text"
                              value={rec.patientName || ''}
                              onChange={(e) => updateCurrentRecord(rIdx, 'patientName', e.target.value)}
                              placeholder="เช่น นายสมชาย ใจดี"
                              className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 font-semibold"
                            />
                          </div>
                        </div>

                        {/* Date (Service / Insert) */}
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                            วันที่รับบริการ / ใส่ฟัน (Insert)
                          </label>
                          <div className="relative">
                            <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                            <input
                              type="date"
                              value={rec.date || ''}
                              onChange={(e) => updateCurrentRecord(rIdx, 'date', e.target.value)}
                              className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 font-mono"
                            />
                          </div>
                        </div>

                        {/* Dentist (5 doctors) */}
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                            ทันตแพทย์ผู้รักษา (5 ท่าน)
                          </label>
                          <div className="relative">
                            <Stethoscope className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                            <select
                              value={rec.doctor || 'กนกวรรณ'}
                              onChange={(e) => updateCurrentRecord(rIdx, 'doctor', e.target.value)}
                              className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 font-semibold"
                            >
                              {DOCTORS_LIST.map((doc) => (
                                <option key={doc.name} value={doc.name}>
                                  {doc.name} ({doc.fullName})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Denture Type */}
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                            ชนิดฟันปลอม
                          </label>
                          <input
                            type="text"
                            value={rec.dentureType || ''}
                            onChange={(e) => updateCurrentRecord(rIdx, 'dentureType', e.target.value)}
                            placeholder="เช่น CD, APD, TP, ซ่อม"
                            className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Denture Position */}
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                            ตำแหน่ง
                          </label>
                          <input
                            type="text"
                            value={rec.denturePosition || ''}
                            onChange={(e) => updateCurrentRecord(rIdx, 'denturePosition', e.target.value)}
                            placeholder="เช่น บน, ล่าง, บนและล่าง"
                            className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Coverage Group (7 Categories) */}
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                            สิทธิการรักษา (7 หมวด)
                          </label>
                          <div className="relative">
                            <CreditCard className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                            <select
                              value={rec.coverageGroup || 'UC'}
                              onChange={(e) => updateCurrentRecord(rIdx, 'coverageGroup', e.target.value)}
                              className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 font-semibold text-blue-700 dark:text-blue-400"
                            >
                              {COVERAGE_CATEGORIES.map((cat) => (
                                <option key={cat.id} value={cat.name}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Sub Coverage Item */}
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                            สิทธิการรักษาย่อย
                          </label>
                          <input
                            type="text"
                            value={rec.coverage || ''}
                            onChange={(e) => updateCurrentRecord(rIdx, 'coverage', e.target.value)}
                            placeholder="เช่น 30 บาท, อสม, สอย., จ่ายตรง"
                            className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Lab Cost */}
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                            ค่าแลป (LAB บาท)
                          </label>
                          <div className="relative">
                            <Banknote className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                            <input
                              type="number"
                              value={rec.labCost !== undefined ? rec.labCost : 0}
                              onChange={(e) => updateCurrentRecord(rIdx, 'labCost', parseFloat(e.target.value) || 0)}
                              className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 font-mono font-semibold"
                            />
                          </div>
                        </div>

                        {/* Total Treatment Fee */}
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                            รวมค่ารักษา (บาท)
                          </label>
                          <div className="relative">
                            <Banknote className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                            <input
                              type="number"
                              value={rec.treatmentFee !== undefined ? rec.treatmentFee : 0}
                              onChange={(e) => updateCurrentRecord(rIdx, 'treatmentFee', parseFloat(e.target.value) || 0)}
                              className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 font-mono font-semibold text-emerald-600 dark:text-emerald-400"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Note / OCR Detected handwriting details */}
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          หมายเหตุ / ข้อความที่ตรวจพบบนเอกสาร
                        </label>
                        <input
                          type="text"
                          value={rec.note || ''}
                          onChange={(e) => updateCurrentRecord(rIdx, 'note', e.target.value)}
                          placeholder="รายละเอียดเพิ่มเติม หรือข้อความจากลายมือแพทย์"
                          className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Navigation & Batch Save Action Bar */}
            <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Previous / Next Page Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (activePageIndex > 0) {
                      setActivePageIndex(activePageIndex - 1);
                      setZoomLevel(1);
                      setRotation(0);
                    }
                  }}
                  disabled={activePageIndex === 0}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-200 dark:border-zinc-700 flex items-center space-x-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>หน้าที่แล้ว</span>
                </button>

                {/* Page Thumbnails Carousel Strip */}
                <div className="flex items-center space-x-1 max-w-xs sm:max-w-md overflow-x-auto p-1">
                  {batchItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setActivePageIndex(idx);
                        setZoomLevel(1);
                        setRotation(0);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all shrink-0 ${
                        activePageIndex === idx
                          ? 'bg-blue-600 text-white shadow-xs'
                          : item.included
                          ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300'
                          : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 line-through'
                      }`}
                      title={`หน้า ${item.pageNumber}: ${item.records[0]?.patientName || 'ไม่ระบุชื่อ'}`}
                    >
                      P.{item.pageNumber}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (activePageIndex < batchItems.length - 1) {
                      setActivePageIndex(activePageIndex + 1);
                      setZoomLevel(1);
                      setRotation(0);
                    }
                  }}
                  disabled={activePageIndex === batchItems.length - 1}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-200 dark:border-zinc-700 flex items-center space-x-1 transition-colors"
                >
                  <span>หน้าถัดไป</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Batch Import Action Button */}
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-2xl text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  ยกเลิก
                </button>

                <button
                  onClick={handleSaveAllRecords}
                  disabled={isSaving || totalRecordsToSave === 0}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-2 rounded-2xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึก {totalRecordsToSave} รายการ...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>บันทึกข้อมูลทั้งหมดเข้าสู่ระบบ ({totalRecordsToSave} รายการ)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
