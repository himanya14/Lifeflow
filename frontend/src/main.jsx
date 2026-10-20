
import React, {useEffect, useMemo, useState} from "react";
import {createRoot} from "react-dom/client";
import {
  Droplets, ShieldCheck, HeartPulse, Bell, MapPin, Clock3, Activity, UserRound, LogOut,
  ChevronRight, CheckCircle2, XCircle, AlertTriangle, Navigation, FileText, Stethoscope,
  CalendarDays, CircleDot, Route, Settings, History, Download, RefreshCw, LockKeyhole,
  Search, BadgeCheck, Radio, TimerReset, Hospital, Phone, ClipboardCheck
} from "lucide-react";
import {api, hospitalApi} from "./api";
import "./styles.css";

const fmtDate = (s) => s ? new Date(s+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const fmtDT = (s) => s ? new Date(s).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}) : "—";

const POLL_MS = 5000;

function useBackendSync(){
  const [state,setState] = useState({online:false,lastSync:null,serverTime:null});
  useEffect(()=>{
    let active=true;
    const check=async()=>{
      try{
        const t=await api.time();
        if(active)setState({online:true,lastSync:new Date(),serverTime:new Date(t.utc)});
      }catch{
        if(active)setState(s=>({...s,online:false}));
      }
    };
    check();
    const id=setInterval(check,POLL_MS);
    return ()=>{active=false;clearInterval(id)};
  },[]);
  return state;
}

function SyncStatus(){
  const sync=useBackendSync();
  const [tick,setTick]=useState(0);
  useEffect(()=>{const id=setInterval(()=>setTick(x=>x+1),1000);return()=>clearInterval(id)},[]);
  const ago = sync.lastSync ? Math.max(0,Math.floor((Date.now()-sync.lastSync.getTime())/1000)) : null;
  return <div className={"syncStatus "+(sync.online?"online":"offline")}>
    <span className="syncDot"></span>
    <div>
      <b>{sync.online?"Backend connected":"Backend offline"}</b>
      <small>{sync.online ? `Synced ${ago}s ago · ${sync.serverTime?.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"}) || ""}` : "Waiting for FastAPI"}</small>
    </div>
  </div>
}

function App(){
  const [token,setToken] = useState(localStorage.getItem("lifeflow_token"));
  const [page,setPage] = useState("overview");
  const [donor,setDonor] = useState(null);
  const [toast,setToast] = useState("");
  useEffect(()=>{
    if(token) api.me().then(setDonor).catch(()=>{localStorage.removeItem("lifeflow_token");setToken(null);});
  },[token]);
  const notify=(m)=>{setToast(m);setTimeout(()=>setToast(""),2800)};
  if(!token) return <Auth onAuth={(t,d)=>{localStorage.setItem("lifeflow_token",t);setToken(t);setDonor(d)}}/>;
  if(!donor) return <div className="loading">Loading donor record…</div>;
  return <Shell donor={donor} page={page} setPage={setPage} notify={notify} onDonor={setDonor} onLogout={()=>{localStorage.removeItem("lifeflow_token");setToken(null)}} toast={toast}/>;
}

function Auth({onAuth}){
  const [mode,setMode]=useState("login");
  const [form,setForm]=useState({name:"",email:"aarav@lifeflow.com",password:"lifeflow123",blood_group:"B+",phone:"",city:"Hyderabad"});
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const submit=async(e)=>{
    e.preventDefault(); setError(""); setBusy(true);
    try{
      const data = mode==="login" ? await api.login({email:form.email,password:form.password}) : await api.register(form);
      onAuth(data.token,data.donor);
    }catch(err){setError(err.message)} finally{setBusy(false)}
  };
  return <div className="auth">
    <header className="authTop">
      <Brand/>
      <span className="prototypeTag"><a href="/hospital" style={{color:"inherit",textDecoration:"none"}}>Hospital portal ↗</a> &nbsp;·&nbsp; Donor services prototype</span>
    </header>
    <main className="authGrid">
      <section className="authHero">
        <div>
          <span className="eyebrow light">LIFEFLOW DONOR SERVICES</span>
          <h1>Donation readiness,<br/>in one clear record.</h1>
          <p>Pre-screen your health, track recovery, understand why you are matched, and respond to compatible emergency requests.</p>
        </div>
        <div className="heroPoints">
          <HeroPoint icon={<Stethoscope/>} title="Explainable pre-screening" text="Every result shows the safety rule behind it."/>
          <HeroPoint icon={<TimerReset/>} title="Recovery-aware" text="Automatic 56 / 112 day interval protection."/>
          <HeroPoint icon={<Radio/>} title="Emergency matching" text="Compatible requests filtered by eligibility and radius."/>
        </div>
      </section>
      <section className="authPanel">
        <div className="authCard">
          <span className="eyebrow">DONOR ACCESS</span>
          <h2>{mode==="login"?"Sign in":"Create donor account"}</h2>
          <p>{mode==="login"?"Use the demo account to open the donor workspace.":"Create a prototype donor profile."}</p>
          {error&&<div className="errorBox">{error}</div>}
          <form onSubmit={submit} className="formStack">
            {mode==="register"&&<><Field label="Full name"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></Field>
              <div className="twoCols"><Field label="Blood group"><select value={form.blood_group} onChange={e=>setForm({...form,blood_group:e.target.value})}>{["O-","O+","A-","A+","B-","B+","AB-","AB+"].map(x=><option key={x}>{x}</option>)}</select></Field>
              <Field label="City"><input value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></Field></div></>}
            <Field label="Email"><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/></Field>
            <Field label="Password"><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required/></Field>
            <button className="primaryBtn" disabled={busy}>{busy?"Please wait…":mode==="login"?"Sign in":"Register"}</button>
          </form>
          <button className="textBtn" onClick={()=>setMode(mode==="login"?"register":"login")}>{mode==="login"?"New donor? Create account":"Already registered? Sign in"}</button>
          {mode==="login"&&<div className="demoAccountSection">
            <div className="demoSectionHeading"><b>Donor demo accounts</b><span>Choose an account to sign in instantly</span></div>
            <div className="demoAccountGrid">
              {[
                {name:"Aarav Sharma",blood:"B+",email:"aarav@lifeflow.com",password:"lifeflow123"},
                {name:"Nisha Reddy",blood:"O−",email:"nisha.o.neg@lifeflow.com",password:"donor123"},
                {name:"Kabir Mehta",blood:"O+",email:"kabir.o.pos@lifeflow.com",password:"donor123"},
                {name:"Meera Iyer",blood:"A−",email:"meera.a.neg@lifeflow.com",password:"donor123"},
                {name:"Arjun Rao",blood:"A+",email:"arjun.a.pos@lifeflow.com",password:"donor123"},
                {name:"Zoya Khan",blood:"B−",email:"zoya.b.neg@lifeflow.com",password:"donor123"},
                {name:"Ishaan Das",blood:"AB−",email:"ishaan.ab.neg@lifeflow.com",password:"donor123"},
                {name:"Tara Shah",blood:"AB+",email:"tara.ab.pos@lifeflow.com",password:"donor123"}
              ].map(account=><button type="button" className="demoAccountCard" key={account.email} disabled={busy} onClick={async()=>{setError("");setBusy(true);try{const data=await api.login({email:account.email,password:account.password});onAuth(data.token,data.donor)}catch(err){setForm({...form,email:account.email,password:account.password});setError(err.message)}finally{setBusy(false)}}}>
                <span className="demoBloodBadge">{account.blood}</span><span className="demoAccountInfo"><b>{account.name}</b><small>{account.email}</small><small>Password: {account.password}</small></span><span className="demoLoginArrow">↗</span>
              </button>)}
            </div>
          </div>}

        </div>
      </section>
    </main>
  </div>
}
function HeroPoint({icon,title,text}){return <div className="heroPoint"><div className="heroIcon">{icon}</div><div><b>{title}</b><span>{text}</span></div></div>}
function Field({label,children}){return <label className="field"><span>{label}</span>{children}</label>}

const navItems=[
  ["overview","Overview",HeartPulse],["map","Interactive map",MapPin],["screening","Health Screening",Stethoscope],["eligibility","Eligibility",ShieldCheck],
  ["emergencies","Emergencies",Radio],["donations","Donations",Droplets],["activity","Activity",History],["profile","Health record",FileText]
];

function Shell({donor,page,setPage,notify,onDonor,onLogout,toast}){
  useEffect(()=>{
    let active=true;
    const syncDonor=async()=>{try{const d=await api.me();if(active)onDonor(d)}catch{}};
    const id=setInterval(syncDonor,POLL_MS);
    return ()=>{active=false;clearInterval(id)};
  },[onDonor]);
  return <div className="app">
    <header className="topbar">
      <Brand/>
      <nav>{navItems.map(([id,label,I])=><button key={id} className={page===id?"active":""} onClick={()=>setPage(id)}><I size={17}/>{label}</button>)}</nav>
      <div className="topActions">
        <SyncStatus/>
        <button className="iconBtn" onClick={()=>setPage("notifications")}><Bell size={19}/></button>
        <button className="profileMini" onClick={()=>setPage("profile")}><span>{donor.name.split(" ").map(x=>x[0]).join("").slice(0,2)}</span><div><b>{donor.donor_code}</b><small>{donor.blood_group}</small></div></button>
        <button className="iconBtn" onClick={onLogout}><LogOut size={18}/></button>
      </div>
    </header>
    <main className="workspace">
      {page==="overview"&&<Overview donor={donor} setPage={setPage}/>}
      {page==="map"&&<DonorInteractiveMap donor={donor} notify={notify}/>}
      {page==="screening"&&<ScreeningPage notify={notify} setPage={setPage}/>}
      {page==="eligibility"&&<EligibilityPage donor={donor}/>}
      {page==="emergencies"&&<EmergenciesPage donor={donor} notify={notify}/>}
      {page==="donations"&&<DonationsPage/>}
      {page==="activity"&&<ActivityPage/>}
      {page==="notifications"&&<NotificationsPage/>}
      {page==="profile"&&<ProfilePage donor={donor} onDonor={onDonor} notify={notify}/>}
    </main>
    {toast&&<div className="toast">{toast}</div>}
  </div>
}

