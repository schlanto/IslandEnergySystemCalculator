import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

const root=process.cwd(); const readJson=async(path:string)=>JSON.parse(await readFile(path,'utf8'))
const base=await readJson(join(root,'schemas','component.schema.json')); const ajv=new Ajv2020({allErrors:true,strict:false}); addFormats(ajv); ajv.addSchema(base)
const schemas:Record<string,object>={}; for(const role of ['consumer','generator','storage','converter'])schemas[role]=await readJson(join(root,'schemas',`${role}.schema.json`))
const errors:string[]=[]; const ids=new Set<string>(); let count=0
for(const role of Object.keys(schemas)){const validate=ajv.compile(schemas[role]);const folder=join(root,'data',role==='storage'?'storage':`${role}s`);for(const filename of await readdir(folder)){if(!filename.endsWith('.json'))continue;count++;const path=join(folder,filename);const data=await readJson(path);if(!validate(data))errors.push(`${path}: ${ajv.errorsText(validate.errors,{separator:'; '})}`);if(ids.has(data.id))errors.push(`${path}: duplicate id ${data.id}`);ids.add(data.id);if(data.category!==role)errors.push(`${path}: category must match folder`);const e=data.electrical??{};if(e.startupPowerW!=null&&e.continuousPowerW!=null&&e.startupPowerW<e.continuousPowerW)errors.push(`${path}: startup power is below continuous power`);if(e.maximumVoltageV!=null&&e.minimumVoltageV!=null&&e.maximumVoltageV<e.minimumVoltageV)errors.push(`${path}: maximum voltage is below minimum voltage`);if(e.usableCapacityWh!=null&&e.nominalCapacityWh!=null&&e.usableCapacityWh>e.nominalCapacityWh)errors.push(`${path}: usable capacity exceeds nominal capacity`);if(e.output?.peakPowerW!=null&&e.output?.continuousPowerW!=null&&e.output.peakPowerW<e.output.continuousPowerW)errors.push(`${path}: peak output is below continuous output`)}}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}console.log(`Validated ${count} component files with unique IDs and cross-field constraints.`)
