import { Client } from '@notionhq/client';
import { SyncCalendarModule } from 'sync-calendar-module';
import { ModuleSettings } from 'sync-calendar-module/build/settings.helper';

import { NotionAPI, DatabaseID, SettingsDatabaseID } from './settings.json';
 
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
})

const calendarModuleSettings = new ModuleSettings();
calendarModuleSettings.NotionAPI = NotionAPI;
calendarModuleSettings.DatabaseID = DatabaseID;
calendarModuleSettings.SettingsDatabaseID = SettingsDatabaseID;

const calendarModule = new SyncCalendarModule(calendarModuleSettings);

setInterval(calendarModuleLoop, 1000*60);

let updateCalendarModuleTimer = 0;

function calendarModuleLoop(){
  updateCalendarModuleTimer++;
  if(updateCalendarModuleTimer >= 30) updateCalendarModule();
}

async function updateCalendarModule(){
  updateCalendarModuleTimer = 0;

  const calendarSettings = await calendarModule.getNotionCalendarSettings(notion);
  for(let i = 0; i < calendarSettings.length; i++){
    await calendarModule.updateACalendar(notion, calendarSettings[i].properties, calendarSettings[i].id);
  }
}