function Brand(){return <div className="brand"><div className="brandMark" aria-label="LifeFlow logo"><Droplets size={25} strokeWidth={2.2}/></div><div><strong>LifeFlow</strong><small>LIFEFLOW PLATFORM</small></div></div>}

function PageTitle({eyebrow,title,desc,action}){return <div className="pageTitle"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{desc}</p></div>{action}</div>}

function Overview({donor,setPage}){
  const [data,setData]=useState(null);
  const [syncing,setSyncing]=useState(false);
  const load=async()=>{try{setSyncing(true);setData(await api.dashboard())}finally{setSyncing(false)}};
  useEffect(()=>{load();const id=setInterval(load,POLL_MS);return()=>clearInterval(id)},[]);
  if(!data)return <Skeleton/>;
  const e=data.eligibility, i=e.interval;
  return <>
    <PageTitle eyebrow="DONOR RECORD" title={`Welcome, ${donor.name.split(" ")[0]}`} desc="Your current donation readiness and emergency activity in one place." action={<div className="titleActions"><button className="secondaryBtn small" onClick={load}><RefreshCw size={14} className={syncing?"spin":""}/>Sync now</button><span className={"statusPill "+(e.eligible?"ok":"warn")}>{e.status}</span></div>}/>
    <section className="readinessHero">
      <div className="readinessMain">
        <div className="readinessHead">
          <div><span className="sectionKicker">DONATION READINESS</span><h2>{e.status}</h2><p>{e.eligible?"Your current screening and recovery interval satisfy prototype donation rules.":"One or more safety rules currently prevent donation."}</p></div>
          <ScoreRing score={e.readiness_score}/>
        </div>
        <div className="checkGrid">
          <CheckLine ok={e.screening.eligible} label="Health screening" value={e.screening.exists?(e.screening.eligible?"Passed":"Review required"):"Not completed"}/>
          <CheckLine ok={i.passed} label="Recovery interval" value={i.passed?"Passed":`${i.days_remaining} days remaining`}/>
          <CheckLine ok={donor.emergency_available} label="Emergency availability" value={donor.emergency_available?"Active":"Paused"}/>
          <CheckLine ok={donor.notifications_enabled} label="Notifications" value={donor.notifications_enabled?"Enabled":"Disabled"}/>
        </div>
      </div>
      <div className="passportCard">
        <div className="passportTop"><BadgeCheck/><span>DONOR HEALTH PASSPORT</span></div>
        <div className="passportBlood">{donor.blood_group}</div>
        <b>{donor.donor_code}</b>
        <p>Screening {e.screening.eligible?"valid":"requires attention"} · recovery {i.passed?"cleared":"in progress"}</p>
        <div className="passportFooter">{e.eligible?"READY TO DONATE":"NOT READY"}</div>
      </div>
    </section>

    <section className="donorInsightStrip">
      <div className="insightHeading"><div><span className="sectionKicker">YOUR DONOR INTELLIGENCE</span><h2>Health and impact at a glance</h2></div><span className="liveBadge"><i/> PROFILE SYNCED</span></div>
      <div className="insightMetrics">
        <div className="insightMetric"><span className="insightIcon"><HeartPulse size={17}/></span><div><small>Readiness score</small><b>{e.readiness_score}<em>/100</em></b><span>{e.eligible?"Eligible under prototype rules":"Review required"}</span></div></div>
        <div className="insightMetric"><span className="insightIcon"><ShieldCheck size={17}/></span><div><small>Screening status</small><b>{e.screening.exists?(e.screening.eligible?"Passed":"Review"):"Pending"}</b><span>Health questionnaire</span></div></div>
        <div className="insightMetric"><span className="insightIcon"><TimerReset size={17}/></span><div><small>Recovery interval</small><b>{i.passed?"Cleared":`${i.days_remaining} days`}</b><span>Donation safety window</span></div></div>
        <div className="insightMetric"><span className="insightIcon"><Radio size={17}/></span><div><small>Relevant requests</small><b>{data.request_summary.relevant}</b><span>After compatibility filters</span></div></div>
      </div>
    </section>
    <section className="donorAnalyticsGrid">
      <div className="recordPanel donorAnalyticsPanel">
        <PanelHead title="Readiness indicators" action={<button className="textBtn" onClick={()=>setPage("screening")}>Review screening <ChevronRight size={15}/></button>}/>
        <div className="readinessBars">
          {[{label:"Health screening",value:e.screening.eligible?100:(e.screening.exists?45:0),state:e.screening.eligible?"Complete":(e.screening.exists?"Review":"Pending")},{label:"Recovery interval",value:i.passed?100:Math.max(0,100-(i.days_remaining/112*100)),state:i.passed?"Cleared":`${i.days_remaining} days left`},{label:"Emergency availability",value:donor.emergency_available?100:0,state:donor.emergency_available?"Available":"Paused"},{label:"Notifications",value:donor.notifications_enabled?100:0,state:donor.notifications_enabled?"Enabled":"Disabled"}].map(x=><div className="readinessBarRow" key={x.label}><div><span>{x.label}</span><b>{x.state}</b></div><div className="readinessTrack"><i style={{width:`${Math.max(0,Math.min(100,x.value))}%`}}/></div></div>)}
        </div>
        <p className="chartFootnote">Indicators reflect the current donor record and prototype safety rules, not a medical diagnosis.</p>
      </div>
      <div className="recordPanel donorAnalyticsPanel">
        <PanelHead title="Emergency request mix" action={<button className="textBtn" onClick={()=>setPage("emergencies")}>View requests <ChevronRight size={15}/></button>}/>
        <div className="requestMixChart">
          <div className="mixDonut" style={{"--mix-a":`${data.request_summary.relevant?Math.max(8,Math.round(data.request_summary.relevant/Math.max(1,data.request_summary.detected)*100)):0}%`}}><div><b>{data.request_summary.detected}</b><small>detected</small></div></div>
          <div className="mixLegend"><div><i className="mixRelevant"/><span>Relevant to your group / radius</span><b>{data.request_summary.relevant}</b></div><div><i className="mixFiltered"/><span>Filtered by compatibility / radius</span><b>{data.request_summary.filtered}</b></div></div>
        </div>
        <p className="chartFootnote">Request counts refresh from the shared API. No requests are created by this chart.</p>
      </div>
    </section>
    <section className="contentGrid">
      <div className="recordPanel">
        <PanelHead title="Recovery timeline" action={<button className="textBtn" onClick={()=>setPage("eligibility")}>Open eligibility <ChevronRight size={15}/></button>}/>
        <RecoveryTimeline donor={donor} interval={i}/>
      </div>
      <div className="recordPanel">
        <PanelHead title="Smart alert filtering"/>
        <div className="filterNumbers">
          <Metric n={data.request_summary.detected} label="Requests detected"/>
          <Metric n={data.request_summary.filtered} label="Automatically filtered"/>
          <Metric n={data.request_summary.relevant} label="Relevant to you"/>
        </div>
        <p className="muted">LifeFlow filters incompatible blood groups, requests outside your radius, and safety-blocked matches.</p>
      </div>
    </section>

    {data.nearest_request&&<section className="emergencyStrip">
      <div className="emergencyIcon"><Radio/></div>
      <div className="emergencyText"><span className="sectionKicker">NEARBY COMPATIBLE EMERGENCY</span><h3>{data.nearest_request.request_code} · {data.nearest_request.hospital}</h3><p>{data.nearest_request.blood_group} · {data.nearest_request.units_required} unit(s) · {data.nearest_request.distance_km} km · approx. {data.nearest_request.eta_minutes} min</p></div>
      <button className="primaryBtn small" onClick={()=>setPage("emergencies")}>Review request</button>
    </section>}

    <section className="recordPanel">
      <PanelHead title="Recent activity" action={<button className="textBtn" onClick={()=>setPage("activity")}>Full activity log <ChevronRight size={15}/></button>}/>
      <div className="activityRows">{data.recent_activity.map((a,i)=><div className="activityRow" key={i}><CircleDot size={15}/><div><b>{a.action}</b><span>{a.detail}</span></div><time>{fmtDT(a.created_at)}</time></div>)}</div>
    </section>
  </>
}

