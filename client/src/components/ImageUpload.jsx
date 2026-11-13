import { useState, useRef, useEffect } from 'react';
import { Upload, Camera, X, FileImage, Loader, RefreshCw, Circle } from 'lucide-react';

const CLOUD_NAME = 'dv45n8xix';
const UPLOAD_PRESET = 'ellolplu';
const MAX_SIDE = 2560;   // plenty to read a scale ticket, small enough for a weak signal

// Shrink big phone photos before upload. PDFs and anything the browser
// can't decode go up untouched.
async function shrinkImage(file) {
  if (!file.type.startsWith('image/') || file.size < 1.5 * 1024 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85));
    return blob && blob.size < file.size ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

// Full-screen camera that runs inside the page. Works the same on Android
// and iPhone, in the browser or from a home-screen shortcut - unlike the
// file input's "capture" hint, which many Android browsers ignore.
function CameraModal({ onShot, onClose, onFallback }) {
  const videoRef = useRef();
  const streamRef = useRef();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 3840 }, height: { ideal: 2160 } },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        setReady(true);
      } catch (err) {
        if (!cancelled) setFailed(err?.name === 'NotAllowedError' ? 'denied' : 'unavailable');
      }
    })();
    return () => { cancelled = true; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const snap = () => {
    const v = videoRef.current;
    if (!v?.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext('2d').drawImage(v, 0, 0);
    canvas.toBlob(blob => {
      if (blob) onShot(new File([blob], 'paperwork.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col">
      <div className="flex items-center justify-between p-3 text-white">
        <span className="text-sm font-medium">Take a photo of the paperwork</span>
        <button type="button" onClick={onClose} className="p-2"><X size={22} /></button>
      </div>
      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 w-full h-full object-contain" />
        {!ready && !failed && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-sm">Starting camera…</div>
        )}
        {failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-slate-200 text-sm">
            <p>
              {failed === 'denied'
                ? 'Camera access is blocked for this site. Allow the camera in your browser settings, or use your phone\'s camera app instead.'
                : 'This browser can\'t open the camera here. Use your phone\'s camera app instead.'}
            </p>
            <button type="button" onClick={onFallback} className="btn-primary"><Camera size={15} /> Open Camera App</button>
          </div>
        )}
      </div>
      {ready && (
        <div className="p-6 pb-10 flex items-center justify-center">
          <button type="button" onClick={snap} aria-label="Take photo"
            className="rounded-full bg-white border-4 border-slate-400 active:scale-95 transition-transform flex items-center justify-center"
            style={{ width: 72, height: 72 }}>
            <Circle size={56} className="text-white fill-white" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function ImageUpload({ label, value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileRef = useRef();
  const nativeCameraRef = useRef();

  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', await shrinkImage(file));
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'farmpulse/loads');

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      onChange(data.secure_url);
    } catch (err) {
      setError('Upload failed — try again');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleFile = (e) => { uploadFile(e.target.files[0]); e.target.value = ''; };
  const handleRemove = () => { onChange(null); setError(null); };
  const openCamera = () => setCameraOpen(true);
  const useNativeCamera = () => { setCameraOpen(false); nativeCameraRef.current?.click(); };

  const isPdf = value && value.includes('.pdf');
  const isImage = value && !isPdf;

  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</div>

      {value ? (
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
            {isImage ? (
              <a href={value} target="_blank" rel="noreferrer">
                <img src={value} alt={label} className="w-full h-32 object-cover" />
              </a>
            ) : (
              <a href={value} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 hover:bg-slate-700 transition-colors">
                <FileImage size={24} className="text-soil-400 shrink-0" />
                <span className="text-sm text-slate-300 truncate">View {label}</span>
              </a>
            )}
            <button type="button" onClick={handleRemove} aria-label="Remove"
              className="absolute top-2 right-2 bg-red-900/90 hover:bg-red-800 text-white rounded-full p-1.5">
              <X size={14} />
            </button>
          </div>
          <button type="button" onClick={openCamera}
            className="flex items-center gap-1.5 text-xs text-soil-400 hover:text-soil-300">
            <RefreshCw size={12} /> Retake photo
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-700 rounded-lg p-3 text-center hover:border-slate-600 transition-colors">
          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader size={20} className="text-soil-400 animate-spin" />
              <span className="text-xs text-slate-500">Uploading…</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button type="button" onClick={openCamera}
                className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-soil-500 hover:bg-soil-400 rounded-lg text-sm font-medium text-white transition-colors">
                <Camera size={16} /> Take Photo
              </button>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition-colors">
                <Upload size={12} /> Choose from Photos / Files
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {cameraOpen && (
        <CameraModal
          onShot={(file) => { setCameraOpen(false); uploadFile(file); }}
          onClose={() => setCameraOpen(false)}
          onFallback={useNativeCamera}
        />
      )}

      {/* Hidden inputs: library/files, and the phone's own camera app as a fallback */}
      <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
      <input ref={nativeCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
    </div>
  );
}
