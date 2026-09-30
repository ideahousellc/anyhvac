import { Audio } from "@remotion/media";
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export type DuctSizeVideoInput = {
  campaignId: string; videoId: string; width: number; height: number; fps: number; durationSeconds: number;
  calculatorImage: string; logoPath: string; destinationUrl: string;
  music: { path: string; volume: number }; sfx: { path: string; volume: number };
};

const ink="#f7fbff", navy="#050d18", cyan="#4fd5ff", orange="#ff8c42", blue="#0878d1";
const base:CSSProperties={fontFamily:"Arial,Helvetica,sans-serif",color:ink};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const range=(frame:number,start:number,end:number)=>clamp((frame-start)/(end-start));

function BeatText({children,frame,start,style}:{children:ReactNode;frame:number;start:number;style?:CSSProperties}) {
  const {fps}=useVideoConfig(); const p=spring({frame:frame-start,fps,config:{damping:18,stiffness:180,mass:.55}});
  return <div style={{opacity:p,transform:`translateY(${interpolate(p,[0,1],[42,0])}px) scale(${interpolate(p,[0,1],[.92,1])})`,...style}}>{children}</div>;
}

function AirStream({frame,speed=1,spread=1}:{frame:number;speed?:number;spread?:number}) {
  return <>{Array.from({length:34},(_,i)=>{const depth=((frame*speed*5+i*43)%1150)-80;const y=960+Math.sin(i*2.7)*330*spread;const scale=.25+(depth+80)/1150;return <div key={i} style={{position:"absolute",zIndex:4,left:540+Math.sin(i*1.9)*380*scale,top:y+(i%3-1)*90,width:18+75*scale,height:3+5*scale,borderRadius:20,background:i%4===0?ink:cyan,opacity:.18+.72*scale,transform:`translateX(${depth-520}px)`,boxShadow:`0 0 ${8+18*scale}px ${cyan}`}}/>})}</>;
}

function Tunnel({frame,narrow=0,hot=0}:{frame:number;narrow?:number;hot?:number}) {
  const inset=70+narrow*220; const drift=Math.sin(frame/25)*12;
  return <AbsoluteFill style={{overflow:"hidden",background:`radial-gradient(circle at 50% 50%,#17304a 0%,${navy} 66%)`}}>
    <div style={{position:"absolute",inset:`${180+narrow*120}px ${inset}px ${180+narrow*120}px`,border:`${8+hot*6}px solid rgba(${hot?"255,140,66":"79,213,255"},${.38+hot*.25})`,borderRadius:80-narrow*30,transform:`perspective(850px) rotate(${drift/18}deg) scale(${1+Math.sin(frame/18)*.012})`,boxShadow:`inset 0 0 180px rgba(8,120,209,.25),0 0 ${50+hot*80}px rgba(255,140,66,${hot*.22})`,backgroundImage:"linear-gradient(rgba(79,213,255,.08) 2px,transparent 2px),linear-gradient(90deg,rgba(79,213,255,.08) 2px,transparent 2px)",backgroundSize:"92px 92px"}}/>
    <AirStream frame={frame} speed={1+narrow*1.35} spread={1-narrow*.38}/>
    <div style={{position:"absolute",top:52,right:52,padding:"10px 16px",border:"1px solid rgba(79,213,255,.5)",borderRadius:999,color:cyan,fontSize:18,fontWeight:850,letterSpacing:3}}>CONCEPTUAL</div>
  </AbsoluteFill>;
}

function Intro({frame}:{frame:number}) {
  const narrow=range(frame,30,84);
  return <AbsoluteFill><Tunnel frame={frame} narrow={narrow}/><div style={{position:"absolute",zIndex:10,left:64,right:64,top:250}}>
    <BeatText frame={frame} start={0} style={{fontSize:96,fontWeight:900,letterSpacing:-5}}>Same airflow.</BeatText>
    {frame>=30&&<BeatText frame={frame} start={30} style={{fontSize:96,fontWeight:900,letterSpacing:-5,color:orange,marginTop:14}}>Smaller duct.</BeatText>}
    {frame>=58&&<BeatText frame={frame} start={58} style={{fontSize:42,fontWeight:800,marginTop:34}}>What changes?</BeatText>}
  </div></AbsoluteFill>;
}

function Compare({frame}:{frame:number}) {
  const local=frame-90; return <AbsoluteFill style={{background:navy}}><div style={{position:"absolute",inset:0,display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,padding:"280px 34px 250px"}}>
    {[0,1].map(side=><div key={side} style={{position:"relative",overflow:"hidden",border:`3px solid ${side?orange:cyan}`,borderRadius:44,transform:`scale(${side?0.82:1})`,background:"radial-gradient(circle,#17304a,#07101c)"}}><AirStream frame={local} speed={side?2.25:1} spread={side?.55:.9}/><div style={{position:"absolute",bottom:30,left:0,right:0,textAlign:"center",fontSize:28,fontWeight:900}}>{side?"SMALLER AREA":"LARGER AREA"}</div></div>)}
  </div><div style={{position:"absolute",zIndex:9,left:55,right:55,top:120,textAlign:"center"}}><BeatText frame={frame} start={90} style={{fontSize:76,fontWeight:900}}>Less area.</BeatText><BeatText frame={frame} start={126} style={{fontSize:76,fontWeight:900,color:orange}}>Higher velocity.</BeatText></div><div style={{position:"absolute",bottom:110,left:80,right:80,textAlign:"center",fontSize:24,color:"#a8bed0",fontWeight:700}}>Same airflow • qualitative comparison</div></AbsoluteFill>;
}