function ScoreRing({score}){return <div className="scoreRing" style={{"--p":`${score*3.6}deg`}}><div><b>{score}</b><span>/100</span></div></div>}
function CheckLine({ok,label,value}){return <div className="checkLine">{ok?<CheckCircle2 className="green"/>:<AlertTriangle className="amber"/>}<div><b>{label}</b><span>{value}</span></div></div>}
function Metric({n,label}){return <div className="metric"><b>{n}</b><span>{label}</span></div>}
function PanelHead({title,action}){return <div className="panelHead"><h3>{title}</h3>{action}</div>}
function RecoveryTimeline({donor,interval}){
  const progress=interval.progress||100;
  return <div className="timelineBox">
    <div className="timelineLabels"><span><b>Last donation</b>{fmtDate(donor.last_donation)}</span><span className="right"><b>Eligible again</b>{interval.next_eligible_date?fmtDate(interval.next_eligible_date):"Now"}</span></div>
    <div className="recoveryTrack"><div className="recoveryFill" style={{width:`${progress}%`}}></div><span className="dot start"></span><span className="dot end"></span><span className="today" style={{left:`${Math.min(96,progress)}%`}}>TODAY</span></div>
    <div className="timelineSummary"><b>{interval.days_since ?? "No prior donation"} {interval.days_since!==null?"days completed":""}</b><span>{interval.passed?`${Math.max(0,(interval.days_since||0)-interval.required_days)} days beyond required recovery period`:`${interval.days_remaining} days remaining`}</span></div>
  </div>
}

function ScreeningPage({notify,setPage}){
  const initial={fever:false,infection:false,hepatitis:false,malaria:false,anemia:false,antibiotics:false,chronic_condition:false,surgery:false,recent_travel:false,pregnancy_related:false,hemoglobin:13.5,notes:""};
  const [form,setForm]=useState(initial); const [result,setResult]=useState(null); const [busy,setBusy]=useState(false);
  const questions=[
    ["fever","Fever in the last 7 days"],["infection","Active or recent infection"],["hepatitis","History of hepatitis"],["malaria","Recent malaria"],["anemia","Anemia / low iron"],["antibiotics","Currently taking antibiotics"],
    ["chronic_condition","Chronic condition requiring review"],["surgery","Recent surgery or procedure"],["recent_travel","Recent travel requiring screening"],["pregnancy_related","Pregnancy-related deferral applies"]
  ];
  const submit=async()=>{setBusy(true);try{const r=await api.screening(form);await api.eligibility();setResult(r);notify("Screening saved to backend · eligibility synchronized")}catch(e){notify(e.message)}finally{setBusy(false)}};
  return <>
    <PageTitle eyebrow="MEDICAL PRE-SCREENING" title="Check donation safety before you travel" desc="Prototype rule engine evaluates temporary health risks and explains the decision."/>
    <div className="screeningLayout">
      <section className="recordPanel">
        <div className="formSection"><span className="sectionKicker">01 · CURRENT HEALTH</span><h3>Health and illness history</h3><p className="muted">Answer based on your current condition. A positive answer may trigger a temporary deferral.</p>
          <div className="questionList">{questions.map(([k,l])=><label className="questionRow" key={k}><span>{l}</span><div className="yesNo"><button className={!form[k]?"selected":""} onClick={(e)=>{e.preventDefault();setForm({...form,[k]:false})}}>No</button><button className={form[k]?"selected danger":""} onClick={(e)=>{e.preventDefault();setForm({...form,[k]:true})}}>Yes</button></div></label>)}</div>
        </div>
        <div className="formSection"><span className="sectionKicker">02 · HEMOGLOBIN</span><h3>Latest hemoglobin reading</h3><div className="hbRow"><input type="number" step="0.1" value={form.hemoglobin} onChange={e=>setForm({...form,hemoglobin:Number(e.target.value)})}/><span>g/dL</span><small>Prototype threshold: 12.5 g/dL</small></div></div>
        <div className="formSection"><span className="sectionKicker">03 · NOTES</span><textarea placeholder="Optional notes for the screening record" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}></textarea></div>
        <button className="primaryBtn" onClick={submit} disabled={busy}>{busy?"Evaluating…":"Evaluate screening"}</button>
      </section>
      <aside>
        <div className="infoPanel"><ShieldCheck/><h3>Explainable result</h3><p>LifeFlow records the exact prototype safety rule that caused a deferral instead of only showing eligible / not eligible.</p></div>
        {result&&<div className={"decisionCard "+(result.eligible?"pass":"fail")}><span className="sectionKicker">SCREENING DECISION</span><h2>{result.eligible?"ELIGIBLE":"TEMPORARILY DEFERRED"}</h2><div className="decisionScore">Screening score <b>{result.score}/100</b></div><hr/><b>Triggered rule</b><p>{result.rule_code}</p><b>Reason</b><p>{result.reason}</p>{result.recheck_date&&<><b>Recommended recheck</b><p>{fmtDate(result.recheck_date)}</p></>}<button className="secondaryBtn" onClick={()=>setPage("eligibility")}>View full eligibility</button></div>}
      </aside>
    </div>
  </>
}

function EligibilityPage({donor}){
  const [e,setE]=useState(null),[history,setHistory]=useState([]);
  const load=()=>Promise.all([api.eligibility(),api.screenings()]).then(([a,b])=>{setE(a);setHistory(b)});
  useEffect(()=>{load();const id=setInterval(load,POLL_MS);return()=>clearInterval(id)},[]);
  if(!e)return <Skeleton/>;
  return <>
    <PageTitle eyebrow="ELIGIBILITY RECORD" title="Why you can — or cannot — donate today" desc="A transparent view of recovery and medical screening rules." action={<span className={"statusPill "+(e.eligible?"ok":"warn")}>{e.status}</span>}/>
    <section className="eligibilityBanner">
      <div><span className="sectionKicker">CAN I DONATE TODAY?</span><h2>{e.eligible?"YES — YOU ARE CURRENTLY ELIGIBLE":"NOT YET — SAFETY LOCK ACTIVE"}</h2><p>{e.eligible?"All mandatory prototype checks have passed.":"Resolve the blocking rule(s) below before accepting a donation request."}</p></div>
      <ScoreRing score={e.readiness_score}/>
    </section>
    <div className="contentGrid">
      <section className="recordPanel"><PanelHead title="Rule evaluation"/>
        <div className="ruleRows">
          <Rule name="Donation interval" ok={e.interval.passed} value={e.interval.passed?`${e.interval.days_since} days since last donation`:`${e.interval.days_remaining} days remaining`}/>
          <Rule name="Medical screening" ok={e.screening.eligible} value={e.screening.exists?e.screening.reason:"No screening completed"}/>
          <Rule name="Screening freshness" ok={e.screening.valid} value={e.screening.exists?`${e.screening.valid_days_remaining} days validity remaining`:"Required"}/>
          <Rule name="Emergency availability" ok={e.emergency_available} value={e.emergency_available?"Enabled":"Paused"}/>
        </div>
      </section>
      <section className="recordPanel"><PanelHead title="Recovery interval"/><RecoveryTimeline donor={donor} interval={e.interval}/></section>
    </div>
    <section className="recordPanel"><PanelHead title="Screening history"/>
      <div className="tableLike"><div className="tableHead"><span>Date</span><span>Decision</span><span>Rule</span><span>Score</span><span>Reason</span></div>
      {history.map(x=><div className="tableRow" key={x.id}><span>{fmtDT(x.submitted_at)}</span><span className={x.eligible?"goodText":"badText"}>{x.eligible?"Eligible":"Deferred"}</span><span>{x.rule_code}</span><span>{x.score}/100</span><span>{x.reason}</span></div>)}</div>
    </section>
  </>
}
function Rule({name,ok,value}){return <div className="ruleRow">{ok?<CheckCircle2 className="green"/>:<XCircle className="red"/>}<div><b>{name}</b><span>{value}</span></div><strong>{ok?"PASS":"BLOCK"}</strong></div>}

