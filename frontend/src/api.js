
const BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const token = () => localStorage.getItem("lifeflow_token");
async function req(path, options={}) {
  const headers = {"Content-Type":"application/json", ...(options.headers||{})};
  if (token()) headers.Authorization = `Bearer ${token()}`;
  const res = await fetch(`${BASE}${path}`, {...options, headers});
  if (!res.ok) {
    let message = "Request failed";
    try { const data = await res.json(); message = data.detail || message; } catch {}
    throw new Error(message);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}
export const api = {
  login: (data)=>req("/auth/login",{method:"POST",body:JSON.stringify(data)}),
  register: (data)=>req("/auth/register",{method:"POST",body:JSON.stringify(data)}),
  health: ()=>req("/health"),
  time: ()=>req("/time"),
  me: ()=>req("/me"),
  updateMe: (data)=>req("/me",{method:"PUT",body:JSON.stringify(data)}),
  dashboard: ()=>req("/dashboard"),
  eligibility: ()=>req("/eligibility"),
  screening: (data)=>req("/screenings",{method:"POST",body:JSON.stringify(data)}),
  screenings: ()=>req("/screenings"),
  emergencies: ()=>req("/emergencies"),
  respond: (id, action)=>req(`/emergencies/${id}/respond`,{method:"POST",body:JSON.stringify({action})}),
  journey: (id, status)=>req(`/emergencies/${id}/journey`,{method:"PUT",body:JSON.stringify({status})}),
  donations: ()=>req("/donations"),
  notifications: ()=>req("/notifications"),
  readNotification: (id)=>req(`/notifications/${id}/read`,{method:"POST"}),
  activity: ()=>req("/activity"),
  compatibility: ()=>req("/compatibility"),
  passport: ()=>req("/health-passport"),
  certificateUrl: (id)=>`${BASE}/donations/${id}/certificate`,
  base: BASE
};

const HBASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
async function hreq(path, options={}) {
  const headers={"Content-Type":"application/json", ...(options.headers||{})};
  const t=localStorage.getItem("lifeflow_hospital_token"); if(t) headers.Authorization=`Bearer ${t}`;
  const res=await fetch(`${HBASE}${path}`,{...options,headers});
  if(!res.ok){let msg="Request failed";try{const d=await res.json();msg=d.detail||msg}catch{};throw new Error(msg)}
  return res.json();
}
export const hospitalApi={
  login:(data)=>hreq("/hospital/auth/login",{method:"POST",body:JSON.stringify(data)}),
  me:()=>hreq("/hospital/me"), updateMe:(data)=>hreq("/hospital/me",{method:"PUT",body:JSON.stringify(data)}),
  overview:()=>hreq("/hospital/overview"), commandCenter:()=>hreq("/hospital/command-center"), donors:(group="")=>hreq(`/hospital/donors${group?`?blood_group=${encodeURIComponent(group)}`:""}`), requests:()=>hreq("/hospital/requests"), matches:(id)=>hreq(`/hospital/requests/${id}/matches`), simulate:(id,data)=>hreq(`/hospital/requests/${id}/simulate`,{method:"POST",body:JSON.stringify(data)}),
  createRequest:(data)=>hreq("/hospital/requests",{method:"POST",body:JSON.stringify(data)}),
  updateRequest:(id,status)=>hreq(`/hospital/requests/${id}`,{method:"PATCH",body:JSON.stringify({status})}),
  responses:(id)=>hreq(`/hospital/requests/${id}/responses`), inventory:()=>hreq("/hospital/inventory"),
  setInventory:(data)=>hreq("/hospital/inventory",{method:"POST",body:JSON.stringify(data)}), time:()=>hreq("/time")
};
