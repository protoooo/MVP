import { useState } from "react";
import { createSession, uploadMedia, processSession, getReport } from "../utils/api";
import ProgressBar from "./ProgressBar";

export default function UploadSection() {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [reportUrl, setReportUrl] = useState(null);

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(selected.slice(0, 50)); // limit to 50 files
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    setFiles(dropped.slice(0, 50));
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setProcessing(true);
    const session = await createSession({ type: "audit", area_tags: [] });

    // Upload files sequentially or in parallel
    for (let i = 0; i < files.length; i++) {
      await uploadMedia(session.session_id, files[i]);
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }

    await processSession(session.session_id);
    const report = await getReport(session.session_id);
    setReportUrl(report.pdf_url);
    setProcessing(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-sm rounded-md border border-gray-100">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Upload Images & Videos</h2>
      
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-300 rounded-md p-6 mb-4 text-center cursor-pointer hover:border-gray-400 transition"
      >
        <input
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFiles}
          className="hidden"
          id="fileUpload"
        />
        <label htmlFor="fileUpload" className="cursor-pointer text-gray-500 hover:text-gray-700">
          Drag & drop files here or click to select
        </label>
        <p className="mt-2 text-sm text-gray-400">Up to 50 files (images or videos)</p>
      </div>

      {files.length > 0 && (
        <div className="mb-4">
          <p className="text-gray-600 mb-2">{files.length} file(s) selected</p>
          <ul className="text-gray-500 text-sm space-y-1">
            {files.map((f, idx) => <li key={idx}>{f.name}</li>)}
          </ul>
        </div>
      )}

      {processing && <ProgressBar progress={progress} />}

      <button
        onClick={handleUpload}
        disabled={processing || !files.length}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {processing ? "Processing..." : "Upload & Generate Report"}
      </button>

      {reportUrl && (
        <a
          href={reportUrl}
          download
          className="block mt-4 text-center text-indigo-600 hover:underline"
        >
          Download Report
        </a>
      )}
    </div>
  );
}