function DonorInteractiveMap({donor,notify}){
  const [rows,setRows]=useState([]); const [blood,setBlood]=useState("ALL"); const [urgency,setUrgency]=useState("ALL"); const [mode,setMode]=useState("requests"); const [radius,setRadius]=useState(Number(donor.alert_radius_km)||10); const [loading,setLoading]=useState(false);
  const load=async()=>{setLoading(true);try{setRows(await api.emergencies())}catch(e){notify(e.message)}finally{setLoading(false)}};
  useEffect(()=>{load();const id=setInterval(load,POLL_MS);return()=>clearInterval(id)},[]);
  const filtered=rows.filter(r=>(blood==="ALL"||r.blood_group===blood)&&(urgency==="ALL"||r.urgency===urgency)&&(mode==="all"||mode==="requests")&&(Number(r.distance_km||999)<=radius));
  return <><PageTitle eyebrow="INTERACTIVE MAP" title="Emergency coverage & compatible requests" desc="Filter active emergency requests by blood group, urgency and your alert radius. Distances and ETAs are backend estimates." action={<button className="secondaryBtn small" onClick={load}><RefreshCw size={14} className={loading?"spin":""}/>Sync map</button>}/>
    <div className="mapFilters panelCard"><div><label>Blood type<select value={blood} onChange={e=>setBlood(e.target.value)}><option value="ALL">All blood groups</option>{["O-","O+","A-","A+","B-","B+","AB-","AB+"].map(g=><option key={g}>{g}</option>)}</select></label></div><div><label>Urgency stage<select value={urgency} onChange={e=>setUrgency(e.target.value)}><option value="ALL">All urgency levels</option>{["CRITICAL","HIGH","MODERATE","LOW"].map(g=><option key={g}>{g}</option>)}</select></label></div><div className="mapRadiusFilter"><label>Alert radius <b>{radius} km</b><input type="range" min="1" max="25" value={radius} onChange={e=>setRadius(Number(e.target.value))}/></label></div><div className="mapFilterActions"><button className="secondaryBtn small" onClick={()=>{setBlood("ALL");setUrgency("ALL");setRadius(Number(donor.alert_radius_km)||10)}}>Clear</button></div></div>
    <section className="interactiveMapLayout"><div className="recordPanel mapCanvasPanel"><div className="mapCanvasHead"><div><span className="sectionKicker">LIVE API DATA</span><h2>Regional emergency map</h2><p>{filtered.length} request(s) match your current filters</p></div><span className="liveBadge"><i/> SYNCED</span></div><div className="interactiveMapCanvas"><div className="mapLand landA"/><div className="mapLand landB"/><div className="mapLand landC"/><svg className="mapConnections" viewBox="0 0 700 340" preserveAspectRatio="none" aria-hidden="true"><path d="M95 105 Q250 20 360 145 T590 170"/><path d="M120 245 Q300 310 500 225"/></svg>{filtered.slice(0,14).map((r,i)=>{const x=12+((i*37+17)%76),y=17+((i*53+12)%65);return <button key={r.id} className={`mapRequestPin ${String(r.urgency).toLowerCase()}`} style={{left:`${x}%`,top:`${y}%`}} title={`${r.hospital} · ${r.blood_group} · ${r.urgency}`} onClick={()=>{notify(`${r.request_code} · ${r.hospital} · ${r.distance_km} km away`)}}><span>{r.blood_group}</span></button>})}<div className="mapCenterLabel"><MapPin size={15}/>{donor.city||"Your region"}</div><div className="mapCanvasLegend"><span><i className="legendRed"/>Critical</span><span><i className="legendGold"/>High</span><span><i className="legendGreen"/>Other active</span></div></div><p className="chartFootnote">Map markers are a spatial overview of API request records, not precise GPS coordinates. Exact route guidance is not provided.</p></div>
      <aside className="recordPanel mapRequestList"><div className="panelHead"><h2>Matched request list</h2><span className="statusPill ok">{filtered.filter(x=>x.matched).length} compatible</span></div>{filtered.length?filtered.slice(0,8).map(r=><div className="mapRequestRow" key={r.id}><span className={`urgency ${String(r.urgency).toLowerCase()}`}>{r.urgency}</span><div><b>{r.hospital}</b><small>{r.request_code} · {r.blood_group} · {r.units_required} unit(s)</small><small>{r.distance_km} km · ~{r.eta_minutes} min estimate</small></div><span className={`statusPill ${r.matched?"ok":"warn"}`}>{r.matched?"MATCH":"FILTERED"}</span></div>):<EmptyState icon={<MapPin/>} title="No requests match" text="Try a wider radius or clear the filters."/>}</aside></section>
  </>;
}

function InteractiveCoverageMap({requests=[],donors=[],inventory=[],onSelectRequest}){
 const [group,setGroup]=useState("ALL"); const [stage,setStage]=useState("ALL"); const [kind,setKind]=useState("requests");
 const active=requests.filter(r=>(r.status||"").toUpperCase()==="ACTIVE"&&(group==="ALL"||r.blood_group===group)&&(stage==="ALL"||r.urgency===stage));
 const visibleDonors=donors.filter(d=>group==="ALL"||d.blood_group===group);
 return <><div className="coverageFilters"><label>Blood type<select value={group} onChange={e=>setGroup(e.target.value)}><option value="ALL">All groups</option>{["O-","O+","A-","A+","B-","B+","AB-","AB+"].map(g=><option key={g}>{g}</option>)}</select></label><label>Urgency<select value={stage} onChange={e=>setStage(e.target.value)}><option value="ALL">All stages</option>{["CRITICAL","HIGH","MODERATE","LOW"].map(g=><option key={g}>{g}</option>)}</select></label><div className="mapModeToggle"><button className={kind==="requests"?"active":""} onClick={()=>setKind("requests")}>Requests ({active.length})</button><button className={kind==="donors"?"active":""} onClick={()=>setKind("donors")}>Donors ({visibleDonors.length})</button></div></div><div className="coverageMap"><div className="mapGridLines"/><svg viewBox="0 0 700 300" role="img" aria-label="Schematic regional coverage map"><path className="landShape" d="M62 63 L105 37 156 47 181 72 218 78 234 106 205 130 197 161 160 169 146 205 113 195 93 165 66 152 53 111Z M280 46 L326 34 360 48 378 73 410 77 425 102 404 123 375 119 356 145 325 139 312 111 287 99Z M452 51 L496 36 552 55 590 87 579 118 548 127 532 156 504 152 490 122 465 107Z M394 177 L430 166 459 184 468 220 444 246 414 229 402 204Z"/><path className="routeLine" d="M133 127 Q220 50 328 96 T512 106"/>{kind==="requests"?active.slice(0,8).map((r,i)=><g key={r.id} className={`mapPin ${String(r.urgency).toLowerCase()==="critical"?"pinRed":String(r.urgency).toLowerCase()==="high"?"pinGold":"pinGreen"}`} transform={`translate(${90+(i*79)%520} ${65+(i*43)%170})`}><circle r="15"/><circle r="5"/></g>):visibleDonors.slice(0,8).map((d,i)=><g key={d.id} className={`mapPin ${d.eligible?"pinGreen":"pinGold"}`} transform={`translate(${90+(i*79)%520} ${65+(i*43)%170})`}><circle r="13"/><circle r="4"/></g>)}</svg><div className="mapLegend"><span><i className="legendRed"/> Critical request</span><span><i className="legendGold"/> High urgency / review</span><span><i className="legendGreen"/> Other active / eligible</span></div></div><div className="mapFeatureList">{kind==="requests"?active.slice(0,5).map(r=><button key={r.id} onClick={()=>onSelectRequest?.(r.id)}><span className={`urgency ${String(r.urgency).toLowerCase()}`}>{r.urgency}</span><b>{r.request_code}</b><span>{r.blood_group} · {r.units_required} unit(s)</span><span>{r.status}</span><ChevronRight size={15}/></button>):visibleDonors.slice(0,5).map(d=><div key={d.id}><span className="statusPill">{d.blood_group}</span><b>{d.name}</b><span>{d.city} · {d.distance_km} km</span><span>{d.eligibility_status}</span></div>)}</div><p className="chartFootnote">Coverage is schematic; markers summarize filtered backend records and are not exact GPS coordinates.</p></>;
}

function EmergenciesPage({donor,notify}){
  const [rows,setRows]=useState([]); const [selected,setSelected]=useState(null); const [compat,setCompat]=useState(null);
  const load=()=>Promise.all([api.emergencies(),api.compatibility()]).then(([a,b])=>{setRows(a);setCompat(b);setSelected(prev=>prev ? (a.find(x=>x.id===prev.id)||prev) : prev)});
  useEffect(()=>{load();const id=setInterval(load,POLL_MS);return()=>clearInterval(id)},[]);
  const respond=async(action)=>{try{await api.respond(selected.id,action);notify(`Request ${action.toLowerCase()}`);await load()}catch(e){notify(e.message)}};
  const journey=async(status)=>{try{await api.journey(selected.id,status);notify(`Status updated: ${status.replace("_"," ")}`);await load()}catch(e){notify(e.message)}};
  return <>
    <PageTitle eyebrow="EMERGENCY MATCHING" title="Compatible requests near you" desc={`Requests are filtered using blood compatibility, eligibility and your ${donor.alert_radius_km} km alert radius.`} action={<button className="secondaryBtn small" onClick={load}><RefreshCw size={14}/>Sync now</button>}/>
    <div className="emergencyLayout">
      <section className="emergencyList">
        <div className="listToolbar"><div><b>{rows.filter(x=>x.matched).length}</b> relevant matches</div><span><MapPin size={15}/>{donor.city} · {donor.alert_radius_km} km radius</span></div>
        {rows.map(r=><button key={r.id} className={"requestCard "+(selected?.id===r.id?"selected":"")+" "+(!r.matched?"mutedCard":"")} onClick={()=>setSelected(r)}>
          <div className="requestTop"><span className={"urgency "+r.urgency.toLowerCase()}>{r.urgency}</span><span>{r.request_code}</span></div>
          <h3>{r.hospital}</h3><div className="requestFacts"><span><Droplets size={16}/>{r.blood_group} · {r.units_required} unit(s)</span><span><MapPin size={16}/>{r.distance_km} km</span><span><Clock3 size={16}/>{r.eta_minutes} min</span></div>
          <div className="requestFooter">{r.matched?<span className="goodText"><CheckCircle2 size={15}/>Compatible match</span>:<span>Filtered from active matching</span>}{r.response&&<b>{r.response}</b>}</div>
        </button>)}
      </section>
      <section className="emergencyDetail">
        {!selected?<EmptyState icon={<Radio/>} title="Select an emergency request" text="Open a request to review compatibility, location and response controls."/>:<RequestDetail r={selected} compat={compat} respond={respond} journey={journey}/>}
      </section>
    </div>
  </>
}

