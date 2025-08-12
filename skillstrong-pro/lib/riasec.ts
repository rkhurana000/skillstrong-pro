export type RType='R'|'I'|'A'|'S'|'E'|'C';
export const questions=[
{t:'R',q:'I like fixing or building things with tools.'},
{t:'R',q:'I enjoy working with machines or equipment.'},
{t:'I',q:'I like figuring out how things work.'},
{t:'I',q:'I enjoy solving technical problems.'},
{t:'A',q:'I like drawing, design, or creating things.'},
{t:'A',q:'I enjoy thinking of new product ideas.'},
{t:'S',q:'I like helping people learn or succeed.'},
{t:'S',q:'I enjoy working on a team to support others.'},
{t:'E',q:'I like leading projects or organizing work.'},
{t:'E',q:'I enjoy persuading others to try new ideas.'},
{t:'C',q:'I like keeping things organized and accurate.'},
{t:'C',q:'I enjoy following clear steps and procedures.'},
];
export const roleMap:Record<RType,{title:string;summary:string;prompt:string}[]>={
R:[{title:'Welder',summary:'Weld metal parts in manufacturing and construction.',prompt:'Welding career overview and certificates'},{title:'CNC Operator',summary:'Set up and run computer-controlled machines.',prompt:'CNC operator overview and training'}],
I:[{title:'Robotics/Mechatronics Technician',summary:'Keep automated systems running.',prompt:'Mechatronics tech overview and certificates'},{title:'Industrial Maintenance Tech',summary:'Repair and maintain factory equipment.',prompt:'Industrial maintenance overview and apprenticeships'}],
A:[{title:'CAD Technician',summary:'Create technical drawings and models.',prompt:'CAD technician overview and training'}],
S:[{title:'Quality Technician',summary:'Inspect products and processes; help teams improve.',prompt:'Quality tech overview and certificates'}],
E:[{title:'Production Team Lead',summary:'Coordinate people and processes on the floor.',prompt:'Production lead overview and training'}],
C:[{title:'Supply Chain Coordinator',summary:'Track materials, inventory, and shipments.',prompt:'Supply chain coordinator overview and training'}],
};
export function score(ans:Record<number,boolean>){const c:{[k in RType]:number}={R:0,I:0,A:0,S:0,E:0,C:0};questions.forEach((it,i)=>{if(ans[i])c[it.t as RType]++});const top=Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0] as RType;return{counts:c,top};}
