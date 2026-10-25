import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Link2,
  Barcode,
  X,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Scan,
  AlertCircle,
  UploadCloud,
  Image as ImageIcon,
  Loader2,
  Trash2,
} from 'lucide-react';
import { RecognizedRetailerLink, VisualAnalysisResult, Product } from '../types';
import { priceProvider } from '../services/priceProvider';
import { BarcodeScanner, CameraProblem } from './BarcodeScanner';
import { parseProductLink } from '../utils/retailerLinks';
import { digitsOnly, explainInvalidGtin, isValidGtin, normalizeGtin } from '../utils/ean';
import { DemoBadge } from './DemoBadge';

const CAMERA_MESSAGES: Record<CameraProblem, string> = {
  denied: 'Camera access was denied. Allow the camera in your browser settings or enter the code manually.',
  'no-camera': 'No camera was found on this device. Enter the code manually.',
  insecure: 'The camera only works on a secure connection (HTTPS or localhost). Enter the code manually.',
  unsupported: 'This browser does not allow camera access. Enter the code manually.',
  failed: 'The camera could not be started. Try again or enter the code manually.',
};

interface VisualMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecognizedLink?: (recognized: RecognizedRetailerLink) => void;
  onPhotoAnalysisComplete?: (result: VisualAnalysisResult) => void;
  onBarcodeProduct?: (product: Product) => void;
  initialTab?: 'link' | 'photo' | 'barcode';
  /** Text already pasted (e.g. from Home): prefilled and validated. */
  initialUrl?: string;
}