function RequestDetail({r,compat,respond,journey}){
  return <div>
    <div className="detailHead"><div><span className={"urgency "+r.urgency.toLowerCase()}>{r.urgency}</span><h2>{r.hospital}</h2><p>{r.request_code} · {r.blood_group} · {r.units_required} unit(s)</p></div><div className="etaBox"><Navigation/><b>{r.eta_minutes} min</b><span>{r.distance_km} km</span></div></div>
    <GeoMap r={r}/>
    <div className="detailSection"><span className="sectionKicker">WHY YOU WERE MATCHED</span><div className="matchRows">{r.match_reasons.map((m,i)=><div key={i} className="matchRow">{m.passed?<CheckCircle2 className="green"/>:<XCircle className="red"/>}<div><b>{m.label}</b><span>{m.value}</span></div><strong>{m.passed?"PASS":"NO"}</strong></div>)}</div></div>
    {!r.response&&<div className="responseBar">{r.can_accept?<><button className="primaryBtn" onClick={()=>respond("ACCEPTED")}>Accept request</button><button className="secondaryBtn" onClick={()=>respond("DECLINED")}>Decline</button></>:<div className="safetyLock"><LockKeyhole/><div><b>Safety lock active</b><span>This request cannot be accepted because one or more matching rules failed.</span></div></div>}</div>}
    {r.response==="DECLINED"&&<div className="declinedNote"><XCircle/>You declined this request. In the full system, dispatch automatically moves to the next nearest verified donor.</div>}
    {r.response==="ACCEPTED"&&<EmergencyResponse r={r} journey={journey}/>}
    {compat&&<div className="compatMini"><span className="sectionKicker">BLOOD COMPATIBILITY EXPLORER</span><div><b>You donate to</b>{compat.donate_to.map(x=><span key={x}>{x}</span>)}</div><div><b>You receive from</b>{compat.receive_from.map(x=><span key={x}>{x}</span>)}</div></div>}
  </div>
}

function GeoMap({r}){return <div className="geoMap">
  <div className="mapGrid"></div>
  <div className="radius"></div>
  <div className="donorMarker"><UserRound/><span>You</span></div>
  <div className="hospitalMarker"><Hospital/><span>{r.distance_km} km</span></div>
  <div className="mapLegend"><span><i className="dotLegend donor"></i>Donor</span><span><i className="dotLegend hospital"></i>Hospital</span><span><i className="ringLegend"></i>Selected radius</span></div>
</div>}

function EmergencyResponse({r,journey}){
  const steps=["EN_ROUTE","ARRIVED","COMPLETED"];
  const current=r.journey_status||"EN_ROUTE";
  const idx=steps.indexOf(current);
  return <div className="responseMode">
    <div className="responseModeHead"><Radio/><div><span className="sectionKicker">ACTIVE EMERGENCY RESPONSE</span><h3>{current.replace("_"," ")}</h3></div></div>
    <div className="responseTimeline">{steps.map((s,i)=><div className={"responseStep "+(i<=idx?"done":"")} key={s}><span>{i<idx?<CheckCircle2/>:<CircleDot/>}</span><b>{s.replace("_"," ")}</b></div>)}</div>
    <div className="responseActions">
      {current==="EN_ROUTE"&&<button className="primaryBtn small" onClick={()=>journey("ARRIVED")}>Mark arrived</button>}
      {current==="ARRIVED"&&<button className="primaryBtn small" onClick={()=>journey("COMPLETED")}>Mark donation completed</button>}
      {current!=="COMPLETED"&&<button className="secondaryBtn small" onClick={()=>journey("CANCELLED")}>Cancel response</button>}
    </div>
  </div>
}

function DonationsPage(){
  const [rows,setRows]=useState([]);
  const load=()=>api.donations().then(setRows);
  useEffect(()=>{load();const id=setInterval(load,POLL_MS);return()=>clearInterval(id)},[]);
  const download=async(id,code)=>{
    const res=await fetch(api.certificateUrl(id),{headers:{Authorization:`Bearer ${localStorage.getItem("lifeflow_token")}`}});
    const blob=await res.blob(); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url;a.download=`${code}.txt`;a.click();URL.revokeObjectURL(url);
  }
  return <>
    <PageTitle eyebrow="DONATION HISTORY" title="Verified donation record" desc="Past donations, blood centres and downloadable prototype records."/>
    <section className="contributionBanner"><Droplets/><div><span className="sectionKicker">YOUR CONTRIBUTION</span><h2>{rows.length} verified donations</h2><p>Every completed emergency response can be added automatically to this record.</p></div></section>
    <section className="recordPanel"><div className="donationRows">{rows.map(d=><div className="donationRow" key={d.id}><div className="donationDate"><b>{new Date(d.donation_date+"T00:00:00").getDate()}</b><span>{new Date(d.donation_date+"T00:00:00").toLocaleString("en",{month:"short"}).toUpperCase()}</span></div><div className="donationMain"><b>{d.blood_bank}</b><span>{d.donation_type} · {d.units} unit · {d.donation_code}</span></div><span className="verified"><BadgeCheck size={17}/>Verified</span><button className="iconBtn" title="Download record" onClick={()=>download(d.id,d.donation_code)}><Download size={17}/></button></div>)}</div></section>
  </>
}

function ActivityPage(){
  const [rows,setRows]=useState([]); const load=()=>api.activity().then(setRows); useEffect(()=>{load();const id=setInterval(load,POLL_MS);return()=>clearInterval(id)},[]);
  return <><PageTitle eyebrow="AUDIT TRAIL" title="Donor activity log" desc="A chronological record of screening, eligibility, emergency and donation events."/>
    <section className="recordPanel"><div className="auditTimeline">{rows.map((a,i)=><div className="auditItem" key={a.id}><div className="auditRail"><span></span>{i<rows.length-1&&<i></i>}</div><div><time>{fmtDT(a.created_at)}</time><h3>{a.action}</h3><p>{a.detail}</p></div></div>)}</div></section></>
}

function NotificationsPage(){
  const [rows,setRows]=useState([]); const load=()=>api.notifications().then(setRows); useEffect(()=>{load();const id=setInterval(load,POLL_MS);return()=>clearInterval(id)},[]);
  const read=async(id)=>{await api.readNotification(id);load()}
  return <><PageTitle eyebrow="NOTIFICATION CENTRE" title="Alerts that need your attention" desc="Emergency, eligibility, screening and donation updates."/>
    <section className="recordPanel"><div className="noticeList">{rows.map(n=><button key={n.id} className={"noticeRow "+(!n.read?"unread":"")} onClick={()=>read(n.id)}><div className="noticeIcon">{n.kind==="EMERGENCY"?<Radio/>:n.kind==="SCREENING"?<Stethoscope/>:<Bell/>}</div><div><div className="noticeTitle"><b>{n.title}</b>{!n.read&&<span>NEW</span>}</div><p>{n.body}</p><time>{fmtDT(n.created_at)}</time></div></button>)}</div></section></>
}

function ProfilePage({donor,onDonor,notify}){
  const [form,setForm]=useState({...donor}); const [passport,setPassport]=useState(null); useEffect(()=>{api.passport().then(setPassport)},[]);
  const save=async()=>{try{const d=await api.updateMe({name:form.name,phone:form.phone,city:form.city,emergency_available:form.emergency_available,alert_radius_km:Number(form.alert_radius_km),notifications_enabled:form.notifications_enabled});onDonor(d);notify("Profile saved")}catch(e){notify(e.message)}}
  return <><PageTitle eyebrow="PROFILE & PREFERENCES" title="Control your donor record and emergency availability" desc="Adjust contact details, alert radius and notification preferences."/>
    <div className="profileLayout">
      <section className="recordPanel">
        <div className="twoCols"><Field label="Full name"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Donor code"><input value={donor.donor_code} disabled/></Field></div>
        <div className="twoCols"><Field label="Phone"><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label="City"><input value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></Field></div>
        <Field label="Preferred emergency alert radius"><div className="radiusControl"><input type="range" min="1" max="25" value={form.alert_radius_km} onChange={e=>setForm({...form,alert_radius_km:e.target.value})}/><b>{form.alert_radius_km} km</b></div></Field>
        <Toggle label="Emergency availability" desc="Allow LifeFlow to include you in compatible emergency matching." value={form.emergency_available} onChange={v=>setForm({...form,emergency_available:v})}/>
        <Toggle label="Notifications" desc="Receive screening, eligibility and emergency updates." value={form.notifications_enabled} onChange={v=>setForm({...form,notifications_enabled:v})}/>
        <button className="primaryBtn" onClick={save}>Save changes</button>
      </section>
      <section className="recordPanel medicalHistoryPanel"><div className="panelHead"><div><span className="sectionKicker">DONOR HEALTH RECORD</span><h2>Medical history & donation safety</h2><p>Self-reported information for donor preparation. This does not replace professional screening.</p></div></div><DonorMedicalHistory notify={notify}/></section>
      {passport&&<aside className="passportLarge"><div className="passportTop"><BadgeCheck/><span>DONOR HEALTH PASSPORT</span></div><div className="passportIdentity"><div className="passportBlood">{donor.blood_group}</div><div><h2>{donor.name}</h2><p>{donor.donor_code}</p></div></div><div className="passportRules"><span>Screening <b>{passport.screening}</b></span><span>Recovery interval <b>{passport.recovery_interval}</b></span><span>Emergency status <b>{passport.emergency_status}</b></span><span>Readiness score <b>{passport.readiness_score}/100</b></span></div><div className="passportFooter">{passport.passport_status}</div></aside>}
    </div>
  </>
}
function DonorMedicalHistory({notify}){
 const key="lifeflow_medical_history";const [form,setForm]=useState(()=>{try{return JSON.parse(localStorage.getItem(key))||{conditions:"",medications:"",allergies:"",recentProcedure:"no",lastDonation:"",notes:""}}catch{return {conditions:"",medications:"",allergies:"",recentProcedure:"no",lastDonation:"",notes:""}}});
 const save=()=>{localStorage.setItem(key,JSON.stringify({...form,savedAt:new Date().toISOString()}));notify("Medical history saved on this browser")};
 return <div className="medicalHistoryForm"><div className="twoCols"><Field label="Existing medical conditions (self-reported)"><textarea rows="2" value={form.conditions} onChange={e=>setForm({...form,conditions:e.target.value})} placeholder="List any conditions or type None"/></Field><Field label="Current medications"><textarea rows="2" value={form.medications} onChange={e=>setForm({...form,medications:e.target.value})} placeholder="List medications or type None"/></Field></div><div className="twoCols"><Field label="Allergies / drug sensitivities"><textarea rows="2" value={form.allergies} onChange={e=>setForm({...form,allergies:e.target.value})} placeholder="List allergies or type None"/></Field><Field label="Most recent donation date"><input type="date" value={form.lastDonation} onChange={e=>setForm({...form,lastDonation:e.target.value})}/></Field></div><Field label="Recent surgery or procedure"><select value={form.recentProcedure} onChange={e=>setForm({...form,recentProcedure:e.target.value})}><option value="no">No / not reported</option><option value="yes">Yes — discuss with clinical staff</option><option value="unsure">Unsure — ask clinical staff</option></select></Field><Field label="Notes for screening staff"><textarea rows="2" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Optional notes to discuss during screening"/></Field><div className="medicalHistoryFooter"><span><LockKeyhole size={14}/> Stored locally in this browser for this prototype; not sent to the backend.</span><button className="primaryBtn small" onClick={save}>Save health record</button></div></div>
}