function Friction({frame}:{frame:number}) {const local=frame-210;const pulse=.45+.55*Math.abs(Math.sin(local/7));return <AbsoluteFill><Tunnel frame={local} narrow={.72} hot={pulse}/><div style={{position:"absolute",zIndex:10,left:64,right:64,top:230}}><BeatText frame={frame} start={210} style={{fontSize:82,fontWeight:900}}>Friction changes too.</BeatText><BeatText frame={frame} start={258} style={{fontSize:34,lineHeight:1.3,fontWeight:750,color:"#c4d3df",maxWidth:820}}>Same airflow. Comparable duct conditions.</BeatText></div><div style={{position:"absolute",zIndex:10,left:64,right:64,bottom:180,display:"flex",justifyContent:"space-between",fontSize:30,fontWeight:900}}><span>AREA</span><span style={{color:cyan}}>VELOCITY</span><span style={{color:orange}}>FRICTION</span></div></AbsoluteFill>}

function Connect({frame}:{frame:number}) {const local=frame-330;const morph=.5+.45*Math.sin(local/12);return <AbsoluteFill><Tunnel frame={local} narrow={morph}/><div style={{position:"absolute",zIndex:10,left:60,right:60,top:190}}><BeatText frame={frame} start={330} style={{fontSize:72,fontWeight:900}}>Space.</BeatText><BeatText frame={frame} start={360} style={{fontSize:72,fontWeight:900,color:cyan}}>Velocity.</BeatText><BeatText frame={frame} start={390} style={{fontSize:72,fontWeight:900,color:orange}}>Friction.</BeatText><BeatText frame={frame} start={414} style={{marginTop:36,fontSize:42,fontWeight:850}}>Sizing connects them.</BeatText></div></AbsoluteFill>}

function CalculatorReveal({frame,input}:{frame:number;input:DuctSizeVideoInput}) {const local=frame-450;const open=range(local,0,95);const settle=range(local,95,150);return <AbsoluteFill style={{background:navy,overflow:"hidden"}}><div style={{position:"absolute",inset:0,transform:`scale(${1.7-open*.7})`,opacity:open}}><Img src={staticFile(input.calculatorImage)} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"54% top",filter:"saturate(.95) contrast(1.03)"}}/></div><div style={{position:"absolute",zIndex:5,inset:0,background:`radial-gradient(circle at 50% 48%,transparent ${open*70}%,${navy} ${open*70+8}%)`}}/><div style={{position:"absolute",zIndex:8,left:55,right:55,bottom:170,opacity:settle,padding:"24px 28px",borderRadius:24,background:"rgba(5,13,24,.88)",fontSize:35,fontWeight:850}}>The design point needs context.</div></AbsoluteFill>}

function Calculator({frame,input}:{frame:number;input:DuctSizeVideoInput}) {const local=frame-600;const left=interpolate(local,[0,150],[-10,-360],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});const top=interpolate(local,[0,150],[330,210],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});return <AbsoluteFill style={{background:"#eef1f5",overflow:"hidden"}}><Img src={staticFile(input.calculatorImage)} style={{position:"absolute",width:1450,height:"auto",left,top,filter:"saturate(.96) contrast(1.02)",boxShadow:"0 28px 80px rgba(18,35,51,.28)"}}/><div style={{position:"absolute",inset:0,boxShadow:"inset 0 0 150px rgba(5,13,24,.42)"}}/><div style={{position:"absolute",left:48,right:48,top:95,padding:"22px 28px",borderRadius:24,background:"rgba(5,13,24,.9)",fontSize:40,fontWeight:900}}>Real calculator. Real design inputs.</div><div style={{position:"absolute",left:48,right:48,bottom:105,padding:"20px 26px",borderLeft:`7px solid ${blue}`,background:"rgba(255,255,255,.94)",color:"#172433",fontSize:29,fontWeight:800}}>Airflow • friction rate • round + rectangular options</div></AbsoluteFill>}

function End({frame,input}:{frame:number;input:DuctSizeVideoInput}) {return <AbsoluteFill style={{...base,background:`linear-gradient(145deg,${blue},#043c70 58%,${navy})`,padding:"260px 64px",justifyContent:"center"}}><BeatText frame={frame} start={750}><div style={{width:130,height:130,padding:14,borderRadius:28,background:"white"}}><Img src={staticFile(input.logoPath)} style={{width:"100%",height:"100%",objectFit:"contain"}}/></div></BeatText><BeatText frame={frame} start={758} style={{fontSize:90,fontWeight:900,letterSpacing:-5,marginTop:48}}>Size it faster.</BeatText><BeatText frame={frame} start={770} style={{fontSize:40,fontWeight:800,color:"#d5edff",marginTop:22}}>Free. No signup.</BeatText><BeatText frame={frame} start={782} style={{marginTop:52,padding:"26px 28px",borderRadius:22,background:"white",color:blue,fontSize:28,fontWeight:900,overflowWrap:"anywhere"}}>AnyHVAC.net/tools/duct-calculator</BeatText></AbsoluteFill>}

export function DuctSizeMatters(input:DuctSizeVideoInput) {const frame=useCurrentFrame();let scene:ReactNode;if(frame<90)scene=<Intro frame={frame}/>;else if(frame<210)scene=<Compare frame={frame}/>;else if(frame<330)scene=<Friction frame={frame}/>;else if(frame<450)scene=<Connect frame={frame}/>;else if(frame<600)scene=<CalculatorReveal frame={frame} input={input}/>;else if(frame<750)scene=<Calculator frame={frame} input={input}/>;else scene=<End frame={frame} input={input}/>;return <AbsoluteFill style={base}>{scene}<Audio src={staticFile(input.music.path)} volume={input.music.volume}/><Audio src={staticFile(input.sfx.path)} volume={input.sfx.volume}/></AbsoluteFill>}
