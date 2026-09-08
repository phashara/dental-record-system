import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Check, RefreshCw, AlertCircle, FileText, Sparkles, SwitchCamera, Image as ImageIcon } from 'lucide-react';
import { DentureRecord, DOCTORS_LIST, COVERAGE_CATEGORIES, resolveCoverage } from '../types';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRecords: (records: DentureRecord[]) => void;
}

// Sample presets derived from the user's provided PDF documents for one-tap testing
const SAMPLE_PRESETS = [
  {
    title: 'OPD Card: นางอารี บุตรน้อย (หมอศศิมนต์)',
    desc: 'HN: 680020696 • Upper APD • ค่าแลป = 575',
    record: {
      hn: '680020696',
      patientName: 'นางอารี บุตรน้อย',
      age: '64',
      gender: 'หญิง',
      date: '2026-08-06',
      doctor: 'ศศิมนต์',
      dentureType: 'APD (ฟันเทียมบางส่วนถอดได้)',
      denturePosition: 'บน (Upper APD)',
      coverage: 'ต้นสังกัด (ระบบจ่ายตรง)',
      labCost: 575,
      treatmentFee: 1500,
      note: 'Tx. insert upper APD / ค่าแลป = 575',
      diagnosis: 'K081 Loss of teeth due to accident / extraction',
      status: 'เสร็จสิ้น (Completed)',
      source: 'AI OCR สแกนกล้อง'
    }
  },
  {
    title: 'OPD Card: นายจำเนียร สุขบาง (หมอศศิมนต์)',
    desc: 'HN: 490015357 • APD/APD • ค่าแลป = 300+1023=1323',
    record: {
      hn: '490015357',
      patientName: 'นายจำเนียร สุขบาง',
      age: '76',
      gender: 'ชาย',
      date: '2026-08-13',
      doctor: 'ศศิมนต์',
      dentureType: 'APD/APD',
      denturePosition: 'บนและล่าง (Upper & Lower APD)',
      coverage: 'ต้นสังกัด (ระบบจ่ายตรง)',
      labCost: 1323,
      treatmentFee: 3000,
      note: 'Tx. Insert APD/APD / ค่าแลป = 300+1023 = 1323',
      diagnosis: 'Z012 Dental examination / K081',
      status: 'เสร็จสิ้น (Completed)',
      source: 'AI OCR สแกนกล้อง'
    }
  },
  {
    title: 'OPD Card: นางชะม้าย ล้อมวงค์ (หมอวีรยา)',
    desc: 'HN: 500033707 • U/L APD • LAB = 1372+300+360=2032',
    record: {
      hn: '500033707',
      patientName: 'นางชะม้าย ล้อมวงค์',
      age: '68',
      gender: 'หญิง',
      date: '2026-09-04',
      doctor: 'วีรยา',
      dentureType: 'APD/APD',
      denturePosition: 'บนและล่าง (U/L APD)',
      coverage: 'บัตร อสม.',
      labCost: 2032,
      treatmentFee: 2800,
      note: 'U/L APD / LAB = 1372 + 300 + 360 = 2032 บาท',
      diagnosis: 'K081 Dental examination',
      status: 'เสร็จสิ้น (Completed)',
      source: 'AI OCR สแกนกล้อง'
    }
  },
  {
    title: 'OPD Card: น.ส.จันทรา รังผึ้ง (หมอกนกวรรณ)',
    desc: 'HN: 490022393 • UTP 13 ซี่ • ค่าแลป = 1275.44',
    record: {
      hn: '490022393',
      patientName: 'น.ส.จันทรา รังผึ้ง',
      age: '69',
      gender: 'หญิง',
      date: '2026-09-01',
      doctor: 'กนกวรรณ',
      dentureType: 'USD (UTP 13 ซี่)',
      denturePosition: 'บน (U-arch)',
      coverage: 'บัตร อสม.',
      labCost: 1275.44,
      treatmentFee: 2400,
      note: 'ใส่ฟัน UTP 13 ซี่ / Lab = 38.52 + 192.67 + 1044.32 = 1275.44',
      diagnosis: 'K081 / Z012 Dental examination',
      status: 'เสร็จสิ้น (Completed)',
      source: 'AI OCR สแกนกล้อง'
    }
  },
  {
    title: 'OPD Card: นางดวงเดือน โฉมชัย (หมอจิณณพัต)',
    desc: 'HN: 500027652 • UTP 1 ซี่ • ค่าแลป = 358',
    record: {
      hn: '500027652',
      patientName: 'นางดวงเดือน โฉมชัย',
      age: '56',
      gender: 'หญิง',
      date: '2026-08-26',
      doctor: 'จิณณพัต',
      dentureType: 'UTP (1 ซี่)',
      denturePosition: 'บน (UTP 1 Insertion)',
      coverage: 'บัตร อสม.',
      labCost: 358,
      treatmentFee: 1300,
      note: 'ค่าแลป: 358 / UTP 1 Insertion completed',
      diagnosis: 'K081 / Z012',
      status: 'เสร็จสิ้น (Completed)',
      source: 'AI OCR สแกนกล้อง'
    }
  },
  {
    title: 'OPD Card: นางสายเทียน ทัพชัย (หมอชิดชนก)',
    desc: 'HN: 550064055 • Upper & Lower APD • ค่าแลป = 1874.64',
    record: {
      hn: '550064055',
      patientName: 'นางสายเทียน ทัพชัย',
      age: '67',
      gender: 'หญิง',
      date: '2026-08-07',
      doctor: 'ชิดชนก',
      dentureType: 'APD/APD',
      denturePosition: 'บนและล่าง (Upper & Lower APD)',
      coverage: 'ต้นสังกัด (ระบบจ่ายตรง)',
      labCost: 1874.64,
      treatmentFee: 3050,
      note: 'ค่าแลป 1874.64 / ผู้รักษา ทพญ.ชิดชนก',
      diagnosis: 'K081 Loss of teeth',
      status: 'เสร็จสิ้น (Completed)',
      source: 'AI OCR สแกนกล้อง'
    }
  }
];

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onSaveRecords,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [ocrStep, setOcrStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [extractedRecords, setExtractedRecords] = useState<DentureRecord[]>([]);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize camera when active
  useEffect(() => {
    if (isOpen && cameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, cameraActive, facingMode]);

  const startCamera = async () => {
    try {
      stopCamera();
      // Prioritize vertical portrait constraints optimized for A4 paper and mobile
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          // Mobile portrait: width < height
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          aspectRatio: { ideal: 0.707 }, // A4 document aspect ratio (1 / 1.414)
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Portrait camera constraints failed, attempting fallback:', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: false,
        });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play();
        }
      } catch (fallbackErr) {
        setErrorMsg('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตสิทธิ์กล้อง หรือใช้การอัปโหลดรูปภาพ');
        setCameraActive(false);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      if (navigator.vibrate) {
        navigator.vibrate(40);
      }
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1080;
      canvas.height = video.videoHeight || 1920;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
        setPreviewImage(dataUrl);
        setCameraActive(false);
        stopCamera();
        processOcr(dataUrl);
      }
    } catch (e) {
      console.error('Capture error', e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreviewImage(dataUrl);
      setCameraActive(false);
      stopCamera();
      processOcr(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyPreset = (index: number) => {
    setSelectedPresetIndex(index);
    const preset = SAMPLE_PRESETS[index];
    const generatedRecord: DentureRecord = {
      ...preset.record,
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      synced: false
    } as DentureRecord;

    setExtractedRecords([generatedRecord]);
  };

  const processOcr = async (base64Image: string) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setOcrStep('🔍 กำลังเชื่อมต่อระบบ AI Gemini วิเคราะห์ภาพ...');

    try {
      setOcrStep('📋 กำลังตรวจหา HN, ชื่อ-สกุล, วินิจฉัย และตารางบริการ...');
      
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType: 'image/jpeg',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${res.status}`);
      }

      setOcrStep('✍️ กำลังถอดรหัสลายมือแพทย์ & ค่าใช้จ่าย LAB...');
      const result = await res.json();
      const ocrData = result.data || {};

      if (ocrData.records && ocrData.records.length > 0) {
        const records: DentureRecord[] = ocrData.records.map((r: any, idx: number) => ({
          id: `rec-ocr-${Date.now()}-${idx}`,
          hn: r.hn || '',
          patientName: r.patientName || '',
          age: r.age ? String(r.age) : '',
          gender: r.gender || 'ไม่ระบุ',
          date: r.date || new Date().toISOString().split('T')[0],
          doctor: r.doctor || 'ชิดชนก',
          dentureType: r.dentureType || 'CD (ฟันเทียมทั้งปาก)',
          denturePosition: r.denturePosition || 'บนและล่าง',
          coverage: r.coverage || 'UC 30 บาท',
          labCost: Number(r.labCost) || 0,
          treatmentFee: Number(r.treatmentFee) || 0,
          note: r.note || ocrData.detectedHandwriting || '',
          diagnosis: r.diagnosis || 'K081 Loss of teeth',
          status: 'เสร็จสิ้น (Completed)',
          source: 'AI OCR สแกนกล้อง',
          createdAt: new Date().toISOString(),
          synced: false,
        }));

        setExtractedRecords(records);
      } else {
        throw new Error('ไม่พบข้อมูลทันตกรรมในภาพ กรุณาถ่ายให้ชัดเจนหรือเลือกตัวอย่างด้านล่าง');
      }
    } catch (err: any) {
      console.warn('OCR error fallback to intelligent matching:', err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการวิเคราะห์ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsProcessing(false);
      setOcrStep('');
    }
  };

  const handleUpdateRecordField = (index: number, field: keyof DentureRecord, value: any) => {
    setExtractedRecords(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleConfirmSave = () => {
    if (extractedRecords.length === 0) return;
    const normalized = extractedRecords.map(r => {
      const cov = resolveCoverage(r.coverage);
      return {
        ...r,
        coverageGroup: r.coverageGroup || cov.group,
        coverage: cov.subItem,
      };
    });
    onSaveRecords(normalized);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    stopCamera();
    setCameraActive(false);
    setPreviewImage(null);
    setExtractedRecords([]);
    setErrorMsg(null);
    setSelectedPresetIndex(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* iOS Sheet Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                สแกนกล้องมือถือ / นำเข้าแบบฟอร์ม AI OCR
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                อ่าน OPD Card ทันตกรรม, ลายมือค่าแลป และตารางทะเบียนฟันปลอมอัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Main Scanner Section */}
          {extractedRecords.length === 0 ? (
            <div className="space-y-5">
              
              {/* Camera Viewfinder or Image Preview Area - Optimized for Vertical A4 Paper & Mobile Phones */}
              <div className="relative w-full max-w-sm sm:max-w-md mx-auto aspect-[3/4] sm:aspect-[1/1.414] max-h-[56vh] bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center shadow-inner">
                {cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover"
                    />
                    {/* iOS Reticle Scan Overlay - Vertical A4 Sheet Guides */}
                    <div className="absolute inset-3.5 sm:inset-5 border-2 border-dashed border-blue-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-3 bg-blue-500/5">
                      <div className="flex justify-between items-start">
                        <div className="w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg shadow-sm" />
                        <span className="px-2.5 py-1 rounded-full bg-blue-600/90 text-white text-[10px] font-semibold backdrop-blur-md shadow-sm">
                          📄 จัดกระดาษ A4 / OPD Card แนวตั้ง
                        </span>
                        <div className="w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg shadow-sm" />
                      </div>
                      <div className="text-center">
                        <span className="px-3 py-1.5 rounded-full bg-black/75 text-white text-xs backdrop-blur-md font-medium shadow-md">
                          จัดขอบใบตรวจรักษาให้อยู่ในกรอบแนวตั้ง
                        </span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg shadow-sm" />
                        <div className="w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg shadow-sm" />
                      </div>
                    </div>
                  </>
                ) : previewImage ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
                    <img
                      src={previewImage}
                      alt="Scan Preview"
                      className="h-full w-full object-contain"
                    />
                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center">
                        <RefreshCw className="w-10 h-10 text-blue-400 animate-spin mb-3" />
                        <p className="text-sm font-semibold">{ocrStep || 'กำลังประมวลผลด้วย AI...'}</p>
                        <p className="text-xs text-zinc-400 mt-1">วิเคราะห์ตัวอักษร ลายมือแพทย์ และค่าใช้จ่ายแลป</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-6 max-w-sm space-y-4">
                    <div className="w-16 h-16 rounded-full bg-zinc-900 text-blue-400 flex items-center justify-center mx-auto ring-1 ring-zinc-800">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100">
                        พร้อมสแกนเอกสารแนวตั้ง (A4)
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        ใช้กล้องมือถือสแกน หรืออัปโหลดภาพใบตรวจ OPD Card เพื่อดึงข้อมูลอัตโนมัติ
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
                      <button
                        onClick={() => setCameraActive(true)}
                        className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
                      >
                        <Camera className="w-4 h-4" />
                        <span>เปิดกล้องมือถือแนวตั้ง</span>
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all"
                      >
                        <Upload className="w-4 h-4" />
                        <span>เลือกรูปภาพจากเครื่อง</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Action Controls when previewing image */}
              {previewImage && !isProcessing && (
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  <button
                    onClick={() => {
                      setPreviewImage(null);
                      setErrorMsg(null);
                      setCameraActive(true);
                    }}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>เปิดกล้องถ่ายใหม่</span>
                  </button>
                  <button
                    onClick={() => {
                      setPreviewImage(null);
                      setErrorMsg(null);
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>เลือกรูปอื่น</span>
                  </button>
                  {errorMsg && (
                    <button
                      onClick={() => {
                        if (previewImage) processOcr(previewImage);
                      }}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>ลองประมวลผลอีกครั้ง</span>
                    </button>
                  )}
                </div>
              )}

              {/* Shutter / Camera Controls when camera is active */}
              {cameraActive && (
                <div className="flex items-center justify-center space-x-6 py-2">
                  <button
                    onClick={toggleFacingMode}
                    className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 transition-colors"
                    title="สลับกล้องหน้า/หลัง"
                  >
                    <SwitchCamera className="w-5 h-5" />
                  </button>

                  {/* iOS Shutter Button */}
                  <button
                    onClick={capturePhoto}
                    className="w-16 h-16 rounded-full bg-white ring-4 ring-blue-500/30 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                    title="ถ่ายรูป"
                  >
                    <div className="w-13 h-13 rounded-full border-2 border-zinc-900 bg-white" />
                  </button>

                  <button
                    onClick={() => {
                      setCameraActive(false);
                      stopCamera();
                    }}
                    className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 transition-colors"
                    title="ยกเลิก"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Error Banner */}
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 text-xs flex items-center space-x-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Quick Sample Selector (From Attached Files) */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>หรือเลือกทดสอบจากชาร์ตตัวอย่างจริง (จากไฟล์ที่แนบ)</span>
                  </div>
                  <span className="text-[11px] text-zinc-400">กด 1 คลิกเพื่อทดสอบ OCR</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SAMPLE_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleApplyPreset(idx)}
                      className={`text-left p-3 rounded-2xl border transition-all duration-150 ${
                        selectedPresetIndex === idx
                          ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-500'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            {preset.title}
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {preset.desc}
                          </p>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {preset.record.doctor}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            /* Results Review & Edit Screen */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold">
                    วิเคราะห์ข้อมูลสำเร็จ! พบ {extractedRecords.length} รายการ กรุณาตรวจสอบก่อนบันทึก
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline"
                >
                  สแกนใหม่
                </button>
              </div>

              {extractedRecords.map((rec, idx) => (
                <div
                  key={rec.id || idx}
                  className="p-4 sm:p-5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-zinc-200/70 dark:border-zinc-800/70 pb-3">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        รายการที่ {idx + 1}: HN {rec.hn || 'ไม่ระบุ'}
                      </span>
                    </div>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-medium">
                      {rec.source || 'AI OCR'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {/* HN */}
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        HN (เลขประจำตัวผู้ป่วย)
                      </label>
                      <input
                        type="text"
                        value={rec.hn}
                        onChange={e => handleUpdateRecordField(idx, 'hn', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Patient Name */}
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        ชื่อ-สกุล ผู้ป่วย
                      </label>
                      <input
                        type="text"
                        value={rec.patientName}
                        onChange={e => handleUpdateRecordField(idx, 'patientName', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Doctor (5 doctors) */}
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        ทันตแพทย์ผู้รักษา (5 ท่าน)
                      </label>
                      <select
                        value={rec.doctor}
                        onChange={e => handleUpdateRecordField(idx, 'doctor', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-blue-700 dark:text-blue-300"
                      >
                        {DOCTORS_LIST.map(doc => (
                          <option key={doc.name} value={doc.name}>
                            {doc.fullName} ({doc.name})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Denture Type */}
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        ชนิดฟันปลอม
                      </label>
                      <input
                        type="text"
                        value={rec.dentureType}
                        onChange={e => handleUpdateRecordField(idx, 'dentureType', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Position */}
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        ตำแหน่งฟันปลอม
                      </label>
                      <input
                        type="text"
                        value={rec.denturePosition || ''}
                        onChange={e => handleUpdateRecordField(idx, 'denturePosition', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        วันที่ให้บริการ / Insert
                      </label>
                      <input
                        type="date"
                        value={rec.date}
                        onChange={e => handleUpdateRecordField(idx, 'date', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Coverage (5 Categories) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                          สิทธิการรักษา (5 หมวด)
                        </label>
                        {(() => {
                          const res = resolveCoverage(rec.coverage);
                          const cat = COVERAGE_CATEGORIES.find(c => c.name === res.group) || COVERAGE_CATEGORIES[0];
                          return (
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${cat.badgeClass}`}>
                              {res.group}
                            </span>
                          );
                        })()}
                      </div>
                      <select
                        value={rec.coverage}
                        onChange={e => handleUpdateRecordField(idx, 'coverage', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {COVERAGE_CATEGORIES.map((cat, catIdx) => (
                          <optgroup key={cat.id} label={`${catIdx + 1}. ${cat.name}`}>
                            {cat.items.map(item => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    {/* Lab Cost (Handwritten extracted) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                        ค่าใช้จ่าย LAB (บาท) ✍️
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={rec.labCost}
                        onChange={e => handleUpdateRecordField(idx, 'labCost', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-emerald-400 dark:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-700 dark:text-emerald-300"
                      />
                    </div>

                    {/* Total Treatment Fee */}
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        รวมค่าใช้จ่ายทั้งสิ้น (บาท)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={rec.treatmentFee}
                        onChange={e => handleUpdateRecordField(idx, 'treatmentFee', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Note / Handwritten details */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Dental Note / ลายมือแพทย์ / หมายเหตุ
                    </label>
                    <input
                      type="text"
                      value={rec.note || ''}
                      onChange={e => handleUpdateRecordField(idx, 'note', e.target.value)}
                      placeholder="เช่น Tx. insert upper APD / ค่าแลป = 575"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            ยกเลิก
          </button>

          {extractedRecords.length > 0 && (
            <button
              onClick={handleConfirmSave}
              className="flex items-center space-x-1.5 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>บันทึกลงทะเบียนฟันปลอม ({extractedRecords.length} รายการ)</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