function Toggle({label,desc,value,onChange}){return <div className="toggleRow"><div><b>{label}</b><span>{desc}</span></div><button className={"toggle "+(value?"on":"")} onClick={()=>onChange(!value)}><span></span></button></div>}

function EmptyState({icon,title,text}){return <div className="emptyState"><div>{icon}</div><h3>{title}</h3><p>{text}</p></div>}
function Skeleton(){return <div className="loading">Loading LifeFlow record…</div>}


function buildWeeklyActivity(rows){
  const today=new Date(); today.setHours(0,0,0,0);
  const buckets=Array.from({length:7},(_,idx)=>{const date=new Date(today);date.setDate(today.getDate()-(6-idx));return {date,d:date.toLocaleDateString("en-IN",{weekday:"short"}).toUpperCase(),a:0,b:0}});
  rows.forEach(r=>{const created=r.created_at?new Date(r.created_at):null;if(!created||Number.isNaN(created.getTime()))return;created.setHours(0,0,0,0);const bucket=buckets.find(x=>x.date.getTime()===created.getTime());if(bucket){bucket.a++;bucket.b+=(Array.isArray(r.responses)?r.responses.length:0)}});
  const max=Math.max(1,...buckets.flatMap(x=>[x.a,x.b]));
  return buckets.map(x=>({...x,aPct:x.a?Math.max(8,x.a/max*100):0,bPct:x.b?Math.max(8,x.b/max*100):0}));
}

