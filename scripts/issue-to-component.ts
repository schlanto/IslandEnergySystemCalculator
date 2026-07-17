import { readFile, mkdir, writeFile, appendFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { issueToComponent } from '../src/contribution/parser'

const input=process.argv[2];if(!input)throw new Error('Usage: npm run component:from-issue -- <issue-body-file> [output-root]')
const component=issueToComponent(await readFile(input,'utf8'));const root=process.argv[3]??process.cwd();const folder=component.category==='storage'?'storage':`${component.category}s`;const output=join(root,'data',folder,`${component.id}.json`);await mkdir(dirname(output),{recursive:true});await writeFile(output,`${JSON.stringify(component,null,2)}\n`);if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`component_id=${component.id}\ncomponent_name=${component.manufacturer} ${component.model}\ncomponent_role=${component.category}\nsource_url=${component.sources[0].url}\n`);console.log(output)