export const VisualMatcherModal: React.FC<VisualMatcherModalProps> = ({
  isOpen,
  onClose,
  onRecognizedLink,
  onPhotoAnalysisComplete,
  onBarcodeProduct,
  initialTab = 'link',
  initialUrl = '',
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'photo' | 'barcode'>(initialTab);
  const [inputUrl, setInputUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [urlError, setUrlError] = useState<{
    type: 'malformed' | 'unsupported';
    title: string;
    message: string;
  } | null>(null);

  // Photo analysis state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewBase64, setPreviewBase64] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [photoScanStep, setPhotoScanStep] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  // Barcode state
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraProblem, setCameraProblem] = useState<CameraProblem | null>(null);
  const [manualEan, setManualEan] = useState('');
  const [manualEanError, setManualEanError] = useState<string | null>(null);
  const [lookingUpEan, setLookingUpEan] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [notFoundEan, setNotFoundEan] = useState<string | null>(null);

  // Synchronize activeTab whenever modal opens or initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setScanning(false);
      setInputUrl(initialUrl);
      if (initialUrl) {
        const r = parseProductLink(initialUrl);
        setUrlError(
          r.ok === false
            ? { type: r.kind === 'malformed' ? 'malformed' : 'unsupported', title: r.title, message: r.message }
            : null
        );
      } else {
        setUrlError(null);
      }
      setSelectedFile(null);
      setPreviewBase64(null);
      setPhotoError(null);
      setIsAnalyzingPhoto(false);
      setIsDragging(false);
      setCameraOn(false);
      setCameraProblem(null);
      setManualEan('');
      setManualEanError(null);
      setLookingUpEan(false);
      setLookupError(null);
      setNotFoundEan(null);
    }
  }, [isOpen, initialTab, initialUrl]);

  if (!isOpen) return null;

  const lookupEan = async (rawCode: string) => {
    const code = normalizeGtin(rawCode);
    setCameraOn(false);
    setLookingUpEan(true);
    setLookupError(null);
    setNotFoundEan(null);
    try {
      const product = await priceProvider.getProductByEan(code);
      if (product && onBarcodeProduct) {
        onBarcodeProduct(product);
      } else {
        setNotFoundEan(code);
      }
    } catch (err) {
      console.error('EAN lookup failed', err);
      setLookupError('The search failed. Check your connection and try again.');
    } finally {
      setLookingUpEan(false);
    }
  };

  const handleManualEanSubmit = () => {
    const problem = explainInvalidGtin(manualEan);
    if (problem) {
      setManualEanError(
        problem === 'empty'
          ? 'Enter the number printed under the barcode.'
          : problem === 'length'
            ? 'A barcode has 8, 12, 13 or 14 digits.'
            : 'The check digit does not match. Check that you typed the code correctly.'
      );
      return;
    }
    setManualEanError(null);
    lookupEan(manualEan);
  };

  const handleAnalyzeLinkSubmit = async () => {
    setUrlError(null);
    const parsed = parseProductLink(inputUrl);
    if (parsed.ok === false) {
      setUrlError({
        type: parsed.kind === 'malformed' ? 'malformed' : 'unsupported',
        title: parsed.title,
        message: parsed.message,
      });
      return;
    }

    // The only real wait: matching against the catalog through the provider.
    setScanning(true);
    setScanStep('Analyzing the link…');
    let matchedProduct: Product | null = null;
    try {
      matchedProduct = await priceProvider.matchProductFromLink(parsed.link);
    } catch (err) {
      console.error('Link match failed', err);
    }
    setScanning(false);
    onRecognizedLink?.({ ...parsed.link, matchedProduct });
  };

  const handleFileSelect = (file: File) => {
    setPhotoError(null);
    const validMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const validExtensions = /\.(png|jpe?g|webp)$/i;

    if (!validMimeTypes.includes(file.type) && !validExtensions.test(file.name)) {
      setPhotoError('Unsupported format. Please select a PNG, JPG, or WEBP image.');
      return;
    }

    // Check size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image exceeds the 5 MB limit. Please select a smaller photo.');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewBase64(reader.result as string);
    };
    reader.onerror = () => {
      setPhotoError('Could not read the selected image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyzePhotoSubmit = async () => {
    if (!previewBase64 || !selectedFile) {
      setPhotoError('Please select or upload a photograph to analyze.');
      return;
    }

    setIsAnalyzingPhoto(true);
    setPhotoError(null);
    setPhotoScanStep('Uploading photo to server...');

    const timer1 = setTimeout(() => {
      setPhotoScanStep('Gemini 3.8 Flash analyzing visual features...');
    }, 1100);

    const timer2 = setTimeout(() => {
      setPhotoScanStep('Identifying item & generating retailer search queries...');
    }, 2500);

    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: previewBase64,
          mimeType: selectedFile.type || 'image/jpeg',
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error while analyzing photograph.');
      }

      const visualResult: VisualAnalysisResult = {
        objectName: data.objectName,
        category: data.category,
        description: data.description,
        observableCharacteristics: data.observableCharacteristics,
        retailerSearchQuery: data.retailerSearchQuery,
        alternatives: data.alternatives,
        imagePreviewUrl: previewBase64,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setIsAnalyzingPhoto(false);
      onPhotoAnalysisComplete?.(visualResult);
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsAnalyzingPhoto(false);
      setPhotoError(err?.message || 'Failed to connect to the image analysis service.');
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Scan or find product" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 relative animate-in slide-in-from-bottom-4 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[11px] font-mono tracking-wider text-emerald-700 font-bold uppercase">
            OvoPrice Visual Matcher
          </span>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-1">
          Product Identification
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Recognizes product links, photos and barcodes.
        </p>

        {/* 3 Portal Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg mb-4">
          <button
            onClick={() => {
              setActiveTab('link');
              setUrlError(null);
            }}
            className={`py-2 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'link'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Paste Link</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('photo');
              setUrlError(null);
            }}
            className={`py-2 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'photo'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-600" />
            <span>Scan Photo</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('barcode');
              setUrlError(null);
            }}
            className={`py-2 px-3 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'barcode'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Barcode className="w-3.5 h-3.5 text-purple-600" />
            <span>Barcode</span>
          </button>
        </div>

        {scanning ? (
          <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
              <Scan className="w-7 h-7 text-emerald-600 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{scanStep}</p>
              
            </div>
          </div>
        ) : (
          <div>
            {activeTab === 'link' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Product link (MediaMarkt, OTTO, Amazon, eBay)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={inputUrl}
                      onChange={(e) => {
                        setInputUrl(e.target.value);
                        if (urlError) setUrlError(null);
                      }}
                      placeholder="Paste the link, e.g. https://www.otto.de/p/…"
                      className={`w-full text-xs py-2.5 pl-3 pr-8 bg-slate-50 border rounded-lg focus:outline-none text-slate-900 ${
                        urlError
                          ? 'border-rose-400 focus:border-rose-500'
                          : 'border-slate-200 focus:border-slate-800'
                      }`}
                    />
                    {inputUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setInputUrl('');
                          if (urlError) setUrlError(null);
                        }}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                        title="Clear input"
                        aria-label="Clear input"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Error Banner */}
                {urlError && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                      urlError.type === 'malformed'
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <AlertCircle
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        urlError.type === 'malformed' ? 'text-rose-600' : 'text-amber-600'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-xs">{urlError.title}</p>
                      <p className="text-[11px] mt-0.5 leading-relaxed">{urlError.message}</p>
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800 text-[11px]">Supported stores:</p>
                  <p className="text-[10px] text-slate-500">
                    MediaMarkt • OTTO • Amazon.de / .at • eBay.de. Links from TikTok, Instagram or YouTube cannot be read yet.
                  </p>
                </div>

                <button
                  onClick={handleAnalyzeLinkSubmit}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
                >
                  <span>Analyze link</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {activeTab === 'photo' && (
              <div className="space-y-3">
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                {/* Error Banner */}
                {photoError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-rose-900">Analysis Notice</p>
                      <p className="text-[11px] text-rose-700 leading-snug mt-0.5">{photoError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPhotoError(null)}
                      className="text-rose-400 hover:text-rose-600 text-xs font-bold px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Analyzing Loading State */}
                {isAnalyzingPhoto ? (
                  <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
                      <Sparkles className="w-7 h-7 text-emerald-600 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{photoScanStep || 'Analyzing photo...'}</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Processing image with Gemini 3.8 Flash Vision model
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Upload / Preview Area */}
                    {!previewBase64 ? (
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                          isDragging
                            ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-200'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-100">
                          <Camera className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-semibold text-slate-800">
                          Take photo or drop product image
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Click to browse from your device or drag & drop here
                        </p>
                        <div className="flex items-center justify-center gap-1.5 mt-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            PNG, JPG, WEBP
                          </span>
                          <span className="text-[10px] text-slate-400">•</span>
                          <span className="text-[10px] text-slate-400">Max 5 MB</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 rounded-lg bg-slate-200 border border-slate-300 overflow-hidden shrink-0 relative">
                            <img
                              src={previewBase64}
                              alt="Upload preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {selectedFile?.name || 'Selected photograph'}
                              </p>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : ''} · Ready for AI analysis
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline mt-1 inline-block cursor-pointer"
                            >
                              Choose different image
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                              setPreviewBase64(null);
                              setPhotoError(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                            title="Remove selected image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Primary Action Button: Analyze Photo with Gemini */}
                        <button
                          onClick={handleAnalyzePhotoSubmit}
                          disabled={isAnalyzingPhoto}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-emerald-200" />
                          <span>Analyze Photo with Gemini</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'barcode' && (
              <div className="space-y-3">
                {lookingUpEan ? (
                  <div className="py-8 flex flex-col items-center gap-2 text-center bg-slate-50 rounded-xl border border-slate-200">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <p className="text-sm font-bold text-slate-900">Caut produsul…</p>
                  </div>
                ) : notFoundEan ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="text-xs text-amber-900">
                        <p className="font-bold">Product not found</p>
                        <p className="mt-0.5">
                          The code <span className="font-mono">{notFoundEan}</span> is not in the OvoPrice catalog
                          {priceProvider.isDemo ? ' (demo catalog with only a few products)' : ''}.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(notFoundEan)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 text-center bg-white border border-amber-300 text-amber-900 text-xs font-semibold rounded-lg"
                      >
                        Search the code on Google
                      </a>
                      <button
                        onClick={() => {
                          setNotFoundEan(null);
                          setManualEan('');
                        }}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        Scan another code
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {cameraOn ? (
                      <div className="space-y-2">
                        <BarcodeScanner
                          onDetected={(code) => lookupEan(code)}
                          onCameraProblem={(problem) => {
                            setCameraOn(false);
                            setCameraProblem(problem);
                          }}
                        />
                        <p className="text-[11px] text-slate-500 text-center">
                          Fit the barcode inside the frame. Scanning starts automatically.
                        </p>
                        <button
                          onClick={() => setCameraOn(false)}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          Stop camera
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setCameraProblem(null);
                          setLookupError(null);
                          setCameraOn(true);
                        }}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Scan with camera</span>
                      </button>
                    )}

                    {cameraProblem && (
                      <p className="flex items-start gap-1.5 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>{CAMERA_MESSAGES[cameraProblem]}</span>
                      </p>
                    )}
                    {lookupError && (
                      <p className="flex items-start gap-1.5 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>{lookupError}</span>
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="flex-1 h-px bg-slate-200" />
                      <span>or enter the code manually</span>
                      <span className="flex-1 h-px bg-slate-200" />
                    </div>

                    <div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={manualEan}
                          onChange={(e) => {
                            setManualEan(digitsOnly(e.target.value).slice(0, 14));
                            setManualEanError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleManualEanSubmit();
                          }}
                          placeholder="EAN, e.g. 4548736132580"
                          aria-label="EAN barcode"
                          className="flex-1 min-w-0 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={handleManualEanSubmit}
                          disabled={!manualEan}
                          className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <span>Search</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {manualEanError && (
                        <p className="text-[11px] text-rose-700 mt-1">{manualEanError}</p>
                      )}
                      {manualEan && isValidGtin(manualEan) && !manualEanError && (
                        <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Cod valid
                        </p>
                      )}
                    </div>

                    {priceProvider.isDemo && (
                      <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-start gap-1.5">
                        <DemoBadge />
                        <span>Demo catalog: only 5 products are recognized (e.g. 4548736132580 for Sony WH-1000XM5).</span>
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