function HospitalApp(){
  const [token,setToken]=useState(localStorage.getItem("lifeflow_hospital_token"));
  const [hospital,setHospital]=useState(null); const [page,setPage]=useState("overview"); const [data,setData]=useState(null); const [requests,setRequests]=useState([]); const [inventory,setInventory]=useState([]); const [commandData,setCommandData]=useState(null); const [directory,setDirectory]=useState({donors:[],counts:{}}); const [selectedRequestId,setSelectedRequestId]=useState(""); const [matchData,setMatchData]=useState(null); const [simDeclines,setSimDeclines]=useState(1); const [simResult,setSimResult]=useState(null); const [error,setError]=useState(""); const [toast,setToast]=useState(""); const [busy,setBusy]=useState(false); const [processing,setProcessing]=useState(false); const [processingStage,setProcessingStage]=useState(0);
  const [login,setLogin]=useState({email:"apollo@lifeflow.com",password:"apollo123"});
  const [form,setForm]=useState({blood_group:"B+",units_required:2,urgency:"CRITICAL",city:"Hyderabad",latitude:17.4142,longitude:78.4080,required_in_minutes:120});
  const [stock,setStock]=useState({blood_group:"B+",units_available:4});
  const notify=(m)=>{setToast(m);setTimeout(()=>setToast(""),2600)};
  const load=async()=>{try{const [o,r,i,h,c,dir]=await Promise.all([hospitalApi.overview(),hospitalApi.requests(),hospitalApi.inventory(),hospitalApi.me(),hospitalApi.commandCenter(),hospitalApi.donors()]);setData(o);setRequests(r);setInventory(i);setHospital(h);setCommandData(c);setDirectory(dir);setSelectedRequestId(old=>old || String(r[0]?.id || ""));setError("")}catch(e){setError(e.message)}};
  const loadMatches=async()=>{if(!selectedRequestId)return;try{setMatchData(await hospitalApi.matches(selectedRequestId));setSimResult(null)}catch(e){setError(e.message)}};
  const runSimulation=async()=>{if(!selectedRequestId)return;try{setBusy(true);setSimResult(await hospitalApi.simulate(selectedRequestId,{declines_before_accept:Number(simDeclines)}))}catch(e){setError(e.message)}finally{setBusy(false)}};
  useEffect(()=>{if(token){load();const id=setInterval(load,5000);return()=>clearInterval(id)}},[token]);
  const signIn=async(e)=>{e.preventDefault();setBusy(true);setError("");try{const d=await hospitalApi.login(login);localStorage.setItem("lifeflow_hospital_token",d.token);setToken(d.token);setHospital(d.hospital)}catch(e){setError(e.message)}finally{setBusy(false)}};
  if(!token)return <div className="hospitalAuth"><header className="hospitalHeader"><Brand/><a href="/">Donor portal ↗</a></header><main className="hospitalLogin"><section><span className="eyebrow light">LIFEFLOW HOSPITAL SERVICES</span><h1>Emergency blood coordination, in one workspace.</h1><p>Create blood requests, review donor responses, and maintain stock records. Requests are shared with the donor portal through the same API and database.</p><div className="hospitalProof"><span>✓ Shared emergency requests</span><span>✓ Donor response tracking</span><span>✓ Inventory records</span></div></section><form className="hospitalLoginCard" onSubmit={signIn}><span className="eyebrow">HOSPITAL ACCESS</span><h2>Sign in</h2><p>Use a hospital demo account.</p>{error&&<div className="errorBox">{error}</div>}<Field label="Email"><input type="email" value={login.email} onChange={e=>setLogin({...login,email:e.target.value})} required/></Field><Field label="Password"><input type="password" value={login.password} onChange={e=>setLogin({...login,password:e.target.value})} required/></Field><button className="primaryBtn" disabled={busy}>{busy?"Signing in…":"Sign in to hospital portal"}</button><div className="demoAccountSection hospitalDemoAccounts">
          <div className="demoSectionHeading"><b>Hospital demo accounts</b><span>Click a hospital to sign in instantly</span></div>
          <div className="demoAccountGrid hospitalDemoGrid">
            {[{name:"Apollo Hospitals",email:"apollo@lifeflow.com",password:"apollo123",code:"AH"},{name:"CARE Hospitals",email:"care@lifeflow.com",password:"care123",code:"CH"},{name:"AIG Hospitals",email:"aig@lifeflow.com",password:"aig123",code:"AIG"}].map(account=><button type="button" className="demoAccountCard hospitalDemoCard" key={account.email} disabled={busy} onClick={()=>{setLogin({email:account.email,password:account.password});setError("");setBusy(true);hospitalApi.login({email:account.email,password:account.password}).then(d=>{localStorage.setItem("lifeflow_hospital_token",d.token);setToken(d.token);setHospital(d.hospital)}).catch(e=>setError(e.message)).finally(()=>setBusy(false))}}>
              <span className="demoBloodBadge hospitalBadge">{account.code}</span><span className="demoAccountInfo"><b>{account.name}</b><small>{account.email}</small><small>Password: {account.password}</small></span><span className="demoLoginArrow">↗</span>
            </button>)}
          </div>
        </div></form></main></div>;
  return <div className="hospitalApp"><header className="hospitalTop"><Brand/><nav className="hospitalNav hospitalNavInHeader" aria-label="Hospital navigation">{[["overview","Command center"],["requests","Emergency requests"],["new","New request"],["inventory","Blood inventory"],["donors","Donor directory"],["dispatch","Match & dispatch lab"],["responses","Donor responses"]].map(([id,label])=><button className={page===id?"active":""} onClick={()=>setPage(id)} key={id}>{label}</button>)}</nav><div className="hospitalIdentity"><span className="onlineDot"/><span className="syncLabel">Backend synced · {hospital?.name||"Hospital"}</span><button className="secondaryBtn small" onClick={load}><RefreshCw size={14}/>Sync now</button><button className="secondaryBtn small" onClick={()=>{localStorage.removeItem("lifeflow_hospital_token");setToken(null);setHospital(null)}}><LogOut size={14}/>Sign out</button><a className="portalSwitch" href="/">Donor portal ↗</a></div></header>
  <main className="hospitalWorkspace"><div className="hospitalTitle"><div><span className="eyebrow">HOSPITAL OPERATIONS</span><h1>{({overview:"Emergency command center",requests:"Emergency requests",new:"Create emergency request",inventory:"Blood inventory",donors:"Donor directory",dispatch:"Explainable matching & dispatch simulator",responses:"Donor responses"})[page]}</h1><p>{hospital?.name} · updates automatically every 5 seconds</p></div><span className="statusPill ok"><span className="onlineDot"/> API connected</span></div>
  {error&&<div className="errorBox">Backend error: {error}</div>}
  {page==="overview"&&<><div className="hospitalMetrics"><HospitalMetric label="Active requests" value={data?.active_requests??"—"} detail="Open emergency requirements"/><HospitalMetric label="Total requests" value={data?.total_requests??"—"} detail="All statuses"/><HospitalMetric label="Donor responses" value={data?.responses??"—"} detail={`${data?.accepted??0} accepted`}/><HospitalMetric label="Units in inventory" value={data?.inventory_units??"—"} detail="Across blood groups"/></div><section className="commandGrid"><div className="hospitalPanel mapPanel"><div className="panelHeading"><div><span className="sectionKicker">LIVE RESPONSE OVERVIEW</span><h2>Emergency coverage map</h2><p>Illustrative regional view for the prototype · use request details for verified location data.</p></div><span className="liveBadge"><i/> MONITORING</span></div><InteractiveCoverageMap requests={requests} donors={directory.donors} inventory={inventory} onSelectRequest={id=>{setSelectedRequestId(String(id));setPage("dispatch")}} /></div><div className="hospitalPanel analyticsPanel"><div className="panelHeading"><div><span className="sectionKicker">OPERATIONS ANALYTICS</span><h2>Response activity</h2><p>Request volume and response trend (demo visualization).</p></div></div><div className="chartSummary"><div><small>Active now</small><b>{data?.active_requests??0}</b></div><div><small>Accepted</small><b>{data?.accepted??0}</b></div></div><div className="barChart" aria-label="Last seven days of actual request and donor response activity">{buildWeeklyActivity(requests).map(x=><div className="barDay" key={x.d} title={`${x.d}: ${x.a} requests, ${x.b} responses`}><div className="barPair"><i style={{height:`${x.aPct}%`}}/><i style={{height:`${x.bPct}%`}}/></div><small>{x.d}</small></div>)}</div><div className="chartLegend"><span><i/> Requests</span><span><i/> Donor responses</span></div><p className="chartFootnote">Counts are calculated from the request records currently returned by the backend, grouped by creation date.</p><div className="prioritySummary"><b>Priority watch</b><span>{requests.filter(r=>r.status==="ACTIVE"&&["CRITICAL","HIGH"].includes(r.urgency)).length} high-priority active request(s)</span><button className="textBtn" onClick={()=>setPage("requests")}>Review requests ↗</button></div></div></section><section className="hospitalPanel"><div className="panelHeading"><div><h2>Blood group coverage</h2><p>Seeded demo donor directory includes all eight standard ABO/Rh groups.</p></div><span className="statusPill ok">{commandData?.donor_count ?? directory.donors.length} demo donors</span></div><div className="groupCounts">{["O-","O+","A-","A+","B-","B+","AB-","AB+"].map(g=><div className="groupCount" key={g}><b className="bloodBadge">{g}</b><strong>{commandData?.donors_by_group?.[g] ?? directory.counts?.[g] ?? 0}</strong><small>donors</small></div>)}</div><div className="stockWarnings"><b>Inventory watch</b>{(commandData?.inventory_by_group||[]).filter(x=>x.status==="LOW").map(x=><span key={x.blood_group} className="stockWarning">{x.blood_group}: {x.units_available} units · low stock</span>)}{!(commandData?.inventory_by_group||[]).some(x=>x.status==="LOW")&&<span className="stockOkay">No low-stock groups at this threshold</span>}</div></section><section className="hospitalPanel"><div className="panelHeading"><div><span className="sectionKicker">STOCK ANALYTICS</span><h2>Blood-group inventory</h2><p>Current units by blood group from this hospital's inventory records.</p></div><span className="statusPill ok">{inventory.reduce((n,x)=>n+Number(x.units_available||0),0)} units tracked</span></div><div className="inventoryChart">{["O-","O+","A-","A+","B-","B+","AB-","AB+"].map(g=>{const item=inventory.find(x=>x.blood_group===g);const units=Number(item?.units_available||0);const max=Math.max(1,...inventory.map(x=>Number(x.units_available||0)));return <div className="inventoryBar" key={g} title={`${g}: ${units} units`}><b>{units}</b><div><i style={{height:`${Math.max(units?6:0,units/max*100)}%`}}/></div><small>{g}</small></div>})}</div><p className="chartFootnote">A missing group is shown as zero when no inventory record is returned for it.</p><div className="requestStatusBreakdown"><div className="statusBreakdownHead"><b>Request status breakdown</b><span>{requests.length} total</span></div>{["ACTIVE","FULFILLED","CANCELLED","EXPIRED"].map(status=>{const count=requests.filter(r=>(r.status||"").toUpperCase()===status).length;const pct=requests.length?count/requests.length*100:0;return <div className="statusBreakdownRow" key={status}><div><span>{status.toLowerCase().replace(/^./,c=>c.toUpperCase())}</span><b>{count}</b></div><div className="statusBreakdownTrack"><i className={`status-${status.toLowerCase()}`} style={{width:`${pct}%`}}/></div></div>})}</div></section><section className="hospitalPanel"><div className="panelHeading"><div><h2>Latest emergency requests</h2><p>Requests created by this hospital and shared with donor matching.</p></div><button className="primaryBtn small" onClick={()=>setPage("new")}>+ New request</button></div><HospitalRequestTable rows={requests.slice(0,8)} onUpdate={async(id,status)=>{try{await hospitalApi.updateRequest(id,status);await load();notify("Request updated in shared backend")}catch(e){notify(e.message)}}}/></section></>}
  {page==="donors"&&<><section className="hospitalPanel"><div className="panelHeading"><div><h2>Demo donor directory</h2><p>All eight standard ABO/Rh groups are represented. Records are synthetic demo data, not real verified donors.</p></div><button className="secondaryBtn small" onClick={load}><RefreshCw size={14}/>Refresh directory</button></div><div className="groupCounts">{["O-","O+","A-","A+","B-","B+","AB-","AB+"].map(g=><div className="groupCount" key={g}><b className="bloodBadge">{g}</b><strong>{directory.counts?.[g]??0}</strong><small>donors</small></div>)}</div><div className="tableScroll"><table className="hospitalTable"><thead><tr><th>Donor</th><th>Blood group</th><th>Location</th><th>Distance</th><th>Screening / interval</th><th>Availability</th></tr></thead><tbody>{directory.donors.map(d=><tr key={d.id}><td><b>{d.name}</b><small>{d.donor_code}</small></td><td><b className="bloodBadge">{d.blood_group}</b></td><td>{d.city}</td><td>{d.distance_km} km</td><td><span className={`statusPill ${d.eligible?"ok":"warn"}`}>{d.eligibility_status}</span></td><td>{d.emergency_available&&d.notifications_enabled?"Available":"Paused"}<small>Alert radius: {d.alert_radius_km} km</small></td></tr>)}</tbody></table></div></section></>}
  {page==="dispatch"&&<><section className="hospitalPanel"><div className="panelHeading"><div><h2>Explainable donor matching</h2><p>Compatibility and prototype eligibility are hard gates; eligible donors inside their alert radius are ranked by distance.</p></div></div><div className="dispatchControls"><Field label="Select emergency request"><select value={selectedRequestId} onChange={e=>{setSelectedRequestId(e.target.value);setMatchData(null);setSimResult(null)}}>{requests.map(r=><option value={String(r.id)} key={r.id}>{r.request_code} · {r.blood_group} · {r.urgency} · {r.status}</option>)}</select></Field><button className="primaryBtn" onClick={loadMatches} disabled={!selectedRequestId}>Analyse compatible donors</button></div>{matchData&&<><div className="matchSummary"><div><span>Compatible & eligible</span><strong>{matchData.match_count}</strong></div><div><span>Candidates reviewed</span><strong>{matchData.candidate_count}</strong></div><p>{matchData.ranking_explanation}</p></div><div className="tableScroll"><table className="hospitalTable"><thead><tr><th>Rank / donor</th><th>Group</th><th>Distance / ETA</th><th>Eligibility</th><th>Match reason</th></tr></thead><tbody>{matchData.candidates.map((d,i)=><tr key={d.donor_id}><td><b>{d.match?`#${i+1} `:"— "}{d.name}</b><small>{d.donor_code}</small></td><td><b className="bloodBadge">{d.blood_group}</b></td><td>{d.distance_km} km<small>~{d.eta_minutes_estimate} min (estimate)</small></td><td><span className={`statusPill ${d.match?"ok":"warn"}`}>{d.match?"MATCH":"NOT MATCHED"}</span><small>{d.eligibility_status}</small></td><td>{d.reasons.join(" · ")}</td></tr>)}</tbody></table></div></>}</section><section className="hospitalPanel"><div className="panelHeading"><div><h2>What-if dispatch simulator</h2><p>Test decline / timeout escalation without contacting donors or changing real records.</p></div><span className="statusPill warn">Simulation only</span></div><div className="dispatchControls"><Field label="Declines before simulated acceptance"><select value={simDeclines} onChange={e=>setSimDeclines(Number(e.target.value))}>{[0,1,2,3,4,5,10].map(n=><option value={n} key={n}>{n}</option>)}</select></Field><button className="primaryBtn" disabled={!selectedRequestId||busy} onClick={runSimulation}>{busy?"Simulating…":"Run dispatch simulation"}</button></div>{simResult&&<><div className="simNotice"><b>{simResult.mode.replaceAll("_"," ")}</b><span>{simResult.real_records_changed?"Records changed":"No real records changed"}</span><p>{simResult.note}</p></div><div className="dispatchTimeline">{simResult.events.map(ev=><div className="dispatchEvent" key={ev.step}><span>{String(ev.step).padStart(2,"0")}</span><div><b>{ev.event}</b><p>{ev.detail}</p></div><em>{ev.status}</em></div>)}</div></>}</section></>}
  {page==="requests"&&<section className="hospitalPanel"><div className="panelHeading"><div><h2>Request register</h2><p>Live list of your emergency requests.</p></div><button className="primaryBtn small" onClick={()=>setPage("new")}>+ New request</button></div><HospitalRequestTable rows={requests} onUpdate={async(id,status)=>{try{await hospitalApi.updateRequest(id,status);await load();notify("Request updated")}catch(e){notify(e.message)}}}/></section>}
  {page==="new"&&<section className="hospitalPanel requestFormPanel"><div className="processingIntro"><div className="processingGlyph"><Activity size={22}/></div><div><span className="eyebrow">LIFEFLOW INTELLIGENCE</span><h2>Emergency blood request</h2><p>Submit a request to run compatibility, readiness, and donor matching checks.</p></div></div><form onSubmit={async e=>{e.preventDefault();setError("");setBusy(true);setProcessingStage(0);setProcessing(true);const startedAt=Date.now();const stageTimer=setInterval(()=>setProcessingStage(v=>Math.min(3,v+1)),650);try{const res=await hospitalApi.createRequest({...form,units_required:Number(form.units_required),latitude:Number(form.latitude),longitude:Number(form.longitude),required_in_minutes:Number(form.required_in_minutes)});const matches=await hospitalApi.matches(res.id);await load();setSelectedRequestId(String(res.id));setMatchData(matches);setSimResult(null);setProcessingStage(4);const remaining=Math.max(0,1800-(Date.now()-startedAt));if(remaining)await new Promise(resolve=>setTimeout(resolve,remaining));notify(`Processed ${res.request_code}; ${res.eligible_donors_notified} eligible donor(s) notified`);setPage("dispatch")}catch(e){setError(e.message);setProcessing(false)}finally{clearInterval(stageTimer);setBusy(false);setProcessing(false)}}}><div className="twoCols"><Field label="Required blood group"><select value={form.blood_group} onChange={e=>setForm({...form,blood_group:e.target.value})}>{["O-","O+","A-","A+","B-","B+","AB-","AB+"].map(g=><option key={g}>{g}</option>)}</select></Field><Field label="Units required"><input type="number" min="1" max="20" value={form.units_required} onChange={e=>setForm({...form,units_required:e.target.value})}/></Field></div><div className="twoCols"><Field label="Urgency"><select value={form.urgency} onChange={e=>setForm({...form,urgency:e.target.value})}>{["CRITICAL","HIGH","MODERATE","LOW"].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Request expires in (minutes)"><input type="number" min="5" value={form.required_in_minutes} onChange={e=>setForm({...form,required_in_minutes:e.target.value})}/></Field></div><div className="twoCols"><Field label="City"><input value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></Field><Field label="Hospital latitude"><input type="number" step="any" value={form.latitude} onChange={e=>setForm({...form,latitude:e.target.value})}/></Field></div><Field label="Hospital longitude"><input type="number" step="any" value={form.longitude} onChange={e=>setForm({...form,longitude:e.target.value})}/></Field><button className="primaryBtn" disabled={busy}>{busy?"Creating and matching…":"Create request and notify matched donors"}</button></form></section>}
  {page==="inventory"&&<><section className="hospitalPanel"><h2>Update blood stock</h2><form className="inventoryForm" onSubmit={async e=>{e.preventDefault();try{await hospitalApi.setInventory({...stock,units_available:Number(stock.units_available)});setInventory(await hospitalApi.inventory());await load();notify("Inventory saved to database")}catch(e){notify(e.message)}}}><Field label="Blood group"><select value={stock.blood_group} onChange={e=>setStock({...stock,blood_group:e.target.value})}>{["O-","O+","A-","A+","B-","B+","AB-","AB+"].map(g=><option key={g}>{g}</option>)}</select></Field><Field label="Units available"><input type="number" min="0" value={stock.units_available} onChange={e=>setStock({...stock,units_available:e.target.value})}/></Field><button className="primaryBtn">Save stock</button></form></section><section className="hospitalPanel"><div className="panelHeading"><h2>Current inventory</h2><span>Persisted stock records</span></div><table className="hospitalTable"><thead><tr><th>Blood group</th><th>Units available</th><th>Last updated</th></tr></thead><tbody>{inventory.map(x=><tr key={x.id}><td><b className="bloodBadge">{x.blood_group}</b></td><td>{x.units_available}</td><td>{fmtDT(x.updated_at)}</td></tr>)}</tbody></table></section></>}
  {page==="responses"&&<section className="hospitalPanel"><div className="panelHeading"><div><h2>Donor responses</h2><p>Responses from the donor portal for your requests.</p></div></div>{requests.filter(r=>r.responses?.length).map(r=><div className="responseGroup" key={r.id}><h3>{r.request_code} · {r.blood_group} · {r.status}</h3>{r.responses.map((d,i)=><div className="responseDonor" key={i}><b>{d.donor_name}</b><span>{d.donor_code} · {d.blood_group}</span><span className={d.response==="ACCEPTED"?"verified":"statusPill"}>{d.response}</span><span>{d.journey_status}</span><time>{fmtDT(d.responded_at)}</time></div>)}</div>)}{!requests.some(r=>r.responses?.length)&&<EmptyState icon={<UsersIcon/>} title="No donor responses yet" text="Responses will appear here after donors accept or decline shared requests."/>}</section>}
  </main>{processing&&<div className="processingBackdrop" role="dialog" aria-modal="true" aria-labelledby="processingTitle"><section className="processingModal"><div className="processingModalTop"><div className="processingGlyph pulse"><Activity size={23}/></div><span className="processingLive"><i/> PROCESSING REQUEST</span></div><span className="eyebrow">LIFEFLOW INTELLIGENCE ENGINE</span><h2 id="processingTitle">Finding the right donors.</h2><p className="processingLead">The backend is creating your request and evaluating the available donor records.</p><div className="processingProgress"><span style={{width:`${[18,42,68,88,100][processingStage]}%`}}/></div><div className="processingSteps">{[{title:"Validate emergency request",detail:"Blood group, units and urgency"},{title:"Apply compatibility rules",detail:"Compare requested and donor blood groups"},{title:"Check recorded readiness",detail:"Eligibility and donation interval rules"},{title:"Rank potential candidates",detail:"Distance and donor alert radius"},{title:"Prepare explainable results",detail:"Load candidate list for hospital review"}].map((step,i)=><div className={`processingStep ${i<processingStage?"complete":i===processingStage?"current":""}`} key={step.title}><span className="processingStepIcon">{i<processingStage?"✓":i===processingStage?<span className="processingSpinner"/>:String(i+1).padStart(2,"0")}</span><div><b>{step.title}</b><small>{step.detail}</small></div>{i<processingStage&&<span className="processingDone">DONE</span>}</div>)}</div><div className="processingFoot"><span className="processingLive"><i/> SHARED BACKEND</span><span>Results require hospital review</span></div></section></div>}{toast&&<div className="toast">{toast}</div>}</div>
}
function UsersIcon(){return <UserRound/>}
function HospitalRequestTable({rows,onUpdate}){return <div className="tableScroll"><table className="hospitalTable"><thead><tr><th>Request</th><th>Requirement</th><th>Urgency</th><th>Status</th><th>Responses</th><th>Created</th><th>Actions</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><b>{r.request_code}</b><small>{r.hospital}</small></td><td><b className="bloodBadge">{r.blood_group}</b> · {r.units_required} unit(s)</td><td><span className={`urgencyTag ${r.urgency.toLowerCase()}`}>{r.urgency}</span></td><td><span className={`statusPill ${r.status==="ACTIVE"?"ok":"warn"}`}>{r.status}</span></td><td>{r.responses?.length||0} <small>({r.responses?.filter(x=>x.response==="ACCEPTED").length||0} accepted)</small></td><td>{fmtDT(r.created_at)}</td><td>{r.status==="ACTIVE"?<button className="secondaryBtn small" onClick={()=>onUpdate(r.id,"CANCELLED")}>Close</button>:r.status==="FULFILLED"?"—":<button className="secondaryBtn small" onClick={()=>onUpdate(r.id,"ACTIVE")}>Reopen</button>}</td></tr>)}</tbody></table>{!rows.length&&<EmptyState icon={<Hospital/>} title="No requests yet" text="Create an emergency request to start matching with eligible donors."/>}</div>}
function HospitalMetric({label,value,detail}){return <div className="hospitalMetric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>}

createRoot(document.getElementById("root")).render(window.location.pathname.startsWith("/hospital") ? <HospitalApp/> : <App/>);
