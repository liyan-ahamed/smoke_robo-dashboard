import {useEffect,useRef,useState} from 'react';
import {VirtualESP32} from '../services/sensorSimulator';
import {calculatePredictions,classifyRisk} from '../services/predictionEngine';
import {analyzeThermalFrame} from '../services/humanDetectionEngine';
import {evaluateAlerts,mergeAlerts} from '../services/alertEngine';
export const DEFAULT_THRESHOLDS={ambientWarning:40,ambientCritical:60,internalWarning:44,coWarning:50,coCritical:150,batteryWarning:20,wifiWarning:-80};
const missionId=()=>`SS-${Date.now().toString(36).toUpperCase().slice(-6)}`;
export function useSensorData(){
  const device=useRef(new VirtualESP32()); const historyRef=useRef([]), detectionRef=useRef({humans:[],hotspots:[],lastMovement:null,lastDetection:null,nextId:1});
  const firedRef=useRef({}), alertsRef=useRef([]), startedRef=useRef(null), elapsedRef=useRef(0), idRef=useRef(missionId());
  const [history,setHistory]=useState([]),[detection,setDetection]=useState(detectionRef.current),[alerts,setAlerts]=useState([]);
  const [phase,setPhase]=useState('ready'),[elapsed,setElapsed]=useState(0),[id,setId]=useState(idRef.current),[missions,setMissions]=useState([]);
  const [environment,setEnvironment]=useState('Normal monitoring'),[humanScenario,setHumanScenario]=useState('No human candidate');
  const [thresholds,setThresholds]=useState(DEFAULT_THRESHOLDS);
  const phaseRef=useRef(phase), envRef=useRef(environment), humanRef=useRef(humanScenario), thresholdRef=useRef(thresholds);
  useEffect(()=>{phaseRef.current=phase},[phase]);useEffect(()=>{envRef.current=environment},[environment]);useEffect(()=>{humanRef.current=humanScenario},[humanScenario]);useEffect(()=>{thresholdRef.current=thresholds},[thresholds]);
  function complete(status){
    if(phaseRef.current==='completed'||phaseRef.current==='shutdown'||phaseRef.current==='ready')return;
    const h=historyRef.current,a=alertsRef.current;
    setMissions(old=>[{id:idRef.current,duration:elapsedRef.current,maxAmbient:Math.max(0,...h.map(x=>x.ambient)),maxInternal:Math.max(0,...h.map(x=>x.internal)),maxCO:Math.max(0,...h.map(x=>x.co)),humanCandidates:h.reduce((n,r)=>Math.max(n,r.candidateCount||0),0),criticalAlerts:a.filter(x=>x.severity==='critical').length,status},...old]);
    phaseRef.current=status==='Safe shutdown'?'shutdown':'completed';setPhase(phaseRef.current);
  }
  useEffect(()=>{
    const timer=setInterval(()=>{
      if(phaseRef.current!=='running')return;
      elapsedRef.current++;setElapsed(elapsedRef.current);
      const reading=device.current.next(envRef.current,humanRef.current);
      if(!reading)return;
      const detected=analyzeThermalFrame(reading.thermal,detectionRef.current,reading.timestamp);
      detectionRef.current=detected;setDetection(detected);
      const nextHistory=[...historyRef.current,{...reading,candidateCount:detected.humans.length}].slice(-600);
      historyRef.current=nextHistory;setHistory(nextHistory);
      const predictions=calculatePredictions(nextHistory);
      const active=evaluateAlerts(reading,predictions,detected,nextHistory,thresholdRef.current);
      const merged=mergeAlerts(alertsRef.current,active,reading.timestamp,firedRef.current);
      alertsRef.current=merged.alerts;firedRef.current=merged.lastFired;setAlerts(merged.alerts);
      if(reading.internal>=50){device.current.emergencyShutdown();complete('Safe shutdown');}
      else if(elapsedRef.current>=300)complete('Completed');
    },1000);
    return()=>clearInterval(timer);
  },[]);
  function start(){if(phaseRef.current==='ready'||phaseRef.current==='completed'||phaseRef.current==='shutdown')resetState();startedRef.current=Date.now();phaseRef.current='running';setPhase('running');}
  function resetState(){device.current.reset();historyRef.current=[];detectionRef.current={humans:[],hotspots:[],lastMovement:null,lastDetection:null,nextId:1};alertsRef.current=[];firedRef.current={};elapsedRef.current=0;idRef.current=missionId();setId(idRef.current);setHistory([]);setDetection(detectionRef.current);setAlerts([]);setElapsed(0);}
  function reset(){if(phaseRef.current==='running'||phaseRef.current==='paused')complete('Reset');resetState();phaseRef.current='ready';setPhase('ready');}
  function pause(){if(phaseRef.current==='running'){phaseRef.current='paused';setPhase('paused');}}
  function resume(){if(phaseRef.current==='paused'){phaseRef.current='running';setPhase('running');}}
  const current=history.at(-1),predictions=calculatePredictions(history),risk=classifyRisk(current,predictions,detection,thresholds);
  return {history,current,predictions,detection,alerts,phase,elapsed,id,missions,environment,setEnvironment,humanScenario,setHumanScenario,thresholds,setThresholds,risk,start,pause,resume,reset};
}
