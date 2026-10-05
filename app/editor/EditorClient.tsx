"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

// pdfjs-dist 5.x requires an explicit worker module URL in the browser.
// Bundle the matching worker with the Next.js build so production does not depend on a CDN.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
import {
  ArrowLeft, Download, FileText, MousePointer2, Type, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, Trash2, Upload, Info, CheckCircle2
} from "lucide-react";

type TextItem = {
  id: string;
  page: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  fontFamily: string;
  fontSize: number;
};

type PageInfo = { width: number; height: number; image: string };

function cleanFontName(name: string) {
  return name.replace(/^.*\+/, "").replace(/[-_](Bold|Italic|Oblique|Regular|Roman).*$/i, "").trim() || "Unknown";
}

export default function EditorPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [items, setItems] = useState<TextItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [fontStatus, setFontStatus] = useState<Record<string, boolean>>({});
  const [newText, setNewText] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadPdf = useCallback(async (file: File) => {
    setBusy(true);
    setPdfFile(file);
    const buffer = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
    const nextPages: PageInfo[] = [];
    const nextItems: TextItem[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const p = await doc.getPage(i);
      const viewport = p.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d")!;
      await p.render({ canvasContext: ctx, viewport, canvas }).promise;
      nextPages.push({ width: viewport.width, height: viewport.height, image: canvas.toDataURL("image/png") });

      const content = await p.getTextContent();
      for (const raw of content.items as any[]) {
        if (!raw.str?.trim()) continue;
        const tx = pdfjsLib.Util.transform(viewport.transform, raw.transform);
        const fontName = cleanFontName(raw.fontName || "");
        nextItems.push({
          id: `${i}-${nextItems.length}`,
          page: i,
          text: raw.str,
          x: tx[4],
          y: tx[5] - Math.abs(tx[3]),
          width: Math.max(raw.width || 10, 8),
          height: Math.max(Math.abs(tx[3]) || 12, 10),
          fontName: raw.fontName || "",
          fontFamily: fontName,
          fontSize: Math.max(Math.abs(tx[3]) || 12, 8),
        });
      }
    }
    setPages(nextPages);
    setItems(nextItems);
    setPage(1);
    setSelected(null);
    setBusy(false);
  }, []);

  useEffect(() => {
    // Browser Font Loading API: after installing a matching font, refresh/re-open
    // the editor and the browser can use the local face when it exists.
    const families = Array.from(new Set(items.map(x => x.fontFamily).filter(Boolean)));
    const status: Record<string, boolean> = {};
    for (const f of families) {
      try { status[f] = document.fonts.check(`16px "${f}"`); } catch { status[f] = false; }
    }
    setFontStatus(status);
  }, [items]);

  const selectedItem = items.find(x => x.id === selected);

  const updateSelected = (patch: Partial<TextItem>) => {
    if (!selected) return;
    setItems(prev => prev.map(x => x.id === selected ? { ...x, ...patch } : x));
  };

  const addText = () => {
    if (!newText.trim() || !pages[page - 1]) return;
    const id = `new-${Date.now()}`;
    setItems(prev => [...prev, {
      id, page, text: newText, x: 80, y: 90, width: 180, height: 28,
      fontName: "Helvetica", fontFamily: "Helvetica", fontSize: 18
    }]);
    setSelected(id);
    setNewText("");
  };

  const deleteSelected = () => {
    if (!selected) return;
    setItems(prev => prev.filter(x => x.id !== selected));
    setSelected(null);
  };

  const exportPdf = async () => {
    if (!pdfFile) return;
    setBusy(true);
    const original = await PDFDocument.load(await pdfFile.arrayBuffer());
    const out = await PDFDocument.create();
    const copied = await out.copyPages(original, original.getPages().map((_, i) => i));
    copied.forEach(p => out.addPage(p));

    // Important limitation of a browser-only editor:
    // Existing PDF text isn't safely rewritten in-place by pdf-lib.
    // We therefore overlay edited text and white-out the old text area.
    for (const p of out.getPages()) {
      const pageNum = out.getPages().indexOf(p) + 1;
      const edits = items.filter(x => x.page === pageNum);
      for (const item of edits) {
        const originalItem = item.id.startsWith("new-") ? null : items.find(x => x.id === item.id);
        // For a robust MVP, draw a white rectangle and the new text.
        // Existing text extraction gives us the approximate text box.
        p.drawRectangle({
          x: item.x / 1.5,
          y: p.getHeight() - (item.y + item.height) / 1.5,
          width: item.width / 1.5 + 6,
          height: item.height / 1.5 + 4,
          color: rgb(1, 1, 1),
          opacity: 1,
        });
        let font = await out.embedFont(StandardFonts.Helvetica);
        if (/bold/i.test(item.fontFamily)) font = await out.embedFont(StandardFonts.HelveticaBold);
        if (/italic|oblique/i.test(item.fontFamily)) font = await out.embedFont(StandardFonts.HelveticaOblique);
        p.drawText(item.text, {
          x: item.x / 1.5,
          y: p.getHeight() - (item.y + item.height) / 1.5 + 2,
          size: Math.max(item.fontSize / 1.5, 6),
          font,
          color: rgb(0, 0, 0),
        });
      }
    }

    const bytes = await out.save();
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "pdf-a2z-edited.pdf"; a.click();
    URL.revokeObjectURL(url);
    setBusy(false);
  };

  const onPick = (file?: File) => {
    if (file && file.type === "application/pdf") loadPdf(file);
  };

  if (!pdfFile) {
    return (
      <main className="editor-shell">
        <div className="editor-empty">
          <a className="back-link" href="/"><ArrowLeft size={18}/> PDF A2Z</a>
          <div className="editor-empty-card">
            <div className="editor-icon"><FileText size={34}/></div>
            <h1>Edit PDF</h1>
            <p>Upload a PDF and edit its text directly in the browser.</p>
            <label className="upload-button">
              <Upload size={18}/> Choose PDF
              <input ref={inputRef} type="file" accept="application/pdf" hidden onChange={e => onPick(e.target.files?.[0])}/>
            </label>
            <small>Files stay in your browser. Nothing is uploaded to a server.</small>
          </div>
        </div>
      </main>
    );
  }

  const current = pages[page - 1];
  const visibleItems = items.filter(x => x.page === page);

  return (
    <main className="editor-shell">
      <header className="editor-topbar">
        <a className="back-link" href="/"><ArrowLeft size={18}/><b>PDF A2Z</b></a>
        <span className="editor-title">Edit PDF</span>
        <button className="export-button" onClick={exportPdf} disabled={busy}><Download size={17}/> {busy ? "Working…" : "Download PDF"}</button>
      </header>

      <div className="editor-workspace">
        <aside className="editor-sidebar">
          <div className="side-section">
            <strong>Tools</strong>
            <button className="side-tool active"><MousePointer2 size={17}/> Select</button>
            <button className="side-tool" onClick={() => document.getElementById("newText")?.focus()}><Type size={17}/> Add text</button>
          </div>

          <div className="side-section">
            <strong>Text</strong>
            {selectedItem ? (
              <>
                <label>Text</label>
                <input value={selectedItem.text} onChange={e => updateSelected({text:e.target.value})}/>
                <label>Font detected</label>
                <div className="font-detected">
                  <span>{selectedItem.fontFamily}</span>
                  {fontStatus[selectedItem.fontFamily] ? <CheckCircle2 size={15}/> : null}
                </div>
                <small>{fontStatus[selectedItem.fontFamily] ? "Installed on this device" : "Not detected on this device. Install this font, then refresh."}</small>
                <label>Font size</label>
                <input type="number" value={Math.round(selectedItem.fontSize)} onChange={e => updateSelected({fontSize:Number(e.target.value)})}/>
                <button className="delete-tool" onClick={deleteSelected}><Trash2 size={16}/> Remove</button>
              </>
            ) : <p className="muted">Click text on the page to select it.</p>}
          </div>

          <div className="side-section">
            <strong>Add new text</strong>
            <input id="newText" placeholder="Type something…" value={newText} onChange={e=>setNewText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addText()}/>
            <button className="add-button" onClick={addText}><Type size={16}/> Add</button>
          </div>

          <div className="font-note"><Info size={16}/><span>PDF A2Z reads the PDF's embedded font metadata. If the same font is installed on your PC and the browser can detect it, its family can be used for editing.</span></div>
        </aside>

        <section className="editor-canvas-area">
          <div className="canvas-toolbar">
            <button onClick={()=>setZoom(z=>Math.max(.5,z-.1))}><ZoomOut size={17}/></button>
            <span>{Math.round(zoom*100)}%</span>
            <button onClick={()=>setZoom(z=>Math.min(2,z+.1))}><ZoomIn size={17}/></button>
          </div>
          <div className="pdf-page-wrap">
            {current && <div className="pdf-page" style={{width:current.width*zoom, height:current.height*zoom}}>
              <img src={current.image} alt={`Page ${page}`} />
              {visibleItems.map(item => (
                <div key={item.id}
                  className={`text-overlay ${selected===item.id ? "selected":""}`}
                  style={{left:item.x*zoom, top:item.y*zoom, width:item.width*zoom+8, height:item.height*zoom+4, fontFamily:`"${item.fontFamily}", Arial, sans-serif`, fontSize:item.fontSize*zoom}}
                  onClick={()=>setSelected(item.id)}>
                  {item.text}
                </div>
              ))}
            </div>}
          </div>
        </section>

        <aside className="page-sidebar">
          <strong>Pages</strong>
          {pages.map((p,i)=><button className={page===i+1?"thumb active":"thumb"} key={i} onClick={()=>setPage(i+1)}><img src={p.image}/><span>{i+1}</span></button>)}
        </aside>
      </div>

      <footer className="editor-footer">
        <button disabled={page<=1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={17}/></button>
        <span>Page {page} of {pages.length}</span>
        <button disabled={page>=pages.length} onClick={()=>setPage(p=>p+1)}><ChevronRight size={17}/></button>
      </footer>
    </main>
  );
}
