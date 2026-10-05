 "use client";
import { useState } from "react";
import { FileText, Merge, Scissors, Minimize2, Image as ImageIcon, ArrowRight, ShieldCheck, Zap, Lock, Upload } from "lucide-react";
import { ToolModal } from "../components/ToolModal";

const tools = [
  { name: "Edit PDF", description: "Edit text, detect fonts, add text, and download.", icon: "edit", href: "/editor" },
  {id:"merge", title:"Merge PDF", desc:"Combine multiple PDFs into one document.", icon:Merge},
  {id:"split", title:"Split PDF", desc:"Extract selected pages from a PDF.", icon:Scissors},
  {id:"compress", title:"Compress PDF", desc:"Reduce PDF size in your browser.", icon:Minimize2},
  {id:"jpg-pdf", title:"JPG to PDF", desc:"Turn images into a PDF document.", icon:ImageIcon},
  {id:"pdf-jpg", title:"PDF to JPG", desc:"Convert PDF pages into JPG images.", icon:FileText},
];

export default function Home() {
  const [active,setActive]=useState<string|null>(null);
  return <main>
    <header className="nav">
      <a className="brand" href="#"><span className="brandMark">A2Z</span><span>PDF A2Z</span></a>
      <nav><a href="#tools">PDF Tools</a><a href="#about">Why PDF A2Z</a></nav>
    </header>

    <section className="hero">
      <div className="eyebrow">FREE PDF TOOLS · FAST · PRIVATE</div>
      <h1>All your PDF tools,<br/><span>from A to Z.</span></h1>
      <p>Merge, split, compress and convert PDFs without uploading your files to a server. Simple, fast and free.</p>
      <a className="primary" href="#tools">Explore PDF Tools <ArrowRight size={18}/></a>
      <div className="privacy"><Lock size={15}/> Your files stay on your device</div>
    </section>

    <section id="tools" className="section">
      <div className="sectionHead"><div><div className="eyebrow">PDF A2Z TOOLKIT</div><h2>What do you want to do?</h2></div><span className="count">5 tools</span></div>
      <div className="grid">
        {tools.map(t=>{const Icon=t.icon; return <button className="toolCard" key={t.id} onClick={()=>setActive(t.id)}>
          <div className="iconBox"><Icon size={24}/></div><div className="toolText"><h3>{t.title}</h3><p>{t.desc}</p></div><ArrowRight className="cardArrow" size={19}/>
        </button>})}
      </div>
    </section>

    <section id="about" className="why">
      <div><div className="eyebrow">BUILT FOR EVERYONE</div><h2>PDF work should be simple.</h2><p>PDF A2Z is designed as a lightweight alternative to complicated PDF software. No account required for the core tools.</p></div>
      <div className="features">
        <div><Zap/><b>Fast</b><span>Processing happens in your browser.</span></div>
        <div><ShieldCheck/><b>Private</b><span>Your files don't need to leave your device.</span></div>
        <div><Lock/><b>Free</b><span>No subscription required for core tools.</span></div>
      </div>
    </section>

    <footer><div className="brand"><span className="brandMark">A2Z</span><span>PDF A2Z</span></div><span>© 2026 PDF A2Z</span></footer>
    {active && <ToolModal tool={active} onClose={()=>setActive(null)}/>}
  </main>
}