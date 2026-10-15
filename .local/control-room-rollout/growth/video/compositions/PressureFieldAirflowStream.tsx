import { Audio } from "@remotion/media";
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { getAudioTracks, type VideoInput, type VideoScene } from "../../schema";

const navy = "#071321";
const cyan = "#55d5ff";
const blue = "#0878d1";
const orange = "#ff9d42";
const white = "#f5fbff";
const base: CSSProperties = { fontFamily: "Arial, Helvetica, sans-serif", color: white };

function rise(frame: number, fps: number, delay = 0) {
  const p = spring({ frame: frame - delay, fps, config: { damping: 24, stiffness: 105 } });
  return { opacity: p, transform: `translateY(${interpolate(p, [0, 1], [34, 0])}px)` };
}

function DuctWorld({ emphasis = "both" }: { emphasis?: "both" | "pressure" | "airflow" }) {
  const frame = useCurrentFrame();
  return <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
    <div style={{ position: "absolute", inset: "350px -250px 260px", transform: "perspective(900px) rotateX(61deg)", backgroundImage: "linear-gradient(rgba(85,213,255,.12) 2px,transparent 2px),linear-gradient(90deg,rgba(85,213,255,.12) 2px,transparent 2px)", backgroundSize: "100px 100px", maskImage: "linear-gradient(to bottom,transparent,#000 18%,#000 75%,transparent)" }} />
    <div style={{ position: "absolute", top: 520, left: 70, width: 940, height: 470, border: "3px solid rgba(185,229,255,.28)", borderRadius: 90, background: "linear-gradient(90deg,rgba(8,120,209,.24),rgba(14,28,43,.65) 48%,rgba(255,157,66,.20))", boxShadow: emphasis !== "airflow" ? "inset 240px 0 180px rgba(0,116,217,.19), inset -240px 0 180px rgba(255,117,41,.14)" : "none" }}>
      <div style={{ position: "absolute", left: 404, top: 55, width: 130, height: 350, border: `4px solid ${cyan}`, borderRadius: 34, display: "grid", placeItems: "center", background: "rgba(4,18,31,.9)" }}><div style={{ transform: "rotate(-90deg)", whiteSpace: "nowrap", fontWeight: 800, letterSpacing: 4, color: cyan }}>FAN / EQUIPMENT</div></div>
      {Array.from({length: 18}, (_, i) => {
        const x = ((frame * (3.2 + i % 3) + i * 83) % 1180) - 120;
        const y = 65 + (i * 67) % 330;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: 46 + (i % 4) * 12, height: 4, borderRadius: 8, opacity: emphasis === "pressure" ? .18 : .75, background: i % 2 ? cyan : white, boxShadow: `0 0 15px ${cyan}` }} />;
      })}
    </div>
  </div>;
}

