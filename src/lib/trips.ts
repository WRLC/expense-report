import type {Report,Trip,TripStore} from '../types/expenseReport';
import {DRAFT_KEY} from '../config/appConfig';
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const token=()=>crypto.randomUUID();
export function createReport():Report{return{employee:'',employeeEmail:'',submittedDate:localDate(),reportNumber:`WR-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`,expenses:[{id:token(),date:'',description:'',type:'',amount:''},{id:token(),date:'',description:'',type:'',amount:''},{id:token(),date:'',description:'',type:'',amount:''}],priorBalance:'',advances:[{id:token(),description:'',amount:''},{id:token(),description:'',amount:''},{id:token(),description:'',amount:''}],certified:false,certificationDate:localDate()}}
export function createTrip(name=''):Trip{return{id:token(),name,report:createReport()}}
export function initialTripStore():TripStore{const trip=createTrip();return{version:2,activeTripId:trip.id,trips:[trip]}}
function isTripStore(value:unknown):value is TripStore{if(!value||typeof value!=='object')return false;const v=value as Partial<TripStore>;return v.version===2&&Array.isArray(v.trips)&&v.trips.length>0&&typeof v.activeTripId==='string'&&v.trips.some(t=>t.id===v.activeTripId&&!!t.report?.expenses&&!!t.report?.advances)}
export function parseTripStore(value:unknown):TripStore{
 if(isTripStore(value))return value;
 if(value&&typeof value==='object'&&(value as {version?:number}).version===1){const legacy=(value as {report?:Partial<Report>}).report;if(legacy?.expenses&&legacy.advances){const trip:Trip={id:token(),name:'',report:{...createReport(),...legacy,employeeEmail:legacy.employeeEmail||''} as Report};return{version:2,activeTripId:trip.id,trips:[trip]}}}
 throw new Error('Invalid trip data');
}
export function loadTripStore():TripStore{try{const raw=localStorage.getItem(DRAFT_KEY);if(raw)return parseTripStore(JSON.parse(raw))}catch{/* Start a fresh device-local trip if there is no valid draft. */}return initialTripStore()}
export function importTripStore(json:string):TripStore{return parseTripStore(JSON.parse(json))}
