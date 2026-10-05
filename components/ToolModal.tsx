 "use client";
import { useRef, useState } from "react";
import { X, Upload, Download, Loader2, FileText } from "lucide-react";
import { PDFDocument } from "pdf-lib";

type Props={tool:string;onClose:()=>void};

async function downloadBlob(blob:Blob,name:string){
  const url=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function ToolModal({tool,onClose}:Props){
  const input=useRef<HTMLInputElement>(null); const [files,setFiles]=useState<File[]>([]);
  const [busy,setBusy]=useState(false); const [done,setDone]=useState<string|null>(null); const [error,setError]=useState("");

  const title={"merge":"Merge PDF","split":"Split PDF","compress":"Compress PDF","jpg-pdf":"JPG to PDF","pdf-jpg":"PDF to JPG"}[tool]||"PDF Tool";
  const accept=tool==="jpg-pdf"?"image/jpeg,image/png":".pdf";
  const multi=tool==="merge"||tool==="jpg-pdf";

  async function process(){
    setError("");setDone(null);setBusy(true);
    try{
      if(!files.length) throw new Error("Please choose a file first.");
      if(tool==="merge"){
        const out=await PDFDocument.create();
        for(const f of files){const src=await PDFDocument.load(await f.arrayBuffer());const pages=await out.copyPages(src,src.getPageIndices());pages.forEach(p=>out.addPage(p));}
        await downloadBlob(new Blob([await out.save()],{type:"application/pdf"}),"pdf-a2z-merged.pdf");
      } else if(tool==="split"){
        const src=await PDFDocument.load(await files[0].arrayBuffer()); const out=await PDFDocument.create();
        const page=src.getPage(0); const [p]=await out.copyPages(src,[0]); out.addPage(p);
        await downloadBlob(new Blob([await out.save()],{type:"application/pdf"}),"pdf-a2z-page-1.pdf");
      } else if(tool==="jpg-pdf"){
        const out=await PDFDocument.create();
        for(const f of files){const bytes=new Uint8Array(await f.arrayBuffer());let img;
          if(f.type==="image/png") img=await out.embedPng(bytes); else img=await out.embedJpg(bytes);
          const page=out.addPage([img.width,img.height]);page.drawImage(img,{x:0,y:0,width:img.width,height:img.height});
        }
        await downloadBlob(new Blob([await out.save()],{type:"application/pdf"}),"pdf-a2z-images.pdf");
      } else if(tool==="compress"){
        const src=await PDFDocument.load(await files[0].arrayBuffer()); const bytes=await src.save({useObjectStreams:true});
        await downloadBlob(new Blob([bytes],{type:"application/pdf"}),"pdf-a2z-compressed.pdf");
      } else if(tool==="pdf-jpg"){
        throw new Error("PDF to JPG engine is being added in the next build.");
      }
      setDone("Done — your file is ready.");
    }catch(e){setError(e instanceof Error?e.message:"Something went wrong.");}
    finally{setBusy(false);}
  }

  return <div className="overlay"><div className="modal">
    <button className="close" onClick={onClose}><X/></button>
    <div className="modalIcon"><FileText/></div><h2>{title}</h2>
    <p className="modalSub">{tool==="merge"?"Select two or more PDF files to combine.":tool==="jpg-pdf"?"Select one or more JPG/PNG images.":"Choose a PDF file to process."}</p>
    <input ref={input} type="file" accept={accept} multiple={multi} hidden onChange={e=>setFiles(Array.from(e.target.files||[]))}/>
    <button className="drop" onClick={()=>input.current?.click()}><Upload/><b>Choose {tool==="jpg-pdf"?"images":"PDF"}</b><span>or click to browse</span></button>
    {files.length>0 && <div className="fileList">{files.map((f,i)=><div key={i}>{f.name}<span>{Math.round(f.size/1024)} KB</span></div>)}</div>}
    {error&&<div className="error">{error}</div>}{done&&<div className="success">{done}</div>}
    <button className="process" disabled={busy||!files.length} onClick={process}>{busy?<><Loader2 className="spin"/>Processing...</>:<><Download size={18}/> Process & Download</>}</button>
    <small>Processing is done locally in your browser.</small>
  </div></div>
}