import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// --- THE FIX: Import the worker locally ---
// This tells Vite to bundle the worker file so we don't need a CDN link.
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Apply the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import { CloudArrowUpIcon, DocumentTextIcon, PlayCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

// ⚠️ STEP 2: Use Localhost first to test. 
// Once this works, you can change it back to your Render link.
const BACKEND_URL = "http://127.0.0.1:3000/convert";

function App() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("idle"); 
  const [statusMsg, setStatusMsg] = useState("");

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setStatus("reading");
    setStatusMsg("Scanning document...");

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const typedarray = new Uint8Array(ev.target.result);
        
        // Load the PDF
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        
        let fullText = "";
        const maxPages = Math.min(pdf.numPages, 30);
        
        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map(item => item.str).join(" ") + " ";
        }
        
        setText(fullText);
        setStatus("idle");
        setStatusMsg(`Ready to convert ${maxPages} pages.`);
      } catch (err) {
        console.error("PDF Error:", err);
        setStatus("error");
        setStatusMsg("Failed to read PDF. Check console (F12) for details.");
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleConvert = async () => {
    setStatus("processing");
    setStatusMsg("Brewing your audio...");

    try {
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("Server error");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace('.pdf', '')}_audio.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setStatus("done");
      setStatusMsg("Download started!");
    } catch (err) {
      console.error("Server Error:", err);
      setStatus("error");
      setStatusMsg("Server is asleep or offline.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <nav className="max-w-5xl mx-auto p-6 flex justify-between items-center">
        <div className="font-bold text-xl text-indigo-600 flex items-center gap-2">
          <span>🎧 ireadpdf</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pt-12 pb-20 text-center">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-6">
          Stop Reading. <span className="text-indigo-600">Start Listening.</span>
        </h1>
        
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 md:p-12">
          {!file && (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-10 relative group">
              <input type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <CloudArrowUpIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="font-semibold text-slate-700">Click to upload notes</p>
            </div>
          )}

          {file && (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-3 bg-indigo-50 py-3 px-4 rounded-lg">
                <DocumentTextIcon className="w-5 h-5 text-indigo-600" />
                <span className="font-medium truncate max-w-xs">{file.name}</span>
                <button onClick={() => { setFile(null); setText(""); setStatus("idle"); }} className="text-xs text-red-500 underline ml-2">Remove</button>
              </div>

              {status === 'processing' || status === 'reading' ? (
                 <button disabled className="w-full py-4 bg-slate-100 text-slate-400 font-bold rounded-xl flex items-center justify-center gap-2">
                   <ArrowPathIcon className="w-5 h-5 animate-spin" /> {statusMsg}
                 </button>
              ) : (
                <button onClick={handleConvert} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                  <PlayCircleIcon className="w-6 h-6" /> Convert to MP3
                </button>
              )}
              
              {status === 'error' && <div className="text-red-500 font-medium bg-red-50 p-3 rounded-lg">⚠️ {statusMsg}</div>}
              {status === 'done' && <div className="text-green-600 font-medium bg-green-50 p-3 rounded-lg"> Check your downloads!</div>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;