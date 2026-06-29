import { useState, useRef } from 'react';
import { Upload, Camera, X, FileImage, Loader } from 'lucide-react';

const CLOUD_NAME = 'dv45n8xix';
const UPLOAD_PRESET = 'ellolplu';

export default function ImageUpload({ label, value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef();
  const cameraRef = useRef();

  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
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

  const handleFile = (e) => uploadFile(e.target.files[0]);
  const handleRemove = () => { onChange(null); setError(null); };

  // Check if it's a PDF
  const isPdf = value && value.includes('.pdf');
  const isImage = value && !isPdf;

  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</div>

      {value ? (
        <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
          {isImage ? (
            <a href={value} target="_blank" rel="noreferrer">
              <img
                src={value}
                alt={label}
                className="w-full h-32 object-cover"
              />
            </a>
          ) : (
            <a href={value} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 hover:bg-slate-700 transition-colors">
              <FileImage size={24} className="text-soil-400 shrink-0" />
              <span className="text-sm text-slate-300 truncate">View {label}</span>
            </a>
          )}
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-900/80 hover:bg-red-800 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-700 rounded-lg p-4 text-center hover:border-slate-600 transition-colors">
          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader size={20} className="text-soil-400 animate-spin" />
              <span className="text-xs text-slate-500">Uploading…</span>
            </div>
          ) : (
            <>
              <div className="flex justify-center gap-3 mb-2">
                {/* File upload */}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition-colors"
                >
                  <Upload size={12} /> Upload
                </button>
                {/* Camera capture (mobile) */}
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition-colors"
                >
                  <Camera size={12} /> Camera
                </button>
              </div>
              <p className="text-xs text-slate-600">JPG, PNG, PDF accepted</p>
            </>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Hidden file inputs */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFile}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