function Label({ children }: { children: ReactNode }) {
  return <div style={{ display: "inline-block", padding: "12px 20px", border: `1px solid ${cyan}`, borderRadius: 999, color: cyan, background: "rgba(7,19,33,.75)", fontSize: 24, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase" }}>{children}</div>;
}

function Text({ scene, compact = false }: { scene: VideoScene; compact?: boolean }) {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  return <div style={{ position: "absolute", zIndex: 5, top: compact ? 210 : 230, left: 68, right: 68 }}>
    <div style={rise(frame, fps)}><Label>{scene.eyebrow}</Label></div>
    <h1 style={{ ...rise(frame, fps, 5), margin: "30px 0 0", fontSize: compact ? 68 : 100, lineHeight: 1.02, letterSpacing: -4, maxWidth: 930 }}>{scene.title}</h1>
    {scene.body && <p style={{ ...rise(frame, fps, 11), margin: "30px 0 0", maxWidth: 890, fontSize: 38, lineHeight: 1.35, color: "#c6d6e4", fontWeight: 600 }}>{scene.body}</p>}
  </div>;
}

function Hook({ scene }: { scene: VideoScene }) { return <AbsoluteFill style={{...base, background: navy}}><DuctWorld/><Text scene={scene}/><div style={{position:"absolute",left:70,right:70,bottom:250,fontSize:30,color:"#9fb7ca",fontWeight:700}}>Pressure field <span style={{color:orange}}>≠</span> airflow stream</div></AbsoluteFill>; }
function Concept({ scene }: { scene: VideoScene }) { return <AbsoluteFill style={{...base,background:navy}}><DuctWorld/><Text scene={scene} compact/><div style={{position:"absolute",zIndex:5,left:100,right:100,bottom:250,display:"flex",justifyContent:"space-between",fontSize:27,fontWeight:800}}><span style={{color:blue}}>PRESSURE FIELD</span><span style={{color:cyan}}>MOVING AIR</span></div><Note text={scene.sourceNote}/></AbsoluteFill>; }

function Example({ scene }: { scene: VideoScene }) {
  const frame=useCurrentFrame(); const {fps}=useVideoConfig();
  return <AbsoluteFill style={{...base,background:"radial-gradient(circle at 50% 68%,#12314c,#071321 62%)"}}><Text scene={scene} compact/><div style={{position:"absolute",top:700,left:70,right:70,display:"grid",gap:22}}>{scene.values?.map((v,i)=><div key={v.label} style={{...rise(frame,fps,8+i*5),display:"flex",justifyContent:"space-between",padding:"28px 32px",border:"1px solid rgba(160,214,248,.25)",borderRadius:24,background:"rgba(13,35,53,.86)",fontSize:32}}><span style={{color:"#a9bfd0"}}>{v.label}</span><b style={{color:i===2?orange:cyan}}>{v.value}</b></div>)}</div><div style={{...rise(frame,fps,26),position:"absolute",left:70,right:70,bottom:300,padding:34,borderRadius:28,background:white,color:navy,textAlign:"center",fontSize:42,fontWeight:900}}>{scene.formula}</div><Note text={scene.sourceNote}/></AbsoluteFill>;
}

function Warning({ scene }: { scene: VideoScene }) { const frame=useCurrentFrame(); const {fps}=useVideoConfig(); return <AbsoluteFill style={{...base,background:navy}}><DuctWorld emphasis="pressure"/><Text scene={scene} compact/><div style={{...rise(frame,fps,18),position:"absolute",zIndex:6,left:70,right:70,bottom:330,padding:"32px 36px",borderLeft:`7px solid ${orange}`,background:"rgba(7,19,33,.9)",fontSize:31,lineHeight:1.45,fontWeight:700}}>TESP supports evaluation—it is not a direct CFM reading.</div><Note text={scene.sourceNote}/></AbsoluteFill>; }
function End({ scene, logoPath }: { scene:VideoScene; logoPath:string }) { const frame=useCurrentFrame(); const {fps}=useVideoConfig(); return <AbsoluteFill style={{...base,background:"linear-gradient(150deg,#0878d1,#043e73 62%,#071321)",justifyContent:"center",padding:70}}><div style={{...rise(frame,fps),width:150,height:150,padding:16,borderRadius:30,background:white,boxShadow:"0 18px 50px rgba(0,0,0,.22)"}}><Img src={staticFile(logoPath)} style={{width:"100%",height:"100%",objectFit:"contain"}}/></div><h1 style={{...rise(frame,fps,6),fontSize:80,lineHeight:1.05,letterSpacing:-4,margin:"45px 0"}}>{scene.title}</h1><div style={{...rise(frame,fps,12),padding:"28px 32px",borderRadius:22,background:white,color:blue,fontSize:28,fontWeight:850,overflowWrap:"anywhere"}}>{scene.body}</div></AbsoluteFill>; }
function Note({text}:{text?:string}) { return text ? <div style={{position:"absolute",zIndex:8,left:70,right:70,bottom:110,color:"#819bb0",fontSize:22,lineHeight:1.35,fontWeight:650}}>{text}</div> : null; }

export function PressureFieldAirflowStream(input: VideoInput) {
  const timed=input.scenes.map((scene,index)=>({scene,from:input.scenes.slice(0,index).reduce((total,item)=>total+item.durationSeconds*input.fps,0),duration:scene.durationSeconds*input.fps}));
  return <AbsoluteFill style={{...base,background:navy}}>{timed.map(({scene,from,duration})=><Sequence key={scene.id} from={from} durationInFrames={duration}>{scene.kind==="hook"?<Hook scene={scene}/>:scene.kind==="concept"?<Concept scene={scene}/>:scene.kind==="example"?<Example scene={scene}/>:scene.kind==="warning"?<Warning scene={scene}/>:<End scene={scene} logoPath={input.logoPath}/>}</Sequence>)}<div style={{position:"absolute",zIndex:20,top:42,right:42,padding:"10px 16px",borderRadius:999,background:"rgba(7,19,33,.72)",color:"#aac2d4",fontSize:18,fontWeight:800,letterSpacing:2}}>CONCEPTUAL</div>{getAudioTracks(input.audio).map((track,i)=><Audio key={`${track.role}-${i}`} src={staticFile(track.path)} volume={track.volume}/>)}</AbsoluteFill>;
}
