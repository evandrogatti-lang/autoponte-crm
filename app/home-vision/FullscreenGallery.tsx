"use client";

import { MouseEvent, useEffect, useState } from "react";
import overlay from "./fullscreen-overlay.module.css";

type Props={title:string;meta:string;image:string;onClose:()=>void};

export default function FullscreenGallery({title,meta,image,onClose}:Props){
  const[zoomed,setZoomed]=useState(false);const[point,setPoint]=useState({x:50,y:50});
  useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key!=="Escape")return;if(zoomed)setZoomed(false);else onClose()};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[zoomed,onClose]);
  function move(e:MouseEvent<HTMLDivElement>){if(!zoomed)return;const r=e.currentTarget.getBoundingClientRect();setPoint({x:Math.max(0,Math.min(100,((e.clientX-r.left)/r.width)*100)),y:Math.max(0,Math.min(100,((e.clientY-r.top)/r.height)*100))})}
  return <div className={overlay.backdrop} role="dialog" aria-modal="true" aria-label={`Galeria de ${title}`} onClick={onClose}><div className={overlay.gallery} onClick={e=>e.stopPropagation()}><div className={overlay.top}><div className={overlay.title}><b>{title}</b><span>{meta}</span></div><div className={overlay.controls}><span className={overlay.counter}>1 / 1</span><button type="button" onClick={()=>setZoomed(v=>!v)}>{zoomed?"Sair do zoom":"⌕ Zoom"}</button><button type="button" onClick={onClose}>✕ Fechar</button></div></div><div className={`${overlay.stage} ${zoomed?overlay.zoomed:""}`} onMouseMove={move} onClick={()=>setZoomed(v=>!v)}><button className={overlay.arrowLeft} type="button" aria-label="Foto anterior">‹</button><img style={zoomed?{transform:"scale(2)",transformOrigin:`${point.x}% ${point.y}%`}:undefined} src={image} alt={title}/><button className={overlay.arrowRight} type="button" aria-label="Próxima foto">›</button></div><div className={overlay.thumbs}><button className={`${overlay.thumb} ${overlay.thumbActive}`} type="button"><img src={image} alt="Foto 1"/></button><span className={overlay.hint}>As próximas fotos do anúncio aparecerão aqui.</span></div></div></div>
}
