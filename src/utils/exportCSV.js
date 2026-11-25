function download(name,columns,rows){
  const quote=v=>`"${String(v??'').replaceAll('"','""')}"`;
  const content=[columns.map(quote).join(','),...rows.map(row=>row.map(quote).join(','))].join('\r\n');
  const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function exportSensorCSV(history){download('smokescout-sensors.csv',['Timestamp','Ambient °C','Internal °C','CO ppm','Battery %','Wi-Fi dBm','Status','Thermal 8x8 JSON'],history.map(r=>[new Date(r.timestamp).toISOString(),r.ambient,r.internal,r.co,r.battery,r.wifi,r.status,JSON.stringify(r.thermal)]));}
export function exportAlertCSV(alerts){download('smokescout-alerts.csv',['Timestamp','Severity','Title','Description','Value'],alerts.map(a=>[new Date(a.timestamp).toISOString(),a.severity,a.title,a.description,a.value]));}
