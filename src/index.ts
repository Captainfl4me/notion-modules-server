import { Client } from '@notionhq/client';

import dotenv from 'dotenv';
import { promisify } from 'node:util';
const exec = promisify(require('node:child_process').exec);

dotenv.config();

if(!process.env.NOTION_TOKEN) {
  console.error("Env var NOTION_TOKEN not set!");
  process.exit(1);
}
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

const modules_list: Array<string> = [];
async function installModules() {
  if(process.env.USE_CALENDAR_MODULE) modules_list.push('sync-calendar-module@0.1.7');

  if(modules_list.length <= 0) return;
  const { stdout, stderr } = await exec(`npm i ${modules_list.join(' ')}`);
  console.log('install:', stdout);
  console.error('stderr:', stderr);
}
async function uninstallModules() {
  if(modules_list.length <= 0) return;

  const { stdout, stderr } = await exec(`npm uninstall ${modules_list.map((pck_name)=>pck_name.replace(/@(.*)/gm, '')).join(' ')}`);
  console.log('uninstall:', stdout);
  console.error('stderr:', stderr);
}

//bootstrap app
async function bootstrap(){
  console.log("Managing dependencies...");
  await installModules();

  let calendarModule;
  if(process.env.USE_CALENDAR_MODULE) {
    console.log("Setup calendar module...");
    const { SyncCalendarModule, ModuleSettings } = require('sync-calendar-module');

    if(!process.env.CALENDAR_DB_ID || !process.env.CALENDAR_DB_ID){      
      console.error("Env var CALENDAR_DB_ID or CALENDAR_DB_ID not set!");
      process.exit(1);
    }

    const calendarModuleSettings = new ModuleSettings();
    calendarModuleSettings.DatabaseID = process.env.CALENDAR_DB_ID as string;
    calendarModuleSettings.SettingsDatabaseID = process.env.CALENDAR_SETTINGS_DB_ID as string;
    
    calendarModule = new SyncCalendarModule(calendarModuleSettings);
  }

  console.log("Application setup finish, playing runtime...");
  runtime(calendarModule); //start runtime
}

let runtimeCounter = 0;
async function runtime(calendarModule: any = undefined){
  //Update calendar module if import & every 10min
  if(calendarModule && runtimeCounter % (60*10) == 0) {
    console.log("Update calendar!");  
    try{
      const calendarSettings = await calendarModule.getNotionCalendarSettings(notion);
      for(let i = 0; i < calendarSettings.length; i++){
        await calendarModule.updateACalendar(notion, calendarSettings[i].properties, calendarSettings[i].id);
      }
    }catch(e){
      console.error(e);
    }
  }

  runtimeCounter++;
  setTimeout(()=>runtime(calendarModule), 1000);
}

bootstrap();

async function exitHandler(options: any, exitCode: any) {
  if(process.env.REMOVE_MODULES_ON_EXIT){
    console.log("Unistalling dependencies...");
    await uninstallModules();
  }

  if (options.cleanup) console.log('clean');
  if (exitCode || exitCode === 0) console.log(exitCode);
  if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));